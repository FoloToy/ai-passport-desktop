#!/bin/bash
# Runs inside ubuntu:22.04 (see scripts/package-linux.sh). /src is the read-only
# source tree, /out the output directory.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
rm -f /etc/apt/apt.conf.d/docker-clean   # keep downloaded .debs in the mounted cache
apt-get update -qq
apt-get install -y -qq --no-install-recommends ca-certificates curl build-essential pkg-config \
  libgtk-3-dev libwebkit2gtk-4.1-dev dpkg-dev >/dev/null

go_version=go1.26.0
if [ ! -x /opt/go-cache/go/bin/go ] || [ "$(/opt/go-cache/go/bin/go env GOVERSION)" != "$go_version" ]; then
  rm -rf /opt/go-cache/go
  tarball=$go_version.linux-$ARCH.tar.gz
  curl -fsSL "https://go.dev/dl/$tarball" -o /tmp/go.tgz || curl -fsSL "https://golang.google.cn/dl/$tarball" -o /tmp/go.tgz
  tar -C /opt/go-cache -xzf /tmp/go.tgz
fi
export PATH=/opt/go-cache/go/bin:$PATH GOTOOLCHAIN=local GOMODCACHE=/gomod GOCACHE=/tmp/gocache GOFLAGS=-buildvcs=false
cd /src

tags=production,gtk3
go vet -tags gtk3 ./...
go test -tags gtk3 ./... 2>&1 | grep -v '^?' || { echo 'go test failed' >&2; exit 1; }

work=$(mktemp -d)
CGO_ENABLED=1 go build -tags "$tags" -trimpath -ldflags "-s -w -X main.version=$VERSION" -o "$work/ai-passport-plays" .
"$work/ai-passport-plays" -self-test

name=AI-Passport-Plays-$VERSION-Linux-$ARCH

# .deb ------------------------------------------------------------------------
root=$work/deb
install -Dm755 "$work/ai-passport-plays" "$root/usr/bin/ai-passport-plays"
install -Dm644 scripts/linux/ai-passport-plays.desktop "$root/usr/share/applications/ai-passport-plays.desktop"
install -Dm644 assets/icon.png "$root/usr/share/icons/hicolor/1024x1024/apps/ai-passport-plays.png"
install -Dm644 scripts/linux/60-ai-passport.rules "$root/usr/lib/udev/rules.d/60-ai-passport.rules"
doc=$root/usr/share/doc/ai-passport-plays
install -Dm644 LICENSE "$doc/copyright"
install -Dm644 THIRD_PARTY.md "$doc/THIRD_PARTY.md"
install -Dm644 pkg/esp/stub/LICENSE-APACHE "$doc/esp-flasher-stub/LICENSE-APACHE"
install -Dm644 pkg/esp/stub/LICENSE-MIT "$doc/esp-flasher-stub/LICENSE-MIT"
echo "$COMMIT" > "$doc/source-commit.txt"
mkdir -p "$root/DEBIAN"
cat > "$root/DEBIAN/control" <<CONTROL
Package: ai-passport-plays
Version: $VERSION
Architecture: $ARCH
Maintainer: FoloToy <https://github.com/FoloToy/ai-passport-desktop>
Installed-Size: $(du -sk "$root/usr" | cut -f1)
Depends: libc6 (>= 2.35), libgtk-3-0 | libgtk-3-0t64, libwebkit2gtk-4.1-0
Recommends: bluez
Section: utils
Priority: optional
Homepage: https://ai-passport.folotoy.cn/tools/desktop-app/
Description: AI Passport App Library (desktop)
 Download every AI Passport community app, browse them offline and install
 them on an AI Passport over USB. Also backs up and restores the firmware.
 Installs a udev rule so the logged-in user can open the device's serial port.
CONTROL
cat > "$root/DEBIAN/postinst" <<'POST'
#!/bin/sh
set -e
if command -v udevadm >/dev/null 2>&1; then
  udevadm control --reload-rules 2>/dev/null || true
  udevadm trigger --subsystem-match=tty --attr-match=idVendor=303a 2>/dev/null || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then update-desktop-database -q /usr/share/applications || true; fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then gtk-update-icon-cache -q -t /usr/share/icons/hicolor || true; fi
POST
cp "$root/DEBIAN/postinst" "$root/DEBIAN/postrm"
chmod 755 "$root/DEBIAN/postinst" "$root/DEBIAN/postrm"
dpkg-deb --root-owner-group -Zxz --build "$root" "/out/$name.deb" >/dev/null

# .tar.gz (other distributions) -------------------------------------------------
tdir=$work/$name
install -Dm755 "$work/ai-passport-plays" "$tdir/ai-passport-plays"
install -Dm644 scripts/linux/ai-passport-plays.desktop "$tdir/ai-passport-plays.desktop"
install -Dm644 assets/icon.png "$tdir/ai-passport-plays.png"
install -Dm644 scripts/linux/60-ai-passport.rules "$tdir/60-ai-passport.rules"
install -Dm644 scripts/linux/README.txt "$tdir/README.txt"
install -Dm644 LICENSE "$tdir/ThirdParty/LICENSE"
install -Dm644 THIRD_PARTY.md "$tdir/ThirdParty/THIRD_PARTY.md"
install -Dm644 pkg/esp/stub/LICENSE-APACHE "$tdir/ThirdParty/esp-flasher-stub/LICENSE-APACHE"
install -Dm644 pkg/esp/stub/LICENSE-MIT "$tdir/ThirdParty/esp-flasher-stub/LICENSE-MIT"
echo "$COMMIT" > "$tdir/source-commit.txt"
tar -C "$work" --owner=0 --group=0 -czf "/out/$name.tar.gz" "$name"

cd /out
for f in "$name.deb" "$name.tar.gz"; do sha256sum "$f" > "$f.sha256"; done
chown "$HOST_UID:$HOST_GID" "$name".* 2>/dev/null || true
echo "Packaged /out/$name.deb and .tar.gz"
