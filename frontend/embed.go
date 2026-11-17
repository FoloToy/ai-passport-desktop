// Package frontend embeds the local UI into the binary.
package frontend

import "embed"

//go:embed index.html app.css app.js community.js phone-countries.js tools.js logo.svg
var Files embed.FS
