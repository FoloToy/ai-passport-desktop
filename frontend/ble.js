'use strict';
/* Bluetooth, as in the Android app: nearby devices on the Device tab, the device in install
   mode (Wi-Fi and wireless install of a play), the Passport editor, and Bluetooth Wi-Fi setup.
   Loaded after tools.js; the protocol library arrives as window.PB from ble-boot.js (a module),
   which talks to the Go Bluetooth bridge through ble-bridge.js. */

Object.assign(I18N.zh, {
  ble_title: '蓝牙', ble_nearby: '附近的设备', ble_searching_short: '搜索中', ble_search_again: '重新搜索',
  ble_lead: '安装模式设备可无线安装玩法；配网模式设备可设置 Wi-Fi；通行证可换头像、图片和开机音乐。',
  ble_searching: '正在搜索附近的 AI Passport…', ble_none: '没有发现设备', ble_loading: '正在准备蓝牙…',
  ble_off: '蓝牙不可用', ble_off_sub: '请打开电脑的蓝牙后重试。macOS 第一次使用时会询问是否允许使用蓝牙，请选择允许（也可以在“系统设置 › 隐私与安全性 › 蓝牙”里打开）。Linux 需要 BlueZ 蓝牙服务。',
  ble_retry: '重试', ble_connect: '连接', ble_connected: '已连接', ble_not_nearby: '不在附近', ble_nearby_pill: '附近',
  mode_installer: '安装模式', mode_blufi: '可配网', mode_workcard: '通行证',
  ble_not_near_toast: n => `${n} 不在附近，请靠近电脑并开机。`,
  ble_not_near_inst: n => `${n} 不在附近。关机后同时按住开机键和上键，进入安装模式后再试。`,
  dev_wifi: w => `Wi-Fi：${w}`, ble_help: ['让设备靠近电脑，并确认没有被手机或其他电脑连接。', '安装模式：关机后同时按住开机键和上键，屏幕出现安装提示后松开。'],
  /* installer device */
  inst_title: '安装模式设备', inst_connecting: '连接中', inst_off: '未连接',
  inst_info: (sn, v, p, mb) => `SN ${sn} · 安装器 v${v} · 协议 ${p} · ${mb} MB`, inst_state: s => `状态：${s}`,
  inst_wifi_ok: '无线网络已连接', inst_wifi_ok_n: w => `Wi-Fi 已连接：${w}`, inst_wifi_none: '安装模式 · 尚未联网',
  inst_ready_go: 'Wi-Fi 已连接，可以去玩法社区安装', inst_go: '去玩法社区', inst_reboot: '重启设备（退出安装模式）',
  inst_reboot_q: '重启后设备会退出安装模式，运行已安装的玩法。确定吗？', inst_disconnect: '断开连接', inst_reconnect: '重新连接',
  inst_joined: w => `设备已连上 ${w}`, inst_pick: '在“设备”页选择一台安装模式设备。',
  /* Wi-Fi picker */
  wifi_choose: '选择 Wi-Fi', wifi_scan: '扫描', wifi_refresh: '刷新', wifi_scanning: '设备正在扫描 Wi-Fi…', wifi_none: '没有扫描到 Wi-Fi，请刷新。',
  wifi_open: '开放网络', wifi_hidden: '手动输入隐藏网络', wifi_name: 'Wi-Fi 名称', wifi_pw: '密码（开放网络可留空）',
  wifi_join: '连接', wifi_joining: '正在连接…', wifi_note: '只支持 2.4 GHz 网络。密码只发给设备，App 不保存、不上传。', wifi_selected: s => `已选择：${s}`,
  /* wireless install */
  wi_btn: '无线安装', wi_title: '无线安装', wi_steps: '无线安装步骤',
  wi_step1: '装好小程序玩法安装器', wi_step1_sub: '只需用数据线装一次，装过可以跳过',
  wi_step2: '让设备进入安装模式', wi_step2_sub: '关机后同时按住开机键和上键，屏幕出现安装提示后松开',
  wi_step3: '在下方选择设备并连接', wi_step3_sub: '设备进入安装模式后会出现在这里，点它连接',
  wi_devices: '安装模式设备', wi_searching: '正在搜索安装模式设备…', wi_none: '没有发现安装模式设备。请确认设备屏幕上出现了安装提示，并靠近电脑。',
  wi_installer_usb: '用数据线安装小程序玩法安装器', wi_change: '更换设备', wi_connect_wifi: '给设备连上 Wi-Fi',
  wi_checking: '正在检查这个玩法能不能无线安装…', wi_fetching: '正在下载固件…',
  wi_ready: '设备已联网。电脑会先下载并核对固件，再让设备通过 Wi-Fi 下载同一份文件安装。设备上原有的玩法和数据会被替换，Wi-Fi 设置保留。',
  wi_keep: '保持设备开机、靠近电脑。下载开始后，设备会自行完成写入并重启。',
  wi_start: '开始安装', wi_phase_fetch: '电脑下载并核对固件', wi_phase_sending: '发送安装指令', wi_phase_installing: '设备下载并写入',
  wi_done: '安装完成，设备正在重启。以后想换玩法，关机后同时按住开机键和上键进入安装模式。', wi_failed: '安装失败', wi_usb: '改用数据线安装',
  wi_busy: '正在安装，请等待完成。',
  err_ble_disconnected: '蓝牙连接已断开',
  err_wireless_app_big: '这个玩法的程序超过 6 MB，小程序玩法安装器装不下，请用数据线安装。',
  err_wireless_space: '这个玩法占用的空间太大，小程序玩法安装器装不下，请用数据线安装。',
  err_wireless_image: '这个玩法不能用小程序玩法安装器安装，请用数据线安装。',
  /* passport */
  pp_title: '通行证', pp_slogan: '让通行证，更像你', pp_connecting: '正在连接 AI Passport', pp_keep: '请保持设备靠近电脑。',
  pp_failed: '连接没有完成', pp_missing: '未识别到通行证功能',
  pp_missing_sub: '可能正在运行其他玩法，也可能是蓝牙功能尚未读取完整。可以重新连接，或用数据线恢复出厂后再使用。',
  pp_unavailable: '通行证功能暂不可用', pp_unavailable_sub: '当前固件不支持通行证编辑。恢复通行证固件后，即可设置头像和个人介绍。',
  pp_restore_usb: '用数据线恢复通行证', pp_jd: '这台设备请在京东小程序中设置', pp_jd_sub: '这是京东定制版 AI 通行证，资料编辑需要在京东的小程序中完成。',
  pp_reconnect: '重新连接', pp_other: '选择其他设备', pp_preview: '当前效果', pp_trae: 'TRAE 设备',
  pp_profile: '个人信息', pp_profile_sub: '这些内容会显示在你的 AI 通行证上', pp_profile_trae: '修改 TRAE 上显示的名字',
  pp_name: '名字', pp_job: '职业', pp_intro: '个人介绍', pp_name_ph: '例如：FoloToy', pp_job_ph: '例如：设计师', pp_intro_ph: '简单介绍一下自己',
  pp_bytes: (n, m) => `${n}/${m} 字节`, pp_chars: (n, m) => `${n}/${m} 字`, pp_apply: '更新预览', pp_preview_updated: '已更新效果',
  pp_name_long: '名字有点长，请缩短后再试', pp_profile_bad: '职业和个人介绍不能为空，职业最多 47 字节，介绍最多 28 个字符',
  pp_avatar: '头像', pp_avatar_sub: '96×156 像素，会自动裁剪', pp_avatar_trae: '选择一个喜欢的头像', pp_trae_n: n => `头像 ${n}`,
  pp_full: '全屏图片', pp_full_sub: '设备会整屏显示这张图片（240×320）', pp_pick: '选择图片', pp_pick_again: '换一张',
  pp_show_full: '看全屏图片', pp_show_card: '看通行证',
  pp_changed: '已修改', pp_pending: n => `下发 ${n} 项改动到设备`, pp_sync: '同步到 AI 通行证', pp_undo: '取消', pp_none: '还没有改动。修改后点“同步到 AI 通行证”。',
  pp_sending: s => `正在下发 ${s}`, pp_syncing: p => `正在同步 ${p}%`, pp_synced: '已同步到设备',
  pp_synced_full: '已同步到设备。全屏图片显示后，长按设备确定键可退出。', pp_fix_first: '个人信息有误，请先修改',
  pp_separate: '以下功能会单独发送', pp_music: '开机音乐', pp_music_sub: '设置设备开机时播放的音乐（RTTTL 铃声乐谱）',
  pp_score_fmt: '格式：名称:d=默认时值,o=默认八度,b=速度:音符,音符…  例如 c6 表示高八度的 do。',
  pp_send: '发送到设备', pp_clear: '清空音乐', pp_clearing: '清空中…', pp_sending_p: p => `发送中 ${p}%`,
  pp_score_bad: '乐谱不能为空，且不超过 1024 字节', pp_music_sent: '开机音乐已发送', pp_music_cleared: '开机音乐已清空',
  pp_settings: '设备设置', pp_settings_sub: '息屏与音量', pp_sleep: '自动息屏（分钟）', pp_sleep_hint: '0 表示永不息屏', pp_volume: '设备音量（%）', pp_volume_hint: '范围 0–100',
  pp_save: '保存到设备', pp_saving: '保存中', pp_settings_bad: '息屏时间需为非负整数，音量为 0–100', pp_settings_saved: '设置已保存',
  pp_chars_bad: (d, h) => `设备暂不支持以下字符：${d}，请修改后再发送。` + (h ? `可替换为英文标点：${h}。` : ''),
  pp_crop: '裁剪图片', pp_crop_hint: '拖动和缩放，选出显示在通行证上的部分', pp_zoom: '缩放', pp_use: '使用这张图',
  pp_img_bad: '图片读取失败', pp_img_big: '裁剪后的图片超过 124KB，请换一张更简单的图片', pp_sn: s => `SN ${s}`,
  /* BluFi */
  bf_title: '蓝牙配网', bf_before: '开始之前', bf_before_list: ['在设备菜单中打开「BLUFI Setup」', '打开电脑的蓝牙', '准备好 2.4 GHz Wi-Fi 名称和密码'],
  bf_searching: '正在搜索可配网的设备…', bf_none: '没有发现可配网的设备', bf_ready: '可配网',
  bf_step_connect: '连接蓝牙', bf_step_secure: '建立加密通道（DH + AES）', bf_secure_ok: '加密通道已建立',
  bf_step_mode: '设置为 Wi-Fi 客户端', bf_step_ssid: '发送网络名称', bf_step_pw: '加密发送密码', bf_step_ip: '等待设备获取 IP',
  bf_ok: w => `设备已连上 ${w}。`, bf_done: '完成', bf_again: '重新输入密码', bf_other: '重新选择设备', bf_failed: '配网没有完成',
});

