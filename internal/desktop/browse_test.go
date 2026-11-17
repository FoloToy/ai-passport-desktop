package desktop

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/FoloToy/ai-passport-desktop/pkg/library"
	"github.com/FoloToy/ai-passport-desktop/pkg/settings"
	"github.com/FoloToy/ai-passport-desktop/pkg/syncer"
)

// fakeCommunity lists n plays and serves their images; it never serves firmware.
func fakeCommunity(t *testing.T, n int, images *atomic.Int32) *httptest.Server {
	t.Helper()
	var plays []map[string]any
	for i := 1; i <= n; i++ {
		slug := fmt.Sprintf("play-%d", i)
		plays = append(plays, map[string]any{
			"id": i, "slug": slug, "source": "community", "revisionId": i,
			"title": map[string]string{"zh": "玩法", "en": "Play"}, "categoryKey": "games", "author": "dev",
			"thumbnail": "/api/media/plays/" + slug + "/thumbnail.webp?v=1",
			"firmware":  map[string]any{"available": true, "size": 100, "sha256": strings.Repeat("a", 64), "url": "/api/download/community/" + slug, "format": "esp-merged-0x0"},
		})
	}
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/plays/recommendations":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "plays": plays[:4]})
		case r.URL.Path == "/api/plays":
			q := r.URL.Query()
			var limit, offset int
			fmt.Sscan(q.Get("limit"), &limit)
			fmt.Sscan(q.Get("offset"), &offset)
			end := min(offset+limit, len(plays))
			page := []map[string]any{}
			if offset < end {
				page = plays[offset:end]
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "plays": page,
				"pagination": map[string]any{"total": len(plays), "hasMore": end < len(plays)}, "allTotal": len(plays),
				"categoryCounts": map[string]int{"games": len(plays)}})
		case strings.HasPrefix(r.URL.Path, "/api/media/"):
			images.Add(1)
			_, _ = w.Write([]byte("RIFFxxxxWEBP"))
		default:
			t.Errorf("unexpected request %s", r.URL)
			http.NotFound(w, r)
		}
	}))
}

func newBrowseServer(t *testing.T, origin string) (*Server, string) {
	t.Helper()
	s, lib := newServer(t)
	s.Sync.Client = syncer.NewClient(origin, "test")
	return s, lib
}

