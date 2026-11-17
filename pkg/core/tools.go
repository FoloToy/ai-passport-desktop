package core

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/FoloToy/ai-passport-desktop/pkg/flasher"
	"github.com/FoloToy/ai-passport-desktop/pkg/syncer"
)

// Backup is a full-flash copy of a device kept in the backup folder: either made
// with "Back up device" or saved before a factory restore.
type Backup struct {
	Path    string    `json:"path"`
	Name    string    `json:"name"`
	Session string    `json:"session"`
	MAC     string    `json:"mac"`
	Size    int64     `json:"size"`
	Time    time.Time `json:"time"`
	// Kind is "backup" (Back up device) or "restore" (saved before a factory restore).
	Kind string `json:"kind"`
}

// Session folders are named <yyyyMMdd-HHmmss>-<mac12>[-firmware-backup].
var sessionName = regexp.MustCompile(`^(\d{8}-\d{6})-([0-9a-f]{12})(-firmware-backup)?$`)

// ListBackups returns the full-flash backups, newest first.
func (c *Core) ListBackups() ([]Backup, error) {
	root := c.Settings.Get().Backups()
	entries, err := os.ReadDir(root)
	if errors.Is(err, os.ErrNotExist) {
		return []Backup{}, nil
	}
	if err != nil {
		return nil, fail("backup_dir", err)
	}
	out := []Backup{}
	for _, e := range entries {
		m := sessionName.FindStringSubmatch(e.Name())
		if !e.IsDir() || m == nil {
			continue
		}
		at, _ := time.ParseInLocation("20060102-150405", m[1], time.Local)
		files, _ := os.ReadDir(filepath.Join(root, e.Name()))
		for _, f := range files {
			name := f.Name()
			kind := ""
			switch {
			case strings.HasSuffix(name, "-full-flash.bin"):
				kind = "backup"
			case name == "full-flash-before-restore.bin":
				kind = "restore"
			default:
				continue
			}
			info, err := f.Info()
			if err != nil || info.Size() == 0 {
				continue
			}
			out = append(out, Backup{Path: filepath.Join(root, e.Name(), name), Name: name, Session: e.Name(),
				MAC: m[2], Size: info.Size(), Time: at, Kind: kind})
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Time.After(out[j].Time) })
	return out, nil
}

// findBackup accepts only a path ListBackups returned, so the UI cannot point the
// writer at an arbitrary file.
func (c *Core) findBackup(path string) (Backup, error) {
	list, err := c.ListBackups()
	if err != nil {
		return Backup{}, err
	}
	for _, b := range list {
		if b.Path == filepath.Clean(path) {
			return b, nil
		}
	}
	return Backup{}, fail("not_found", errors.New("backup not found"))
}

func fileSHA256(path string) (string, int64, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", 0, err
	}
	defer f.Close()
	h := sha256.New()
	n, err := io.Copy(h, f)
	if err != nil {
		return "", 0, err
	}
	return hex.EncodeToString(h.Sum(nil)), n, nil
}

// StartRestoreBackup writes a full-flash backup back to the device it came from.
// The device must have the same MAC and flash size; the .sha256 file written next
// to the backup must still match.
func (c *Core) StartRestoreBackup(path, port string) error {
	b, err := c.findBackup(path)
	if err != nil {
		return err
	}
	if port == "" {
		return fail("port", errors.New("choose a serial port"))
	}
	sum, size, err := fileSHA256(b.Path)
	if err != nil {
		return fail("image", err)
	}
	if side, err := os.ReadFile(b.Path + ".sha256"); err == nil {
		if want := strings.ToLower(strings.Fields(string(side) + " x")[0]); want != sum {
			return fail("checksum", errors.New("the backup no longer matches its .sha256 file"))
		}
	}
	job := flasher.Job{Port: port, Image: b.Path, SHA256: sum, Size: size, Baud: 460800,
		BackupDir: c.Settings.Get().Backups(), ExpectMAC: b.MAC}
	if err := c.Flash.Start(job); err != nil {
		return fail("busy", err)
	}
	return nil
}

// DeleteBackup removes a full-flash backup and its .sha256 file. The rest of the
// session (reports, partition table and identity copies) is kept.
func (c *Core) DeleteBackup(path string) error {
	b, err := c.findBackup(path)
	if err != nil {
		return err
	}
	if err := os.Remove(b.Path); err != nil {
		return fail("backup_dir", err)
	}
	_ = os.Remove(b.Path + ".sha256")
	return nil
}

// StartFlashFile installs a firmware file the user picked (a merged image written
// at 0x0). The image is checked the same way as a play before the port is opened.
func (c *Core) StartFlashFile(path, port string) error {
	if path == "" {
		return fail("image", errors.New("choose a firmware file"))
	}
	if port == "" {
		return fail("port", errors.New("choose a serial port"))
	}
	sum, size, err := fileSHA256(path)
	if err != nil {
		return fail("image", err)
	}
	job := flasher.Job{Port: port, Image: path, SHA256: sum, Size: size, Baud: 460800, BackupDir: c.Settings.Get().Backups()}
	if err := c.Flash.Start(job); err != nil {
		return fail("busy", err)
	}
	return nil
}

// InstallerSlug is the community play "Play Installer" (小程序玩法安装器): once it
// is installed with a USB cable, plays can be installed over Bluetooth and Wi-Fi.
const InstallerSlug = "community-bc6850b5"

// StartBatch downloads the firmware of the given plays (the first screen of the
// library, for a show booth). It is a hidden feature; at most syncer.MaxBatch
// plays are taken.
func (c *Core) StartBatch(slugs []string) error {
	dir := c.Settings.Get().LibraryDir
	if dir == "" {
		return fail("target", errors.New("no library folder"))
	}
	if err := c.Sync.StartBatch(dir, slugs); err != nil {
		return fail(syncer.CodeBusy, err)
	}
	return nil
}
