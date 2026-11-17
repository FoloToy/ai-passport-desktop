//go:build !blefake

package main

import (
	"github.com/FoloToy/ai-passport-desktop/internal/ble"
	"github.com/FoloToy/ai-passport-desktop/internal/ble/native"
)

// newRadio is the system Bluetooth adapter.
func newRadio() ble.Radio { return native.New() }
