// Package ble lets the page talk Bluetooth LE through the local API. The WebViews the
// app runs in (WKWebView, WebView2, WebKitGTK) have no usable Web Bluetooth, so the
// page's protocol clients (frontend/passport-ble) use a transport that calls these
// endpoints instead. The bridge only moves bytes: scanning, connecting, GATT reads,
// writes and notifications. The AI Passport protocols stay in JavaScript.
//
// The radio itself is in internal/ble/native (tinygo.org/x/bluetooth); tests use a fake.
// Not in pkg/: Windows 7 has no Bluetooth LE API the client could use.
package ble

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// Advert is one device seen while scanning.
type Advert struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	RSSI     int      `json:"rssi"`
	Services []string `json:"services"`
}

// Peripheral is one connected device. Calls are not made concurrently.
type Peripheral interface {
	// Services lists the primary service UUIDs (lower case, 128-bit).
	Services() []string
	// MTU is the ATT MTU, or 23 when unknown.
	MTU() int
	Read(service, char string) ([]byte, error)
	// Write is a write with response.
	Write(service, char string, data []byte) error
	Subscribe(service, char string, fn func([]byte)) error
	Close() error
}

// Radio is the system Bluetooth adapter.
type Radio interface {
	// Enable prepares the adapter; it fails when Bluetooth is off, missing or not allowed.
	Enable() error
	// Scan reports advertisements until ctx ends.
	Scan(ctx context.Context, found func(Advert)) error
	// Connect connects and discovers the services; gone is called once if the link drops.
	Connect(ctx context.Context, id string, gone func()) (Peripheral, error)
}

// Error codes the page translates (err_ble_<code>).
const (
	CodeUnavailable = "ble_unavailable"
	CodeNotFound    = "ble_not_found"
	CodeConnect     = "ble_connect"
	CodeGone        = "ble_disconnected"
	CodeGATT        = "ble_gatt"
)

type codedError struct {
	code string
	err  error
}

func (e *codedError) Error() string { return e.err.Error() }
func (e *codedError) Unwrap() error { return e.err }

func coded(code string, err error) error { return &codedError{code, err} }

const (
	// seenFor is how long a device stays in the list after its last advertisement.
	seenFor = 12 * time.Second
	// maxScan caps one scan request; the page renews it while the list is shown.
	maxScan = 60 * time.Second
	// keepEvents caps the notifications kept for a connection the page is not reading.
	keepEvents = 2000
)

type seen struct {
	Advert
	at time.Time
}

type event struct {
	Seq     int    `json:"seq"`
	Service string `json:"service"`
	Char    string `json:"char"`
	Data    []byte `json:"data"`
}

type conn struct {
	id     int
	name   string
	device string
	p      Peripheral
	op     sync.Mutex // one GATT operation at a time

	mu     sync.Mutex
	alive  bool
	events []event
	next   int
	wake   chan struct{}
}

func (c *conn) push(service, char string, data []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.next++
	c.events = append(c.events, event{Seq: c.next, Service: service, Char: char, Data: append([]byte(nil), data...)})
	if len(c.events) > keepEvents {
		c.events = c.events[len(c.events)-keepEvents:]
	}
	close(c.wake)
	c.wake = make(chan struct{})
}

func (c *conn) drop() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.alive {
		c.alive = false
		close(c.wake)
		c.wake = make(chan struct{})
	}
}

