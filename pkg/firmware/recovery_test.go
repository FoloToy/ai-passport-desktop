package firmware

import (
	"crypto/md5"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"testing"
)

// appImage is a one-segment ESP32-C3 app image with a valid checksum and appended SHA-256.
func appImage(dataLen int) []byte {
	b := make([]byte, 24+8+dataLen)
	b[0], b[1] = 0xE9, 1
	b[12] = 5
	b[23] = 1
	binary.LittleEndian.PutUint32(b[24+4:], uint32(dataLen))
	sum := byte(0xEF)
	for i := 0; i < dataLen; i++ {
		b[32+i] = byte(i * 7)
		sum ^= b[32+i]
	}
	end := (len(b)/16 + 1) * 16
	out := make([]byte, end, end+32)
	copy(out, b)
	out[end-1] = sum
	h := sha256.Sum256(out)
	return append(out, h[:]...)
}

type part struct {
	typ, sub     byte
	offset, size uint32
	label        string
}

func merged(parts []part, app []byte) []byte {
	b := make([]byte, 0x10000+len(app))
	for i := range b[:0x10000] {
		b[i] = 0xFF
	}
	at := 0x8000
	for _, p := range parts {
		e := b[at : at+32]
		for i := range e {
			e[i] = 0
		}
		e[0], e[1], e[2], e[3] = 0xAA, 0x50, p.typ, p.sub
		binary.LittleEndian.PutUint32(e[4:], p.offset)
		binary.LittleEndian.PutUint32(e[8:], p.size)
		copy(e[12:28], p.label)
		at += 32
	}
	sum := md5.Sum(b[0x8000:at])
	b[at], b[at+1] = 0xEB, 0xEB
	copy(b[at+16:at+32], sum[:])
	copy(b[0x10000:], app)
	return b
}

var standard = []part{
	{1, 2, 0x9000, 0x6000, "nvs"},
	{1, 1, 0xF000, 0x1000, "phy_init"},
	{0, 0, 0x10000, 0x200000, "factory"},
	{1, 0x82, 0x210000, 0x100000, "storage"},
}

func TestInspectRecoveryMerged(t *testing.T) {
	img := merged(standard, appImage(1000))
	got, err := InspectRecovery(img, "")
	if err != nil {
		t.Fatal(err)
	}
	if !got.Merged || got.AppOffset != 0x10000 || got.AppSize != 1040+32 {
		t.Fatalf("%+v", got)
	}
	sum := sha256.Sum256(img)
	if got.SHA256 != hex.EncodeToString(sum[:]) {
		t.Fatal("sha")
	}
	if _, err := InspectRecovery(img, "00"); !isKind(err, FitChecksum) {
		t.Fatalf("checksum: %v", err)
	}
}

func TestInspectRecoveryPlainApp(t *testing.T) {
	got, err := InspectRecovery(appImage(100), "")
	if err != nil || got.Merged || got.AppOffset != 0 {
		t.Fatalf("%+v %v", got, err)
	}
}

func TestInspectRecoveryRejects(t *testing.T) {
	big := append(append([]part{}, standard[:2]...), part{0, 0, 0x10000, 0x200000, "factory"}, part{0, 0x10, 0x600000, 0x100000, "ota_0"})
	if _, err := InspectRecovery(merged(big, appImage(100)), ""); !isKind(err, FitNoSpace) {
		t.Fatalf("ota past data end: %v", err)
	}
	noNVS := []part{standard[1], standard[2]}
	if _, err := InspectRecovery(merged(noNVS, appImage(100)), ""); !isKind(err, FitImage) {
		t.Fatalf("no nvs: %v", err)
	}
	wrongChip := appImage(100)
	wrongChip[12] = 9
	if _, err := InspectRecovery(wrongChip, ""); !isKind(err, FitImage) {
		t.Fatalf("chip: %v", err)
	}
	broken := appImage(100)
	broken[40] ^= 1
	if _, err := InspectRecovery(broken, ""); !isKind(err, FitImage) {
		t.Fatalf("checksum byte: %v", err)
	}
	if _, err := InspectRecovery(nil, ""); !isKind(err, FitImage) {
		t.Fatalf("empty: %v", err)
	}
}

func isKind(err error, k FitKind) bool {
	var fe *FitError
	return errors.As(err, &fe) && fe.Kind == k
}