Object.assign(I18N.en, {
  ble_title: 'Bluetooth', ble_nearby: 'Nearby devices', ble_searching_short: 'Searching', ble_search_again: 'Search again',
  ble_lead: 'Devices in install mode can install plays wirelessly. Devices in Wi-Fi setup mode can set up Wi-Fi. Passports can change the avatar, picture and boot music.',
  ble_searching: 'Searching for a nearby AI Passport…', ble_none: 'No devices found', ble_loading: 'Getting Bluetooth ready…',
  ble_off: "Bluetooth isn't available", ble_off_sub: 'Turn on Bluetooth on this computer and try again. The first time on macOS you are asked whether the app may use Bluetooth; allow it (or turn it on in System Settings › Privacy & Security › Bluetooth). Linux needs the BlueZ Bluetooth service.',
  ble_retry: 'Try again', ble_connect: 'Connect', ble_connected: 'Connected', ble_not_nearby: 'Not nearby', ble_nearby_pill: 'Nearby',
  mode_installer: 'Install mode', mode_blufi: 'Ready for Wi-Fi setup', mode_workcard: 'Passport',
  ble_not_near_toast: n => `${n} isn't nearby. Bring it close to the computer and turn it on.`,
  ble_not_near_inst: n => `${n} isn't nearby. Turn it off, then hold the power and Up buttons together to enter install mode, and try again.`,
  dev_wifi: w => `Wi-Fi: ${w}`, ble_help: ['Keep the device close to the computer and make sure no phone or other computer is connected to it.', 'Install mode: turn the device off, then hold the power and Up buttons together. Let go when the install screen shows.'],
  inst_title: 'Install mode device', inst_connecting: 'Connecting', inst_off: 'Not connected',
  inst_info: (sn, v, p, mb) => `SN ${sn} · Installer v${v} · Protocol ${p} · ${mb} MB`, inst_state: s => `Status: ${s}`,
  inst_wifi_ok: 'Wi-Fi connected', inst_wifi_ok_n: w => `Wi-Fi connected: ${w}`, inst_wifi_none: 'Install mode · Not online yet',
  inst_ready_go: 'Wi-Fi connected. You can install from the community', inst_go: 'Go to community', inst_reboot: 'Restart device (exit install mode)',
  inst_reboot_q: 'The device leaves install mode and runs the installed play. Restart it?', inst_disconnect: 'Disconnect', inst_reconnect: 'Reconnect',
  inst_joined: w => `Device connected to ${w}`, inst_pick: 'Choose a device in install mode on the Device tab.',
  wifi_choose: 'Choose Wi-Fi', wifi_scan: 'Scan', wifi_refresh: 'Refresh', wifi_scanning: 'The device is scanning for Wi-Fi…', wifi_none: 'No Wi-Fi found. Refresh to try again.',
  wifi_open: 'Open network', wifi_hidden: 'Enter a hidden network', wifi_name: 'Wi-Fi name', wifi_pw: 'Password (leave empty for open networks)',
  wifi_join: 'Connect', wifi_joining: 'Connecting…', wifi_note: "Only 2.4 GHz networks work. The password goes only to the device. The app doesn't save or upload it.", wifi_selected: s => `Selected: ${s}`,
  wi_btn: 'Wireless install', wi_title: 'Wireless install', wi_steps: 'Wireless install steps',
  wi_step1: 'Install Play Installer', wi_step1_sub: 'Only needed once with a USB cable. Skip if already done.',
  wi_step2: 'Put the device in install mode', wi_step2_sub: 'With the device off, hold the power and Up buttons together. Let go when the install prompt shows on screen.',
  wi_step3: 'Choose your device below and connect', wi_step3_sub: "Your device shows up here once it's in install mode. Click it to connect.",
  wi_devices: 'Devices in install mode', wi_searching: 'Searching for devices in install mode…', wi_none: "No device in install mode found. Make sure the install prompt is on the device screen and it's near the computer.",
  wi_installer_usb: 'Install Play Installer with a USB cable', wi_change: 'Change device', wi_connect_wifi: 'Connect the device to Wi-Fi',
  wi_checking: 'Checking if this play can be installed wirelessly…', wi_fetching: 'Downloading the firmware…',
  wi_ready: 'The device is online. This computer downloads and checks the firmware first, then the device downloads the same file over Wi-Fi and installs it. The current play and its data will be replaced. Wi-Fi settings are kept.',
  wi_keep: 'Keep the device on and near the computer. Once the download starts, the device will finish installing and restart on its own.',
  wi_start: 'Start install', wi_phase_fetch: 'Computer downloads and checks the firmware', wi_phase_sending: 'Sending install command', wi_phase_installing: 'Device downloads and installs',
  wi_done: 'Installed. The device is restarting. To switch plays later, turn it off and hold the power and Up buttons together to enter install mode.', wi_failed: 'Install failed', wi_usb: 'Install with a USB cable instead',
  wi_busy: 'Installing. Please wait until it finishes.',
  err_ble_disconnected: 'Bluetooth disconnected',
  err_wireless_app_big: "This play's program is over 6 MB, too big for Play Installer. Please install with a USB cable.",
  err_wireless_space: 'This play takes up too much space for Play Installer. Please install with a USB cable.',
  err_wireless_image: "This play can't be installed with Play Installer. Please install with a USB cable.",
  pp_title: 'Passport', pp_slogan: 'Make your passport more you', pp_connecting: 'Connecting to AI Passport', pp_keep: 'Keep the device close to the computer.',
  pp_failed: "Connection didn't finish", pp_missing: 'Passport features not found',
  pp_missing_sub: "Another play may be running, or Bluetooth hasn't finished loading. Try reconnecting, or restore the default play with a USB cable first.",
  pp_unavailable: 'Passport features unavailable', pp_unavailable_sub: "This firmware doesn't support passport editing. Restore the passport firmware to set your avatar and intro.",
  pp_restore_usb: 'Restore passport with a USB cable', pp_jd: 'Set up this device in the JD mini program', pp_jd_sub: 'This is a JD edition AI Passport. Edit its profile in the JD mini program.',
  pp_reconnect: 'Reconnect', pp_other: 'Choose another device', pp_preview: 'Preview', pp_trae: 'TRAE device',
  pp_profile: 'Profile', pp_profile_sub: 'This shows on your AI Passport', pp_profile_trae: 'Change the name shown on TRAE',
  pp_name: 'Name', pp_job: 'Job title', pp_intro: 'Intro', pp_name_ph: 'e.g. FoloToy', pp_job_ph: 'e.g. Designer', pp_intro_ph: 'Say a little about yourself',
  pp_bytes: (n, m) => `${n}/${m} bytes`, pp_chars: (n, m) => `${n}/${m} characters`, pp_apply: 'Update preview', pp_preview_updated: 'Preview updated',
  pp_name_long: 'The name is a bit long. Please shorten it', pp_profile_bad: "Job title and intro can't be empty. Job title up to 47 bytes, intro up to 28 characters",
  pp_avatar: 'Avatar', pp_avatar_sub: '96×156 pixels, cropped for you', pp_avatar_trae: 'Pick an avatar you like', pp_trae_n: n => `Avatar ${n}`,
  pp_full: 'Full-screen picture', pp_full_sub: 'The device shows this picture full screen (240×320)', pp_pick: 'Choose picture', pp_pick_again: 'Choose another',
  pp_show_full: 'Show full-screen picture', pp_show_card: 'Show passport',
  pp_changed: 'Changed', pp_pending: n => `Send ${n} changes to the device`, pp_sync: 'Sync to AI Passport', pp_undo: 'Undo', pp_none: 'No changes yet. Make changes, then click "Sync to AI Passport".',
  pp_sending: s => `Sending ${s}`, pp_syncing: p => `Syncing ${p}%`, pp_synced: 'Synced to the device',
  pp_synced_full: 'Synced to the device. When the full-screen picture shows, long-press the OK button on the device to exit.', pp_fix_first: 'Please fix your profile first',
  pp_separate: 'These are sent separately', pp_music: 'Boot music', pp_music_sub: 'Set the music the device plays when it starts (RTTTL ringtone score)',
  pp_score_fmt: 'Format: name:d=default duration,o=default octave,b=tempo:note,note…  For example, c6 is do one octave up.',
  pp_send: 'Send to device', pp_clear: 'Clear music', pp_clearing: 'Clearing…', pp_sending_p: p => `Sending ${p}%`,
  pp_score_bad: "The score can't be empty or longer than 1024 bytes", pp_music_sent: 'Boot music sent', pp_music_cleared: 'Boot music cleared',
  pp_settings: 'Device settings', pp_settings_sub: 'Screen-off and volume', pp_sleep: 'Auto screen-off (minutes)', pp_sleep_hint: '0 means never', pp_volume: 'Device volume (%)', pp_volume_hint: 'Range 0–100',
  pp_save: 'Save to device', pp_saving: 'Saving', pp_settings_bad: 'Screen-off time must be a whole number of 0 or more, and volume 0–100', pp_settings_saved: 'Settings saved',
  pp_chars_bad: (d, h) => `The device can't show these characters: ${d}. Please change them and try again.` + (h ? ` Use English punctuation instead: ${h}.` : ''),
  pp_crop: 'Crop picture', pp_crop_hint: 'Drag and zoom to choose what shows on your passport', pp_zoom: 'Zoom', pp_use: 'Use this picture',
  pp_img_bad: "Couldn't read the image", pp_img_big: 'The cropped image is over 124KB. Please try a simpler image', pp_sn: s => `SN ${s}`,
  bf_title: 'Bluetooth Wi-Fi setup', bf_before: 'Before you start', bf_before_list: ['Open "BLUFI Setup" in the device menu', 'Turn on Bluetooth on this computer', 'Have your 2.4 GHz Wi-Fi name and password ready'],
  bf_searching: 'Looking for devices ready for Wi-Fi setup…', bf_none: 'No devices ready for Wi-Fi setup found', bf_ready: 'Ready for setup',
  bf_step_connect: 'Connect Bluetooth', bf_step_secure: 'Set up encrypted channel (DH + AES)', bf_secure_ok: 'Encrypted channel ready',
  bf_step_mode: 'Set as Wi-Fi client', bf_step_ssid: 'Send network name', bf_step_pw: 'Send password (encrypted)', bf_step_ip: 'Wait for the device to get an IP address',
  bf_ok: w => `The device is connected to ${w}.`, bf_done: 'Done', bf_again: 'Re-enter password', bf_other: 'Choose another device', bf_failed: "Wi-Fi setup didn't finish",
});

/* ---------------- state ---------------- */
const BL = {
  st: null, // bridge state {supported, ready, error}
  stError: '',
  list: [], // classified nearby devices
  scanning: false,
  scanTimer: null,
  listTimer: null,
  conn: null, // the one Bluetooth connection (BridgeConnection)
  inst: null, // device in install mode
  pass: null, // Passport editor
  blufi: { stage: 'pick' },
  wifi: null, // Wi-Fi picker state, per connected device
  wi: null, // wireless install of one play
  crop: null,
  charset: null,
};

