#!/usr/bin/env python3
"""Upload one release of the desktop app or the Windows 7 client to Volcengine TOS.

Layout in tos://folotoy-ai-passport/tools/ai-passport-desktop/ (public read):

    desktop/v0.4.1/<files> + SHA256SUMS.txt     macOS and Windows 10/11 builds
    windows7/v0.1.0/<files> + SHA256SUMS.txt    the native Windows 7/8/8.1 client
    releases.json                               every version of both, newest first

A version folder is written once and never changed; publishing a version that
already exists is refused. releases.json is the only object that is replaced; the
previous copy is kept as history/releases-<UTC time>.json. The download page
(ai-passport.folotoy.cn/tools/desktop-app/) reads releases.json.

Needs tosutil configured for the bucket (~/.tosutilconfig). Example:

    scripts/publish-tos.py --product desktop --version 0.4.1 --date 2026-11-13 \
      --commit <full SHA> --prerelease \
      --summary-zh "..." --summary-en "..." dist/*.dmg dist/windows/*.exe dist/windows/*.zip
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone

BUCKET = "folotoy-ai-passport"
PREFIX = "tools/ai-passport-desktop"
PUBLIC = f"https://{BUCKET}.tos-cn-beijing.volces.com/{PREFIX}"

PRODUCTS = {
    "desktop": {
        "name": {"zh": "AI Passport 玩法社区（桌面版）", "en": "AI Passport App Library (desktop)"},
        "repo": "https://github.com/FoloToy/ai-passport-desktop",
    },
    "windows7": {
        "name": {"zh": "AI Passport 玩法社区（Windows 7 版）", "en": "AI Passport App Library (Windows 7 edition)"},
        "repo": "https://github.com/FoloToy/ai-passport-desktop-windows7",
    },
}

# File name pattern -> (product, platform id). Platform ids are what the page shows.
PATTERNS = [
    (r"-macOS-arm64\.dmg$", "desktop", "macos-arm64"),
    (r"-macOS-x86_64\.dmg$", "desktop", "macos-x86_64"),
    (r"-macOS-universal\.dmg$", "desktop", "macos-universal"),
    (r"-Windows-x64-Setup\.exe$", "desktop", "windows-x64-setup"),
    (r"-Windows-x64\.zip$", "desktop", "windows-x64-zip"),
    (r"-Windows7-[\d.]+-x64\.zip$", "windows7", "windows7-x64"),
    (r"-Windows7-[\d.]+-x86\.zip$", "windows7", "windows7-x86"),
]


def platform_of(name, product):
    for pattern, prod, platform in PATTERNS:
        if re.search(pattern, name):
            if prod != product:
                sys.exit(f"{name} belongs to {prod}, not {product}")
            return platform
    sys.exit(f"Unknown file type: {name}")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def tosutil(*args):
    out = subprocess.run(["tosutil", *args], capture_output=True, text=True)
    text = out.stdout + out.stderr
    if out.returncode != 0 or re.search(r"\bFailed count is: [1-9]|Error:", text):
        sys.exit(f"tosutil {' '.join(args[:2])} failed:\n{text}")
    return text


def exists(key):
    out = subprocess.run(["tosutil", "ls", f"tos://{BUCKET}/{key}", "-limit", "1"], capture_output=True, text=True)
    return f"tos://{BUCKET}/{key}" in out.stdout


def upload(local, key, content_type, cache):
    tosutil("cp", local, f"tos://{BUCKET}/{key}", f"-contentType={content_type}", f"-cacheControl={cache}")


def fetch_index():
    try:
        with urllib.request.urlopen(f"{PUBLIC}/releases.json?t={datetime.now().timestamp()}", timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def version_key(v):
    return tuple(int(x) for x in re.findall(r"\d+", v))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--product", required=True, choices=PRODUCTS)
    p.add_argument("--version", required=True, help="X.Y.Z without the v")
    p.add_argument("--date", required=True, help="release date, YYYY-MM-DD")
    p.add_argument("--commit", required=True, help="full source commit SHA")
    p.add_argument("--prerelease", action="store_true")
    p.add_argument("--summary-zh", required=True)
    p.add_argument("--summary-en", required=True)
    p.add_argument("--notes-url", help="release notes page (default: the GitHub release)")
    p.add_argument("--dry-run", action="store_true", help="check everything, upload nothing")
    p.add_argument("files", nargs="+")
    a = p.parse_args()

    if not re.fullmatch(r"\d+\.\d+\.\d+", a.version):
        sys.exit("--version must look like 1.2.3")
    if not re.fullmatch(r"[0-9a-f]{40}", a.commit):
        sys.exit("--commit must be a full 40-character SHA")
    datetime.strptime(a.date, "%Y-%m-%d")

    folder = f"{PREFIX}/{a.product}/v{a.version}"
    files, seen = [], set()
    for path in a.files:
        name = os.path.basename(path)
        if a.version not in name:
            sys.exit(f"{name} does not carry version {a.version}")
        platform = platform_of(name, a.product)
        if platform in seen:
            sys.exit(f"Two files for {platform}")
        seen.add(platform)
        digest = sha256(path)
        sidecar = path + ".sha256"
        if os.path.exists(sidecar):
            want = open(sidecar).read().split()[0].lower()
            if want != digest:
                sys.exit(f"{name}: SHA-256 does not match {os.path.basename(sidecar)}")
        files.append({"platform": platform, "name": name, "size": os.path.getsize(path), "sha256": digest,
                      "url": f"{PUBLIC}/{a.product}/v{a.version}/{name}", "local": path})

    index = fetch_index() or {"schema": 1, "products": {}}
    product = index["products"].setdefault(a.product, {**PRODUCTS[a.product], "releases": []})
    if any(r["version"] == a.version for r in product["releases"]):
        sys.exit(f"{a.product} {a.version} is already in releases.json; versions are never replaced")
    if exists(folder + "/"):
        sys.exit(f"tos://{BUCKET}/{folder}/ already exists; versions are never replaced")

    release = {
        "version": a.version,
        "date": a.date,
        "prerelease": a.prerelease,
        "commit": a.commit,
        "summary": {"zh": a.summary_zh, "en": a.summary_en},
        "notes": a.notes_url or f"{PRODUCTS[a.product]['repo']}/releases/tag/v{a.version}",
        "files": [{k: v for k, v in f.items() if k != "local"} for f in sorted(files, key=lambda f: f["platform"])],
    }
    product.update({k: v for k, v in PRODUCTS[a.product].items()})
    product["releases"].append(release)
    product["releases"].sort(key=lambda r: version_key(r["version"]), reverse=True)
    previous = json.dumps(index, ensure_ascii=False, indent=1) if index.get("updatedAt") else None
    index["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    index["base"] = PUBLIC

    for f in files:
        print(f"{f['platform']:20} {f['name']}  {f['size']:>10}  {f['sha256']}")
    if a.dry_run:
        print("Dry run: nothing uploaded.")
        return

    with tempfile.TemporaryDirectory() as tmp:
        for f in files:
            ctype = "application/x-apple-diskimage" if f["name"].endswith(".dmg") else (
                "application/zip" if f["name"].endswith(".zip") else "application/octet-stream")
            upload(f["local"], f"{folder}/{f['name']}", ctype, "public, max-age=31536000, immutable")
            print("uploaded", f["name"])
        sums = os.path.join(tmp, "SHA256SUMS.txt")
        with open(sums, "w") as out:
            out.writelines(f"{f['sha256']}  {f['name']}\n" for f in sorted(files, key=lambda f: f["name"]))
        upload(sums, f"{folder}/SHA256SUMS.txt", "text/plain; charset=utf-8", "public, max-age=31536000, immutable")

        # Check every file through the public URL before announcing the version.
        for f in files:
            req = urllib.request.Request(f["url"], method="HEAD")
            with urllib.request.urlopen(req, timeout=30) as r:
                if int(r.headers["Content-Length"]) != f["size"]:
                    sys.exit(f"{f['name']}: public size differs; releases.json not updated")

        if previous:
            hist = os.path.join(tmp, "previous.json")
            open(hist, "w").write(previous)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            upload(hist, f"{PREFIX}/history/releases-{stamp}.json", "application/json; charset=utf-8", "no-cache")
        new = os.path.join(tmp, "releases.json")
        with open(new, "w") as out:
            json.dump(index, out, ensure_ascii=False, indent=1)
            out.write("\n")
        upload(new, f"{PREFIX}/releases.json", "application/json; charset=utf-8", "no-cache")
    print(f"Published {a.product} {a.version}: {PUBLIC}/releases.json")


if __name__ == "__main__":
    main()
