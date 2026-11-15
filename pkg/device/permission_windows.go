//go:build windows

package device

// portAccess is not needed on Windows: any user may open a COM port.
func portAccess(string) error { return nil }
