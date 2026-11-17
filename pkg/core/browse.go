package core

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/FoloToy/ai-passport-desktop/pkg/library"
	"github.com/FoloToy/ai-passport-desktop/pkg/syncer"
)

// Browsing loads the library the way the website does: the featured plays first,
// then one page at a time from the community, with the community's own search,
// category, collection and sort. Every play shown is remembered in index.json, so
// the plays (and the images and firmware already downloaded) stay available offline.

// indexSaveDelay batches index.json writes while the user scrolls.
var indexSaveDelay = 1500 * time.Millisecond

func (c *Core) browseRoot() (string, error) {
	if c.Sync.Running() && c.Sync.Snapshot().Kind == "move" {
		return "", fail("busy", errors.New("library is being moved"))
	}
	root := c.Settings.Get().LibraryDir
	if root == "" {
		return "", fail("no_library", errors.New("choose a library folder first"))
	}
	return root, nil
}

// Home returns the featured plays, the categories with their counts and the collections.
func (c *Core) Home(ctx context.Context) (*syncer.Home, error) {
	root, err := c.browseRoot()
	if err != nil {
		return nil, err
	}
	home, err := c.Sync.HomePage(ctx, root)
	if err != nil {
		return nil, fail("network", err)
	}
	c.remember(root, home.Featured, func(idx *library.Index) {
		ids := make([]int, 0, len(home.Featured))
		for _, p := range home.Featured {
			ids = append(ids, p.ID)
		}
		idx.Recommendations = ids
		old := map[string][]int{}
		for _, t := range idx.Topics {
			old[t.Key] = t.IDs
		}
		topics := make([]library.Topic, 0, len(home.Topics))
		for _, t := range home.Topics {
			if ids := old[t.Key]; ids != nil {
				t.IDs = ids
			}
			topics = append(topics, t)
		}
		idx.Topics = topics
	})
	return home, nil
}

// Browse returns one page of plays from the community.
func (c *Core) Browse(ctx context.Context, q syncer.Query) (*syncer.Page, error) {
	root, err := c.browseRoot()
	if err != nil {
		return nil, err
	}
	page, err := c.Sync.Browse(ctx, root, q)
	if err != nil {
		return nil, fail("network", err)
	}
	c.remember(root, page.Plays, func(idx *library.Index) {
		if q.Tag == "" {
			return
		}
		for i := range idx.Topics {
			if idx.Topics[i].Tag != q.Tag {
				continue
			}
			have := map[int]bool{}
			for _, id := range idx.Topics[i].IDs {
				have[id] = true
			}
			for _, p := range page.Plays {
				if !have[p.ID] {
					idx.Topics[i].IDs = append(idx.Topics[i].IDs, p.ID)
				}
			}
		}
	})
	return page, nil
}

// remember merges plays into the cached index and schedules an index.json write.
// While a full download runs it does nothing: that download rewrites the index.
func (c *Core) remember(root string, plays []library.Play, change func(*library.Index)) {
	if c.Sync.Running() {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.index == nil || c.indexDir != root {
		idx, err := library.Library{Root: root}.LoadIndex()
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				return // keep an index we cannot read untouched
			}
			idx = &library.Index{Version: library.IndexVersion, Origin: c.Sync.Client.Origin,
				Topics: []library.Topic{}, Recommendations: []int{}, Plays: []library.Play{}}
		}
		c.index, c.catalog, c.indexDir = idx, nil, root
	}
	// Copy on write: Index() hands out c.index to readers that do not hold c.mu.
	next := *c.index
	next.Plays = append(make([]library.Play, 0, len(c.index.Plays)+len(plays)), c.index.Plays...)
	next.Topics = append([]library.Topic{}, c.index.Topics...)
	for i := range next.Topics {
		next.Topics[i].IDs = append([]int{}, next.Topics[i].IDs...)
	}
	idx := &next
	pos := make(map[string]int, len(idx.Plays))
	for i, p := range idx.Plays {
		pos[p.Slug] = i
	}
	for _, p := range plays {
		if i, ok := pos[p.Slug]; ok {
			idx.Plays[i] = p
		} else {
			pos[p.Slug] = len(idx.Plays)
			idx.Plays = append(idx.Plays, p)
		}
	}
	if change != nil {
		change(idx)
	}
	counts := map[string]int{}
	for _, p := range idx.Plays {
		if !p.Removed {
			counts[p.Category]++
		}
	}
	idx.Categories = make([]library.Category, 0, len(library.Categories))
	for _, cat := range library.Categories {
		cat.Count = counts[cat.Key]
		idx.Categories = append(idx.Categories, cat)
	}
	c.index = idx
	c.catalog = nil
	c.dirty = true
	if c.saveTimer == nil {
		c.saveTimer = time.AfterFunc(indexSaveDelay, func() { _ = c.FlushIndex() })
	}
}

// FlushIndex writes plays remembered from browsing to index.json now. The app calls
// it on exit; otherwise it runs shortly after browsing.
func (c *Core) FlushIndex() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.saveTimer != nil {
		c.saveTimer.Stop()
		c.saveTimer = nil
	}
	if !c.dirty || c.index == nil || c.indexDir == "" || c.Sync.Running() {
		return nil
	}
	if err := (library.Library{Root: c.indexDir}).SaveIndex(c.index); err != nil {
		return err
	}
	c.dirty = false
	return nil
}

// CachedPlay returns a play from the index or from its cached meta.json.
func (c *Core) CachedPlay(slug string) (*library.Play, error) {
	p, err := c.Play(slug)
	if err != nil {
		return nil, fail("not_found", err)
	}
	return p, nil
}

// MediaFile returns the path of a library image, downloading it first if needed.
func (c *Core) MediaFile(ctx context.Context, rel string) (string, error) {
	root := c.Settings.Get().LibraryDir
	if root == "" {
		return "", os.ErrNotExist
	}
	if c.Sync.Running() && c.Sync.Snapshot().Kind == "move" {
		p, ok := library.Library{Root: root}.Resolve(rel)
		if !ok {
			return "", os.ErrNotExist
		}
		return p, nil
	}
	return c.Sync.FetchAsset(ctx, root, rel)
}
