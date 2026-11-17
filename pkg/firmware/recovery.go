package firmware

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
)

// Wireless install: the Play Installer (the "mini-app installer" Recovery firmware)
// downloads a play over Wi-Fi and lays it out below its own data area. Before asking
// it to, the app runs the installer's checks here, as the Android app and the mini
// program do (RecoveryImage.inspect, utils/wifiRecovery.js). The device repeats them
// in recovery/main/install_layout.c.

const (
	// RecoveryAppOffset is where the installer writes the play's app.
	RecoveryAppOffset = 0x10000
	// RecoveryAppLimit is the largest app the installer accepts (6 MiB).
	RecoveryAppLimit = 0x600000
	// RecoveryDataEnd is where the installer's own data begins.
	RecoveryDataEnd = 0x6B8000

	tableOffset = 0x8000
	tableSize   = 0xC00
)

// FitKind says why an image can't go through the Play Installer.
type FitKind string

const (
	FitAppTooBig FitKind = "app_too_big" // the app is over 6 MiB
	FitNoSpace   FitKind = "no_space"    // partitions don't fit below the installer's data
	FitImage     FitKind = "image"       // anything else about the image
	FitChecksum  FitKind = "checksum"
)

// FitError explains why an image can't be installed wirelessly.
type FitError struct {
	Kind   FitKind
	Detail string
}

func (e *FitError) Error() string { return e.Detail }

func fit(kind FitKind, format string, a ...any) error {
	return &FitError{Kind: kind, Detail: fmt.Sprintf(format, a...)}
}

// Inspection is what the installer needs to fetch and write the image.
type Inspection struct {
	AppOffset int    `json:"appOffset"`
	AppSize   int    `json:"appSize"`
	Merged    bool   `json:"merged"`
	SHA256    string `json:"sha256"`
}

type partition struct {
	typ, subtype int
	offset, size int
	label        string
	flags        uint32
	index        int
	labelHasNul  bool
}

// InspectRecovery checks an image for the Play Installer. expectSHA256 may be empty.
func InspectRecovery(b []byte, expectSHA256 string) (Inspection, error) {
	if len(b) == 0 {
		return Inspection{}, fit(FitImage, "the firmware file is empty")
	}
	var table []partition
	if len(b) > RecoveryAppOffset {
		table = parseTable(b)
	}
	merged := false
	for _, p := range table {
		if p.typ == 0 && p.offset == RecoveryAppOffset && u8(b, RecoveryAppOffset) == 0xE9 {
			merged = true
		}
	}
	appOffset := 0
	if merged {
		appOffset = RecoveryAppOffset
	}
	if u8(b, appOffset) != 0xE9 {
		return Inspection{}, fit(FitImage, "no ESP32 app image found in the firmware")
	}
	if !merged && table != nil {
		return Inspection{}, fit(FitImage, "the merged firmware's app isn't at 0x10000")
	}
	if u8(b, appOffset+12) != 5 || u8(b, appOffset+13) != 0 {
		return Inspection{}, fit(FitImage, "the firmware isn't an ESP32-C3 app image")
	}
	appSize, err := imageLength(b, appOffset)
	if err != nil {
		return Inspection{}, err
	}
	if appSize > RecoveryAppLimit {
		return Inspection{}, fit(FitAppTooBig, "the play app is over the 6 MiB limit")
	}
	limit := RecoveryAppLimit
	if merged {
		limit = MaxSize
	}
	if len(b) > limit {
		return Inspection{}, fit(FitNoSpace, "the firmware file is larger than the device's storage")
	}
	if merged {
		planned, err := planLayout(b, table)
		if err != nil {
			return Inspection{}, err
		}
		if appSize > planned {
			return Inspection{}, fit(FitNoSpace, "the firmware app is larger than the partition it installs to")
		}
	} else {
		for _, c := range b[appSize:] {
			if c != 0xFF && c != 0 {
				return Inspection{}, fit(FitImage, "please use a full firmware that includes a resource partition table")
			}
		}
	}
	sum := sha256.Sum256(b)
	sha := hex.EncodeToString(sum[:])
	if expectSHA256 != "" && !strings.EqualFold(sha, expectSHA256) {
		return Inspection{}, fit(FitChecksum, "firmware SHA-256 check failed")
	}
	return Inspection{AppOffset: appOffset, AppSize: appSize, Merged: merged, SHA256: sha}, nil
}

