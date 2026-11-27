#ifndef PackageDir
  #error PackageDir is required
#endif
#ifndef OutputDir
  #error OutputDir is required
#endif
#ifndef AppVersion
  #define AppVersion "0.9.0"
#endif
#define AppTitle "AI Passport"
#define ExeName "AI Passport.exe"

[Setup]
AppId={{6C1F1C38-2E57-4E1B-9C0B-2F5D3A9F7A41}
AppName={#AppTitle}
AppVersion={#AppVersion}
AppPublisher=FoloToy
AppPublisherURL=https://ai-passport.folotoy.cn/plays/
DefaultDirName={localappdata}\Programs\FoloToy\AI Passport
; Same AppId as before 0.9, so this upgrades the old "AI Passport 玩法社区" in place; move it to the new folder.
UsePreviousAppDir=no
UsePreviousGroup=no
DefaultGroupName={#AppTitle}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=AI-Passport-{#AppVersion}-Windows-x64-Setup
#ifdef IconFile
SetupIconFile={#IconFile}
#endif
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#ExeName}
UninstallDisplayName={#AppTitle}
CloseApplications=yes
RestartApplications=no

; Up to 0.8 the app was "AI Passport 玩法社区" (AIPassportPlays.exe) in "AI Passport Plays".
[InstallDelete]
Type: filesandordirs; Name: "{localappdata}\Programs\FoloToy\AI Passport Plays"
Type: filesandordirs; Name: "{userprograms}\AI Passport 玩法社区"
Type: files; Name: "{userdesktop}\AI Passport 玩法社区.lnk"

[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppTitle}"; Filename: "{app}\{#ExeName}"
Name: "{autodesktop}\{#AppTitle}"; Filename: "{app}\{#ExeName}"; Tasks: desktopicon

[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut / 创建桌面快捷方式"

[Run]
Filename: "{app}\runtime\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Installing Microsoft WebView2 Runtime..."; Check: NeedsWebView2; Flags: waituntilterminated
Filename: "{app}\{#ExeName}"; Description: "Launch / 启动 {#AppTitle}"; Flags: nowait postinstall skipifsilent

[Code]
function NeedsWebView2: Boolean;
var Version: String;
begin
  Result := True;
  if RegQueryStringValue(HKLM32, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) then
    if (Version <> '') and (Version <> '0.0.0.0') then Result := False;
  if RegQueryStringValue(HKCU32, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) then
    if (Version <> '') and (Version <> '0.0.0.0') then Result := False;
end;
