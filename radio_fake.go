//go:build blefake

package main

import (
	"github.com/FoloToy/ai-passport-desktop/internal/ble"
	"github.com/FoloToy/ai-passport-desktop/internal/ble/blefake"
)

// newRadio simulates nearby devices (development builds with -tags blefake).
func newRadio() ble.Radio { return blefake.New() }
