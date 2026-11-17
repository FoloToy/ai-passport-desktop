'use strict';
/* 设备 and 工具 pages, laid out like the Android app (minus NFC), plus "My backups" and the
   hidden booth batch download. Loaded after app.js and community.js; shares their globals. */

Object.assign(I18N.zh, {
  nav_device: '设备', nav_plays: '玩法', nav_tools: '工具',
  dev_title: '连接设备', dev_lead: '用数据线连接可以安装玩法、备份和恢复出厂；用蓝牙连接可以无线安装、给设备配网和编辑通行证。',
  usb_title: '数据线连接', usb_connected: '已连接', usb_unknown: '没认出设备', usb_none: '未连接', usb_checking: '正在检查…',
  usb_none_sub: '用支持数据传输的 USB 线连接 AI Passport。', usb_unknown_sub: '找到了串口，但不像是 AI Passport。', usb_many: n => `连接了 ${n} 台设备，一次只能操作一台。`,
  dev_go_plays: '去玩法社区安装', dev_backup: '备份设备', dev_restore: '恢复出厂', dev_local: '安装本地固件',
  my_devices: '我的设备', my_devices_empty: '在这台电脑上安装、备份或恢复过的设备会显示在这里。', dev_last_play: p => `上次安装：${p}`, dev_seen: d => `上次连接：${d}`, dev_remove: '移除',
  help_title: '搜不到设备？',
  help_items: ['换一根能传数据的 USB 线（有些线只能充电），直接插在电脑上，不要经过扩展坞。', '设备开着机时一般能直接认出；认不出时，按住 BOOT 键再插上数据线，进入下载模式。', 'Windows 第一次连接时会自动安装驱动，等一会儿再试。Windows 7 需要先安装串口驱动。', 'Linux 用 .deb 安装包时会自动设置串口权限；提示没有权限时重新插拔一次。', '刷机失败、设备无法启动时，可以在「工具」里恢复出厂。'],
  tools_title: '工具', tools_lead: '用数据线安装、备份和恢复；用蓝牙编辑通行证、给设备配网。',
  sec_default: 'AI Passport 默认玩法', pill_default: '默认玩法', sec_default_info: '通行证是 AI Passport 的默认玩法：显示名字、职业、头像和图片。',
  t_edit_passport: '编辑通行证', t_edit_passport_sub: '在「设备」页用蓝牙连接通行证，换头像、图片和开机音乐。',
  t_passport_back: '用回通行证', t_passport_back_sub: '用数据线恢复出厂，装回通行证。',
  sec_usb: '用数据线安装',
  t_local: '安装本地固件', t_local_sub: '安装电脑里已下载的固件文件（.bin）。',
  t_backup: '备份设备', t_backup_sub: '把设备里的全部内容保存到电脑。',
  t_backups: '我的备份', t_backups_sub: '查看备份，或写回原来的设备。',
  t_restore: '恢复出厂', t_restore_sub: '装回默认玩法「通行证」，设备身份保持不变。',
  sec_installer: '小程序玩法安装器',
  t_installer: '安装小程序玩法安装器', t_installer_sub: '用数据线装一次，之后就能用电脑或手机无线安装玩法。',
  t_installer_wifi: '小程序玩法安装器配网', t_installer_wifi_sub: '设备进入安装模式后，在「设备」页用蓝牙连接它，再设置 Wi-Fi。',
  sec_blufi: '蓝牙配网', t_blufi: '蓝牙配网', t_blufi_sub: '在设备菜单里打开「BLUFI Setup」，再把 Wi-Fi 名称和密码发给设备。',
  needs_ble: '需要蓝牙', installer_missing: '玩法库里还没有小程序玩法安装器，请先更新玩法库。',
  installer_warn: '装好后设备会进入安装模式，原有玩法和已保存的 Wi-Fi 会被清除。之后可以在手机上无线安装玩法，或在这里恢复出厂。',
  backups_title: '我的备份', backups_lead: '备份保存在备份目录里。写回设备只能写回原来那台设备（按 MAC 地址核对）。', backups_new: '新建备份',
  backups_empty: '还没有备份。', backups_kind_backup: '设备备份', backups_kind_restore: '恢复出厂前自动备份',
  b_write: '写回设备', b_show: '在文件夹中显示', b_delete: '删除', b_delete_q: '确定删除这个备份文件吗？同一次的报告和设备身份备份会保留。', b_deleted: '已删除',
  flash_agree: '我知道设备上原有的玩法和数据会被覆盖', flash_agree_backup: '我知道设备上现在的内容会被这个备份替换',
  local_title: '安装本地固件', backup_write_title: '写回备份', file_choose: '选择固件文件', file_path_ph: '固件文件的完整路径（.bin）',
  file_hint: '必须是合并好的 ESP32-C3 固件（从 0x0 开始写入，不超过 8 MB）。', file_change: '换一个文件', file_none: '还没有选择文件',
  backup_mac: m => `设备 MAC：${m}`, flash_done_generic: '写入完成',
  batch_title: '展会批量下载', batch_lead: n => `下载玩法社区首页第一屏 ${n} 个玩法的固件，下载后可以离线刷机，适合展会使用。固件服务器有下载频率限制，被限流时会自动等待后继续。`,
  batch_start: '开始下载', batch_stop: '停止', batch_running: (d, n) => `正在下载 ${d} / ${n}`, batch_done: (d, n, f) => `已下载 ${d} / ${n}` + (f ? `，${f} 个失败` : ''),
  batch_wait: w => `固件服务器限流中，${w} 后继续`, batch_none: '玩法库还是空的，请先更新玩法库。',
  hidden_on: '已显示隐藏功能', hidden_off: '已隐藏',
});
Object.assign(I18N.en, {
  nav_device: 'Device', nav_plays: 'Plays', nav_tools: 'Tools',
  dev_title: 'Connect device', dev_lead: 'With a USB cable you can install plays, back up the device and restore it. Over Bluetooth you can install wirelessly, set up Wi-Fi and edit the Passport.',
  usb_title: 'USB connection', usb_connected: 'Connected', usb_unknown: 'Unknown device', usb_none: 'Not connected', usb_checking: 'Checking…',
  usb_none_sub: 'Connect AI Passport with a USB cable that carries data.', usb_unknown_sub: "A serial port was found, but it doesn't look like an AI Passport.", usb_many: n => `${n} devices are connected. Connect one at a time.`,
  dev_go_plays: 'Install from the community', dev_backup: 'Back up device', dev_restore: 'Restore default play', dev_local: 'Install local firmware',
  my_devices: 'My devices', my_devices_empty: 'Devices you install, back up or restore on this computer appear here.', dev_last_play: p => `Last installed: ${p}`, dev_seen: d => `Last connected: ${d}`, dev_remove: 'Remove',
  help_title: "Can't find your device?",
  help_items: ['Use a USB cable that carries data (some only charge), plugged straight into the computer rather than a hub.', "A running device is usually found right away. If it isn't, hold BOOT while you plug in the cable to enter download mode.", 'Windows installs a driver the first time; wait a moment and try again. Windows 7 needs the USB serial driver first.', 'The Linux .deb sets up port access. If the app says it has no permission, unplug the device and plug it back in.', "If installing fails or the device won't start, restore the default play from Tools."],
  tools_title: 'Tools', tools_lead: 'Install, back up and restore with a USB cable. Edit the Passport and set up Wi-Fi over Bluetooth.',
  sec_default: 'AI Passport default play', pill_default: 'Default play', sec_default_info: "Passport is AI Passport's default play: it shows a name, job title, avatar and picture.",
  t_edit_passport: 'Edit Passport', t_edit_passport_sub: 'Connect to your Passport over Bluetooth on the Device tab to change the avatar, picture and boot music.',
  t_passport_back: 'Get Passport back', t_passport_back_sub: 'Restore the default play with a USB cable to get Passport back.',
  sec_usb: 'Install with a USB cable',
  t_local: 'Install local firmware', t_local_sub: 'Install a firmware file (.bin) saved on this computer.',
  t_backup: 'Back up device', t_backup_sub: 'Save everything on the device to this computer.',
  t_backups: 'My backups', t_backups_sub: 'View backups, or write one back to its device.',
  t_restore: 'Restore default play', t_restore_sub: "Reinstall the default play Passport. The device's identity stays as it is.",
  sec_installer: 'Play Installer',
  t_installer: 'Install Play Installer', t_installer_sub: 'Install it once with a USB cable, then install plays wirelessly from this computer or your phone.',
  t_installer_wifi: 'Play Installer Wi-Fi setup', t_installer_wifi_sub: 'When the device is in install mode, connect to it over Bluetooth on the Device tab and set up Wi-Fi.',
  sec_blufi: 'Bluetooth Wi-Fi setup', t_blufi: 'Bluetooth Wi-Fi setup', t_blufi_sub: 'Open "BLUFI Setup" in the device menu, then send the Wi-Fi name and password to the device.',
  needs_ble: 'Needs Bluetooth', installer_missing: "Play Installer isn't in your library yet. Update the library first.",
  installer_warn: 'After installing, the device goes into install mode and its existing plays and saved Wi-Fi are cleared. You can then install plays wirelessly from your phone, or restore the default play here.',
  backups_title: 'My backups', backups_lead: 'Backups are kept in the backup folder. A backup can only be written back to the device it came from (checked by MAC address).', backups_new: 'New backup',
  backups_empty: 'No backups yet.', backups_kind_backup: 'Device backup', backups_kind_restore: 'Saved before a factory restore',
  b_write: 'Restore to device', b_show: 'Show in folder', b_delete: 'Delete', b_delete_q: 'Delete this backup file? The report and identity copies from the same session are kept.', b_deleted: 'Deleted',
  flash_agree: 'I understand the existing plays and data on the device will be overwritten', flash_agree_backup: 'I understand what is on the device now will be replaced by this backup',
  local_title: 'Install local firmware', backup_write_title: 'Restore a backup', file_choose: 'Choose firmware file', file_path_ph: 'Full path of the firmware file (.bin)',
  file_hint: 'It must be a merged ESP32-C3 image, written from 0x0, at most 8 MB.', file_change: 'Choose another file', file_none: 'No file chosen yet',
  backup_mac: m => `Device MAC: ${m}`, flash_done_generic: 'Written',
  batch_title: 'Batch download for events', batch_lead: n => `Download the firmware of the ${n} plays on the first screen of the community so they can be installed offline, for example at a show. The firmware server limits downloads; when it does, the download waits and then continues.`,
  batch_start: 'Start download', batch_stop: 'Stop', batch_running: (d, n) => `Downloading ${d} / ${n}`, batch_done: (d, n, f) => `Downloaded ${d} / ${n}` + (f ? `, ${f} failed` : ''),
  batch_wait: w => `The firmware server is limiting downloads. Continuing in ${w}`, batch_none: 'The library is empty. Update it first.',
  hidden_on: 'Hidden feature shown', hidden_off: 'Hidden',
});

