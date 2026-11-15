package device

import (
	"errors"
	"io/fs"
	"strings"
)

// permissionDenied reports whether opening a serial port failed because the user
// may not open it. On Linux the port belongs to the dialout group until the udev
// rule shipped with the .deb grants access to the logged-in user.
func permissionDenied(err error) bool {
	if err == nil {
		return false
	}
	return errors.Is(err, fs.ErrPermission) || strings.Contains(strings.ToLower(err.Error()), "permission denied")
}

func permissionError(port string) *CodedError {
	return coded("port_permission", "No permission to open %s. Install the .deb package (it adds a udev rule) and replug the device, or add yourself to the dialout group and log in again.", port)
}
