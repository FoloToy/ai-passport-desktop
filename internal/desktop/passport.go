package desktop

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// The 通行证 (Passport) editor's server side: which edition a device is (looked up
// by SN, as the Android app and the mini program do), and what was last sent to
// each device, since the firmware can't be read back.

// ProductAPI answers GET /v1/toys/sn/{sn}/product.
var ProductAPI = "https://api.folotoy.cn"

var snPattern = regexp.MustCompile(`^[0-9A-Fa-f]{12}$`)

// productType normalizes the product key: "standard", "trae", "jd" or "unknown".
func productType(v string) string {
	t := strings.Join(strings.FieldsFunc(strings.ToLower(strings.TrimSpace(v)), func(r rune) bool { return r == ' ' || r == '_' || r == '\t' }), "-")
	switch {
	case t == "":
		return "unknown"
	case t == "jd-passport":
		return "jd"
	case t == "trae" || t == "traecard" || strings.HasPrefix(t, "trae-") || strings.Contains(t, "trae-card"):
		return "trae"
	default:
		return "standard"
	}
}

// productValue reads the product key from the API's answer (its shape varies).
func productValue(raw []byte) string {
	var root map[string]any
	if json.Unmarshal(raw, &root) != nil {
		return ""
	}
	var src any = root
	switch d := root["data"].(type) {
	case map[string]any:
		src = d
		if x, ok := d["device"].(map[string]any); ok {
			src = x
		} else if x, ok := d["product"].(map[string]any); ok {
			src = x
		}
	case string:
		return d
	default:
		if x, ok := root["device"].(map[string]any); ok {
			src = x
		} else if x, ok := root["product"].(map[string]any); ok {
			src = x
		}
	}
	o, _ := src.(map[string]any)
	s := func(k string) string { v, _ := o[k].(string); return v }
	for _, k := range []string{"product_key", "productKey"} {
		if v := s(k); v != "" {
			return v
		}
	}
	for _, k := range []string{"is_trae", "isTrae"} {
		if v, ok := o[k].(bool); ok {
			if v {
				return "trae"
			}
			return "standard"
		}
	}
	for _, k := range []string{"product_type", "productType", "type", "product_code", "productCode"} {
		if v := s(k); v != "" {
			return v
		}
	}
	return ""
}

// lookupProduct asks the product API; any failure means "unknown" (generic editor).
func lookupProduct(ctx context.Context, sn string) string {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, ProductAPI+"/v1/toys/sn/"+strings.ToLower(sn)+"/product", nil)
	if err != nil {
		return "unknown"
	}
	req.Header.Set("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "unknown"
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "unknown"
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if err != nil {
		return "unknown"
	}
	return productType(productValue(b))
}

// passportRecord is what was last sent to one device. Images are stored next to it.
type passportRecord struct {
	Name       *string `json:"name,omitempty"`
	Title      *string `json:"title,omitempty"`
	Intro      *string `json:"intro,omitempty"`
	SleepMin   *string `json:"sleepMin,omitempty"`
	Volume     *string `json:"volume,omitempty"`
	Score      *string `json:"score,omitempty"`
	TraeAvatar *string `json:"traeAvatar,omitempty"`
	UpdatedAt  int64   `json:"updatedAt"`
}

type passportSave struct {
	passportRecord
	SN         string `json:"sn"`
	Avatar     []byte `json:"avatar"`
	Fullscreen []byte `json:"fullscreen"`
}

type passportLoad struct {
	passportRecord
	Avatar     []byte `json:"avatar,omitempty"`
	Fullscreen []byte `json:"fullscreen,omitempty"`
}

var passportMu sync.Mutex

const passportKeep = 8

func (s *Server) passportDir() string { return filepath.Join(s.StateDir, "passport") }

func (s *Server) passportIndex() map[string]passportRecord {
	all := map[string]passportRecord{}
	if b, err := os.ReadFile(filepath.Join(s.passportDir(), "synced.json")); err == nil {
		_ = json.Unmarshal(b, &all)
	}
	return all
}

func (s *Server) loadPassport(sn string) (*passportLoad, error) {
	if !snPattern.MatchString(sn) || s.StateDir == "" {
		return nil, errors.New("invalid SN")
	}
	sn = strings.ToUpper(sn)
	passportMu.Lock()
	defer passportMu.Unlock()
	rec, ok := s.passportIndex()[sn]
	if !ok {
		return nil, nil
	}
	out := &passportLoad{passportRecord: rec}
	dir := filepath.Join(s.passportDir(), sn)
	if rec.TraeAvatar == nil || *rec.TraeAvatar == "" {
		out.Avatar, _ = os.ReadFile(filepath.Join(dir, "avatar.png"))
	}
	out.Fullscreen, _ = os.ReadFile(filepath.Join(dir, "fullscreen.jpg"))
	return out, nil
}

// savePassport merges the given fields into the device's record; absent fields are kept.
func (s *Server) savePassport(in passportSave) error {
	if !snPattern.MatchString(in.SN) || s.StateDir == "" {
		return errors.New("invalid SN")
	}
	sn := strings.ToUpper(in.SN)
	passportMu.Lock()
	defer passportMu.Unlock()
	dir := filepath.Join(s.passportDir(), sn)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	all := s.passportIndex()
	rec := all[sn]
	set := func(dst **string, v *string) {
		if v != nil {
			*dst = v
		}
	}
	set(&rec.Name, in.Name)
	set(&rec.Title, in.Title)
	set(&rec.Intro, in.Intro)
	set(&rec.SleepMin, in.SleepMin)
	set(&rec.Volume, in.Volume)
	set(&rec.Score, in.Score)
	if in.TraeAvatar != nil {
		rec.TraeAvatar = in.TraeAvatar
		_ = os.Remove(filepath.Join(dir, "avatar.png"))
	}
	if len(in.Avatar) > 0 {
		if err := os.WriteFile(filepath.Join(dir, "avatar.png"), in.Avatar, 0o600); err != nil {
			return err
		}
		empty := ""
		rec.TraeAvatar = &empty
	}
	if len(in.Fullscreen) > 0 {
		if err := os.WriteFile(filepath.Join(dir, "fullscreen.jpg"), in.Fullscreen, 0o600); err != nil {
			return err
		}
	}
	rec.UpdatedAt = time.Now().UnixMilli()
	all[sn] = rec
	// Keep the newest devices, drop the rest with their files.
	keys := make([]string, 0, len(all))
	for k := range all {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool { return all[keys[i]].UpdatedAt > all[keys[j]].UpdatedAt })
	for _, k := range keys[min(len(keys), passportKeep):] {
		delete(all, k)
		if snPattern.MatchString(k) {
			_ = os.RemoveAll(filepath.Join(s.passportDir(), k))
		}
	}
	b, err := json.Marshal(all)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(s.passportDir(), "synced.json"), b, 0o600)
}