const PP = { NAME: 47, TITLE: 47, INTRO_CHARS: 28, INTRO_BYTES: 84, SCORE: 1024, MAX_IMG: 124 * 1024, FULL_TARGET: 28 * 1024,
  SCORE_DEFAULT: 'passport:d=4,o=5,b=120:c,e,g,c6', INTRO_DEFAULT: '探索 AI 的无限可能' };
const TRAE_AVATARS = [1, 2, 3, 4, 5, 6, 7, 8].map(n => `avatar-0${n}`);
const utf8len = s => new TextEncoder().encode(s).length;
const charLen = s => Array.from(s).length;
const pbReady = () => !!window.PB;

function bytesToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function b64ToBytes(s) {
  const bin = atob(s || '');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const blobUrl = (bytes, type) => URL.createObjectURL(new Blob([bytes], { type }));
const bleMsg = e => (e && e.message) || String(e || '');

/* ---------------- remembered Bluetooth devices ---------------- */
function bleSaved() {
  try { return JSON.parse(localStorage.getItem('plays-ble-devices') || '[]'); } catch { return []; }
}
function bleSave(list) { localStorage.setItem('plays-ble-devices', JSON.stringify(list.slice(0, 16))); }
function bleRemember(id, name, sn, mode, extra = {}) {
  const old = bleSaved().find(d => d.id === id) || {};
  bleSave([{ ...old, id, name: name || old.name || 'AI Passport', sn: sn || old.sn || '', mode, at: Date.now(), ...extra }].concat(bleSaved().filter(d => d.id !== id)));
}
function bleRecordPlay(id, title) {
  bleSave(bleSaved().map(d => (d.id === id ? { ...d, play: title, at: Date.now() } : d)));
}

/* ---------------- scanning ---------------- */
function bleClassify(d) {
  const PBm = window.PB;
  const mode = PBm.classify(d.name, d.services);
  if (!mode) return null;
  const sn = PBm.snOf(mode, d.name);
  return { id: d.id, name: d.name, rssi: d.rssi, mode, sn, label: PBm.displayName(d.name, mode, sn && sn.toUpperCase()) };
}

/** Whether the current screen shows nearby devices (so the radio should scan). */
function bleWantsScan() {
  if (!pbReady() || !S.server || !S.server.ble) return false;
  const r = parseRoute();
  if (r.name === 'device' && !r.sub) return true;
  if (r.name === 'tools' && r.tool === 'blufi' && BL.blufi.stage === 'pick') return true;
  if (S.modal === 'wireless' && !(BL.inst && (BL.inst.connected || BL.inst.connecting))) return true;
  return false;
}

async function bleState() {
  try { BL.st = await PB.bridge.state(); BL.stError = BL.st.error || ''; } catch (e) { BL.stError = bleMsg(e); }
}

async function bleScanTick() {
  try {
    await PB.bridge.scan(30);
    BL.stError = '';
  } catch (e) { BL.stError = bleMsg(e); BL.scanning = false; bleChanged(); }
}

async function bleListTick() {
  try {
    const r = await PB.bridge.devices();
    BL.scanning = r.scanning;
    BL.list = r.devices.map(bleClassify).filter(Boolean);
  } catch { /* keep the last list */ }
  bleNearbyChanged();
}

/** Starts or stops scanning to match the screen. Called after every render. */
function bleSyncScan() {
  const want = bleWantsScan();
  if (want && !BL.scanTimer) {
    bleScanTick();
    bleListTick();
    BL.scanTimer = setInterval(bleScanTick, 20000);
    BL.listTimer = setInterval(bleListTick, 1200);
  } else if (!want && BL.scanTimer) {
    clearInterval(BL.scanTimer); clearInterval(BL.listTimer);
    BL.scanTimer = BL.listTimer = null;
    BL.scanning = false;
    PB.bridge.stopScan().catch(() => {});
  }
}

function bleRescan() {
  BL.list = [];
  BL.stError = '';
  if (BL.scanTimer) { clearInterval(BL.scanTimer); clearInterval(BL.listTimer); BL.scanTimer = BL.listTimer = null; }
  bleChanged();
  bleSyncScan();
}

const modePill = mode => `<span class="pill-s ${mode === 'installer' ? 'green' : mode === 'blufi' ? 'amber' : 'purple'}">${t('mode_' + mode)}</span>`;

/* ---------------- re-rendering without losing typing ---------------- */
function bleReplace(el, html) {
  if (!el) return;
  const a = document.activeElement;
  const id = a && el.contains(a) ? a.id : '';
  const sel = id && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
  el.innerHTML = html;
  applyWidths(el);
  if (id) {
    const n = document.getElementById(id);
    if (n) { n.focus(); if (sel) try { n.setSelectionRange(sel[0], sel[1]); } catch { /* not a text field */ } }
  }
}

/** Something about Bluetooth changed: refresh what shows it. */
function bleChanged() {
  if (!S.server) return;
  const r = parseRoute();
  if (r.name === 'device' && !r.sub) bleReplace($('#ble-panel'), blePanel());
  if (r.name === 'device' && r.sub) bleReplace($('#ble-page'), r.sub === 'installer' ? installerPage() : passportPage());
  if (r.name === 'tools' && r.tool === 'blufi') bleReplace($('#ble-page'), blufiPage());
  if (S.modal === 'wireless' || S.modal === 'crop') bleReplace($('#modal-body'), S.modal === 'wireless' ? wirelessBody() : cropBody());
  if (S.modal === 'crop') cropDraw();
  bleSyncScan();
}

function bleNearbyChanged() {
  const r = parseRoute();
  if (r.name === 'device' && !r.sub) bleReplace($('#ble-panel'), blePanel());
  if (r.name === 'tools' && r.tool === 'blufi' && BL.blufi.stage === 'pick') bleReplace($('#ble-page'), blufiPage());
  if (S.modal === 'wireless' && !(BL.inst && BL.inst.connected)) bleReplace($('#modal-body'), wirelessBody());
}

/* ---------------- connection ---------------- */
function bleLinkLost(c) {
  if (BL.conn !== c) return;
  BL.conn = null;
  if (BL.inst && BL.inst.conn === c) { BL.inst.connected = false; BL.inst.connecting = false; }
  if (BL.pass && BL.pass.conn === c && BL.pass.phase === 'ready') { BL.pass.phase = 'failed'; BL.pass.failMsg = t('err_ble_disconnected'); }
  if (BL.blufi.conn === c && !['success', 'failure', 'pick'].includes(BL.blufi.stage)) { BL.blufi.stage = 'failure'; BL.blufi.error = t('err_ble_disconnected'); }
  bleChanged();
}

async function bleConnect(id, mode) {
  bleDisconnect();
  const c = await PB.bridge.connect(id);
  const m = PB.classifyConnected(c) || mode;
  if (m === 'blufi') c.mtu = Math.min(c.mtu, PB.MTU.blufi);
  c.onDisconnect = () => bleLinkLost(c);
  BL.conn = c;
  BL.wifi = { list: null, busy: false, sel: '', hidden: false, ssid: '', pw: '', error: '' };
  return c;
}

function bleDisconnect() {
  const c = BL.conn;
  BL.conn = null;
  if (c) c.close();
  if (BL.inst && BL.inst.conn === c) BL.inst = null;
  if (BL.pass && BL.pass.conn === c) BL.pass = null;
  if (BL.blufi.conn === c) BL.blufi = { stage: 'pick' };
}

const bleDeviceName = id => {
  const d = BL.list.find(x => x.id === id) || bleSaved().find(x => x.id === id);
  return d ? d.label || d.name : 'AI Passport';
};
const bleAdvertName = id => {
  const d = BL.list.find(x => x.id === id) || bleSaved().find(x => x.id === id);
  return (d && d.name) || '';
};

/* ---------------- Device tab ---------------- */
function blePanel() {
  if (!S.server.ble) return `<h2>${t('ble_title')}</h2><div class="notice">${t('ble_off')}</div>`;
  if (!pbReady()) return `<h2>${t('ble_nearby')}</h2><div class="searching"><span class="spinner"></span>${t('ble_loading')}</div>`;
  if (BL.stError && !BL.list.length) {
    return `<h2>${t('ble_nearby')}</h2><div class="notice red"><b>${t('ble_off')}</b><br>${esc(BL.stError)}<br><br>${t('ble_off_sub')}
      <div class="buttons"><button class="btn small" data-action="ble-rescan">${t('ble_retry')}</button></div></div>`;
  }
  const rows = BL.list.length ? BL.list.map(d => {
    const on = BL.conn && BL.conn.id === d.id;
    return `<button class="list-row" data-action="ble-open" data-id="${esc(d.id)}" data-mode="${d.mode}">
      <span><b>${esc(d.label)}</b><small>${[d.sn ? t('pp_sn', d.sn.toUpperCase()) : '', d.rssi ? `${d.rssi} dBm` : ''].filter(Boolean).join(' · ')}</small></span>
      ${on ? `<span class="pill-s green">${t('ble_connected')}</span>` : ''}${modePill(d.mode)}<i>›</i></button>`;
  }).join('') : `<div class="searching">${BL.scanning ? `<span class="spinner"></span>${t('ble_searching')}` : t('ble_none')}</div>`;
  return `<div class="row"><h2>${t('ble_nearby')}${BL.scanning ? ` <small class="muted">· ${t('ble_searching_short')}</small>` : ''}</h2>
      <button class="btn ghost small" data-action="ble-rescan">${t('ble_search_again')}</button></div>
    <p>${t('ble_lead')}</p>${rows}`;
}

/** "My devices" rows for devices connected over Bluetooth before. */
function bleSavedRows() {
  return bleSaved().map(d => {
    const near = BL.list.some(x => x.id === d.id);
    const bits = [t('mode_' + d.mode), d.sn ? t('pp_sn', d.sn.toUpperCase()) : '', d.wifi ? t('dev_wifi', d.wifi) : '', d.play ? t('dev_last_play', pick(d.play)) : ''].filter(Boolean);
    return `<div class="list-row static"><span><b>${esc(d.name)}</b><small>${bits.map(esc).join(' · ')}</small></span>
      <span class="pill-s ${near ? 'green' : 'grey'}">${near ? t('ble_nearby_pill') : t('ble_not_nearby')}</span>
      <button class="btn small" data-action="ble-open-saved" data-id="${esc(d.id)}" data-mode="${d.mode}">${t('ble_connect')}</button>
      <button class="btn ghost small" data-action="ble-forget" data-id="${esc(d.id)}">${t('dev_remove')}</button></div>`;
  }).join('');
}

function bleOpen(id, mode) {
  if (mode === 'installer') location.hash = '#/device/installer?id=' + encodeURIComponent(id);
  else if (mode === 'workcard') location.hash = '#/device/passport?id=' + encodeURIComponent(id);
  else if (mode === 'blufi') { location.hash = '#/tools/blufi'; blufiConnect(id); }
}

/** Renders the Bluetooth device pages (#/device/installer, #/device/passport). */
function renderBleDevice(sub) {
  const id = parseRoute().params.get('id') || '';
  if (sub === 'installer' && id && pbReady() && !(BL.inst && BL.inst.id === id)) queueMicrotask(() => instConnect(id));
  if (sub === 'passport' && id && pbReady() && !(BL.pass && BL.pass.id === id)) queueMicrotask(() => passConnect(id));
  return `<div class="settings tools ble-device"><a class="btn ghost small" href="#/device">‹ ${t('nav_device')}</a>
    <div id="ble-page">${sub === 'installer' ? installerPage() : passportPage()}</div></div>`;
}

/* ---------------- Wi-Fi picker ---------------- */
function wifiPicker(kind) {
  const w = BL.wifi || {};
  const busy = w.busy;
  let list;
  if (w.list === null) list = busy ? `<div class="searching"><span class="spinner"></span>${t('wifi_scanning')}</div>` : '';
  else if (!w.list.length) list = `<div class="searching">${busy ? `<span class="spinner"></span>${t('wifi_scanning')}` : t('wifi_none')}</div>`;
  else list = w.list.map(ap => `<label class="port ${!w.hidden && w.sel === ap.ssid ? 'selected' : ''}"><input type="radio" name="wifi" value="${esc(ap.ssid)}" data-action="wifi-pick" ${!w.hidden && w.sel === ap.ssid ? 'checked' : ''}>
      <span><b>${esc(ap.ssid)}</b><small>${ap.rssi} dBm${ap.open ? ' · ' + t('wifi_open') : ''}</small></span><span></span></label>`).join('');
  const ssid = w.hidden ? w.ssid : w.sel;
  return `<div class="wifi-picker">
    <div class="row"><b>${t('wifi_choose')}</b><button class="btn ghost small" data-action="wifi-scan" data-kind="${kind}" ${busy ? 'disabled' : ''}>${w.list ? t('wifi_refresh') : t('wifi_scan')}</button></div>
    <div class="ports">${list}</div>
    <label class="check mt10"><input type="checkbox" data-action="wifi-hidden" ${w.hidden ? 'checked' : ''}> ${t('wifi_hidden')}</label>
    ${w.hidden ? `<input class="field mt10" id="wifi-ssid" data-bind="ssid" maxlength="32" placeholder="${esc(t('wifi_name'))}" value="${esc(w.ssid)}" spellcheck="false">` : ssid ? `<p class="m-sub">${esc(t('wifi_selected', ssid))}</p>` : ''}
    <input class="field mt10" id="wifi-pw" data-bind="pw" type="password" maxlength="64" placeholder="${esc(t('wifi_pw'))}" value="${esc(w.pw)}" autocomplete="off">
    ${w.error ? `<div class="notice red mt10">${esc(w.error)}</div>` : ''}
    <p class="m-note">${t('wifi_note')}</p>
    <div class="buttons"><button class="btn primary" data-action="wifi-join" data-kind="${kind}" ${busy || !ssid ? 'disabled' : ''}>${busy && w.joining ? t('wifi_joining') : t('wifi_join')}</button></div>
  </div>`;
}

async function wifiScan(kind) {
  const w = BL.wifi;
  if (!w || w.busy) return;
  w.busy = true; w.error = '';
  bleChanged();
  try {
    const list = kind === 'blufi' ? await BL.blufi.client.scanWifi() : await BL.inst.client.scanWifi();
    w.list = list;
    if (!w.sel && list.length) w.sel = list[0].ssid;
  } catch (e) { w.error = bleMsg(e); if (!w.list) w.list = []; }
  w.busy = false;
  bleChanged();
}

async function wifiJoin(kind) {
  const w = BL.wifi;
  if (!w || w.busy) return;
  const ssid = (w.hidden ? w.ssid : w.sel).trim();
  if (!ssid) return;
  if (kind === 'blufi') { blufiProvision(ssid, w.pw); return; }
  const inst = BL.inst;
  w.busy = true; w.joining = true; w.error = '';
  bleChanged();
  try {
    await inst.client.joinWifi(ssid, w.pw);
    inst.wifiName = ssid;
    inst.message = t('inst_joined', ssid);
    bleRemember(inst.id, inst.name, inst.info && inst.info.sn, 'installer', { wifi: ssid });
    w.pw = '';
  } catch (e) { w.error = bleMsg(e); }
  w.busy = false; w.joining = false;
  bleChanged();
}

/* ---------------- device in install mode ---------------- */
const instWifiReady = () => !!(BL.inst && BL.inst.connected && BL.inst.status && BL.inst.status.state === PB.recovery.State.WIFI_READY);
const instInstalling = () => !!(BL.wi && ['fetch', 'sending', 'installing'].includes(BL.wi.phase));

async function instConnect(id) {
  if (instInstalling()) return;
  const name = bleDeviceName(id);
  const inst = { id, name, connecting: true, connected: false, info: null, status: null, error: '', message: '', client: null, conn: null };
  BL.inst = inst;
  bleChanged();
  try {
    const c = await bleConnect(id, 'installer');
    BL.inst = inst; // bleConnect clears sessions bound to an older link
    inst.conn = c;
    const client = new PB.recovery.RecoveryClient(c);
    const info = await client.connect();
    client.onStatus(s => { if (BL.inst === inst) { inst.status = s; bleChanged(); } });
    const saved = bleSaved().find(d => d.id === id);
    Object.assign(inst, { client, info, status: client.status, connecting: false, connected: c.connected, wifiName: saved && saved.wifi });
    bleRemember(id, name, info.sn, 'installer');
  } catch (e) {
    if (inst.conn) inst.conn.close();
    if (BL.conn === inst.conn) BL.conn = null;
    Object.assign(inst, { connecting: false, connected: false, error: bleMsg(e) });
  }
  if (BL.inst === inst) bleChanged();
}

function installerPage() {
  const inst = BL.inst;
  if (!pbReady()) return `<div class="searching"><span class="spinner"></span>${t('ble_loading')}</div>`;
  if (!inst) return `<h1>${t('inst_title')}</h1><p class="lead">${t('inst_pick')}</p>`;
  const pill = inst.connected ? `<span class="pill-s green">${t('ble_connected')}</span>` : inst.connecting ? `<span class="pill-s grey">${t('inst_connecting')}</span>` : `<span class="pill-s grey">${t('inst_off')}</span>`;
  const i = inst.info;
  const st = inst.status;
  const ready = instWifiReady();
  let wifiLine = '';
  if (inst.connected) wifiLine = ready ? `<div class="notice green-notice">${esc(inst.wifiName ? t('inst_wifi_ok_n', inst.wifiName) : t('inst_wifi_ok'))} · ${t('inst_ready_go')}</div>` : `<p class="m-sub">${t('inst_wifi_none')}</p>`;
  return `<h1>${t('inst_title')}</h1>
    <section class="panel">
      <div class="row"><h2>${esc(inst.name)}</h2>${pill}</div>
      ${i ? `<p class="mono-line">${esc(t('inst_info', i.sn.toUpperCase(), i.versionLabel, i.protocol, i.flashSize >> 20))}</p>` : ''}
      ${st ? `<p class="m-sub">${esc(t('inst_state', PB.recovery.stateLabel(st.state)))}${st.state === PB.recovery.State.DOWNLOADING ? ` · ${st.percent}%` : ''}</p>` : ''}
      ${inst.connecting ? `<div class="searching"><span class="spinner"></span>${t('pp_connecting')}</div>` : ''}
      ${inst.error ? `<div class="notice red">${esc(inst.error)}</div>` : ''}
      ${inst.message ? `<div class="notice green-notice">${esc(inst.message)}</div>` : ''}
      ${wifiLine}
      <div class="buttons">
        ${ready ? `<a class="btn primary" href="${libraryHash()}">${t('inst_go')}</a>` : ''}
        ${inst.connected ? `<button class="btn" data-action="inst-reboot">${t('inst_reboot')}</button><button class="btn ghost" data-action="inst-disconnect">${t('inst_disconnect')}</button>`
          : inst.connecting ? '' : `<button class="btn primary" data-action="inst-reconnect">${t('inst_reconnect')}</button>`}
      </div>
    </section>
    ${inst.connected ? `<section class="panel">${wifiPicker('inst')}</section>` : ''}`;
}

/* ---------------- wireless install (from a play page) ---------------- */
function wirelessOpen(slug) {
  if (S.server.flash.active) { toast(t('err_busy'), true); return; }
  if (!instInstalling()) BL.wi = { slug, phase: 'idle', percent: 0, error: '', plan: null, planError: null, checking: false };
  S.modal = 'wireless';
  renderModal();
  bleSyncScan();
  if (instWifiReady()) wirelessCheck();
}

/** Downloads the firmware if needed, then asks the app whether the installer can take it. */
async function wirelessCheck() {
  const wi = BL.wi;
  if (!wi || wi.checking || wi.plan || wi.planError) return;
  const p = S.bySlug.get(wi.slug);
  if (!p) return;
  wi.checking = true;
  bleChanged();
  try {
    if (!p.ready) {
      wi.fetching = true;
      bleChanged();
      await api('firmware/fetch', { slug: p.slug });
      for (;;) {
        await new Promise(r => setTimeout(r, 800));
        const st = await api('state');
        const f = st.fetch || {};
        if (f.slug === p.slug && f.done) break;
        if (f.slug === p.slug && !f.running && (f.errorCode || f.error)) {
          const e = new Error(f.errorCode === 'rate_limited' ? t('fetch_wait', countdown(f.throttledUntil) || '…') : errText(f.errorCode, f.error));
          throw e;
        }
      }
      p.ready = true;
      refreshReady();
    }
    wi.fetching = false;
    wi.plan = await api('wireless/plan', { slug: p.slug });
  } catch (e) {
    wi.planError = e.code ? errText(e.code, e.message) + (e.code === 'wireless_image' ? ` (${e.message})` : '') : bleMsg(e);
  }
  wi.checking = false; wi.fetching = false;
  bleChanged();
}

async function wirelessStart() {
  const wi = BL.wi;
  const inst = BL.inst;
  if (!wi || !wi.plan || !inst || !inst.client || instInstalling()) return;
  const p = S.bySlug.get(wi.slug);
  Object.assign(wi, { phase: 'sending', percent: 0, error: '' });
  bleChanged();
  try {
    const plan = wi.plan;
    await inst.client.install(plan.url, plan.size, plan.sha256, plan.appOffset, pct => {
      wi.phase = 'installing'; wi.percent = pct;
      bleChanged();
    });
    wi.phase = 'done'; wi.percent = 100;
    if (p) { bleRecordPlay(inst.id, p.title); recordInstall(p.slug); }
    // The device restarts into the new play.
    if (BL.conn === inst.conn) bleDisconnect();
    BL.inst = null;
  } catch (e) {
    wi.error = bleMsg(e);
    wi.failedAt = wi.phase;
    wi.phase = 'failed';
  }
  bleChanged();
}

function wirelessSteps(wi) {
  const order = ['fetch', 'sending', 'installing'];
  const at = wi.phase === 'done' ? 3 : wi.phase === 'failed' ? order.indexOf(wi.failedAt) : order.indexOf(wi.phase);
  return `<ol class="ble-steps">${order.map((k, i) => `<li class="${i < at ? 'done' : i === at ? (wi.phase === 'failed' ? 'fail' : 'on') : ''}">${t('wi_phase_' + k)}${i === at && k === 'installing' && wi.phase === 'installing' ? ` · ${wi.percent}%` : ''}</li>`).join('')}</ol>`;
}

function wirelessBody() {
  const wi = BL.wi;
  const p = wi && S.bySlug.get(wi.slug);
  if (!wi || !p) return '';
  const inst = BL.inst;
  const head = `<p class="m-title"><b>${esc(pick(p.title))}</b></p>`;
  const close = `<button class="btn" data-action="close-modal">${t('close')}</button>`;
  if (wi.phase === 'done') {
    return `${head}<div class="result"><div class="icon">✓</div><h3>${t('flash_done')}</h3><p>${t('wi_done')}</p></div>
      <div class="modal-foot inline"><button class="btn primary" data-action="close-modal">${t('done')}</button></div>`;
  }
  if (wi.phase === 'failed') {
    return `${head}${wirelessSteps(wi)}<div class="result fail"><div class="icon">!</div><h3>${t('wi_failed')}</h3><p>${esc(wi.error)}</p></div>
      <div class="modal-foot inline">${close}<button class="btn" data-action="wi-usb" data-slug="${esc(p.slug)}">${t('wi_usb')}</button>
      <button class="btn primary" data-action="wi-retry">${t('retry')}</button></div>`;
  }
  if (instInstalling()) {
    const pct = wi.phase === 'installing' ? wi.percent : 0;
    return `${head}${wirelessSteps(wi)}<div class="big-progress"><i data-w="${pct}"></i></div>
      <div class="progress-meta"><span>${esc(inst ? inst.name : '')}</span><span>${pct}%</span></div><div class="notice">${t('wi_keep')}</div>`;
  }
  if (!inst || (!inst.connected && !inst.connecting)) {
    const list = BL.list.filter(d => d.mode === 'installer');
    const rows = list.length ? list.map(d => `<button class="list-row" data-action="wi-connect" data-id="${esc(d.id)}"><span><b>${esc(d.label)}</b><small>${d.rssi} dBm</small></span>${modePill('installer')}<i>›</i></button>`).join('')
      : `<div class="searching">${BL.scanning ? `<span class="spinner"></span>${t('wi_searching')}` : t('wi_none')}</div>`;
    return `${head}<p class="m-sub"><b>${t('wi_steps')}</b></p>
      <ol class="ble-howto"><li><b>${t('wi_step1')}</b><small>${t('wi_step1_sub')} · <button class="link" data-action="wi-installer">${t('wi_installer_usb')}</button></small></li>
        <li><b>${t('wi_step2')}</b><small>${t('wi_step2_sub')}</small></li><li><b>${t('wi_step3')}</b><small>${t('wi_step3_sub')}</small></li></ol>
      ${inst && inst.error ? `<div class="notice red">${esc(inst.error)}</div>` : ''}
      <p class="m-sub"><b>${t('wi_devices')}</b></p><div class="ports">${rows}</div>
      <div class="modal-foot inline"><button class="btn ghost" data-action="ble-rescan">${t('ble_search_again')}</button>${close}</div>`;
  }
  const device = `<div class="row ble-dev-line"><span>${esc(inst.name)}${inst.info ? ` · ${esc(t('pp_sn', inst.info.sn.toUpperCase()))}` : ''}</span>
    ${inst.connecting ? `<span class="pill-s grey">${t('inst_connecting')}</span>` : `<button class="btn ghost small" data-action="wi-change">${t('wi_change')}</button>`}</div>`;
  if (inst.connecting) return `${head}${device}<div class="searching"><span class="spinner"></span>${t('pp_connecting')}</div>`;
  if (!instWifiReady()) {
    return `${head}${device}<p class="m-sub"><b>${t('wi_connect_wifi')}</b></p>${wifiPicker('inst')}
      <div class="modal-foot inline">${close}</div>`;
  }
  if (!wi.plan && !wi.planError && !wi.checking) queueMicrotask(wirelessCheck);
  if (wi.planError) {
    return `${head}${device}<div class="notice red">${esc(wi.planError)}</div>
      <div class="modal-foot inline">${close}<button class="btn primary" data-action="wi-usb" data-slug="${esc(p.slug)}">${t('wi_usb')}</button></div>`;
  }
  if (!wi.plan) {
    return `${head}${device}<div class="searching"><span class="spinner"></span>${wi.fetching ? t('wi_fetching') : t('wi_checking')}</div><div class="modal-foot inline">${close}</div>`;
  }
  return `${head}${device}<p class="m-sub">${t('wi_ready')}</p><div class="notice">${t('wi_keep')}</div>
    <div class="modal-foot inline">${close}<button class="btn primary" data-action="wi-start">${t('wi_start')}</button></div>`;
}

/* ---------------- Passport ---------------- */
async function loadCharset() {
  if (BL.charset) return BL.charset;
  try {
    const text = await (await fetch('/passport/charset.txt')).text();
    BL.charset = new Set(Array.from(text, c => c.codePointAt(0)));
  } catch { BL.charset = null; }
  return BL.charset;
}

const CHAR_HINTS = { '，': ',', '？': '?', '：': ':', '；': ';', '“': '"', '”': '"', '‘': "'", '’': "'" };
/** Empty when the device font has every character, else the message to show. */
function charsetError(v) {
  if (!BL.charset || !v) return '';
  const bad = [...new Set(Array.from(v).filter(c => !BL.charset.has(c.codePointAt(0))))];
  if (!bad.length) return '';
  const label = c => ({ '\n': lang === 'zh' ? '换行' : 'line break', '\t': lang === 'zh' ? '制表符' : 'tab', '​': lang === 'zh' ? '零宽空格' : 'zero-width space', ' ': lang === 'zh' ? '不换行空格' : 'non-breaking space' })[c] || c;
  const sep = lang === 'zh' ? '、' : ', ';
  const hints = bad.filter(c => CHAR_HINTS[c]).map(c => `${c} → ${CHAR_HINTS[c]}`).join(sep);
  return t('pp_chars_bad', bad.map(label).join(sep), hints);
}

const isTrae = () => BL.pass && BL.pass.product === 'trae';
const nameValid = n => { n = n.trim(); return !!n && utf8len(n) <= PP.NAME && !charsetError(n); };
function profileValid(title, intro) {
  if (charsetError(title) || charsetError(intro)) return false;
  const a = title.trim(), b = intro.trim();
  return !!a && !!b && utf8len(a) <= PP.TITLE && charLen(b) <= PP.INTRO_CHARS && utf8len(b) <= PP.INTRO_BYTES;
}

function pendingList(d) {
  return [d.infoDirty && t('pp_profile'), d.avatarDirty && t('pp_avatar'), d.imageDirty && t('pp_full')].filter(Boolean);
}

async function passConnect(id) {
  const name = bleAdvertName(id);
  const pass = { id, name: bleDeviceName(id), phase: 'connecting', failMsg: '', noPassport: false, sn: '', product: 'unknown', client: null, conn: null,
    draft: null, history: [], transfer: null, progress: 0, step: '', showFull: false, sleep: '5', volume: '50', score: PP.SCORE_DEFAULT, form: null };
  BL.pass = pass;
  bleChanged();
  loadCharset().then(() => bleChanged());
  try {
    const c = await bleConnect(id, 'workcard');
    BL.pass = pass;
    pass.conn = c;
    const client = new PB.workcard.WorkCardClient(c);
    const ident = await client.connect(name);
    pass.client = client;
    pass.sn = ident.sn;
    bleRemember(id, pass.name, ident.sn, 'workcard');
    try { pass.product = (await api('passport/product', { sn: ident.sn })).product; } catch { pass.product = 'unknown'; }
    if (pass.product === 'jd') { pass.phase = 'jd'; bleChanged(); return; }
    await passRestore(pass);
    pass.phase = 'ready';
  } catch (e) {
    if (pass.conn) pass.conn.close();
    if (BL.conn === pass.conn) BL.conn = null;
    if (e && e.workspaceUnavailable) pass.phase = 'unavailable';
    else Object.assign(pass, { phase: 'failed', noPassport: !!(e && e.code === 'workcard_missing'), failMsg: bleMsg(e) });
  }
  if (BL.pass === pass) bleChanged();
}

async function passRestore(pass) {
  const d = { name: pass.product === 'trae' ? 'TraeWork' : 'FoloToy', title: '', intro: PP.INTRO_DEFAULT, trae: TRAE_AVATARS[0],
    avatarPng: null, avatarUrl: '', fullJpeg: null, fullUrl: '', infoDirty: false, avatarDirty: false, imageDirty: false };
  let rec = null;
  try { rec = (await api('passport/load', { sn: pass.sn })).record; } catch { rec = null; }
  if (rec) {
    if (rec.name != null) d.name = rec.name;
    if (rec.title && rec.intro) { d.title = rec.title; d.intro = rec.intro; }
    if (rec.traeAvatar && TRAE_AVATARS.includes(rec.traeAvatar)) d.trae = rec.traeAvatar;
    if (rec.avatar) { d.avatarPng = b64ToBytes(rec.avatar); d.avatarUrl = blobUrl(d.avatarPng, 'image/png'); }
    if (rec.fullscreen) { d.fullJpeg = b64ToBytes(rec.fullscreen); d.fullUrl = blobUrl(d.fullJpeg, 'image/jpeg'); }
    if (rec.sleepMin != null && rec.volume != null) { pass.sleep = rec.sleepMin; pass.volume = rec.volume; }
    if (rec.score != null) pass.score = rec.score;
  }
  pass.draft = d;
  pass.form = { name: d.name, title: d.title, intro: d.intro };
  pass.history = [];
}

function passEdit(next, msg = true) {
  const pass = BL.pass;
  pass.history.push(pass.draft);
  pass.draft = next;
  if (msg) toast(t('pp_preview_updated'));
  bleChanged();
}

function passApplyInfo() {
  const pass = BL.pass;
  const f = pass.form;
  if (!nameValid(f.name)) { toast(charsetError(f.name) || t('pp_name_long'), true); return; }
  if (!isTrae() && !profileValid(f.title, f.intro)) { toast(charsetError(f.title) || charsetError(f.intro) || t('pp_profile_bad'), true); return; }
  pass.showFull = false;
  passEdit(isTrae() ? { ...pass.draft, name: f.name.trim(), infoDirty: true }
    : { ...pass.draft, name: f.name.trim(), title: f.title.trim(), intro: f.intro.trim(), infoDirty: true });
}

function passUndo() {
  const pass = BL.pass;
  if (!pass || pass.transfer || !pass.history.length) return;
  pass.draft = pass.history.pop();
  pass.form = { name: pass.draft.name, title: pass.draft.title, intro: pass.draft.intro };
  if (!pass.draft.fullUrl) pass.showFull = false;
  bleChanged();
}

async function passSync() {
  const pass = BL.pass;
  if (!pass || !pass.client || pass.transfer) return;
  const staged = pass.draft;
  const items = pendingList(staged);
  if (!items.length) return;
  if (staged.infoDirty && !(nameValid(staged.name) && (isTrae() || profileValid(staged.title, staged.intro)))) { toast(t('pp_fix_first'), true); return; }
  const total = items.length;
  const c = pass.client;
  pass.transfer = 'batch'; pass.progress = 0;
  let current = 0, info = false, avatar = false, image = false;
  const step = (label, fraction) => {
    pass.step = `${label} ${current}/${total}`;
    pass.progress = Math.max(pass.progress, Math.floor(((current - 1) + Math.min(0.99, fraction)) / total * 100));
    bleChanged();
  };
  try {
    if (staged.infoDirty) {
      current++; step(t('pp_profile'), 0);
      await c.sendConfig(isTrae() ? { name: staged.name } : { nickname: staged.name, title: staged.title, intro: staged.intro });
      info = true; pass.progress = Math.floor(current * 100 / total);
    }
    if (staged.avatarDirty) {
      current++; step(t('pp_avatar'), 0);
      if (isTrae()) await c.sendTraeAvatar(staged.trae);
      else await c.sendAvatar(staged.avatarPng, f => step(t('pp_avatar'), f));
      avatar = true; pass.progress = Math.floor(current * 100 / total);
    }
    if (staged.imageDirty) {
      current++; step(t('pp_full'), 0);
      await c.sendFullscreen(staged.fullJpeg, isTrae(), f => step(t('pp_full'), f));
      image = true; pass.progress = 100;
    }
    pass.history = [];
    toast(image ? t('pp_synced_full') : t('pp_synced'));
  } catch (e) {
    if (e && e.workspaceUnavailable) pass.phase = 'unavailable';
    toast(bleMsg(e), true);
  } finally {
    const clear = d => ({ ...d, infoDirty: d.infoDirty && !info, avatarDirty: d.avatarDirty && !avatar, imageDirty: d.imageDirty && !image });
    pass.draft = clear(pass.draft);
    pass.history = pass.history.map(clear);
    const rec = { sn: pass.sn };
    if (info) Object.assign(rec, { name: staged.name, title: staged.title, intro: staged.intro });
    if (avatar && isTrae()) rec.traeAvatar = staged.trae;
    if (avatar && !isTrae()) rec.avatar = bytesToB64(staged.avatarPng);
    if (image) rec.fullscreen = bytesToB64(staged.fullJpeg);
    if (info || avatar || image) api('passport/save', rec).catch(() => {});
    pass.transfer = null; pass.progress = 0; pass.step = '';
    bleChanged();
  }
}

async function passScore(clear) {
  const pass = BL.pass;
  if (!pass || !pass.client || pass.transfer) return;
  const text = clear ? 'a:' : pass.score.trim();
  if (!clear && (!text || utf8len(text) > PP.SCORE)) { toast(t('pp_score_bad'), true); return; }
  pass.transfer = clear ? 'clear' : 'score'; pass.progress = 0;
  bleChanged();
  try {
    await pass.client.sendScore(text, f => { pass.progress = Math.min(99, Math.floor(f * 100)); bleChanged(); });
    if (clear) pass.score = '';
    api('passport/save', { sn: pass.sn, score: clear ? '' : text }).catch(() => {});
    toast(clear ? t('pp_music_cleared') : t('pp_music_sent'));
  } catch (e) { toast(bleMsg(e), true); }
  pass.transfer = null; pass.progress = 0;
  bleChanged();
}

async function passSettings() {
  const pass = BL.pass;
  if (!pass || !pass.client || pass.transfer) return;
  const s = String(pass.sleep).trim(), v = String(pass.volume).trim();
  const sn = /^\d+$/.test(s) ? Number(s) : -1, vn = /^\d+$/.test(v) ? Number(v) : -1;
  if (sn < 0 || vn < 0 || vn > 100) { toast(t('pp_settings_bad'), true); return; }
  pass.transfer = 'settings';
  bleChanged();
  try {
    await pass.client.sendConfig({ sleep_min: sn, volume: vn });
    api('passport/save', { sn: pass.sn, sleepMin: s, volume: v }).catch(() => {});
    toast(t('pp_settings_saved'));
  } catch (e) { toast(bleMsg(e), true); }
  pass.transfer = null;
  bleChanged();
}

function passPreview(pass) {
  const d = pass.draft;
  if (pass.showFull && d.fullUrl) return `<div class="pp-screen full"><img src="${d.fullUrl}" alt=""></div>`;
  const avatar = isTrae() ? `/passport/trae-avatars/${d.trae}.png` : d.avatarUrl;
  return `<div class="pp-screen card">
    <div class="pp-avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : ''}</div>
    <div class="pp-text"><b>${esc(d.name)}</b>${isTrae() ? '' : `<span>${esc(d.title)}</span><p>${esc(d.intro)}</p>`}</div>
    <small>AI PASSPORT</small></div>`;
}

function counter(v, max, chars) {
  const n = chars ? charLen(v.trim()) : utf8len(v.trim());
  return `<small class="pp-count ${n > max ? 'over' : ''}">${chars ? t('pp_chars', n, max) : t('pp_bytes', n, max)}</small>`;
}

function passportPage() {
  const pass = BL.pass;
  if (!pbReady()) return `<div class="searching"><span class="spinner"></span>${t('ble_loading')}</div>`;
  if (!pass) return `<h1>${t('pp_title')}</h1><p class="lead">${t('inst_pick')}</p>`;
  const top = `<h1>${t('pp_title')}</h1><p class="lead">${t('pp_slogan')}${pass.sn ? ` · ${esc(t('pp_sn', pass.sn))}` : ''}${isTrae() ? ` · ${t('pp_trae')}` : ''}</p>`;
  const again = `<button class="btn primary" data-action="pp-reconnect">${t('pp_reconnect')}</button><a class="btn ghost" href="#/device">${t('pp_other')}</a>`;
  if (pass.phase === 'connecting') return `${top}<section class="panel"><div class="searching"><span class="spinner"></span>${t('pp_connecting')}</div><p class="m-sub">${t('pp_keep')}</p></section>`;
  if (pass.phase === 'failed') {
    return `${top}<section class="panel"><h2>${pass.noPassport ? t('pp_missing') : t('pp_failed')}</h2><p>${esc(pass.noPassport ? t('pp_missing_sub') : pass.failMsg)}</p>
      <div class="buttons">${again}${pass.noPassport ? `<a class="btn" href="#/tools/restore">${t('pp_restore_usb')}</a>` : ''}</div></section>`;
  }
  if (pass.phase === 'unavailable') {
    return `${top}<section class="panel"><h2>${t('pp_unavailable')}</h2><p>${t('pp_unavailable_sub')}</p>
      <div class="buttons"><a class="btn primary" href="#/tools/restore">${t('pp_restore_usb')}</a>${again}</div></section>`;
  }
  if (pass.phase === 'jd') return `${top}<section class="panel"><h2>${t('pp_jd')}</h2><p>${t('pp_jd_sub')}</p><div class="buttons"><a class="btn ghost" href="#/device">${t('pp_other')}</a></div></section>`;
  const d = pass.draft, f = pass.form;
  const busy = !!pass.transfer;
  const pending = pendingList(d);
  const chip = on => (on ? ` <span class="pill-s amber">${t('pp_changed')}</span>` : '');
  const err = v => { const e = charsetError(v); return e ? `<small class="pp-err">${esc(e)}</small>` : ''; };
  const profile = `<section class="panel"><h2>${t('pp_profile')}${chip(d.infoDirty)}</h2><p>${isTrae() ? t('pp_profile_trae') : t('pp_profile_sub')}</p>
    <label class="pp-field"><span>${t('pp_name')}</span><input class="field" id="pp-name" data-bind="name" value="${esc(f.name)}" placeholder="${esc(t('pp_name_ph'))}" spellcheck="false">${counter(f.name, PP.NAME)}${err(f.name)}</label>
    ${isTrae() ? '' : `<label class="pp-field"><span>${t('pp_job')}</span><input class="field" id="pp-title" data-bind="title" value="${esc(f.title)}" placeholder="${esc(t('pp_job_ph'))}" spellcheck="false">${counter(f.title, PP.TITLE)}${err(f.title)}</label>
    <label class="pp-field"><span>${t('pp_intro')}</span><input class="field" id="pp-intro" data-bind="intro" value="${esc(f.intro)}" placeholder="${esc(t('pp_intro_ph'))}" spellcheck="false">${counter(f.intro, PP.INTRO_CHARS, true)}${err(f.intro)}</label>`}
    <div class="buttons"><button class="btn" data-action="pp-apply" ${busy ? 'disabled' : ''}>${t('pp_apply')}</button></div></section>`;
  const avatar = isTrae()
    ? `<section class="panel"><h2>${t('pp_avatar')}${chip(d.avatarDirty)}</h2><p>${t('pp_avatar_trae')}</p><div class="pp-trae">${TRAE_AVATARS.map((k, i) => `<button class="${d.trae === k ? 'active' : ''}" data-action="pp-trae" data-key="${k}" title="${esc(t('pp_trae_n', i + 1))}" ${busy ? 'disabled' : ''}><img src="/passport/trae-avatars/${k}.png" alt=""></button>`).join('')}</div></section>`
    : `<section class="panel"><h2>${t('pp_avatar')}${chip(d.avatarDirty)}</h2><p>${t('pp_avatar_sub')}</p><div class="buttons"><button class="btn" data-action="pp-pick" data-kind="avatar" ${busy ? 'disabled' : ''}>${d.avatarUrl ? t('pp_pick_again') : t('pp_pick')}</button></div></section>`;
  const full = `<section class="panel"><h2>${t('pp_full')}${chip(d.imageDirty)}</h2><p>${t('pp_full_sub')}</p><div class="buttons"><button class="btn" data-action="pp-pick" data-kind="full" ${busy ? 'disabled' : ''}>${d.fullUrl ? t('pp_pick_again') : t('pp_pick')}</button>
    ${d.fullUrl ? `<button class="btn ghost" data-action="pp-toggle-full">${pass.showFull ? t('pp_show_card') : t('pp_show_full')}</button>` : ''}</div></section>`;
  let syncBar;
  if (pass.transfer === 'batch') syncBar = `<div class="big-progress"><i data-w="${pass.progress}"></i></div><div class="progress-meta"><span>${esc(t('pp_sending', pass.step))}</span><span>${pass.progress}%</span></div>`;
  else syncBar = `${pending.length ? `<p class="m-sub">${esc(pending.join(' · '))}</p>` : `<p class="m-sub">${t('pp_none')}</p>`}
    <div class="buttons"><button class="btn primary" data-action="pp-sync" ${pending.length && !busy ? '' : 'disabled'}>${pending.length ? t('pp_pending', pending.length) : t('pp_sync')}</button>
    <button class="btn ghost" data-action="pp-undo" ${pass.history.length && !busy ? '' : 'disabled'}>${t('pp_undo')}</button></div>`;
  const scoreBytes = utf8len(pass.score.trim());
  const music = `<section class="panel"><h2>${t('pp_music')}</h2><p>${t('pp_music_sub')}</p>
    <textarea class="field mono" id="pp-score" data-bind="score" rows="3" spellcheck="false">${esc(pass.score)}</textarea>
    <small class="pp-count ${scoreBytes > PP.SCORE ? 'over' : ''}">${t('pp_bytes', scoreBytes, PP.SCORE)}</small><p class="m-note">${t('pp_score_fmt')}</p>
    <div class="buttons"><button class="btn" data-action="pp-score" ${busy ? 'disabled' : ''}>${pass.transfer === 'score' ? t('pp_sending_p', pass.progress) : t('pp_send')}</button>
    <button class="btn ghost" data-action="pp-score-clear" ${busy ? 'disabled' : ''}>${pass.transfer === 'clear' ? t('pp_clearing') : t('pp_clear')}</button></div></section>`;
  const settings = `<section class="panel"><h2>${t('pp_settings')}</h2><p>${t('pp_settings_sub')}</p>
    <div class="pp-grid"><label class="pp-field"><span>${t('pp_sleep')}</span><input class="field" id="pp-sleep" data-bind="sleep" inputmode="numeric" value="${esc(pass.sleep)}"><small class="muted">${t('pp_sleep_hint')}</small></label>
    <label class="pp-field"><span>${t('pp_volume')}</span><input class="field" id="pp-volume" data-bind="volume" inputmode="numeric" value="${esc(pass.volume)}"><small class="muted">${t('pp_volume_hint')}</small></label></div>
    <div class="buttons"><button class="btn" data-action="pp-settings" ${busy ? 'disabled' : ''}>${pass.transfer === 'settings' ? t('pp_saving') : t('pp_save')}</button></div></section>`;
  return `${top}<div class="pp-layout">
    <div class="pp-side"><section class="panel"><h2>${t('pp_preview')}</h2>${passPreview(pass)}${syncBar}</section></div>
    <div class="pp-main">${profile}${avatar}${full}<h3 class="pp-sep">${t('pp_separate')}</h3>${music}${settings}</div></div>`;
}

/* ---------------- picture crop ---------------- */
const CROP_SIZE = { avatar: [96, 156], full: [240, 320] };

async function passPick(kind) {
  let bytes = null;
  try {
    if (S.server.native) {
      const r = await api('image/choose', {});
      if (!r || !r.data) return;
      bytes = b64ToBytes(r.data);
    } else {
      bytes = await new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => { const f = input.files && input.files[0]; if (!f) resolve(null); else f.arrayBuffer().then(b => resolve(new Uint8Array(b)), () => resolve(null)); };
        input.click();
      });
      if (!bytes) return;
    }
    const bmp = await createImageBitmap(new Blob([bytes]));
    BL.crop = { kind, bmp, scale: 1, ox: 0, oy: 0 };
    S.modal = 'crop';
    renderModal();
  } catch (e) {
    toast(e && e.code ? errText(e.code, e.message) : t('pp_img_bad'), true);
  }
}

