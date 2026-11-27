package settings

import (
	"errors"
	"os"
	"path/filepath"

	"github.com/FoloToy/ai-passport-desktop/pkg/instance"
)

// AppName is the product name on every client: window title, installer, app bundle,
// Start menu and folders. The Android app uses the same name.
const AppName = "AI Passport"

// legacyName is the folder name used up to desktop 0.8 and Windows 7 0.2.
const legacyName = "AI Passport Plays"

// DefaultLibraryDir is suggested on first launch.
func DefaultLibraryDir() string { return documents(AppName) }

func legacyLibraryDir() string { return documents(legacyName) }

func documents(name string) string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, "Documents", name)
}

// StateDir returns <UserConfigDir>/FoloToy/AI Passport, the private settings folder
// shared by the desktop app and the Windows 7 client. A folder left by an earlier
// version ("AI Passport Plays") is moved there first, unless that version is still
// running, in which case the error says so.
func StateDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "FoloToy", AppName)
	return dir, moveLegacy(filepath.Join(base, "FoloToy", legacyName), dir, true)
}

// moveLegacy renames old to dir when only old exists. With locked, it first takes
// the old folder's instance lock so a running older version keeps its files.
func moveLegacy(old, dir string, locked bool) error {
	if exists(dir) || !exists(old) {
		return nil
	}
	if locked {
		unlock, err := instance.Acquire(old)
		if err != nil {
			return err
		}
		unlock()
	}
	if err := os.Rename(old, dir); err != nil {
		return errors.New("move " + old + " to " + dir + ": " + err.Error())
	}
	return nil
}

// MigrateLibrary moves the library from the old default folder (~/Documents/AI
// Passport Plays) to the new one (~/Documents/AI Passport) when the user kept the
// default. A library the user put somewhere else stays where it is. On failure the
// old folder keeps being used.
func (s *Store) MigrateLibrary() error {
	cur := s.Get().LibraryDir
	old, dir := legacyLibraryDir(), DefaultLibraryDir()
	if cur == "" || old == "" || filepath.Clean(cur) != old || exists(dir) || !exists(old) {
		return nil
	}
	if err := moveLegacy(old, dir, false); err != nil {
		return err
	}
	_, err := s.Update(func(c *Settings) { c.LibraryDir = dir })
	return err
}

func exists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}
