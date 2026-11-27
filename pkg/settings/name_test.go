package settings

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/FoloToy/ai-passport-desktop/pkg/instance"
)

func setHome(t *testing.T) string {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if runtime.GOOS == "windows" {
		t.Setenv("USERPROFILE", home)
	}
	return home
}

func TestMoveLegacyState(t *testing.T) {
	base := t.TempDir()
	old, dir := filepath.Join(base, legacyName), filepath.Join(base, AppName)
	if err := os.MkdirAll(old, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(old, "settings.json"), []byte(`{"language":"en"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := moveLegacy(old, dir, true); err != nil {
		t.Fatal(err)
	}
	if exists(old) || !exists(filepath.Join(dir, "settings.json")) {
		t.Fatal("state folder not moved")
	}
	// A second run, or a newer folder already in place, leaves things alone.
	if err := os.MkdirAll(old, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := moveLegacy(old, dir, true); err != nil || !exists(old) {
		t.Fatalf("existing new folder was replaced: %v", err)
	}
}

func TestMoveLegacyStateWhileOldRuns(t *testing.T) {
	base := t.TempDir()
	old, dir := filepath.Join(base, legacyName), filepath.Join(base, AppName)
	if err := os.MkdirAll(old, 0o700); err != nil {
		t.Fatal(err)
	}
	unlock, err := instance.Acquire(old)
	if err != nil {
		t.Fatal(err)
	}
	defer unlock()
	if err := moveLegacy(old, dir, true); err == nil || exists(dir) {
		t.Fatal("moved the folder of a running older version")
	}
}

func TestMigrateLibrary(t *testing.T) {
	home := setHome(t)
	old := filepath.Join(home, "Documents", legacyName)
	if err := os.MkdirAll(filepath.Join(old, "plays"), 0o755); err != nil {
		t.Fatal(err)
	}
	s, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Update(func(c *Settings) { c.LibraryDir = old }); err != nil {
		t.Fatal(err)
	}
	if err := s.MigrateLibrary(); err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(home, "Documents", AppName)
	if got := s.Get().LibraryDir; got != want || !exists(filepath.Join(want, "plays")) || exists(old) {
		t.Fatalf("library not moved: %q", got)
	}
}

func TestMigrateLibraryKeepsCustomFolder(t *testing.T) {
	home := setHome(t)
	custom := filepath.Join(home, "Elsewhere")
	if err := os.MkdirAll(custom, 0o755); err != nil {
		t.Fatal(err)
	}
	s, _ := Open(t.TempDir())
	_, _ = s.Update(func(c *Settings) { c.LibraryDir = custom })
	if err := s.MigrateLibrary(); err != nil || s.Get().LibraryDir != custom {
		t.Fatalf("custom library changed: %q %v", s.Get().LibraryDir, err)
	}
}
