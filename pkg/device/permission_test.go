package device

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func TestPermissionDenied(t *testing.T) {
	for _, err := range []error{fs.ErrPermission, fmt.Errorf("open: %w", fs.ErrPermission), errors.New("Permission denied")} {
		if !permissionDenied(err) {
			t.Errorf("%v not recognised", err)
		}
	}
	for _, err := range []error{nil, fs.ErrNotExist, errors.New("timeout")} {
		if permissionDenied(err) {
			t.Errorf("%v taken for a permission error", err)
		}
	}
}

// A port the user may not open fails at once instead of waiting for the timeout.
func TestAutoConnectStopsOnPortPermission(t *testing.T) {
	if runtime.GOOS == "windows" || os.Geteuid() == 0 {
		t.Skip("needs Unix file permissions and a non-root user")
	}
	port := filepath.Join(t.TempDir(), "ttyACM0")
	if err := os.WriteFile(port, nil, 0); err != nil {
		t.Fatal(err)
	}
	j, calls := autoJob(t, func() []Candidate { return []Candidate{cand(port, "ABC123")} },
		func(Candidate) bool { t.Fatal("capture attempted"); return false }, nil, 5*time.Second)
	start := time.Now()
	_, err := j.autoConnect()
	if codeOf(err) != "port_permission" || time.Since(start) > time.Second || len(*calls) != 0 {
		t.Fatalf("err %v after %v, connects %v", err, time.Since(start), *calls)
	}
}

func TestFlashReportsPortPermission(t *testing.T) {
	path, sum := writeImage(t, playImage(4096))
	err := flashImage(t.Context(), func(string, string, int, func(string)) (Device, error) {
		return nil, fmt.Errorf("open /dev/ttyACM0: %w", fs.ErrPermission)
	}, Request{Port: "/dev/ttyACM0", Image: path, SHA256: sum}, func(Event) {})
	if codeOf(err) != "port_permission" {
		t.Fatalf("got %v", err)
	}
}
