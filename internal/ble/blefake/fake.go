//go:build blefake

// Package blefake simulates nearby AI Passports for working on the Bluetooth screens
// without a device: a Passport (default firmware) and a device in install mode. Only
// in binaries built with -tags blefake (go run -tags blefake . -headless).
package blefake

import (
	"context"
	"encoding/binary"
	"strings"
	"sync"
	"time"

	"github.com/FoloToy/ai-passport-desktop/internal/ble"
)

const (
	wcService  = "54524145-4341-5244-0000-000000000000"
	wcCommand  = "54524145-4341-5244-0000-000000000010"
	wcNotify   = "54524145-4341-5244-0000-000000000011"
	wcIdentity = "54524145-4341-5244-0000-000000000012"
	recService = "0000fff0-0000-1000-8000-00805f9b34fb"
	recControl = "0000fff1-0000-1000-8000-00805f9b34fb"
	recStatus  = "0000fff3-0000-1000-8000-00805f9b34fb"
	recInfo    = "0000fff4-0000-1000-8000-00805f9b34fb"
	recWifi    = "0000fff5-0000-1000-8000-00805f9b34fb"
	recCommand = "0000fff6-0000-1000-8000-00805f9b34fb"
)

type Radio struct{}

func New() *Radio { return &Radio{} }

func (*Radio) Enable() error { return nil }

func (*Radio) Scan(ctx context.Context, found func(ble.Advert)) error {
	for {
		found(ble.Advert{ID: "fake-passport", Name: "A1B2C3D4E5F6", RSSI: -48, Services: []string{wcService}})
		found(ble.Advert{ID: "fake-installer", Name: "AI-PASSPORT-OTA-A1B2C3D4E5F7", RSSI: -55, Services: []string{recService}})
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(time.Second):
		}
	}
}

func (*Radio) Connect(_ context.Context, id string, gone func()) (ble.Peripheral, error) {
	time.Sleep(600 * time.Millisecond)
	switch id {
	case "fake-passport":
		return &passport{subs: map[string]func([]byte){}}, nil
	case "fake-installer":
		return &installer{subs: map[string]func([]byte){}, gone: gone}, nil
	}
	return nil, ble.ErrUnknownDevice
}

type passport struct {
	mu   sync.Mutex
	subs map[string]func([]byte)
	buf  []byte
}

func (p *passport) Services() []string { return []string{wcService} }
func (p *passport) MTU() int           { return 247 }
func (p *passport) Close() error       { return nil }

func (p *passport) Read(service, char string) ([]byte, error) {
	b := make([]byte, 72)
	b[0], b[1] = 1, 1
	copy(b[2:], "A1B2C3D4E5F6")
	copy(b[58:], "MOTE-C3")
	return b, nil
}

func (p *passport) Subscribe(service, char string, fn func([]byte)) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.subs[char] = fn
	return nil
}

func (p *passport) notify(b ...byte) {
	p.mu.Lock()
	fn := p.subs[wcNotify]
	p.mu.Unlock()
	if fn != nil {
		go fn(b)
	}
}

// Write reassembles [01][type][len u16][payload] frames and answers DONE when one completes.
func (p *passport) Write(service, char string, data []byte) error {
	time.Sleep(4 * time.Millisecond)
	p.buf = append(p.buf, data...)
	for len(p.buf) >= 4 {
		n := int(binary.LittleEndian.Uint16(p.buf[2:]))
		if len(p.buf) < 4+n {
			return nil
		}
		typ, payload := p.buf[1], p.buf[4:4+n]
		p.buf = p.buf[4+n:]
		switch {
		case typ == 1:
			p.notify(1, 1)
		case (typ == 2 || typ == 3) && len(payload) > 0 && payload[0] == 2:
			p.notify(typ, 1)
		case (typ == 2 || typ == 3) && len(payload) > 0 && payload[0] == 0:
			p.notify(typ, 0)
		}
	}
	return nil
}

type installer struct {
	mu     sync.Mutex
	subs   map[string]func([]byte)
	gone   func()
	state  byte
	pct    uint32
	xfer   []byte
	xtype  byte
	closed bool
}

func (d *installer) Services() []string { return []string{recService} }
func (d *installer) MTU() int           { return 185 }
func (d *installer) Close() error       { d.mu.Lock(); d.closed = true; d.mu.Unlock(); return nil }

func (d *installer) status() []byte {
	b := make([]byte, 12)
	b[0] = d.state
	binary.LittleEndian.PutUint32(b[4:], d.pct)
	binary.LittleEndian.PutUint32(b[8:], 100)
	return b
}

func (d *installer) Read(service, char string) ([]byte, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if strings.EqualFold(char, recStatus) {
		return d.status(), nil
	}
	b := make([]byte, 40)
	copy(b, "AIPR")
	b[4], b[5] = 4, 0x0B
	binary.LittleEndian.PutUint16(b[6:], 0x0102)
	binary.LittleEndian.PutUint32(b[8:], 8<<20)
	binary.LittleEndian.PutUint32(b[12:], 0x6bc000)
	binary.LittleEndian.PutUint32(b[16:], 0x6c0000)
	copy(b[24:], "a1b2c3d4e5f7")
	return b, nil
}

func (d *installer) Subscribe(service, char string, fn func([]byte)) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.subs[char] = fn
	return nil
}

func (d *installer) emit(char string, b []byte) {
	d.mu.Lock()
	fn := d.subs[char]
	d.mu.Unlock()
	if fn != nil {
		fn(b)
	}
}

func (d *installer) setState(s byte, pct uint32) {
	d.mu.Lock()
	d.state, d.pct = s, pct
	b := d.status()
	d.mu.Unlock()
	d.emit(recStatus, b)
}

func (d *installer) Write(service, char string, data []byte) error {
	time.Sleep(3 * time.Millisecond)
	if strings.EqualFold(char, recControl) {
		go func() { time.Sleep(200 * time.Millisecond); d.gone() }()
		return nil
	}
	if len(data) == 0 {
		return nil
	}
	switch data[0] {
	case 0x09: // scan Wi-Fi
		go func() {
			time.Sleep(1500 * time.Millisecond)
			for i, name := range []string{"FoloToy-Office", "FoloToy-Guest", "Home 2.4G"} {
				ap := append([]byte{3, byte(int8(-40 - 9*i)), byte(len(name))}, name...)
				if i == 1 {
					ap[0] = 0
				}
				d.emit(recWifi, ap)
			}
			d.emit(recWifi, []byte{0xff})
		}()
	case 0x0a:
		d.xtype, d.xfer = data[1], nil
	case 0x0b:
		d.xfer = append(d.xfer, data[3:]...)
	case 0x0c:
		if d.xtype == 1 {
			go func() {
				d.setState(5, 0)
				time.Sleep(1500 * time.Millisecond)
				d.setState(6, 0)
			}()
		} else {
			go func() {
				for pct := uint32(0); pct <= 100; pct += 5 {
					d.setState(7, pct)
					time.Sleep(150 * time.Millisecond)
				}
				d.setState(3, 100)
			}()
		}
	}
	return nil
}