func u8(b []byte, at int) int {
	if at < 0 || at >= len(b) {
		return -1
	}
	return int(b[at])
}

func u32(b []byte, at int) int { return int(binary.LittleEndian.Uint32(b[at : at+4])) }

// parseTable reads the partition table at 0x8000; nil when there is none or it is malformed.
func parseTable(b []byte) []partition {
	if len(b) < tableOffset+32 || u8(b, tableOffset) != 0xAA || u8(b, tableOffset+1) != 0x50 {
		return nil
	}
	var out []partition
	for cursor, index := tableOffset, 0; cursor < tableOffset+tableSize; cursor, index = cursor+32, index+1 {
		if cursor+32 > len(b) {
			return nil
		}
		m0, m1 := u8(b, cursor), u8(b, cursor+1)
		if (m0 == 0xFF && m1 == 0xFF) || (m0 == 0xEB && m1 == 0xEB) {
			break
		}
		if m0 != 0xAA || m1 != 0x50 {
			return nil
		}
		raw := b[cursor+12 : cursor+28]
		label := raw
		if i := bytes.IndexAny(raw, "\x00\xff"); i >= 0 {
			label = raw[:i]
		}
		p := partition{typ: u8(b, cursor+2), subtype: u8(b, cursor+3), offset: u32(b, cursor+4), size: u32(b, cursor+8),
			label: string(label), flags: binary.LittleEndian.Uint32(b[cursor+28:]), index: index, labelHasNul: bytes.IndexByte(raw, 0) >= 0}
		if p.size == 0 || p.offset < 0x9000 || p.offset+p.size > 0x1000000 {
			return nil
		}
		out = append(out, p)
	}
	if len(out) == 0 {
		return nil
	}
	hasApp := false
	for _, p := range out {
		hasApp = hasApp || p.typ == 0
	}
	if !hasApp {
		return nil
	}
	ordered := append([]partition(nil), out...)
	sort.Slice(ordered, func(i, j int) bool { return ordered[i].offset < ordered[j].offset })
	for k := 1; k < len(ordered); k++ {
		if ordered[k].offset < ordered[k-1].offset+ordered[k-1].size {
			return nil
		}
	}
	return out
}

