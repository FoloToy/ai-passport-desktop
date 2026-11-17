package ble

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

type fakeRadio struct {
	mu      sync.Mutex
	adverts []Advert
	p       *fakePeripheral
	gone    func()
}

func (f *fakeRadio) Enable() error { return nil }

func (f *fakeRadio) Scan(ctx context.Context, found func(Advert)) error {
	for _, a := range f.adverts {
		found(a)
	}
	<-ctx.Done()
	return nil
}

func (f *fakeRadio) Connect(_ context.Context, id string, gone func()) (Peripheral, error) {
	if id != "dev1" {
		return nil, ErrUnknownDevice
	}
	f.mu.Lock()
	f.gone = gone
	f.mu.Unlock()
	return f.p, nil
}

type fakePeripheral struct {
	mu     sync.Mutex
	writes [][]byte
	notify func([]byte)
	closed bool
}

func (p *fakePeripheral) Services() []string { return []string{"0000fff0-0000-1000-8000-00805f9b34fb"} }
func (p *fakePeripheral) MTU() int           { return 185 }
func (p *fakePeripheral) Read(service, char string) ([]byte, error) {
	return []byte("AIPR"), nil
}
func (p *fakePeripheral) Write(service, char string, data []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.writes = append(p.writes, data)
	if p.notify != nil {
		go p.notify(append([]byte{0xAC}, data...))
	}
	return nil
}
func (p *fakePeripheral) Subscribe(service, char string, fn func([]byte)) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.notify = fn
	return nil
}
func (p *fakePeripheral) Close() error { p.closed = true; return nil }

func call(t *testing.T, b *Bridge, method, op string, body any, out any) int {
	t.Helper()
	var rd *bytes.Reader
	if body != nil {
		j, _ := json.Marshal(body)
		rd = bytes.NewReader(j)
	} else {
		rd = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, "/api/ble/"+op, rd)
	w := httptest.NewRecorder()
	b.ServeHTTP(w, req)
	if out != nil {
		if err := json.Unmarshal(w.Body.Bytes(), out); err != nil {
			t.Fatalf("%s: %v (%s)", op, err, w.Body.String())
		}
	}
	return w.Code
}

func TestScanConnectWriteNotify(t *testing.T) {
	radio := &fakeRadio{
		adverts: []Advert{
			{ID: "dev1", RSSI: -60, Services: []string{"0000FFF0-0000-1000-8000-00805F9B34FB"}},
			{ID: "dev1", Name: "AI-PASSPORT-OTA-A1B2C3D4E5F6"},
		},
		p: &fakePeripheral{},
	}
	b := New(radio)
	if code := call(t, b, "POST", "scan", map[string]any{"seconds": 5}, nil); code != 200 {
		t.Fatal("scan", code)
	}
	var devs struct {
		Scanning bool     `json:"scanning"`
		Devices  []Advert `json:"devices"`
	}
	deadline := time.Now().Add(2 * time.Second)
	for len(devs.Devices) == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
		call(t, b, "GET", "devices", nil, &devs)
	}
	if len(devs.Devices) != 1 || devs.Devices[0].Name != "AI-PASSPORT-OTA-A1B2C3D4E5F6" || devs.Devices[0].RSSI != -60 ||
		devs.Devices[0].Services[0] != "0000fff0-0000-1000-8000-00805f9b34fb" || !devs.Scanning {
		t.Fatalf("merged advert: %+v", devs)
	}

	var c struct {
		Conn     int      `json:"conn"`
		Name     string   `json:"name"`
		MTU      int      `json:"mtu"`
		Services []string `json:"services"`
	}
	if code := call(t, b, "POST", "connect", map[string]any{"id": "dev1"}, &c); code != 200 || c.Conn == 0 || c.MTU != 185 || c.Name == "" {
		t.Fatalf("connect %d %+v", code, c)
	}
	var rd struct{ Data string }
	call(t, b, "POST", "read", map[string]any{"conn": c.Conn, "service": "x", "char": "y"}, &rd)
	if got, _ := base64.StdEncoding.DecodeString(rd.Data); string(got) != "AIPR" {
		t.Fatalf("read %q", rd.Data)
	}
	if code := call(t, b, "POST", "subscribe", map[string]any{"conn": c.Conn, "service": "S", "char": "C"}, nil); code != 200 {
		t.Fatal("subscribe", code)
	}
	enc := base64.StdEncoding.EncodeToString
	if code := call(t, b, "POST", "write", map[string]any{"conn": c.Conn, "service": "s", "char": "c", "data": []string{enc([]byte{1}), enc([]byte{2})}}, nil); code != 200 {
		t.Fatal("write", code)
	}
	var ev struct {
		Events []struct {
			Seq     int    `json:"seq"`
			Service string `json:"service"`
			Data    []byte `json:"data"`
		} `json:"events"`
		Connected bool `json:"connected"`
	}
	after := 0
	got := [][]byte{}
	for len(got) < 2 {
		call(t, b, "POST", "events", map[string]any{"conn": c.Conn, "after": after, "wait": 2}, &ev)
		if !ev.Connected || len(ev.Events) == 0 {
			t.Fatalf("events %+v", ev)
		}
		for _, e := range ev.Events {
			after = e.Seq
			if e.Service != "s" {
				t.Fatalf("service %q", e.Service)
			}
			got = append(got, e.Data)
		}
	}
	if len(got) != 2 || got[0][0] != 0xAC {
		t.Fatalf("notifications %v", got)
	}

	// The device drops the link: waiting readers wake up and see it.
	go func() { time.Sleep(50 * time.Millisecond); radio.gone() }()
	call(t, b, "POST", "events", map[string]any{"conn": c.Conn, "after": after, "wait": 5}, &ev)
	if ev.Connected {
		t.Fatal("still connected after the link dropped")
	}
	var e struct{ Code string }
	if code := call(t, b, "POST", "write", map[string]any{"conn": c.Conn, "service": "s", "char": "c", "data": []string{enc([]byte{3})}}, &e); code != 400 || e.Code != CodeGone {
		t.Fatalf("write after drop: %d %+v", code, e)
	}
	call(t, b, "POST", "close", map[string]any{"conn": c.Conn}, nil)
	if !radio.p.closed {
		t.Fatal("peripheral not closed")
	}
}

func TestUnknownDeviceAndNoRadio(t *testing.T) {
	b := New(&fakeRadio{p: &fakePeripheral{}})
	var e struct{ Code string }
	if code := call(t, b, "POST", "connect", map[string]any{"id": "nope"}, &e); code != 400 || e.Code != CodeNotFound {
		t.Fatalf("%d %+v", code, e)
	}
	none := New(nil)
	if code := call(t, none, "POST", "scan", map[string]any{}, &e); code != 400 || e.Code != CodeUnavailable {
		t.Fatalf("%d %+v", code, e)
	}
	var st map[string]any
	call(t, none, "GET", "state", nil, &st)
	if st["supported"] != false {
		t.Fatalf("%v", st)
	}
}
