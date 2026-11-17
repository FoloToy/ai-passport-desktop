package core

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/FoloToy/ai-passport-desktop/pkg/settings"
)

func TestBackupsListOnlyFullFlashCopies(t *testing.T) {
	st, err := settings.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	if _, err := st.Update(func(s *settings.Settings) { s.BackupDir = root }); err != nil {
		t.Fatal(err)
	}
	write := func(rel, data string) string {
		p := filepath.Join(root, rel)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(data), 0o644); err != nil {
			t.Fatal(err)
		}
		return p
	}
	b1 := write("20261101-100000-4c11ae326234-firmware-backup/AI-Passport-4c11ae326234-20261101-100000-full-flash.bin", "a")
	write("20261101-100000-4c11ae326234-firmware-backup/firmware-backup-report.txt", "r")
	b2 := write("20261102-100000-4c11ae326234/full-flash-before-restore.bin", "b")
	cardid := write("20261102-100000-4c11ae326234/cardid-before.bin", "c")
	write("cardid/4c11ae326234/x.bin", "d")
	c := &Core{Settings: st}
	list, err := c.ListBackups()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 || list[0].Path != b2 || list[0].Kind != "restore" || list[1].Path != b1 || list[1].MAC != "4c11ae326234" {
		t.Fatalf("list %+v", list)
	}
	if err := c.DeleteBackup(cardid); Code(err) != "not_found" {
		t.Fatalf("deleting a non-backup file: %v", err)
	}
	if err := c.DeleteBackup(b2); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(cardid); err != nil {
		t.Fatal("the identity copy must be kept")
	}
}