// after returns the events after seq, whether the link is up, and a channel closed on change.
func (c *conn) after(seq int) ([]event, bool, <-chan struct{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := []event{}
	for _, e := range c.events {
		if e.Seq > seq {
			out = append(out, e)
		}
	}
	// Events the page has acknowledged are no longer needed.
	i := 0
	for i < len(c.events) && c.events[i].Seq <= seq {
		i++
	}
	c.events = c.events[i:]
	return out, c.alive, c.wake
}

// Bridge serves /api/ble/*. One device is connected at a time, like the Android app.
type Bridge struct {
	radio Radio

	mu        sync.Mutex
	enabled   bool
	enableErr error
	triedAt   time.Time
	devices   map[string]*seen
	scanStop  context.CancelFunc
	scanUntil time.Time
	scanErr   error
	conn      *conn
	nextConn  int
	now       func() time.Time
}

// New returns a bridge over radio; nil means this build has no Bluetooth.
func New(radio Radio) *Bridge {
	return &Bridge{radio: radio, devices: map[string]*seen{}, now: time.Now}
}

func (b *Bridge) enable() error {
	if b.radio == nil {
		return coded(CodeUnavailable, errors.New("bluetooth is not supported in this build"))
	}
	b.mu.Lock()
	if b.enabled {
		b.mu.Unlock()
		return nil
	}
	if b.enableErr != nil && b.now().Sub(b.triedAt) < 3*time.Second {
		err := b.enableErr
		b.mu.Unlock()
		return err
	}
	b.mu.Unlock()
	err := b.radio.Enable()
	b.mu.Lock()
	defer b.mu.Unlock()
	b.triedAt = b.now()
	if err != nil {
		b.enableErr = coded(CodeUnavailable, err)
		return b.enableErr
	}
	b.enabled, b.enableErr = true, nil
	return nil
}

// startScan scans for d (extending a running scan).
func (b *Bridge) startScan(d time.Duration) error {
	if err := b.enable(); err != nil {
		return err
	}
	d = min(max(d, 3*time.Second), maxScan)
	b.mu.Lock()
	defer b.mu.Unlock()
	b.scanUntil = b.now().Add(d)
	b.scanErr = nil
	if b.scanStop != nil {
		return nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	b.scanStop = cancel
	go func() {
		err := b.radio.Scan(ctx, b.found)
		b.mu.Lock()
		if err != nil && ctx.Err() == nil {
			b.scanErr = err
		}
		b.scanStop = nil
		b.mu.Unlock()
		cancel()
	}()
	go func() {
		t := time.NewTicker(250 * time.Millisecond)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				b.mu.Lock()
				over := b.now().After(b.scanUntil)
				b.mu.Unlock()
				if over {
					cancel()
					return
				}
			}
		}
	}()
	return nil
}

func (b *Bridge) stopScan() {
	b.mu.Lock()
	stop := b.scanStop
	b.scanUntil = time.Time{}
	b.mu.Unlock()
	if stop != nil {
		stop()
	}
}

// found merges an advertisement: scan responses often carry the name or UUIDs separately.
func (b *Bridge) found(a Advert) {
	if a.ID == "" {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	s := b.devices[a.ID]
	if s == nil {
		s = &seen{Advert: Advert{ID: a.ID}}
		b.devices[a.ID] = s
	}
	if a.Name != "" {
		s.Name = a.Name
	}
	if a.RSSI != 0 {
		s.RSSI = a.RSSI
	}
	for _, u := range a.Services {
		u = strings.ToLower(u)
		if !contains(s.Services, u) {
			s.Services = append(s.Services, u)
		}
	}
	s.at = b.now()
}

func contains(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

func (b *Bridge) list() []Advert {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := []Advert{}
	for id, s := range b.devices {
		if b.now().Sub(s.at) > seenFor {
			delete(b.devices, id)
			continue
		}
		a := s.Advert
		a.Services = append([]string{}, s.Services...)
		out = append(out, a)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].RSSI != out[j].RSSI {
			return out[i].RSSI > out[j].RSSI
		}
		return out[i].ID < out[j].ID
	})
	return out
}

func (b *Bridge) connect(ctx context.Context, id string) (*conn, error) {
	if err := b.enable(); err != nil {
		return nil, err
	}
	b.stopScan()
	b.mu.Lock()
	old := b.conn
	b.conn = nil
	name := ""
	if s := b.devices[id]; s != nil {
		name = s.Name
	}
	b.nextConn++
	c := &conn{id: b.nextConn, name: name, device: id, alive: true, wake: make(chan struct{})}
	b.mu.Unlock()
	if old != nil {
		old.op.Lock()
		_ = old.p.Close()
		old.op.Unlock()
		old.drop()
	}
	ctx, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()
	p, err := b.radio.Connect(ctx, id, c.drop)
	if err != nil {
		if errors.Is(err, ErrUnknownDevice) {
			return nil, coded(CodeNotFound, err)
		}
		return nil, coded(CodeConnect, err)
	}
	c.p = p
	b.mu.Lock()
	b.conn = c
	b.mu.Unlock()
	return c, nil
}

// ErrUnknownDevice is returned by Radio.Connect for an id it has not seen.
var ErrUnknownDevice = errors.New("device not found; scan again")

func (b *Bridge) get(id int) (*conn, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.conn == nil || b.conn.id != id {
		return nil, coded(CodeGone, errors.New("bluetooth disconnected"))
	}
	return b.conn, nil
}

// gatt runs one operation on a live connection.
func (b *Bridge) gatt(id int, fn func(*conn) error) error {
	c, err := b.get(id)
	if err != nil {
		return err
	}
	c.op.Lock()
	defer c.op.Unlock()
	c.mu.Lock()
	alive := c.alive
	c.mu.Unlock()
	if !alive {
		return coded(CodeGone, errors.New("bluetooth disconnected"))
	}
	if err := fn(c); err != nil {
		var ce *codedError
		if errors.As(err, &ce) {
			return err
		}
		return coded(CodeGATT, err)
	}
	return nil
}