/** Draws the crop onto ctx at w×h: cover fit, then zoom and offset (fractions of the frame), on white. */
function cropRender(ctx, w, h, cr) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  const b = cr.bmp;
  const cover = Math.max(w / b.width, h / b.height) * cr.scale;
  const dw = b.width * cover, dh = b.height * cover;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(b, (w - dw) / 2 + cr.ox * w, (h - dh) / 2 + cr.oy * h, dw, dh);
}

function cropBody() {
  const cr = BL.crop;
  if (!cr) return '';
  const [w, h] = CROP_SIZE[cr.kind];
  const k = cr.kind === 'avatar' ? 2 : 1.25;
  return `<p class="m-sub">${t('pp_crop_hint')}</p>
    <div class="crop-wrap"><canvas id="crop-canvas" width="${w * 2}" height="${h * 2}" style="width:${w * k}px;height:${h * k}px"></canvas></div>
    <label class="pp-field mt10"><span>${t('pp_zoom')}</span><input type="range" id="crop-zoom" min="1" max="4" step="0.01" value="${cr.scale}"></label>
    <div class="modal-foot inline"><button class="btn" data-action="close-modal">${t('cancel')}</button><button class="btn primary" data-action="crop-use">${t('pp_use')}</button></div>`;
}

function cropDraw() {
  const cv = $('#crop-canvas');
  if (!cv || !BL.crop) return;
  cropRender(cv.getContext('2d'), cv.width, cv.height, BL.crop);
}

