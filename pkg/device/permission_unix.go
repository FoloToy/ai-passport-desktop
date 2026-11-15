//go:build !windows

package device

import "syscall"

// portAccess fails with EACCES when the current user may not read and write path.
func portAccess(path string) error {
	return syscall.Access(path, 0x4|0x2) // R_OK | W_OK
}
