# 发版

只有用户要求时才发版。Release 页面**只保留最新的一个版本**：新版本发布成功后，删掉旧的 Release 和 tag。所有版本都保存在火山引擎 TOS 上（第 4 步）。

## 1. 改版本号

以 `X.Y.Z` 为例，这几处要一起改：

| 位置 | 改什么 |
| --- | --- |
| `VERSION` | `X.Y.Z`（打包脚本从这里读版本号，通过 `-ldflags -X main.version=` 写进二进制） |
| `main.go` | `var version = "X.Y.Z-dev"`（`go run` 时显示的版本） |
| `scripts/windows-installer.iss` | `#define AppVersion "X.Y.Z"`（文件是 UTF-8 带 BOM + CRLF，按字节改） |
| `docs/WINDOWS-BUILD.md` | go-winres 命令里的 `X.Y.Z.0` |
| `rsrc_windows_{386,amd64,arm64}.syso` | 用下面的命令重新生成 |

```sh
go run github.com/tc-hib/go-winres@v0.3.3 simply --icon assets/icon.png --manifest gui \
  --product-name "AI Passport 玩法社区" --file-description "AI Passport 玩法社区" --copyright FoloToy \
  --product-version X.Y.Z.0 --file-version X.Y.Z.0 --original-filename AIPassportPlays.exe --arch amd64,arm64,386
```

然后 `go vet ./... && go test -race ./...`，提交 `chore: release X.Y.Z` 并推到 `main`。

## 2. 打包

所有安装包都从**同一个已提交的 commit** 打出来（脚本在有未提交改动时会拒绝，除非设 `ALLOW_DIRTY=1`，Windows 脚本是 `-AllowDirty`）。

| 平台 | 在哪里打 | 命令 | 产物 |
| --- | --- | --- | --- |
| macOS arm64 / x86_64 / universal | Apple 芯片的 Mac | `scripts/package-mac.sh` | `dist/AI-Passport-Plays-X.Y.Z-macOS-{arm64,x86_64,universal}.dmg` |
| Windows 10/11 x64 | Windows 10/11 机器 | `powershell -ExecutionPolicy Bypass -File scripts\build-on-windows.ps1` | `dist\windows\…-Windows-x64-Setup.exe` 和 `…-Windows-x64.zip` |

每个产物旁边都有 `.sha256` 文件，一起上传。

### 在远程 Windows 机器上打 Windows 10+ 版

Windows 机器可以直接 `git clone https://github.com/FoloToy/ai-passport-desktop.git`；网络不通 GitHub 时，用 git bundle 传过去：

```sh
git bundle create /tmp/plays.bundle main
scp /tmp/plays.bundle <windows-host>:build/
ssh <windows-host> "cd build && git clone -b main plays.bundle ai-passport-desktop"
```

在 Windows 上运行 `scripts\package-windows.ps1`（需要 Go 1.26 和 Inno Setup 6）。Inno Setup 装在用户目录时设 `PLAYS_ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe`；国内网络设 `GOPROXY=https://goproxy.cn,direct`。打好后把 `dist\windows\` 下的 4 个文件 scp 回来。详细排错见 [WINDOWS-BUILD.md](WINDOWS-BUILD.md)。

## 3. 发布

```sh
gh release create vX.Y.Z --target <完整的 commit SHA> --prerelease \
  --title "vX.Y.Z：一句话概括" --notes-file notes.md \
  dist/*.dmg dist/*.dmg.sha256 dist/windows/*
```

- 在没有真机验收前，一律标记 `--prerelease`。
- 发布说明用中文，结构参照上一个版本：一句话概括 → 下载对照表（系统 → 文件名）→ **新增** / **修复** → **测试情况**（如实写哪些在真机上验证过、哪些没有、有没有代码签名）。
- 发布后核对资产列表（10 个文件：3 个 DMG、Setup.exe、ZIP，各带 `.sha256`）。

## 4. 上传到火山引擎 TOS（下载页）

官网的下载页 https://ai-passport.folotoy.cn/tools/desktop-app/ 读取 TOS 上的 `releases.json`，GitHub Release 发好后再传一份到 TOS。每个版本放在自己的文件夹里，**只写一次、永不覆盖**（脚本拒绝重复发布同一个版本）；`releases.json` 每次更新前，旧的一份存进 `history/`。

```sh
scripts/publish-tos.py --product desktop --version X.Y.Z --date YYYY-MM-DD \
  --commit <完整的 commit SHA> --prerelease \
  --summary-zh "一句话中文概括" --summary-en "One-sentence English summary" \
  --dry-run dist/*.dmg dist/windows/*.exe dist/windows/*.zip
```

先带 `--dry-run` 检查文件名、版本号、和 `.sha256` 是否一致，没问题再去掉 `--dry-run` 正式上传。需要配置好 `tosutil`（`~/.tosutilconfig`，不要把密钥提交或贴出来）。

| 位置 | 内容 |
| --- | --- |
| `tos://folotoy-ai-passport/tools/ai-passport-desktop/desktop/vX.Y.Z/` | 安装包和 `SHA256SUMS.txt` |
| `…/windows7/vX.Y.Z/` | Windows 7 版（在那个仓库发） |
| `…/releases.json` | 两个产品的全部版本，新版在前；下载页直接读，不用重新部署官网 |
| `…/history/` | 每次更新前的 `releases.json` |

公开地址前缀是 `https://folotoy-ai-passport.tos-cn-beijing.volces.com/tools/ai-passport-desktop/`。上传后打开下载页，确认新版本出现、链接能下载。

## 5. 清理旧版本

```sh
gh release list
gh release delete vOLD --cleanup-tag --yes   # 删除 Release 和远程 tag
git tag -d vOLD                              # 删除本地 tag
```

Windows 7/8/8.1 客户端在 [ai-passport-desktop-windows7](https://github.com/FoloToy/ai-passport-desktop-windows7) 单独发版。
