package main

import (
	"reflect"
	"testing"
)

func TestLinuxDisplayEnv(t *testing.T) {
	cases := []struct {
		name string
		env  map[string]string
		want map[string]string
	}{
		{"wayland with xwayland runs through x11",
			map[string]string{"XDG_SESSION_TYPE": "wayland", "WAYLAND_DISPLAY": "wayland-0", "DISPLAY": ":0", "GTK_MODULES": "gail:atk-bridge:appmenu-gtk-module"},
			map[string]string{"GDK_BACKEND": "x11", "GTK_MODULES": "gail:atk-bridge", "UBUNTU_MENUPROXY": "0"}},
		{"wayland without xwayland stays on wayland but drops the menu module",
			map[string]string{"XDG_SESSION_TYPE": "wayland", "GTK_MODULES": "appmenu-gtk-module"},
			map[string]string{"GTK_MODULES": "", "UBUNTU_MENUPROXY": "0"}},
		{"the user's backend is kept",
			map[string]string{"XDG_SESSION_TYPE": "wayland", "DISPLAY": ":0", "GDK_BACKEND": "wayland"},
			map[string]string{"UBUNTU_MENUPROXY": "0"}},
		{"x11 session is left alone",
			map[string]string{"XDG_SESSION_TYPE": "x11", "DISPLAY": ":0", "GTK_MODULES": "gail"},
			map[string]string{"UBUNTU_MENUPROXY": "0"}},
	}
	for _, c := range cases {
		got := linuxDisplayEnv(func(k string) string { return c.env[k] })
		if !reflect.DeepEqual(got, c.want) {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}