/* ---------------- USB status ---------------- */
const USB = { ports: null, timer: null };

function usbTick() {
  api('ports').then(ports => { USB.ports = ports; updateUsbCards(); }).catch(() => { USB.ports = []; updateUsbCards(); });
}

/** Polls the serial ports while the Device or Tools tab is open (listing does not touch the device). */
function watchUsb(on) {
  if (on && !USB.timer) { usbTick(); USB.timer = setInterval(usbTick, 3000); }
  if (!on && USB.timer) { clearInterval(USB.timer); USB.timer = null; }
}

function usbCard() {
  const ports = USB.ports;
  let pill, sub;
  if (ports === null) { pill = `<span class="pill-s grey">${t('usb_checking')}</span>`; sub = ''; }
  else {
    const rec = ports.filter(p => p.recommended);
    if (rec.length > 1) { pill = `<span class="pill-s amber">${t('usb_connected')}</span>`; sub = t('usb_many', rec.length); }
    else if (rec.length) { pill = `<span class="pill-s green">${t('usb_connected')}</span>`; sub = `${rec[0].label} · ${rec[0].path}`; }
    else if (ports.length) { pill = `<span class="pill-s amber">${t('usb_unknown')}</span>`; sub = t('usb_unknown_sub'); }
    else { pill = `<span class="pill-s grey">${t('usb_none')}</span>`; sub = t('usb_none_sub'); }
  }
  return `<div class="usb-card" data-usb><div class="usb-head"><b>${t('usb_title')}</b>${pill}</div><p>${esc(sub)}</p></div>`;
}

