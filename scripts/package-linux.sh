#!/bin/bash
# Build the Linux packages (Ubuntu 22.04 and later, Debian 12 and later) for x86_64
# (amd64) and ARM64: a .deb and a .tar.gz for each. Runs on macOS or Linux with
# Docker; every architecture is built natively inside an Ubuntu 22.04 container
# (OrbStack/Docker Desktop emulate the other one), so the binaries need only
# glibc 2.35, GTK 3 and WebKitGTK 4.1 at run time.
# Env: PLAYS_DIST (output dir), ALLOW_DIRTY=1 (skip clean-tree check),
#      LINUX_ARCHES (default "amd64 arm64"), GOPROXY (passed through).
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker is required.' >&2; exit 1; }

version=$(tr -d '[:space:]' < VERSION)
dest=${PLAYS_DIST:-dist}
mkdir -p "$dest"
dest=$(cd "$dest" && pwd)

if [ "${ALLOW_DIRTY:-0}" != 1 ] && [ -n "$(git status --porcelain)" ]; then
  echo "Commit the source tree before packaging (or set ALLOW_DIRTY=1)." >&2; exit 1
fi
commit=$(git rev-parse HEAD)

# Go, the module cache and apt downloads are kept between runs (ignored by git).
cache=$PWD/.runtime/linux
mkdir -p "$cache"

for arch in ${LINUX_ARCHES:-amd64 arm64}; do
  echo "== linux/$arch"
  mkdir -p "$cache/$arch/apt" "$cache/$arch/go" "$cache/gomod"
  docker run --rm --platform "linux/$arch" \
    -v "$PWD:/src:ro" -v "$dest:/out" \
    -v "$cache/$arch/apt:/var/cache/apt/archives" -v "$cache/$arch/go:/opt/go-cache" -v "$cache/gomod:/gomod" \
    -e VERSION="$version" -e COMMIT="$commit" -e ARCH="$arch" -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
    -e GOPROXY="${GOPROXY:-https://proxy.golang.org,direct}" \
    ubuntu:22.04 bash /src/scripts/linux/build-in-container.sh
done

# Install each .deb on a clean Ubuntu 24.04 and run the self-test: this checks the
# declared dependencies resolve and the binary links on the newer release too.
for arch in ${LINUX_ARCHES:-amd64 arm64}; do
  deb=AI-Passport-$version-Linux-$arch.deb
  echo "== install test: $deb on ubuntu:24.04/$arch"
  docker run --rm --platform "linux/$arch" -v "$dest:/out:ro" ubuntu:24.04 bash -euc "
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq >/dev/null
    apt-get install -y -qq /out/$deb >/dev/null
    test -f /usr/lib/udev/rules.d/60-ai-passport.rules
    test -f /usr/share/applications/ai-passport.desktop
    ai-passport -self-test"
done
ls -l "$dest"/AI-Passport-"$version"-Linux-*
