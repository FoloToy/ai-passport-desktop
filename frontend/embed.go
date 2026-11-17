// Package frontend embeds the local UI into the binary.
package frontend

import "embed"

// passport-ble is the Bluetooth protocol library shared with the website; passport/
// holds the Passport editor's font character list and the TRAE built-in avatars.
//
//go:embed index.html app.css app.js community.js phone-countries.js tools.js ble.js ble-boot.js ble-bridge.js logo.svg
//go:embed passport-ble/*.js passport/charset.txt passport/trae-avatars/*.png
var Files embed.FS