/** Avatar PNG the firmware accepts: 8-bit RGB (colour type 2), one stored deflate block. */
function avatarPng(rgba, w, h) {
  const raw = new Uint8Array(h * (1 + w * 3));
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = rgba[i + 3] / 255;
      for (let c = 0; c < 3; c++) raw[p++] = a === 1 ? rgba[i + c] : Math.round(rgba[i + c] * a + 255 * (1 - a));
    }
  }
  const n = raw.length; // 45084, fits one stored block
  const z = new Uint8Array(n + 11);
  z.set([0x78, 0x01, 0x01, n & 0xff, n >> 8, ~n & 0xff, (~n >> 8) & 0xff]);
  z.set(raw, 7);
  let a = 1, b = 0;
  for (const v of raw) { a = (a + v) % 65521; b = (b + a) % 65521; }
  const ad = ((b << 16) | a) >>> 0;
  z.set([ad >>> 24, (ad >>> 16) & 0xff, (ad >>> 8) & 0xff, ad & 0xff], n + 7);
  const be32 = v => [v >>> 24, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
  const chunk = (type, data) => {
    const body = new Uint8Array(4 + data.length);
    body.set(Array.from(type, c => c.charCodeAt(0)));
    body.set(data, 4);
    const out = new Uint8Array(data.length + 12);
    out.set(be32(data.length));
    out.set(body, 4);
    out.set(be32(PB.crc32(body)), 8 + data.length);
    return out;
  };
  const ihdr = new Uint8Array([...be32(w), ...be32(h), 8, 2, 0, 0, 0]);
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, x) => s + x.length, 0));
  let at = 0;
  for (const x of parts) { out.set(x, at); at += x.length; }
  return out;
}