function updateUsbCards() {
  document.querySelectorAll('[data-usb]').forEach(el => { el.outerHTML = usbCard(); });
}

/* ---------------- remembered devices ---------------- */
function knownDevices() {
  try { return JSON.parse(localStorage.getItem('plays-devices') || '[]'); } catch { return []; }
}

/** Remembers a device after a job identified it, like the Android app's "My devices". */
function rememberDevice(f) {
  if (!f || !f.mac) return;
  const list = knownDevices().filter(d => d.mac !== f.mac);
  const prev = knownDevices().find(d => d.mac === f.mac) || {};
  const p = f.kind === 'flash' && f.slug ? S.bySlug.get(f.slug) : null;
  list.unshift({ mac: f.mac, flash: f.flash || prev.flash || '', last: p ? p.title : prev.last || null, at: new Date().toISOString() });
  localStorage.setItem('plays-devices', JSON.stringify(list.slice(0, 20)));
}

/* ---------------- 设备 ---------------- */
function renderDevice() {
  const devices = knownDevices();
  const usbRows = devices.map(d => `<div class="list-row static"><span><b>AI Passport · ${esc(d.mac)}</b><small>${[d.flash, d.last ? t('dev_last_play', pick(d.last)) : '', t('dev_seen', new Date(d.at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US'))].filter(Boolean).map(esc).join(' · ')}</small></span><button class="btn ghost small" data-action="forget-device" data-mac="${esc(d.mac)}">${t('dev_remove')}</button></div>`).join('');
  const bleRows = S.server.ble ? bleSavedRows() : '';
  const rows = usbRows || bleRows ? bleRows + usbRows : `<p class="hint">${t('my_devices_empty')}</p>`;
  return `<div class="settings tools">
    <h1>${t('dev_title')}</h1><p class="lead">${t('dev_lead')}</p>
    <section class="panel">${usbCard()}
      <div class="buttons"><a class="btn primary" href="${libraryHash()}">${t('dev_go_plays')}</a><a class="btn" href="#/tools/backup">${t('dev_backup')}</a><a class="btn" href="#/tools/restore">${t('dev_restore')}</a><button class="btn ghost" data-action="tool-local">${t('dev_local')}</button></div>
    </section>
    <section class="panel" id="ble-panel">${blePanel()}</section>
    <section class="panel"><h2>${t('my_devices')}</h2>${rows}</section>
    <details class="panel help"><summary>${t('help_title')}</summary><ul>${I18N[lang].help_items.concat(S.server.ble ? I18N[lang].ble_help : []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>
  </div>`;
}

