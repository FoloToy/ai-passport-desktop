package syncer

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/FoloToy/ai-passport-desktop/pkg/library"
)

// Every request to the download endpoint carries a purpose; anything not marked as an
// install is a sync, so it is never counted as a download.
func TestDownloadPurposeHeader(t *testing.T) {
	var got []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = append(got, r.URL.Path+" "+r.Header.Get(PurposeHeader))
		_, _ = w.Write([]byte("x"))
	}))
	defer srv.Close()
	c := NewClient(srv.URL, "test")
	for _, tc := range []struct{ ref, purpose string }{
		{"/api/download/community/a", PurposeFlash},
		{"/api/download/official/b", PurposeSync},
		{"/api/download/community/c", ""},
		{"/api/download/community/d", "something-else"},
		{"/api/media/plays/a.webp", ""},
		{"/api/plays?limit=1", PurposeFlash},
	} {
		resp, err := c.open(t.Context(), tc.ref, tc.purpose)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
	}
	want := []string{
		"/api/download/community/a flash",
		"/api/download/official/b sync",
		"/api/download/community/c sync",
		"/api/download/community/d sync",
		"/api/media/plays/a.webp ",
		"/api/plays ",
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("request %d: got %q, want %q", i, got[i], want[i])
		}
	}
}

// While "download all firmware" runs, a play the user asked to install is fetched as an install.
func TestQueuedInstallIsMarkedFlash(t *testing.T) {
	m := New(NewClient("http://127.0.0.1:1", "test"))
	if got := m.purposeFor("play-1"); got != PurposeSync {
		t.Fatalf("background fetch: %q", got)
	}
	m.fetch = FetchState{Slug: "play-1", Running: true}
	if got := m.purposeFor("play-1"); got != PurposeFlash {
		t.Fatalf("queued install: %q", got)
	}
	if got := m.purposeFor("play-2"); got != PurposeSync {
		t.Fatalf("other play during an install: %q", got)
	}
}

func TestBrowseCachesPagesWithoutImages(t *testing.T) {
	site := newFakeSite(5)
	srv := httptest.NewServer(site)
	defer srv.Close()
	root := t.TempDir()
	lib := library.Library{Root: root}
	m := New(NewClient(srv.URL, "test"))

	page, err := m.Browse(t.Context(), root, Query{Category: "games", Search: " 玩法 ", Sort: "downloads", Limit: 2})
	if err != nil {
		t.Fatal(err)
	}
	site.mu.Lock()
	q := site.lists[len(site.lists)-1]
	site.mu.Unlock()
	if q.Get("category") != "games" || q.Get("q") != "玩法" || q.Get("sort") != "downloads" || q.Get("limit") != "2" || q.Get("offset") != "0" {
		t.Fatalf("query sent: %v", q)
	}
	if len(page.Plays) != 2 || page.Total != 3 || !page.HasMore {
		t.Fatalf("page: %d plays, total %d, more %v", len(page.Plays), page.Total, page.HasMore)
	}
	p := page.Plays[0]
	if p.Thumb != "plays/"+p.Slug+"/thumb.webp" || p.Cover == "" || len(p.Gallery) != 1 || p.Author.Avatar != "avatars/abc.webp" {
		t.Fatalf("image paths must be set before download: %+v", p)
	}
	if site.media.Load() != 0 || site.downloads.Load() != 0 {
		t.Fatal("browsing must not download images or firmware")
	}
	if cached, ok := CachedPlay(lib, p.Slug); !ok || cached.ID != p.ID {
		t.Fatal("browsed play must be cached in meta.json")
	}

	// Images are downloaded once, when first shown.
	dest, err := m.FetchAsset(t.Context(), root, p.Thumb)
	if err != nil || fileSize(dest) <= 0 {
		t.Fatalf("thumb: %v", err)
	}
	if _, err := m.FetchAsset(t.Context(), root, p.Thumb); err != nil || site.media.Load() != 1 {
		t.Fatalf("thumb downloaded again: %v %d", err, site.media.Load())
	}
	if _, err := m.FetchAsset(t.Context(), root, p.Author.Avatar); err != nil || site.media.Load() != 2 {
		t.Fatalf("avatar: %v", err)
	}
	if _, err := m.FetchAsset(t.Context(), root, "plays/"+p.Slug+"/firmware.bin"); err == nil {
		t.Fatal("only images may be served")
	}
	if _, err := m.FetchAsset(t.Context(), root, "plays/unknown/thumb.webp"); err == nil {
		t.Fatal("unknown play must not be fetched")
	}

	// Offline: the cached copy is still served, a missing image is not.
	srv.Close()
	if _, err := m.FetchAsset(t.Context(), root, p.Thumb); err != nil {
		t.Fatalf("cached thumb offline: %v", err)
	}
	if _, err := m.FetchAsset(t.Context(), root, p.Cover); err == nil {
		t.Fatal("an image never downloaded cannot be served offline")
	}
	if _, err := os.Stat(filepath.Join(root, "plays", p.Slug, "firmware.bin")); !os.IsNotExist(err) {
		t.Fatal("firmware must not be downloaded")
	}
}

func TestHomePage(t *testing.T) {
	site := newFakeSite(6)
	srv := httptest.NewServer(site)
	defer srv.Close()
	root := t.TempDir()
	m := New(NewClient(srv.URL, "test"))
	home, err := m.HomePage(t.Context(), root)
	if err != nil {
		t.Fatal(err)
	}
	// One recommendation is too few, so the rail is filled from must-play (the fake returns every play).
	if len(home.Featured) < 4 || home.Featured[0].ID != 2 {
		t.Fatalf("featured: %d, first %+v", len(home.Featured), home.Featured)
	}
	if home.Total != 6 || len(home.Categories) != len(library.Categories) {
		t.Fatalf("home: total %d, %d categories", home.Total, len(home.Categories))
	}
	if len(home.Topics) != 2 || home.Topics[1].Tag != "entry:family" || home.Topics[1].Count != 1 {
		t.Fatalf("topics: %+v", home.Topics)
	}
	if site.media.Load() != 0 || site.downloads.Load() != 0 {
		t.Fatal("home must not download images or firmware")
	}
	if _, ok := CachedPlay(library.Library{Root: root}, home.Featured[0].Slug); !ok {
		t.Fatal("featured plays must be cached")
	}
}

// A play browsed online whose firmware was installed once can be installed again offline.
func TestBrowsedFirmwareStaysUsableOffline(t *testing.T) {
	site := newFakeSite(1)
	srv := httptest.NewServer(site)
	root := t.TempDir()
	m := New(NewClient(srv.URL, "test"))
	if _, err := m.Browse(t.Context(), root, Query{}); err != nil {
		t.Fatal(err)
	}
	if err := m.FetchOne(root, "play-1"); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(5 * time.Second)
	for m.Fetch().Running && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	srv.Close()
	if _, _, ok := LocalFirmware(library.Library{Root: root}, "play-1"); !ok {
		t.Fatal("firmware should be ready offline")
	}
	p, ok := CachedPlay(library.Library{Root: root}, "play-1")
	if !ok || !p.Ready {
		t.Fatalf("cached play should be ready: %+v", p)
	}
}