/** Throws unless the JPEG is 8-bit baseline (SOF0) at w×h; the device can't decode progressive JPEG. */
function checkBaselineJpeg(b, w, h) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw new Error('not a JPEG');
  let off = 2, ok = false;
  while (off + 3 < b.length) {
    if (b[off] !== 0xff) { off++; continue; }
    while (off < b.length && b[off] === 0xff) off++;
    const m = b[off++];
    if (m === 0xd9 || m === 0xda) break;
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) continue;
    const len = (b[off] << 8) | b[off + 1];
    if (len < 2 || off + len > b.length) break;
    if (m >= 0xc1 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) throw new Error('not baseline');
    if (m === 0xc0) {
      if (b[off + 2] !== 8 || ((b[off + 3] << 8) | b[off + 4]) !== h || ((b[off + 5] << 8) | b[off + 6]) !== w) throw new Error('wrong size');
      ok = true;
    }
    off += len;
  }
  if (!ok) throw new Error('no baseline frame');
}

const canvasJpeg = (cv, q) => new Promise((resolve, reject) => cv.toBlob(bl => (bl ? bl.arrayBuffer().then(x => resolve(new Uint8Array(x)), reject) : reject(new Error('encode'))), 'image/jpeg', q));

async function cropUse() {
  const cr = BL.crop;
  const pass = BL.pass;
  if (!cr || !pass || !pass.draft) return;
  const [w, h] = CROP_SIZE[cr.kind];
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  cropRender(ctx, w, h, cr);
  try {
    if (cr.kind === 'avatar') {
      const png = avatarPng(ctx.getImageData(0, 0, w, h).data, w, h);
      if (pass.draft.avatarUrl) { /* kept for undo */ }
      pass.showFull = false;
      passEdit({ ...pass.draft, avatarPng: png, avatarUrl: blobUrl(png, 'image/png'), avatarDirty: true });
    } else {
      let best = null;
      for (const q of [0.68, 0.58, 0.48, 0.40]) {
        const jpg = await canvasJpeg(cv, q);
        checkBaselineJpeg(jpg, w, h);
        if (!best || jpg.length < best.length) best = jpg;
        if (jpg.length <= PP.FULL_TARGET) break;
      }
      if (!best || best.length > PP.MAX_IMG) throw new Error(t('pp_img_big'));
      pass.showFull = true;
      passEdit({ ...pass.draft, fullJpeg: best, fullUrl: blobUrl(best, 'image/jpeg'), imageDirty: true });
    }
  } catch (e) {
    toast(e.message === t('pp_img_big') ? e.message : `${t('pp_img_bad')}: ${bleMsg(e)}`, true);
    return;
  }
  if (cr.bmp.close) cr.bmp.close();
  BL.crop = null;
  S.modal = null;
  renderModal();
}