/* ---------------- 工具 ---------------- */
function toolRow(title, sub, attrs, disabled) {
  const tag = attrs.startsWith('href') ? 'a' : 'button';
  return `<${tag} class="list-row ${disabled ? 'off' : ''}" ${disabled ? '' : attrs}><span><b>${title}</b><small>${sub}</small></span>${disabled ? `<span class="pill-s grey">${t('needs_ble')}</span>` : '<i>›</i>'}</${tag}>`;
}

function renderTools() {
  const sub = parseRoute().tool;
  if (sub === 'backups') return renderBackups();
  if (sub === 'blufi') return renderBlufi();
  if (sub === 'backup' || sub === 'restore') return renderToolJob(sub);
  const ble = S.server.ble;
  return `<div class="settings tools">
    <h1>${t('tools_title')}</h1><p class="lead">${t('tools_lead')}</p>
    <section class="panel">${usbCard()}</section>
    <section class="panel list-card"><h2>${t('sec_default')} <span class="pill-s purple">${t('pill_default')}</span></h2><p>${t('sec_default_info')}</p>
      ${toolRow(t('t_edit_passport'), t('t_edit_passport_sub'), 'href="#/device"', !ble)}
      ${toolRow(t('t_passport_back'), t('t_passport_back_sub'), 'href="#/tools/restore"')}
    </section>
    <section class="panel list-card"><h2>${t('sec_usb')}</h2>
      ${toolRow(t('t_local'), t('t_local_sub'), 'data-action="tool-local"')}
      ${toolRow(t('t_backup'), t('t_backup_sub'), 'href="#/tools/backup"')}
      ${toolRow(t('t_backups'), t('t_backups_sub'), 'href="#/tools/backups"')}
      ${toolRow(t('t_restore'), t('t_restore_sub'), 'href="#/tools/restore"')}
    </section>
    <section class="panel list-card"><h2>${t('sec_installer')}</h2>
      ${toolRow(t('t_installer'), t('t_installer_sub'), 'data-action="tool-installer"')}
      ${toolRow(t('t_installer_wifi'), t('t_installer_wifi_sub'), 'href="#/device"', !ble)}
    </section>
    <section class="panel list-card"><h2>${t('sec_blufi')}</h2>
      ${toolRow(t('t_blufi'), t('t_blufi_sub'), 'href="#/tools/blufi"', !ble)}
    </section>
  </div>`;
}

