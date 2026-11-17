package syncer

import (
	"context"
	"encoding/json"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/FoloToy/ai-passport-desktop/pkg/library"
)

// Lazy browsing, like the website: the UI asks for one page at a time with the
// server's own search, category, collection and sort parameters. Every play that
// comes back is cached (meta.json) so it can still be shown and installed offline.
// Images are not part of a page; they are downloaded when the UI first shows them
// (FetchAsset), so only what the user actually scrolls to is ever fetched.

// BrowsePageSize is the default number of plays per page.
const BrowsePageSize = 24

// Query selects one page of the community list.
type Query struct {
	Category string // a category key, or "" for all
	Tag      string // a collection tag such as "must-play" or "entry:family"
	Search   string
	Sort     string // newest, downloads, hearts, comments or relevance
	Offset   int
	Limit    int
}

// Values encodes q as /api/plays query parameters.
func (q Query) Values() url.Values {
	v := url.Values{}
	if q.Category != "" && q.Category != "all" {
		v.Set("category", q.Category)
	}
	if q.Tag != "" {
		v.Set("tag", q.Tag)
	}
	if s := strings.TrimSpace(q.Search); s != "" {
		v.Set("q", s)
	}
	switch q.Sort {
	case "downloads", "hearts", "comments", "relevance":
		v.Set("sort", q.Sort)
	}
	return v
}

// Page is one page of plays, normalized like index.json entries.
type Page struct {
	Plays   []library.Play `json:"plays"`
	Offset  int            `json:"offset"`
	Total   int            `json:"total"`
	HasMore bool           `json:"hasMore"`
	// Counts are the server's per-category totals (plus "must-play" and friends).
	Counts map[string]int `json:"counts"`
	// AllTotal is the number of listed plays without filters.
	AllTotal int `json:"allTotal"`
}

// Home is what the library shows before the first page: featured plays, the
// categories with their counts and the collections.
type Home struct {
	Featured   []library.Play     `json:"featured"`
	Categories []library.Category `json:"categories"`
	Topics     []library.Topic    `json:"topics"`
	Total      int                `json:"total"`
}

// Browse fetches one page and caches its records in root (images are not downloaded).
func (m *Manager) Browse(ctx context.Context, root string, q Query) (*Page, error) {
	if q.Limit <= 0 || q.Limit > pageSize {
		q.Limit = BrowsePageSize
	}
	if q.Offset < 0 {
		q.Offset = 0
	}
	r, err := m.Client.pageN(ctx, q.Values(), q.Offset, q.Limit, false)
	if err != nil {
		return nil, err
	}
	page := &Page{Offset: q.Offset, Total: r.Pagination.Total, HasMore: r.Pagination.HasMore, Counts: r.CategoryCounts,
		Plays: []library.Play{}}
	if page.Counts == nil {
		page.Counts = map[string]int{}
	}
	page.AllTotal = r.AllTotal
	page.Plays = m.cachePlays(library.Library{Root: root}, r.Plays)
	return page, nil
}

// HomePage fetches the featured plays and the collections. Collection sizes come
// from one small request each, so the UI can show them without listing every play.
func (m *Manager) HomePage(ctx context.Context, root string) (*Home, error) {
	lib := library.Library{Root: root}
	var (
		first *listResponse
		recs  struct {
			OK    bool         `json:"ok"`
			Plays []remotePlay `json:"plays"`
		}
		recErr error
		wg     sync.WaitGroup
	)
	wg.Add(1)
	go func() {
		defer wg.Done()
		recErr = m.Client.getJSONOnce(ctx, "/api/plays/recommendations?limit=12", &recs)
	}()
	first, err := m.Client.pageN(ctx, url.Values{}, 0, 1, false)
	wg.Wait()
	if err != nil {
		return nil, err
	}
	home := &Home{Total: first.Pagination.Total, Featured: []library.Play{}, Topics: []library.Topic{}}
	if first.AllTotal > 0 {
		home.Total = first.AllTotal
	}
	featured := []remotePlay{}
	if recErr == nil {
		featured = recs.Plays
	}
	if len(featured) < 4 {
		// Like before: fill the rail from the must-play collection.
		if r, err := m.Client.pageN(ctx, url.Values{"tag": {"must-play"}}, 0, 12, false); err == nil {
			seen := map[int]bool{}
			for _, p := range featured {
				seen[p.ID] = true
			}
			for _, p := range r.Plays {
				if !seen[p.ID] && len(featured) < 12 {
					featured = append(featured, p)
				}
			}
		}
	}
	home.Featured = m.cachePlays(lib, featured)
	for _, c := range library.Categories {
		c.Count = first.CategoryCounts[c.Key]
		home.Categories = append(home.Categories, c)
	}
	defs := topicDefs(first)
	counts := make([]int, len(defs))
	for i, d := range defs {
		if n, ok := first.CategoryCounts[d.tag]; ok && d.tag == "must-play" {
			counts[i] = n
			continue
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			if r, err := m.Client.pageN(ctx, url.Values{"tag": {d.tag}}, 0, 1, false); err == nil {
				counts[i] = r.Pagination.Total
			}
		}()
	}
	wg.Wait()
	for i, d := range defs {
		home.Topics = append(home.Topics, library.Topic{Key: d.key, Tag: d.tag, Name: d.name, IDs: []int{}, Count: counts[i]})
	}
	return home, nil
}

