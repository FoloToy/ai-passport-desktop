package syncer

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/FoloToy/ai-passport-desktop/pkg/library"
)

// MaxBatch caps one batch download: it is meant for the first screen of plays
// (a show booth), not the whole library, because the firmware server limits
// downloads per IP.
const MaxBatch = 40

// BatchState reports a batch firmware download.
type BatchState struct {
	Running        bool      `json:"running"`
	Total          int       `json:"total"`
	Done           int       `json:"done"`
	Skipped        int       `json:"skipped"`
	Failed         int       `json:"failed"`
	Current        string    `json:"current,omitempty"`
	ErrorCode      string    `json:"errorCode,omitempty"`
	ThrottledUntil time.Time `json:"throttledUntil"`
	EndedAt        time.Time `json:"endedAt"`
}

func (m *Manager) Batch() BatchState {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.batch
}

// StartBatch downloads the firmware of the given plays one after another, in
// order, skipping those already downloaded. At most MaxBatch plays are taken.
func (m *Manager) StartBatch(root string, slugs []string) error {
	lib := library.Library{Root: root}
	if root == "" {
		return errors.New("no library")
	}
	var plays []*remotePlay
	skipped := 0
	seen := map[string]bool{}
	for _, slug := range slugs {
		if len(plays)+skipped >= MaxBatch {
			break
		}
		if !library.ValidSlug(slug) || seen[slug] {
			continue
		}
		seen[slug] = true
		mf := readMeta(lib, slug)
		if mf == nil {
			continue
		}
		var p remotePlay
		if json.Unmarshal(mf.Remote, &p) != nil || !hasFirmware(&p) {
			continue
		}
		p.raw = mf.Remote
		if firmwareCurrent(lib, &p, mf) {
			skipped++
			continue
		}
		plays = append(plays, &p)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.state.Running || m.fetch.Running || m.batch.Running {
		return errors.New(CodeBusy)
	}
	ctx, cancel := context.WithCancel(context.Background())
	m.batchCancel = cancel
	m.batch = BatchState{Running: len(plays) > 0, Total: len(plays) + skipped, Done: skipped, Skipped: skipped}
	if len(plays) == 0 {
		m.batch.EndedAt = time.Now()
		cancel()
		return nil
	}
	go m.runBatch(ctx, lib, plays)
	return nil
}

// CancelBatch stops a batch download after the current file.
func (m *Manager) CancelBatch() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.batchCancel != nil {
		m.batchCancel()
	}
}

func (m *Manager) runBatch(ctx context.Context, lib library.Library, plays []*remotePlay) {
	defer func() {
		m.mu.Lock()
		m.batch.Running, m.batch.Current, m.batch.EndedAt = false, "", time.Now()
		m.batchCancel = nil
		m.mu.Unlock()
	}()
	for _, p := range plays {
		m.mu.Lock()
		m.batch.Current = p.Slug
		m.mu.Unlock()
		for {
			if until := m.throttle.Until(); time.Until(until) > 0 {
				m.mu.Lock()
				m.batch.ThrottledUntil = until
				m.mu.Unlock()
			}
			if m.throttle.wait(ctx) != nil {
				return
			}
			fctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
			err := m.fetchFirmware(fctx, lib, p)
			cancel()
			if ctx.Err() != nil {
				return
			}
			if ra, limited := IsRateLimited(err); limited {
				m.throttle.hit(ra)
				continue // wait out the limit, then retry the same play
			}
			m.mu.Lock()
			m.batch.ThrottledUntil = time.Time{}
			if err != nil {
				m.batch.Failed++
				m.batch.ErrorCode = CodeNetwork
			} else {
				m.throttle.ok()
				m.batch.Done++
			}
			m.mu.Unlock()
			if err == nil {
				m.markReady(p.Slug)
			}
			break
		}
	}
}