/** The backup and factory restore pages (the panels from the old "Device tools" page). */
function renderToolJob(which) {
  const st = S.server;
  const r = st.restore || {};
  const busy = st.flash.active;
  const main = which === 'backup'
    ? `<section class="panel"><h2>${t('backup_title')}</h2><p>${t('backup_lead')}</p><div id="backup-main">${backupMain()}</div></section>`
    : `<section class="panel"><h2>${t('restore_title')}</h2><p>${t('restore_lead')}</p><div id="restore-main">${restoreMain()}</div></section>`;
  return `<div class="settings restore">
    <a class="btn ghost small" href="#/tools">‹ ${t('tools_title')}</a>
    <h1>${which === 'backup' ? t('t_backup') : t('t_restore')}</h1>
    ${usbCard()}<div class="sp12"></div>
    ${main}
    <section class="panel">
      <h2>${t('r_options')}</h2><p>${t('r_safety')}</p>
      <dl class="kv"><dt>${t('r_backup_dir')}</dt><dd class="ellipsis" title="${esc(r.backupDir || '')}">${esc(r.backupDir || '—')}</dd>${which === 'restore' ? `<dt>${t('r_fw')}</dt><dd>${esc(r.firmware || '')}</dd>` : ''}</dl>
      ${st.native ? '' : `<div class="folder mt10">${ICON.folder}<input id="backup-input" value="${esc(r.backupDir || '')}" spellcheck="false"></div>`}
      ${which === 'restore' ? `<label class="check mt10"><input type="checkbox" id="restore-full" ${S.restore.full ? 'checked' : ''} ${busy ? 'disabled' : ''}> ${t('r_full')}</label>` : ''}
      <div class="buttons">
        <button class="btn" data-action="choose-backup" ${busy ? 'disabled' : ''}>${t('change_dir')}</button>
        ${st.native ? `<button class="btn ghost" data-action="reveal-backup">${t('open_backup')}</button>` : ''}
        <a class="btn ghost" href="#/tools/backups">${t('t_backups')}</a>
      </div>
    </section>
  </div>`;
}