func TestBrowseRemembersPlaysForOffline(t *testing.T) {
	var images atomic.Int32
	site := fakeCommunity(t, 30, &images)
	s, lib := newBrowseServer(t, site.URL)

	w := do(s, "GET", "/api/home", s.Token, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"featured":[{`) || !strings.Contains(w.Body.String(), `"total":30`) {
		t.Fatalf("home: %d %s", w.Code, w.Body)
	}
	w = do(s, "GET", "/api/browse?sort=downloads&offset=0", s.Token, "")
	var page syncer.Page
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &page) != nil || len(page.Plays) != syncer.BrowsePageSize || !page.HasMore {
		t.Fatalf("browse: %d %s", w.Code, w.Body)
	}
	if images.Load() != 0 {
		t.Fatal("pages must not download images")
	}

	// An image is downloaded when the UI asks for it, then served from the library.
	thumb := "/media/" + page.Plays[0].Thumb
	if w := do(s, "GET", thumb, "", ""); w.Code != 200 || images.Load() != 1 {
		t.Fatalf("thumb: %d, %d downloads", w.Code, images.Load())
	}

	// The browsed plays are written to index.json for offline use.
	if err := s.FlushIndex(); err != nil {
		t.Fatal(err)
	}
	idx, err := library.Library{Root: lib}.LoadIndex()
	if err != nil || len(idx.Plays) != syncer.BrowsePageSize || len(idx.Recommendations) != 4 {
		t.Fatalf("index: %v, %d plays, recommendations %v", err, len(idx.Plays), idx.Recommendations)
	}

	// Offline: pages fail, but the catalog, the cached image and the plays are still there.
	site.Close()
	if w := do(s, "GET", "/api/browse", s.Token, ""); w.Code != 400 || !strings.Contains(w.Body.String(), `"code":"network"`) {
		t.Fatalf("offline browse: %d %s", w.Code, w.Body)
	}
	if w := do(s, "GET", "/api/catalog", s.Token, ""); w.Code != 200 || !strings.Contains(w.Body.String(), `"slug":"play-24"`) {
		t.Fatalf("offline catalog: %d", w.Code)
	}
	if w := do(s, "GET", thumb, "", ""); w.Code != 200 {
		t.Fatalf("cached thumb offline: %d", w.Code)
	}
	if w := do(s, "GET", "/api/play?slug=play-3", s.Token, ""); w.Code != 200 || !strings.Contains(w.Body.String(), `"id":3`) {
		t.Fatalf("cached play: %d %s", w.Code, w.Body)
	}
	if w := do(s, "GET", "/api/play?slug=play-29", s.Token, ""); w.Code != 404 {
		t.Fatalf("a play never shown is unknown: %d", w.Code)
	}
}

// The UI polls /api/state (which reads the index) while pages are merged into it.
func TestBrowseWhilePolling(t *testing.T) {
	var images atomic.Int32
	site := fakeCommunity(t, 120, &images)
	defer site.Close()
	s, _ := newBrowseServer(t, site.URL)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for offset := 0; offset < 120; offset += syncer.BrowsePageSize {
			if w := do(s, "GET", fmt.Sprintf("/api/browse?offset=%d", offset), s.Token, ""); w.Code != 200 {
				t.Errorf("browse %d: %d", offset, w.Code)
			}
		}
	}()
	for polling := true; polling; {
		select {
		case <-done:
			polling = false
		default:
			do(s, "GET", "/api/state", s.Token, "")
			do(s, "GET", "/api/catalog", s.Token, "")
			do(s, "GET", "/api/play?slug=play-1", s.Token, "")
		}
	}
	if w := do(s, "GET", "/api/state", s.Token, ""); !strings.Contains(w.Body.String(), `"plays":120`) {
		t.Fatalf("all browsed plays should be counted: %s", w.Body)
	}
}

// A browsed play can be installed before index.json is written: the install
// finds it in its cached meta.json and only then asks for the firmware.
func TestInstallFindsBrowsedPlay(t *testing.T) {
	var images atomic.Int32
	site := fakeCommunity(t, 3, &images)
	defer site.Close()
	s, _ := newBrowseServer(t, site.URL)
	if w := do(s, "GET", "/api/browse", s.Token, ""); w.Code != 200 {
		t.Fatalf("browse: %d", w.Code)
	}
	w := do(s, "POST", "/api/flash/start", s.Token, `{"slug":"play-2","port":"/dev/cu.x"}`)
	if w.Code != 400 || !strings.Contains(w.Body.String(), `"code":"not_ready"`) {
		t.Fatalf("want not_ready (play found, firmware missing), got %d %s", w.Code, w.Body)
	}
}

func TestLanguageSetting(t *testing.T) {
	s, _ := newServer(t)
	if got := s.Settings.Get().Language; got != "auto" {
		t.Fatalf("default language %q, want auto (follow system)", got)
	}
	for _, l := range []string{"zh", "en", "auto"} {
		if w := do(s, "POST", "/api/settings", s.Token, `{"language":"`+l+`"}`); w.Code != 200 {
			t.Fatalf("%s: %d %s", l, w.Code, w.Body)
		}
		if w := do(s, "GET", "/api/state", s.Token, ""); !strings.Contains(w.Body.String(), `"language":"`+l+`"`) {
			t.Fatalf("state does not report %s", l)
		}
	}
	if w := do(s, "POST", "/api/settings", s.Token, `{"language":"fr"}`); w.Code == 200 {
		t.Fatal("unknown language accepted")
	}
	// The choice is stored in settings.json.
	dir := t.TempDir()
	st, _ := settings.Open(dir)
	if _, err := st.Update(func(c *settings.Settings) { c.Language = "en" }); err != nil {
		t.Fatal(err)
	}
	if again, _ := settings.Open(dir); again.Get().Language != "en" {
		t.Fatal("language not persisted")
	}
}