// cachePlays records each play's community data in its meta.json and returns the
// normalized plays. Local state (downloaded images and firmware) is kept.
func (m *Manager) cachePlays(lib library.Library, plays []remotePlay) []library.Play {
	out := []library.Play{}
	for i := range plays {
		p := &plays[i]
		if !library.ValidSlug(p.Slug) {
			continue
		}
		var local localState
		if lib.Root != "" {
			if err := m.updateMeta(lib, p.Slug, p.raw, func(l *localState) {
				// The firmware on disk stays valid for its own revision only.
				if p.Firmware != nil && l.SHA256 != "" && strings.EqualFold(l.SHA256, p.Firmware.SHA256) {
					l.RevisionID = p.RevisionID
				}
				local = *l
			}); err != nil {
				if mf := readMeta(lib, p.Slug); mf != nil {
					local = mf.Local
				}
			}
		}
		out = append(out, normalize(p, local, lib.PlayDir(p.Slug)))
	}
	return out
}

// CachedPlay reads one play from its meta.json, for plays that were browsed but are
// not (yet) in index.json.
func CachedPlay(lib library.Library, slug string) (*library.Play, bool) {
	if lib.Root == "" || !library.ValidSlug(slug) {
		return nil, false
	}
	mf := readMeta(lib, slug)
	if mf == nil {
		return nil, false
	}
	var p remotePlay
	if json.Unmarshal(mf.Remote, &p) != nil || p.Slug != slug {
		return nil, false
	}
	play := normalize(&p, mf.Local, lib.PlayDir(slug))
	return &play, true
}

// FetchAsset makes sure the image at the library-relative path rel is on disk,
// downloading it from the community the first time it is shown (or again when the
// community has replaced it). It returns the absolute path of a usable file; with no
// network a previously downloaded copy is still returned.
func (m *Manager) FetchAsset(ctx context.Context, root, rel string) (string, error) {
	lib := library.Library{Root: root}
	dest, ok := lib.Resolve(rel)
	if !ok || root == "" {
		return "", os.ErrNotExist
	}
	rel = filepath.ToSlash(rel)
	var ref, slug, name string
	switch parts := strings.SplitN(rel, "/", 3); {
	case len(parts) == 3 && parts[0] == "plays" && library.ValidSlug(parts[1]):
		slug, name = parts[1], parts[2]
		mf := readMeta(lib, slug)
		if mf == nil {
			break
		}
		var p remotePlay
		if json.Unmarshal(mf.Remote, &p) != nil {
			break
		}
		ref = wantedAssets(&p)[name]
		if ref != "" && mf.Local.Assets[name] == ref && fileSize(dest) > 0 {
			return dest, nil
		}
	case len(parts) == 2 && parts[0] == "avatars" && library.ValidSlug(strings.ToLower(parts[1])):
		if fileSize(dest) > 0 {
			return dest, nil
		}
		ref = "/api/avatars/" + parts[1]
	}
	have := fileSize(dest) > 0
	if ref == "" {
		if have {
			return dest, nil
		}
		return "", os.ErrNotExist
	}
	if err := m.fetchShared(ctx, lib, ref, dest); err != nil {
		if have {
			return dest, nil
		}
		return "", err
	}
	if slug != "" {
		_ = m.updateMeta(lib, slug, nil, func(l *localState) { l.Assets[name] = ref })
	}
	return dest, nil
}

// assetSlots bounds parallel image downloads started by the UI.
var assetSlots = make(chan struct{}, 6)

// fetchShared downloads ref to dest once even when several requests ask for it together.
func (m *Manager) fetchShared(ctx context.Context, lib library.Library, ref, dest string) error {
	type call struct {
		done chan struct{}
		err  error
	}
	c := &call{done: make(chan struct{})}
	if v, loaded := m.assets.LoadOrStore(dest+"\x00"+ref, c); loaded {
		w := v.(*call)
		select {
		case <-w.done:
			return w.err
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	defer func() {
		m.assets.Delete(dest + "\x00" + ref)
		close(c.done)
	}()
	select {
	case assetSlots <- struct{}{}:
	case <-ctx.Done():
		c.err = ctx.Err()
		return c.err
	}
	defer func() { <-assetSlots }()
	// One attempt: the UI is waiting, and without a network it should give up at once.
	dctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 45*time.Second)
	defer cancel()
	c.err = m.downloadOnce(dctx, lib, ref, dest, 20<<20, nil, "")
	return c.err
}

func topicDefs(first *listResponse) []topicDef {
	var defs []topicDef
	for _, t := range first.DiscoveryTags {
		if t.Enabled && t.Key == "must-play" {
			defs = append(defs, topicDef{key: t.Key, tag: t.Key, name: t.Name})
		}
	}
	for _, t := range first.DiscoveryTabs {
		if t.Enabled && t.Visible && strings.HasPrefix(t.Key, "entry:") {
			defs = append(defs, topicDef{key: strings.TrimPrefix(t.Key, "entry:"), tag: t.Key, name: t.Name})
		}
	}
	return defs
}

// avatarPath maps an avatar URL to its library-relative path, or "".
func avatarPath(ref string) string {
	u, err := url.Parse(ref)
	if err != nil {
		return ""
	}
	name := path.Base(u.Path)
	if !library.ValidSlug(strings.ToLower(name)) || !strings.HasPrefix(u.Path, "/api/avatars/") {
		return ""
	}
	return "avatars/" + name
}