/* ---------------- 我的备份 ---------------- */
const BK = { list: null, loading: false, error: '' };

async function loadBackups() {
  BK.loading = true;
  try { BK.list = await api('backups'); BK.error = ''; } catch (e) { BK.list = []; BK.error = errText(e.code, e.message); }
  BK.loading = false;
  if (parseRoute().tool === 'backups') render();
}

function renderBackups() {
  if (!BK.list && !BK.loading) loadBackups();
  const st = S.server;
  let list;
  if (!BK.list) list = `<p class="hint">${t('loading')}</p>`;
  else if (BK.error) list = `<div class="notice red">${esc(BK.error)}</div>`;
  else if (!BK.list.length) list = `<p class="hint">${t('backups_empty')}</p>`;
  else {
    list = BK.list.map(b => `<div class="backup-row">
      <div><b>${esc(new Date(b.time).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour12: false }))}</b>
        <small>${t('backups_kind_' + b.kind)} · ${esc(b.mac.match(/../g).join(':').toUpperCase())} · ${fmtBytes(b.size)}</small><small class="ellipsis" title="${esc(b.path)}">${esc(b.session + '/' + b.name)}</small></div>
      <div class="buttons"><button class="btn small" data-action="backup-write" data-path="${esc(b.path)}" ${st.flash.active ? 'disabled' : ''}>${t('b_write')}</button>
        ${st.native ? `<button class="btn ghost small" data-action="backup-show" data-path="${esc(b.path)}">${t('b_show')}</button>` : ''}
        <button class="btn ghost small danger-text" data-action="backup-delete" data-path="${esc(b.path)}">${t('b_delete')}</button></div>
    </div>`).join('');
  }
  return `<div class="settings tools">
    <a class="btn ghost small" href="#/tools">‹ ${t('tools_title')}</a>
    <div class="me-list-head"><h1>${t('backups_title')}</h1><a class="btn primary small" href="#/tools/backup">${t('backups_new')}</a></div>
    <p class="lead">${t('backups_lead')}</p>
    <section class="panel">${list}</section>
  </div>`;
}

/* ---------------- flash targets other than a play ---------------- */
/** Opens the install dialog for a local file or a backup (mode 'file' | 'backup'). */
function openFlashTarget(mode, path, label) {
  if (S.server.flash.active) { toast(t('err_busy'), true); return; }
  S.flash = { ...S.flash, mode, slug: '', path, label, port: '', agree: false };
  S.modal = 'flash';
  api('flash/reset', {}).catch(() => {});
  S.server.flash = { stage: 'idle', logs: [] };
  renderModal();
  startPortScan();
}

/** The part of the port step that differs by target. */
function flashTargetHead() {
  const m = S.flash.mode;
  if (m === 'file') {
    return `<p class="m-title"><b>${esc(S.flash.label || t('file_none'))}</b></p>
      ${S.server.native ? `<div class="buttons"><button class="btn small" data-action="file-pick">${S.flash.path ? t('file_change') : t('file_choose')}</button></div>`
        : `<div class="folder">${ICON.folder}<input id="file-input" value="${esc(S.flash.path || '')}" placeholder="${esc(t('file_path_ph'))}" spellcheck="false"></div>`}
      <p class="m-sub">${t('file_hint')}</p>`;
  }
  if (m === 'backup') return `<p class="m-title"><b>${esc(S.flash.label)}</b></p><p class="m-sub">${t('backups_lead')}</p>`;
  return '';
}

async function chooseFirmwareFile() {
  try {
    const r = await api('file/choose', {});
    if (r && r.path) { S.flash.path = r.path; S.flash.label = r.path.split(/[\\/]/).pop(); updateModal(); }
  } catch (e) { showError(e); }
}