// planLayout returns the size reserved for the main app, or why the layout can't be installed.
func planLayout(b []byte, table []partition) (int, error) {
	bad := func() error { return fit(FitImage, "the firmware's partition format isn't supported") }
	if len(table) > 30 {
		return 0, fit(FitImage, "the firmware partition table is invalid")
	}
	marker := tableOffset + len(table)*32
	if marker+32 > len(b) {
		return 0, fit(FitImage, "firmware partition table check failed")
	}
	digest := md5.Sum(b[tableOffset:marker])
	if u8(b, marker) != 0xEB || u8(b, marker+1) != 0xEB || !bytes.Equal(digest[:], b[marker+16:marker+32]) {
		return 0, fit(FitImage, "firmware partition table check failed")
	}
	type plan struct {
		p      partition
		target int
	}
	labels := map[string]bool{}
	main, nvs := false, false
	var parts []*plan
	for _, e := range table {
		if e.label == "" || labels[e.label] || !e.labelHasNul || e.flags != 0 || e.typ > 1 || e.offset+e.size > 0x800000 ||
			e.offset%0x1000 != 0 || e.size%0x1000 != 0 || (e.typ == 0 && e.offset%0x10000 != 0) {
			return 0, bad()
		}
		labels[e.label] = true
		switch e.label {
		case "recovery":
			if e.typ != 0 || e.subtype != 0x20 {
				return 0, fit(FitImage, "the firmware's Recovery partition is invalid")
			}
			continue
		case "netcfg":
			if e.typ != 1 || e.subtype != 2 {
				return 0, fit(FitImage, "the firmware's Wi-Fi partition is invalid")
			}
			continue
		}
		p := e
		if p.typ == 0 && p.offset == RecoveryAppOffset && (p.subtype == 0 || p.subtype == 0x10) {
			main = true
			p.subtype = 0
			p.size = min(p.size, RecoveryAppLimit)
		} else if p.typ == 0 && (p.subtype < 0x10 || p.subtype > 0x1F) {
			return 0, fit(FitImage, "the firmware's boot partition isn't supported")
		}
		if p.typ == 1 && p.subtype == 2 && p.label == "nvs" {
			nvs = true
		}
		target := p.offset
		if target+p.size > RecoveryDataEnd {
			if p.typ == 0 {
				return 0, fit(FitNoSpace, "the firmware's OTA partition conflicts with the device's update system")
			}
			target = 0
		}
		parts = append(parts, &plan{p, target})
	}
	if !main || !nvs || len(parts)+2 >= 30 {
		return 0, fit(FitImage, "the firmware is missing the standard app or NVS partition")
	}
	overlaps := func(a, n, b, m int) bool { return a < b+m && b < a+n }
	for _, pl := range parts {
		if pl.target != 0 {
			continue
		}
		target := RecoveryAppOffset
		for {
			next := target
			for _, q := range parts {
				if q.target != 0 && overlaps(target, pl.p.size, q.target, q.p.size) {
					next = max(next, q.target+q.p.size)
				}
			}
			if next == target {
				break
			}
			target = next
		}
		if target+pl.p.size > RecoveryDataEnd {
			return 0, fit(FitNoSpace, "not enough space to install resource partition %s", pl.p.label)
		}
		pl.target = target
	}
	for _, pl := range parts {
		if pl.p.typ == 0 && pl.target == RecoveryAppOffset {
			return pl.p.size, nil
		}
	}
	return 0, fit(FitImage, "the firmware is missing the standard app partition")
}

// imageLength is the length of the ESP app image at start, with its checksum block and optional SHA-256.
func imageLength(raw []byte, start int) (int, error) {
	if start < 0 || start+33 > len(raw) || raw[start] != 0xE9 {
		return 0, fit(FitImage, "no ESP32 app image found in the firmware")
	}
	count := int(raw[start+1])
	if count < 1 || count > 16 {
		return 0, fit(FitImage, "the firmware app image's segment count is invalid")
	}
	cursor := start + 24
	checksum := byte(0xEF)
	for range count {
		if cursor+8 > len(raw) {
			return 0, fit(FitImage, "the firmware app image is incomplete")
		}
		size := int(binary.LittleEndian.Uint32(raw[cursor+4:]))
		begin := cursor + 8
		end := begin + size
		if size == 0 || end > len(raw) || end < begin {
			return 0, fit(FitImage, "the firmware app image's data is incomplete")
		}
		for _, c := range raw[begin:end] {
			checksum ^= c
		}
		cursor = end
	}
	checksumEnd := ((cursor-start)/16 + 1) * 16
	if start+checksumEnd > len(raw) || raw[start+checksumEnd-1] != checksum {
		return 0, fit(FitImage, "firmware app image check failed")
	}
	if raw[start+23] == 1 {
		if start+checksumEnd+32 > len(raw) {
			return 0, fit(FitImage, "firmware app SHA-256 check failed")
		}
		sum := sha256.Sum256(raw[start : start+checksumEnd])
		if !bytes.Equal(sum[:], raw[start+checksumEnd:start+checksumEnd+32]) {
			return 0, fit(FitImage, "firmware app SHA-256 check failed")
		}
		return checksumEnd + 32, nil
	}
	return checksumEnd, nil
}