/* ---------------- Bluetooth Wi-Fi setup (BluFi) ---------------- */
async function blufiConnect(id) {
  const bf = { stage: 'connecting', id, name: bleDeviceName(id), step: 0, error: '', ssid: '', client: null, conn: null };
  BL.blufi = bf;
  bleChanged();
  try {
    const c = await bleConnect(id, 'blufi');
    BL.blufi = bf;
    bf.conn = c;
    bf.step = 1;
    bleChanged();
    const client = new PB.blufi.BlufiClient(c);
    await client.connect();
    bf.client = client;
    bf.stage = 'wifi';
    bleRemember(id, bf.name, '', 'blufi');
    bleChanged();
    wifiScan('blufi');
  } catch (e) {
    if (bf.conn) bf.conn.close();
    if (BL.conn === bf.conn) BL.conn = null;
    Object.assign(bf, { stage: 'failure', error: bleMsg(e) });
    bleChanged();
  }
}

async function blufiProvision(ssid, pw) {
  const bf = BL.blufi;
  if (!bf.client) return;
  Object.assign(bf, { stage: 'provisioning', step: 0, ssid, error: '' });
  bleChanged();
  const order = Object.values(PB.blufi.Step);
  try {
    await bf.client.provision(ssid, pw, s => { bf.step = order.indexOf(s); bleChanged(); });
    bf.stage = 'success';
    bleRemember(bf.id, bf.name, '', 'blufi', { wifi: ssid });
    if (BL.wifi) BL.wifi.pw = '';
  } catch (e) { Object.assign(bf, { stage: 'failure', error: bleMsg(e) }); }
  bleChanged();
}

