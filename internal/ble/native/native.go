// Package native is the system Bluetooth radio for internal/ble, on top of
// tinygo.org/x/bluetooth: CoreBluetooth on macOS, WinRT on Windows 10 and later,
// and BlueZ over D-Bus on Linux.
//
// On macOS the library creates its CoreBluetooth managers when the package loads,
// so the app asks for Bluetooth permission at launch; the app bundle carries
// NSBluetoothAlwaysUsageDescription for that prompt (scripts/package-mac.sh).
package native

import (
	"context"
	"errors"
	"fmt"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/FoloToy/ai-passport-desktop/internal/ble"
	"tinygo.org/x/bluetooth"
)

// Radio is the default adapter.
type Radio struct {
	adapter *bluetooth.Adapter

	mu    sync.Mutex
	addrs map[string]bluetooth.Address
	gone  map[string]func()
	ready bool
}

// New returns the system radio.
func New() *Radio {
	return &Radio{adapter: bluetooth.DefaultAdapter, addrs: map[string]bluetooth.Address{}, gone: map[string]func(){}}
}

func (r *Radio) Enable() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.ready {
		return nil
	}
	if err := r.adapter.Enable(); err != nil {
		return err
	}
	r.adapter.SetConnectionStateHandler(func(d bluetooth.Device, st bluetooth.ConnectionState) {
		if st.Connected {
			return
		}
		r.mu.Lock()
		fn := r.gone[d.Address.String()]
		delete(r.gone, d.Address.String())
		r.mu.Unlock()
		if fn != nil {
			fn()
		}
	})
	r.ready = true
	return nil
}

func (r *Radio) Scan(ctx context.Context, found func(ble.Advert)) error {
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-ctx.Done():
			_ = r.adapter.StopScan()
		case <-done:
		}
	}()
	return r.adapter.Scan(func(_ *bluetooth.Adapter, res bluetooth.ScanResult) {
		if ctx.Err() != nil {
			return
		}
		id := res.Address.String()
		r.mu.Lock()
		r.addrs[id] = res.Address
		r.mu.Unlock()
		a := ble.Advert{ID: id, Name: res.LocalName(), RSSI: int(res.RSSI)}
		for _, u := range res.ServiceUUIDs() {
			a.Services = append(a.Services, strings.ToLower(u.String()))
		}
		found(a)
	})
}

func (r *Radio) Connect(ctx context.Context, id string, gone func()) (ble.Peripheral, error) {
	r.mu.Lock()
	addr, ok := r.addrs[id]
	r.mu.Unlock()
	if !ok {
		return nil, ble.ErrUnknownDevice
	}
	type result struct {
		p   *peripheral
		err error
	}
	ch := make(chan result, 1)
	go func() {
		d, err := r.adapter.Connect(addr, bluetooth.ConnectionParams{ConnectionTimeout: bluetooth.NewDuration(15 * time.Second)})
		if err != nil {
			ch <- result{err: err}
			return
		}
		r.mu.Lock()
		r.gone[id] = gone
		r.mu.Unlock()
		p, err := discover(d)
		if err != nil {
			_ = d.Disconnect()
			ch <- result{err: err}
			return
		}
		p.radio, p.id = r, id
		ch <- result{p: p}
	}()
	select {
	case res := <-ch:
		if res.err != nil {
			return nil, res.err
		}
		return res.p, nil
	case <-ctx.Done():
		// The connect call can't be interrupted; drop the link if it still comes up.
		go func() {
			if res := <-ch; res.p != nil {
				_ = res.p.Close()
			}
		}()
		return nil, errors.New("connection timed out")
	}
}

type peripheral struct {
	radio    *Radio
	id       string
	device   bluetooth.Device
	services []string
	chars    map[string]*bluetooth.DeviceCharacteristic
	mtu      int
}

func key(service, char string) string { return strings.ToLower(service) + "/" + strings.ToLower(char) }

func discover(d bluetooth.Device) (*peripheral, error) {
	svcs, err := d.DiscoverServices(nil)
	if err != nil {
		return nil, fmt.Errorf("discover services: %w", err)
	}
	p := &peripheral{device: d, chars: map[string]*bluetooth.DeviceCharacteristic{}, mtu: 23}
	for _, s := range svcs {
		su := strings.ToLower(s.UUID().String())
		chars, err := s.DiscoverCharacteristics(nil)
		if err != nil {
			continue // a service we can't read is a service we won't use
		}
		p.services = append(p.services, su)
		for i := range chars {
			c := chars[i]
			p.chars[key(su, c.UUID().String())] = &c
			if m, err := c.GetMTU(); err == nil && m > 0 {
				v := int(m)
				if runtime.GOOS == "darwin" {
					v += 3 // CoreBluetooth reports the largest write, ATT MTU − 3
				}
				p.mtu = max(p.mtu, v)
			}
		}
	}
	return p, nil
}

func (p *peripheral) Services() []string { return p.services }
func (p *peripheral) MTU() int           { return min(p.mtu, 517) }

func (p *peripheral) char(service, char string) (*bluetooth.DeviceCharacteristic, error) {
	c := p.chars[key(service, char)]
	if c == nil {
		return nil, fmt.Errorf("characteristic %s not found", char)
	}
	return c, nil
}

func (p *peripheral) Read(service, char string) ([]byte, error) {
	c, err := p.char(service, char)
	if err != nil {
		return nil, err
	}
	buf := make([]byte, 512)
	n, err := c.Read(buf)
	if err != nil {
		return nil, err
	}
	return buf[:n], nil
}

func (p *peripheral) Write(service, char string, data []byte) error {
	c, err := p.char(service, char)
	if err != nil {
		return err
	}
	_, err = c.Write(data)
	return err
}

func (p *peripheral) Subscribe(service, char string, fn func([]byte)) error {
	c, err := p.char(service, char)
	if err != nil {
		return err
	}
	return c.EnableNotifications(func(b []byte) { fn(append([]byte(nil), b...)) })
}

func (p *peripheral) Close() error {
	if p.radio != nil {
		p.radio.mu.Lock()
		delete(p.radio.gone, p.id)
		p.radio.mu.Unlock()
	}
	return p.device.Disconnect()
}
