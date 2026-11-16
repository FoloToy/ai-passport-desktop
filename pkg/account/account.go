// Package account signs the user in to the AI Passport community (the same accounts as
// https://ai-passport.folotoy.cn) and forwards their requests: profile, likes, favorites
// and comments. It keeps the site's session cookies in the app's private settings folder
// and handles the site's CSRF token, so the UI only sends plain JSON requests.
//
// Only paths accepted by Allowed are forwarded; firmware downloads never go through here.
package account

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// MaxBody caps request and response bodies forwarded through the client.
const MaxBody = 8 << 20

// Client is safe for concurrent use.
type Client struct {
	Origin    string
	UserAgent string
	HTTP      *http.Client

	path string // cookie file
	base *url.URL
	jar  *cookiejar.Jar
	mu   sync.Mutex
	csrf string
}

type savedCookie struct {
	Name    string    `json:"name"`
	Value   string    `json:"value"`
	Path    string    `json:"path"`
	Expires time.Time `json:"expires"`
}

// New returns a client for origin that keeps its cookies in dir/session.json (mode 0600).
func New(origin, userAgent, dir string) (*Client, error) {
	base, err := url.Parse(strings.TrimRight(origin, "/"))
	if err != nil || base.Scheme == "" || base.Host == "" {
		return nil, fmt.Errorf("bad origin %q", origin)
	}
	jar, _ := cookiejar.New(nil)
	c := &Client{Origin: base.String(), UserAgent: userAgent, path: filepath.Join(dir, "session.json"), base: base, jar: jar}
	c.HTTP = newHTTP(jar)
	c.load()
	return c, nil
}