function stepList(labels, at, failed) {
  return `<ol class="ble-steps">${labels.map((l, i) => `<li class="${i < at ? 'done' : i === at ? (failed ? 'fail' : 'on') : ''}">${l}</li>`).join('')}</ol>`;
}

function blufiPage() {
  const bf = BL.blufi;
  if (!pbReady()) return `<div class="searching"><span class="spinner"></span>${t('ble_loading')}</div>`;
  const top = `<h1>${t('bf_title')}</h1>`;
  if (bf.stage === 'pick') {
    const list = BL.list.filter(d => d.mode === 'blufi');
    const rows = list.length ? list.map(d => `<button class="list-row" data-action="bf-connect" data-id="${esc(d.id)}"><span><b>${esc(d.label)}</b><small>${d.rssi} dBm</small></span>${modePill('blufi')}<i>›</i></button>`).join('')
      : `<div class="searching">${BL.stError ? esc(BL.stError) : BL.scanning ? `<span class="spinner"></span>${t('bf_searching')}` : t('bf_none')}</div>`;
    return `${top}<section class="panel"><h2>${t('bf_before')}</h2><ol class="plain-list">${I18N[lang].bf_before_list.map(x => `<li>${esc(x)}</li>`).join('')}</ol></section>
      <section class="panel"><div class="row"><h2>${t('ble_nearby')}</h2><button class="btn ghost small" data-action="ble-rescan">${t('ble_search_again')}</button></div>${rows}</section>`;
  }
  const dev = `<p class="lead">${esc(bf.name || '')}</p>`;
  const prov = [t('bf_step_mode'), t('bf_step_ssid'), t('bf_step_pw'), t('bf_step_ip')];
  if (bf.stage === 'connecting') return `${top}${dev}<section class="panel">${stepList([t('bf_step_connect'), t('bf_step_secure')], bf.step)}</section>`;
  if (bf.stage === 'wifi') return `${top}${dev}<section class="panel"><span class="pill-s green">${t('bf_secure_ok')}</span><div class="sp12"></div>${wifiPicker('blufi')}</section>`;
  if (bf.stage === 'provisioning') return `${top}${dev}<section class="panel"><p class="m-sub">${esc(t('wifi_selected', bf.ssid))}</p>${stepList(prov, bf.step)}</section>`;
  if (bf.stage === 'success') {
    return `${top}${dev}<section class="panel"><div class="result"><div class="icon">✓</div><h3>${esc(t('bf_ok', bf.ssid))}</h3></div>
      <div class="buttons"><button class="btn primary" data-action="bf-done">${t('bf_done')}</button></div></section>`;
  }
  return `${top}${dev}<section class="panel"><div class="result fail"><div class="icon">!</div><h3>${t('bf_failed')}</h3><p>${esc(bf.error)}</p></div>
    <div class="buttons">${bf.client && BL.conn === bf.conn && bf.conn && bf.conn.connected ? `<button class="btn primary" data-action="bf-again">${t('bf_again')}</button>` : ''}
    <button class="btn" data-action="bf-other">${t('bf_other')}</button></div></section>`;
}

function renderBlufi() {
  return `<div class="settings tools"><a class="btn ghost small" href="#/tools">‹ ${t('tools_title')}</a><div id="ble-page">${blufiPage()}</div></div>`;
}

/** The play page's wireless install button (only where this build has Bluetooth). */
function wirelessButton(p) {
  if (!S.server.ble || p.removed || (!p.ready && !p.downloadable) || p.slug === S.server.installer) return '';
  return `<button class="btn small" data-action="wireless-open" data-slug="${esc(p.slug)}">${t('wi_btn')}</button>`;
}

/** Called at the end of every render(). */
function bleAfterRender() {
  if (!pbReady()) return;
  PB.setLanguage(lang);
  if (S.modal === 'crop') cropDraw();
  bleSyncScan();
}

/* ---------------- events ---------------- */
Object.assign(actions, {
  'ble-rescan': () => { bleState().then(bleRescan); },
  'ble-open': el => bleOpen(el.dataset.id, el.dataset.mode),
  'ble-open-saved': el => {
    const d = bleSaved().find(x => x.id === el.dataset.id);
    if (!d) return;
    if (!BL.list.some(x => x.id === d.id) && !(BL.conn && BL.conn.id === d.id)) { toast(d.mode === 'installer' ? t('ble_not_near_inst', d.name) : t('ble_not_near_toast', d.name), true); return; }
    bleOpen(d.id, d.mode);
  },
  'ble-forget': el => { bleSave(bleSaved().filter(d => d.id !== el.dataset.id)); render(); },
  'inst-reconnect': () => { if (BL.inst) instConnect(BL.inst.id); },
  'inst-disconnect': () => { if (instInstalling()) return; bleDisconnect(); BL.inst = null; location.hash = '#/device'; },
  'inst-reboot': async () => {
    const inst = BL.inst;
    if (!inst || !inst.client || instInstalling() || !confirm(t('inst_reboot_q'))) return;
    await inst.client.reboot();
    bleDisconnect();
    BL.inst = null;
    location.hash = '#/device';
  },
  'wifi-scan': el => wifiScan(el.dataset.kind),
  'wifi-join': el => wifiJoin(el.dataset.kind),
  'wireless-open': el => wirelessOpen(el.dataset.slug),
  'wi-connect': el => instConnect(el.dataset.id),
  'wi-change': () => { if (instInstalling()) return; bleDisconnect(); BL.inst = null; if (BL.wi) Object.assign(BL.wi, { plan: null, planError: null }); bleChanged(); },
  'wi-start': () => wirelessStart(),
  'wi-retry': () => { if (BL.wi) Object.assign(BL.wi, { phase: 'idle', error: '', plan: null, planError: null }); bleChanged(); },
  'wi-usb': el => { S.modal = null; renderModal(); actions.flash({ dataset: { slug: el.dataset.slug } }); },
  'wi-installer': () => { S.modal = null; renderModal(); actions['tool-installer'](); },
  'pp-reconnect': () => { if (BL.pass) passConnect(BL.pass.id); },
  'pp-apply': () => passApplyInfo(),
  'pp-trae': el => { const p = BL.pass; if (!p || p.transfer) return; p.showFull = false; passEdit({ ...p.draft, trae: el.dataset.key, avatarDirty: true }); },
  'pp-pick': el => passPick(el.dataset.kind),
  'pp-toggle-full': () => { if (BL.pass) { BL.pass.showFull = !BL.pass.showFull; bleChanged(); } },
  'pp-sync': () => passSync(),
  'pp-undo': () => passUndo(),
  'pp-score': () => passScore(false),
  'pp-score-clear': () => passScore(true),
  'pp-settings': () => passSettings(),
  'crop-use': () => cropUse(),
  'bf-connect': el => blufiConnect(el.dataset.id),
  'bf-again': () => { BL.blufi.stage = 'wifi'; BL.blufi.error = ''; bleChanged(); },
  'bf-other': () => { bleDisconnect(); BL.blufi = { stage: 'pick' }; bleChanged(); },
  'bf-done': () => { bleDisconnect(); BL.blufi = { stage: 'pick' }; location.hash = '#/tools'; },
});

document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.matches('[data-action="wifi-pick"]') && BL.wifi) { BL.wifi.sel = el.value; BL.wifi.hidden = false; bleChanged(); }
  if (el.matches('[data-action="wifi-hidden"]') && BL.wifi) { BL.wifi.hidden = el.checked; bleChanged(); }
});
document.addEventListener('input', ev => {
  const el = ev.target;
  const key = el.dataset && el.dataset.bind;
  if (el.id === 'crop-zoom' && BL.crop) { BL.crop.scale = Number(el.value); cropDraw(); return; }
  if (!key) return;
  if (el.closest('.wifi-picker') && BL.wifi) {
    BL.wifi[key] = el.value;
    if (key === 'ssid') { const b = $('[data-action="wifi-join"]'); if (b) b.disabled = BL.wifi.busy || !el.value.trim(); }
    return;
  }
  const pass = BL.pass;
  if (!pass) return;
  if (['name', 'title', 'intro'].includes(key)) {
    pass.form[key] = el.value;
    const label = el.closest('.pp-field');
    const max = key === 'intro' ? PP.INTRO_CHARS : key === 'title' ? PP.TITLE : PP.NAME;
    const c = label && label.querySelector('.pp-count');
    if (c) c.outerHTML = counter(el.value, max, key === 'intro');
    const old = label && label.querySelector('.pp-err');
    if (old) old.remove();
    const e = charsetError(el.value);
    if (e && label) label.insertAdjacentHTML('beforeend', `<small class="pp-err">${esc(e)}</small>`);
  } else if (key === 'score') {
    pass.score = el.value;
    const c = el.parentElement.querySelector('.pp-count');
    const n = utf8len(el.value.trim());
    if (c) { c.textContent = t('pp_bytes', n, PP.SCORE); c.classList.toggle('over', n > PP.SCORE); }
  } else if (key === 'sleep' || key === 'volume') pass[key] = el.value;
});

// Dragging the picture in the crop dialog.
let cropDrag = null;
document.addEventListener('pointerdown', ev => {
  if (ev.target.id !== 'crop-canvas' || !BL.crop) return;
  cropDrag = { x: ev.clientX, y: ev.clientY, ox: BL.crop.ox, oy: BL.crop.oy, w: ev.target.clientWidth, h: ev.target.clientHeight };
  ev.target.setPointerCapture(ev.pointerId);
});
document.addEventListener('pointermove', ev => {
  if (!cropDrag || !BL.crop) return;
  BL.crop.ox = cropDrag.ox + (ev.clientX - cropDrag.x) / cropDrag.w;
  BL.crop.oy = cropDrag.oy + (ev.clientY - cropDrag.y) / cropDrag.h;
  cropDraw();
});
document.addEventListener('pointerup', () => { cropDrag = null; });
document.addEventListener('wheel', ev => {
  if (ev.target.id !== 'crop-canvas' || !BL.crop) return;
  ev.preventDefault();
  BL.crop.scale = Math.max(1, Math.min(4, BL.crop.scale * (ev.deltaY < 0 ? 1.06 : 1 / 1.06)));
  const z = $('#crop-zoom');
  if (z) z.value = BL.crop.scale;
  cropDraw();
}, { passive: false });

window.addEventListener('pb-ready', () => {
  PB.setLanguage(lang);
  bleState().then(() => { if (S.server) render(); });
});