async function startFlashTarget() {
  const m = S.flash.mode;
  if (m === 'file' && !S.server.native) {
    S.flash.path = (($('#file-input') || {}).value || '').trim();
    S.flash.label = S.flash.path.split(/[\\/]/).pop();
  }
  if (m === 'file') return api('flash/file', { path: S.flash.path, port: S.flash.port });
  if (m === 'backup') return api('backups/restore', { path: S.flash.path, port: S.flash.port });
  return api('flash/start', { slug: S.flash.slug, port: S.flash.port });
}

/* ---------------- hidden: batch download for events ---------------- */
const BATCH_SIZE = 16;

/** The plays on the first screen of the community page: the featured row, then the first
    cards of the default list (all categories, newest first). */
function firstScreenSlugs() {
  if (!S.catalog) return [];
  const saved = S.view;
  S.view = { cat: 'all', tab: 'all', q: '', sort: 'newest' };
  let list;
  try { list = filtered(); } finally { S.view = saved; }
  const out = [];
  for (const p of featuredPlays().concat(list)) {
    if (!p.removed && (p.ready || p.downloadable) && !out.includes(p.slug)) out.push(p.slug);
    if (out.length >= BATCH_SIZE) break;
  }
  return out;
}

function batchPanel() {
  const b = S.server.batch || {};
  const n = firstScreenSlugs().length;
  let status = '';
  const wait = b.running ? countdown(b.throttledUntil) : '';
  if (b.running) status = wait ? t('batch_wait', wait) : t('batch_running', b.done, b.total);
  else if (b.total) status = t('batch_done', b.done, b.total, b.failed);
  const pct = b.total ? Math.round((b.done / b.total) * 100) : 0;
  return `<section class="panel" id="batch-panel">
    <h2>${t('batch_title')}</h2><p>${n ? t('batch_lead', n) : t('batch_none')}</p>
    ${b.running || b.total ? `<div class="big-progress"><i data-w="${pct}"></i></div><div class="progress-meta"><span>${esc(status)}</span><span>${pct}%</span></div>` : ''}
    <div class="buttons">${b.running ? `<button class="btn danger" data-action="batch-stop">${t('batch_stop')}</button>`
      : `<button class="btn primary" data-action="batch-start" ${n && !S.server.sync.running ? '' : 'disabled'}>${t('batch_start')}</button>`}</div>
  </section>`;
}

function updateBatch() {
  const el = $('#batch-panel');
  if (el) { el.outerHTML = batchPanel(); applyWidths($('#batch-panel')); }
}

Object.assign(actions, {
  'tool-local': () => openFlashTarget('file', '', ''),
  'file-pick': () => chooseFirmwareFile(),
  'tool-installer': () => {
    const slug = S.server.installer;
    if (!S.bySlug.get(slug)) { toast(t('installer_missing'), true); return; }
    actions.flash({ dataset: { slug } });
  },
  'backup-write': el => {
    const b = (BK.list || []).find(x => x.path === el.dataset.path);
    if (b) openFlashTarget('backup', b.path, `${t('backups_kind_' + b.kind)} · ${b.mac.match(/../g).join(':').toUpperCase()}`);
  },
  'backup-show': el => api('backups/reveal', { path: el.dataset.path }).catch(showError),
  'backup-delete': async el => {
    if (!confirm(t('b_delete_q'))) return;
    try { await api('backups/delete', { path: el.dataset.path }); toast(t('b_deleted')); BK.list = null; render(); } catch (e) { showError(e); }
  },
  'forget-device': el => {
    localStorage.setItem('plays-devices', JSON.stringify(knownDevices().filter(d => d.mac !== el.dataset.mac)));
    render();
  },
  'batch-start': async () => {
    try { await api('batch/start', { slugs: firstScreenSlugs() }); await poll(true); } catch (e) { showError(e); }
  },
  'batch-stop': async () => { await api('batch/cancel', {}).catch(showError); poll(); },
});