func newHTTP(jar http.CookieJar) *http.Client {
	return &http.Client{Jar: jar, Timeout: 60 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
}

func (c *Client) load() {
	b, err := os.ReadFile(c.path)
	if err != nil {
		return
	}
	var saved []savedCookie
	if json.Unmarshal(b, &saved) != nil {
		return
	}
	var cookies []*http.Cookie
	for _, s := range saved {
		if s.Expires.IsZero() || s.Expires.After(time.Now()) {
			cookies = append(cookies, &http.Cookie{Name: s.Name, Value: s.Value, Path: s.Path, Expires: s.Expires})
		}
	}
	c.jar.SetCookies(c.base, cookies)
}

// save writes the cookies the site set. Session cookies without an expiry are kept for
// 30 days, the site's session lifetime, so the user stays signed in across restarts.
func (c *Client) save(resp *http.Response) {
	if len(resp.Cookies()) == 0 {
		return
	}
	prev := map[string]savedCookie{}
	if b, err := os.ReadFile(c.path); err == nil {
		var saved []savedCookie
		if json.Unmarshal(b, &saved) == nil {
			for _, s := range saved {
				prev[s.Name] = s
			}
		}
	}
	for _, ck := range resp.Cookies() {
		exp := ck.Expires
		if ck.MaxAge < 0 || (!exp.IsZero() && exp.Before(time.Now())) || ck.Value == "" {
			delete(prev, ck.Name)
			continue
		}
		if ck.MaxAge > 0 {
			exp = time.Now().Add(time.Duration(ck.MaxAge) * time.Second)
		} else if exp.IsZero() {
			exp = time.Now().Add(30 * 24 * time.Hour)
		}
		path := ck.Path
		if path == "" {
			path = "/"
		}
		prev[ck.Name] = savedCookie{Name: ck.Name, Value: ck.Value, Path: path, Expires: exp}
	}
	out := make([]savedCookie, 0, len(prev))
	for _, s := range prev {
		out = append(out, s)
	}
	b, _ := json.Marshal(out)
	_ = os.MkdirAll(filepath.Dir(c.path), 0o700)
	tmp := c.path + ".tmp"
	if os.WriteFile(tmp, b, 0o600) == nil {
		_ = os.Rename(tmp, c.path)
	}
}

// SignOut forgets every cookie locally (call after the site's /api/auth/logout).
func (c *Client) SignOut() {
	c.mu.Lock()
	defer c.mu.Unlock()
	jar, _ := cookiejar.New(nil)
	c.jar = jar
	c.HTTP = newHTTP(jar)
	c.csrf = ""
	_ = os.Remove(c.path)
}

var allowed = []*regexp.Regexp{
	regexp.MustCompile(`^/api/session$`),
	regexp.MustCompile(`^/api/me$`),
	regexp.MustCompile(`^/api/me/(likes|follows|install-history|notifications)$`),
	regexp.MustCompile(`^/api/me/follows/(play|creator)/\d{1,12}$`),
	regexp.MustCompile(`^/api/me/install-history/\d{1,12}$`),
	regexp.MustCompile(`^/api/me/profile$`),
	regexp.MustCompile(`^/api/auth/(login|logout|register|phone-register|code-login)$`),
	regexp.MustCompile(`^/api/auth/(verification-code|phone-registration/verification-code|code-login/verification-code)/request$`),
	regexp.MustCompile(`^/api/auth/password-reset/(request|phone/request|phone/confirm)$`),
	regexp.MustCompile(`^/api/engagement$`),
	regexp.MustCompile(`^/api/engagement/(official|community)/[a-z0-9-]{1,80}/(heart|view)$`),
	regexp.MustCompile(`^/api/comments/access$`),
	regexp.MustCompile(`^/api/plays/[a-z0-9-]{1,80}/comments$`),
	regexp.MustCompile(`^/api/plays/[a-z0-9-]{1,80}/comments/\d{1,12}(/like)?$`),
}

// Allowed reports whether the UI may send method to path through the client.
func Allowed(method, path string) bool {
	switch method {
	case http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
	default:
		return false
	}
	for _, re := range allowed {
		if re.MatchString(path) {
			return true
		}
	}
	return false
}

// Response is the site's answer, passed back to the UI unchanged.
type Response struct {
	Status      int
	ContentType string
	Body        []byte
}

// ErrNotAllowed is returned for paths outside the allowlist.
var ErrNotAllowed = errors.New("request not allowed")

// Do sends one request. query is the raw query string; body is JSON (or nil).
// Mutations carry the site Origin and CSRF token; a stale token is refreshed once.
func (c *Client) Do(ctx context.Context, method, path, query string, body []byte) (*Response, error) {
	if !Allowed(method, path) {
		return nil, ErrNotAllowed
	}
	mutation := method != http.MethodGet
	for attempt := 0; attempt < 2; attempt++ {
		token := ""
		if mutation {
			var err error
			if token, err = c.token(ctx, attempt > 0); err != nil {
				return nil, err
			}
		}
		resp, err := c.send(ctx, method, path, query, body, token)
		if err != nil {
			return nil, err
		}
		if mutation && attempt == 0 && resp.Status == http.StatusForbidden && staleToken(resp.Body) {
			continue
		}
		if path == "/api/auth/logout" && resp.Status < 300 {
			c.SignOut()
		}
		return resp, nil
	}
	return nil, errors.New("security check failed")
}

// staleToken matches the site's CSRF / origin refusals ("安全令牌…", "…来源…").
func staleToken(b []byte) bool {
	s := string(b)
	return strings.Contains(s, "安全令牌") || strings.Contains(s, "来源") || strings.Contains(strings.ToLower(s), "csrf")
}

func (c *Client) token(ctx context.Context, force bool) (string, error) {
	c.mu.Lock()
	if c.csrf != "" && !force {
		t := c.csrf
		c.mu.Unlock()
		return t, nil
	}
	c.mu.Unlock()
	resp, err := c.send(ctx, http.MethodGet, "/api/session", "", nil, "")
	if err != nil {
		return "", err
	}
	var s struct {
		CSRF string `json:"csrfToken"`
	}
	if resp.Status != 200 || json.Unmarshal(resp.Body, &s) != nil || s.CSRF == "" {
		return "", errors.New("could not start a secure session")
	}
	c.mu.Lock()
	c.csrf = s.CSRF
	c.mu.Unlock()
	return s.CSRF, nil
}

func (c *Client) send(ctx context.Context, method, path, query string, body []byte, token string) (*Response, error) {
	u := c.Origin + path
	if query != "" {
		u += "?" + query
	}
	var rd io.Reader
	if body != nil {
		rd = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, u, rd)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Origin", c.Origin)
		req.Header.Set("X-CSRF-Token", token)
	}
	c.mu.Lock()
	hc := c.HTTP
	c.mu.Unlock()
	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	c.save(resp)
	b, err := io.ReadAll(io.LimitReader(resp.Body, MaxBody))
	if err != nil {
		return nil, err
	}
	return &Response{Status: resp.StatusCode, ContentType: resp.Header.Get("Content-Type"), Body: b}, nil
}