func (b *Bridge) closeConn(id int) {
	b.mu.Lock()
	c := b.conn
	if c == nil || (id != 0 && c.id != id) {
		b.mu.Unlock()
		return
	}
	b.conn = nil
	b.mu.Unlock()
	c.op.Lock()
	_ = c.p.Close()
	c.op.Unlock()
	c.drop()
}

// Close disconnects and stops scanning (app exit).
func (b *Bridge) Close() {
	b.stopScan()
	b.closeConn(0)
}

type request struct {
	Seconds float64  `json:"seconds"`
	ID      string   `json:"id"`
	Conn    int      `json:"conn"`
	Service string   `json:"service"`
	Char    string   `json:"char"`
	Data    []string `json:"data"`
	After   int      `json:"after"`
	Wait    float64  `json:"wait"`
}

func reply(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, err error) {
	code := CodeGATT
	var ce *codedError
	if errors.As(err, &ce) {
		code = ce.code
	}
	reply(w, http.StatusBadRequest, map[string]string{"code": code, "error": err.Error()})
}

// ServeHTTP answers /api/ble/<op>. The caller has checked the API token.
func (b *Bridge) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	op := strings.TrimPrefix(r.URL.Path, "/api/ble/")
	if r.Method == http.MethodGet {
		switch op {
		case "state":
			b.mu.Lock()
			st := map[string]any{"supported": b.radio != nil, "ready": b.enabled, "scanning": b.scanStop != nil}
			if b.enableErr != nil {
				st["error"] = b.enableErr.Error()
			}
			if b.scanErr != nil {
				st["scanError"] = b.scanErr.Error()
			}
			b.mu.Unlock()
			reply(w, 200, st)
		case "devices":
			b.mu.Lock()
			scanning := b.scanStop != nil
			b.mu.Unlock()
			reply(w, 200, map[string]any{"scanning": scanning, "devices": b.list()})
		default:
			http.NotFound(w, r)
		}
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req request
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		reply(w, 400, map[string]string{"code": "request", "error": err.Error()})
		return
	}
	service, char := strings.ToLower(req.Service), strings.ToLower(req.Char)
	switch op {
	case "scan":
		if err := b.startScan(time.Duration(req.Seconds * float64(time.Second))); err != nil {
			fail(w, err)
			return
		}
		reply(w, 200, map[string]bool{"ok": true})
	case "scan/stop":
		b.stopScan()
		reply(w, 200, map[string]bool{"ok": true})
	case "connect":
		c, err := b.connect(r.Context(), req.ID)
		if err != nil {
			fail(w, err)
			return
		}
		services := c.p.Services()
		if services == nil {
			services = []string{}
		}
		reply(w, 200, map[string]any{"conn": c.id, "name": c.name, "mtu": c.p.MTU(), "services": services})
	case "read":
		var data []byte
		err := b.gatt(req.Conn, func(c *conn) (err error) { data, err = c.p.Read(service, char); return })
		if err != nil {
			fail(w, err)
			return
		}
		reply(w, 200, map[string]string{"data": base64.StdEncoding.EncodeToString(data)})
	case "write":
		writes := make([][]byte, 0, len(req.Data))
		for _, s := range req.Data {
			v, err := base64.StdEncoding.DecodeString(s)
			if err != nil {
				reply(w, 400, map[string]string{"code": "request", "error": err.Error()})
				return
			}
			writes = append(writes, v)
		}
		err := b.gatt(req.Conn, func(c *conn) error {
			for _, v := range writes {
				if err := c.p.Write(service, char, v); err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			fail(w, err)
			return
		}
		reply(w, 200, map[string]bool{"ok": true})
	case "subscribe":
		err := b.gatt(req.Conn, func(c *conn) error {
			return c.p.Subscribe(service, char, func(v []byte) { c.push(service, char, v) })
		})
		if err != nil {
			fail(w, err)
			return
		}
		reply(w, 200, map[string]bool{"ok": true})
	case "events":
		c, err := b.get(req.Conn)
		if err != nil {
			reply(w, 200, map[string]any{"events": []event{}, "connected": false})
			return
		}
		wait := time.Duration(min(max(req.Wait, 0), 25) * float64(time.Second))
		timer := time.NewTimer(wait)
		defer timer.Stop()
		for {
			list, alive, changed := c.after(req.After)
			if len(list) > 0 || !alive || wait == 0 {
				reply(w, 200, map[string]any{"events": list, "connected": alive})
				return
			}
			select {
			case <-changed:
			case <-timer.C:
				wait = 0
			case <-r.Context().Done():
				return
			}
		}
	case "close":
		b.closeConn(req.Conn)
		reply(w, 200, map[string]bool{"ok": true})
	default:
		http.NotFound(w, r)
	}
}
