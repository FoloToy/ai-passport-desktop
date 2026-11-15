package main

import (
	"os"
	"strings"
)

// prepareLinuxDisplay adjusts the GTK environment before Wails starts GTK.
//
// Wails v3 beta.24 (GTK 3) crashes with SIGSEGV in gtk_widget_show_all on a native
// Wayland window when Ubuntu's appmenu-gtk-module is loaded: the module calls
// gdk_wayland_window_set_dbus_properties_libgtk_only on a window that is not a
// Wayland window ("assertion 'GDK_IS_WAYLAND_WINDOW (window)' failed"). So:
//   - on a Wayland session with XWayland available, run through X11, which Wails
//     and WebKitGTK handle reliably;
//   - never load appmenu-gtk-module (the app has no use for a global menu bar).
//
// A GDK_BACKEND the user set is kept.
func prepareLinuxDisplay() {
	for k, v := range linuxDisplayEnv(os.Getenv) {
		_ = os.Setenv(k, v)
	}
}

// linuxDisplayEnv returns the variables to set, given the current environment.
func linuxDisplayEnv(getenv func(string) string) map[string]string {
	out := map[string]string{}
	wayland := getenv("XDG_SESSION_TYPE") == "wayland" || getenv("WAYLAND_DISPLAY") != ""
	if getenv("GDK_BACKEND") == "" && wayland && getenv("DISPLAY") != "" {
		out["GDK_BACKEND"] = "x11"
	}
	if mods := getenv("GTK_MODULES"); mods != "" {
		var keep []string
		for _, m := range strings.Split(mods, ":") {
			if m != "" && m != "appmenu-gtk-module" && m != "unity-gtk-module" {
				keep = append(keep, m)
			}
		}
		if joined := strings.Join(keep, ":"); joined != mods {
			out["GTK_MODULES"] = joined
		}
	}
	out["UBUNTU_MENUPROXY"] = "0"
	return out
}
