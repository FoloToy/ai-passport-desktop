package account

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// fakeSite issues a visitor cookie with /api/session, rotates the CSRF token once, and
// signs the user in on /api/auth/login.
func fakeSite(t *testing.T) *httptest.Server {
	tokens := 0
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/session":
			tokens++
			http.SetCookie(w, &http.Cookie{Name: "passport_visitor", Value: "v", Path: "/"})
			token := "new"
			if tokens == 1 {
				token = "old" // the first token is stale, so the client must retry once
			}
			_ = json.NewEncoder(w).Encode(map[string]string{"csrfToken": token})
		case "/api/auth/login":
			if r.Header.Get("X-CSRF-Token") != "new" || r.Header.Get("Origin") == "" {
				w.WriteHeader(http.StatusForbidden)
				_, _ = io.WriteString(w, `{"detail":"安全令牌无效"}`)
				return
			}
			http.SetCookie(w, &http.Cookie{Name: "passport_session", Value: "s1", Path: "/", HttpOnly: true})
			_, _ = io.WriteString(w, `{"user":{"name":"tester"}}`)
		case "/api/me":
			if c, err := r.Cookie("passport_session"); err == nil && c.Value == "s1" {
				_, _ = io.WriteString(w, `{"user":{"name":"tester"}}`)
				return
			}
			_, _ = io.WriteString(w, `{"user":null}`)
		case "/api/auth/logout":
			http.SetCookie(w, &http.Cookie{Name: "passport_session", Value: "", Path: "/", MaxAge: -1})
			_, _ = io.WriteString(w, `{"ok":true}`)
		default:
			http.NotFound(w, r)
		}
	}))
}

func TestLoginPersistsAcrossRestarts(t *testing.T) {
	srv := fakeSite(t)
	defer srv.Close()
	dir := t.TempDir()
	ctx := context.Background()
	c, err := New(srv.URL, "test", dir)
	if err != nil {
		t.Fatal(err)
	}
	r, err := c.Do(ctx, "POST", "/api/auth/login", "", []byte(`{"email":"a@b.c","password":"x"}`))
	if err != nil || r.Status != 200 {
		t.Fatalf("login: %v %+v", err, r)
	}
	st, _ := os.Stat(filepath.Join(dir, "session.json"))
	if st == nil {
		t.Fatal("session file must exist")
	}
	// Windows has no Unix permission bits; Go reports 0666 there.
	if runtime.GOOS != "windows" && st.Mode().Perm() != 0o600 {
		t.Fatalf("session file must have mode 0600, got %v", st.Mode().Perm())
	}
	// A new client (app restart) is still signed in.
	c2, _ := New(srv.URL, "test", dir)
	r, err = c2.Do(ctx, "GET", "/api/me", "", nil)
	if err != nil || string(r.Body) != `{"user":{"name":"tester"}}` {
		t.Fatalf("me after restart: %v %s", err, r.Body)
	}
	if _, err := c2.Do(ctx, "POST", "/api/auth/logout", "", []byte(`{}`)); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "session.json")); !os.IsNotExist(err) {
		t.Fatal("logout must forget the session")
	}
	r, _ = c2.Do(ctx, "GET", "/api/me", "", nil)
	if string(r.Body) != `{"user":null}` {
		t.Fatalf("still signed in: %s", r.Body)
	}
}

func TestAllowlist(t *testing.T) {
	for _, ok := range [][2]string{
		{"GET", "/api/me"}, {"PUT", "/api/engagement/community/my-play/heart"}, {"PUT", "/api/me/follows/play/42"},
		{"GET", "/api/plays/my-play/comments"}, {"POST", "/api/plays/my-play/comments"}, {"PUT", "/api/plays/my-play/comments/7/like"},
		{"POST", "/api/auth/code-login/verification-code/request"},
	} {
		if !Allowed(ok[0], ok[1]) {
			t.Errorf("%v should be allowed", ok)
		}
	}
	for _, no := range [][2]string{
		{"GET", "/api/download/community/x"}, {"GET", "/api/admin/users"}, {"GET", "/api/plays/../admin"},
		{"TRACE", "/api/me"}, {"DELETE", "/api/me/avatar"}, {"GET", "https://evil/api/me"},
	} {
		if Allowed(no[0], no[1]) {
			t.Errorf("%v must be refused", no)
		}
	}
}
