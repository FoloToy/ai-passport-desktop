// AI Passport mini-app installer (permanent Recovery) GATT protocol v4, ported from the Android app
// (ble/recovery/RecoveryProtocol.kt, RecoveryClient.kt). Source of truth on the device:
// FoloToy/ai-passport-miniapp-installer recovery/main/recovery_main.c and wifi_install.c.

import { BleError, tr, utf8, fromUtf8, ascii, concat, bytes, u16, u32, le32, fromHex, uuid16, withTimeout, sleep } from './util.js';

export const SERVICE = uuid16(0xfff0);
export const CONTROL = uuid16(0xfff1);
export const STATUS = uuid16(0xfff3);
export const INFO = uuid16(0xfff4);
export const WIFI_LIST = uuid16(0xfff5);
export const COMMAND = uuid16(0xfff6);

export const CMD_ABORT = 0x03, CMD_REBOOT = 0x04, CMD_STATUS = 0x05, CMD_SCAN_WIFI = 0x09;
export const CMD_TRANSFER_BEGIN = 0x0a, CMD_TRANSFER_CHUNK = 0x0b, CMD_TRANSFER_COMMIT = 0x0c;
export const TRANSFER_WIFI = 1, TRANSFER_INSTALL = 2;

/** Every write is at most 48 bytes, so a chunk carries at most 45 data bytes. */
export const MAX_WRITE = 48, MAX_CHUNK = MAX_WRITE - 3, MAX_TRANSFER = 552, MAX_URL = 512;
export const FLAG_IDENTITY = 0x01, FLAG_LAYOUT_OK = 0x02, FLAG_PROTECTED = 0x04, FLAG_VERIFIED = 0x08;

export const State = { IDLE: 0, RECEIVING: 1, VERIFYING: 2, READY: 3, ERROR: 4, WIFI_CONNECTING: 5, WIFI_READY: 6, DOWNLOADING: 7 };

export function stateLabel(code) {
  return ({
    0: tr('空闲', 'Idle'), 1: tr('接收中', 'Receiving'), 2: tr('校验中', 'Verifying'), 3: tr('安装完成', 'Installed'),
    4: tr('出错', 'Error'), 5: tr('正在连接 Wi-Fi', 'Connecting to Wi-Fi'), 6: tr('Wi-Fi 已连接', 'Wi-Fi connected'),
    7: tr('下载写入中', 'Downloading and installing'),
  })[code] ?? tr('未知', 'Unknown');
}

export function errorLabel(code) {
  return ({
    0: tr('无', 'None'), 1: tr('命令或 Wi-Fi 失败', 'Command or Wi-Fi failed'), 2: tr('大小错误', 'Wrong size'),
    3: tr('偏移错误', 'Wrong offset'), 4: tr('下载或写入失败', 'Download or write failed'), 5: tr('校验失败', 'Verification failed'),
    6: tr('镜像无效', 'Invalid image'),
  })[code] ?? tr(`错误 ${code}`, `error ${code}`);
}

export function installError(code) {
  const what = errorLabel(code);
  return tr(`设备安装失败：${what}。请确认设备联网后重试`, `Install failed on the device: ${what}. Make sure the device is online and try again.`);
}

export function parseInfo(b) {
  if (b.length < 40 || ascii(b.subarray(0, 4)) !== 'AIPR') throw new BleError(tr('这台设备没有可验证的安装器信息', 'This device has no installer info that can be verified'));
  let snEnd = 37;
  for (let i = 24; i < 37; i++) if (b[i] === 0) { snEnd = i; break; }
  const flags = b[5], version = u16(b, 6);
  return {
    protocol: b[4], flags, recoveryVersion: version,
    flashSize: u32(b, 8), netcfgOffset: u32(b, 12), recoveryOffset: u32(b, 16),
    sn: ascii(b.subarray(24, snEnd)),
    layoutOk: (flags & FLAG_LAYOUT_OK) !== 0, verified: (flags & FLAG_VERIFIED) !== 0,
    versionLabel: `${version >> 8}.${version & 0xff}`,
  };
}

/** Throws with a user-facing message when the installer cannot be used. */
export function requireUsable(info) {
  if (!(info.protocol >= 4 && info.verified)) throw new BleError(tr('这台设备的安装器版本过旧，请先用数据线安装最新的小程序玩法安装器', 'The installer on this device is out of date. Install the latest Play Installer with a USB cable first.'), 'installer_old');
  if (info.flashSize < 8 * 1024 * 1024) throw new BleError(tr('设备闪存小于 8 MB', 'Device flash is smaller than 8 MB'));
  if (info.netcfgOffset !== 0x6bc000 || info.recoveryOffset !== 0x6c0000) throw new BleError(tr('安装器分区布局不受支持', "Installer partition layout isn't supported"));
  if (!info.layoutOk) throw new BleError(tr('设备里的安装器不完整，请用数据线重新安装小程序玩法安装器', 'The installer on the device is incomplete. Reinstall Play Installer with a USB cable.'), 'installer_old');
}

export function parseStatus(b) {
  if (b.length < 12) throw new BleError(tr('状态数据不完整', 'Status data is incomplete'));
  const received = u32(b, 4), total = u32(b, 8);
  return { state: b[0], error: b[1], received, total, percent: total > 0 ? Math.max(0, Math.min(100, Math.floor(received * 100 / total))) : 0 };
}

/** Returns null for the end-of-list marker [FF …]. */
export function parseWifi(b) {
  if (!b.length || b[0] === 0xff) return null;
  if (b.length < 3) throw new BleError(tr('Wi-Fi 数据不完整', 'Wi-Fi data is incomplete'));
  const len = Math.min(b[2], b.length - 3);
  return { auth: b[0], open: b[0] === 0, rssi: (b[1] << 24) >> 24, ssid: fromUtf8(b.subarray(3, 3 + len)) };
}

export function wifiPayload(ssid, password) {
  const s = utf8(ssid), p = utf8(password);
  if (s.length < 1 || s.length > 32) throw new BleError(tr('Wi-Fi 名称需要 1–32 字节', 'Wi-Fi name must be 1–32 bytes'));
  if (p.length > 64) throw new BleError(tr('Wi-Fi 密码最多 64 字节', 'Wi-Fi password can be at most 64 bytes'));
  return concat(bytes(s.length, p.length), s, p);
}

export function installPayload(appOffset, size, sha256Hex, url) {
  if (appOffset !== 0 && appOffset !== 0x10000) throw new BleError(tr('安装偏移无效', 'Invalid install offset'));
  if (!url.startsWith('https://')) throw new BleError(tr('安装地址必须是 HTTPS', 'Install address must be HTTPS'));
  const u = utf8(url);
  if (u.length > MAX_URL) throw new BleError(tr('安装地址过长', 'Install address is too long'));
  const sha = fromHex(sha256Hex);
  if (sha.length !== 32) throw new BleError(tr('缺少 SHA-256', 'Missing SHA-256'));
  return concat(le32(appOffset), le32(size), sha, u);
}

/** Splits a transfer into the FFF6 writes: begin, chunks of ≤45 bytes, commit. */
export function transferWrites(type, payload) {
  if (payload.length < 1 || payload.length > MAX_TRANSFER) throw new BleError(tr('传输数据长度无效', 'Invalid transfer data length'));
  const out = [bytes(CMD_TRANSFER_BEGIN, type, payload.length, payload.length >> 8)];
  for (let off = 0; off < payload.length; off += MAX_CHUNK) {
    out.push(concat(bytes(CMD_TRANSFER_CHUNK, off, off >> 8), payload.subarray(off, Math.min(payload.length, off + MAX_CHUNK))));
  }
  out.push(bytes(CMD_TRANSFER_COMMIT));
  return out;
}

const SN_NAME = /^(?:AI-PASSPORT-OTA-|SN)?([0-9a-fA-F]{12})$/;

/** Advertised name is the 12-hex SN, optionally prefixed with AI-PASSPORT-OTA-. */
export function snFromName(name) {
  const m = SN_NAME.exec(String(name || '').trim());
  if (!m) return null;
  const sn = m[1].toLowerCase();
  return /^0+$/.test(sn) || /^f+$/.test(sn) ? null : sn;
}

/** Device side of an installer connection. `conn` is a connected transport (see transport notes in index.js). */
export class RecoveryClient {
  constructor(conn) {
    this.conn = conn;
    this.info = null;
    this.status = null;
    this.listeners = new Set();
    this.wifiBuffer = [];
    this.wifiDone = null;
  }

  onStatus(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  setStatus(s) { this.status = s; for (const fn of this.listeners) fn(s); }

  async connect() {
    const c = this.conn;
    if (!c.hasService(SERVICE)) throw new BleError(tr('这台设备没有处于安装模式', "This device isn't in install mode"));
    const info = parseInfo(await c.read(SERVICE, INFO));
    requireUsable(info);
    this.info = info;
    await c.subscribe(SERVICE, STATUS, v => { try { this.setStatus(parseStatus(v)); } catch { /* ignore short frames */ } });
    await c.subscribe(SERVICE, WIFI_LIST, v => {
      let ap = null;
      try { ap = parseWifi(v); } catch { return; }
      if (ap) this.wifiBuffer.push(ap);
      else if (this.wifiDone) this.wifiDone();
    });
    // The first status notify fires before we subscribe, so read it directly.
    await this.refreshStatus();
    return info;
  }

  async refreshStatus() {
    const s = parseStatus(await this.conn.read(SERVICE, STATUS));
    this.setStatus(s);
    return s;
  }

  async scanWifi() {
    this.wifiBuffer = [];
    const done = new Promise(r => { this.wifiDone = r; });
    await this.conn.write(SERVICE, COMMAND, bytes(CMD_SCAN_WIFI));
    try {
      await withTimeout(done, 35000, tr('设备扫描 Wi-Fi 超时', 'Device timed out scanning for Wi-Fi'));
    } finally { this.wifiDone = null; }
    const best = new Map();
    for (const ap of this.wifiBuffer) {
      if (!ap.ssid.trim()) continue;
      const prev = best.get(ap.ssid);
      if (!prev || prev.rssi < ap.rssi) best.set(ap.ssid, ap);
    }
    return [...best.values()].sort((a, b) => b.rssi - a.rssi);
  }

  async transfer(type, payload) {
    for (const w of transferWrites(type, payload)) await this.conn.write(SERVICE, COMMAND, w);
  }

  /** Resolves with the first status that matches `pred`, or null after `ms`. */
  waitStatus(pred, ms) {
    return new Promise(resolve => {
      const timer = setTimeout(() => { off(); resolve(null); }, ms);
      const off = this.onStatus(s => { if (pred(s)) { clearTimeout(timer); off(); resolve(s); } });
    });
  }

  /** Sends Wi-Fi credentials and waits for WIFI_READY. */
  async joinWifi(ssid, password) {
    const waiting = this.waitStatus(s => s.state === State.WIFI_READY || s.state === State.ERROR, 25000);
    await this.transfer(TRANSFER_WIFI, wifiPayload(ssid, password));
    const s = (await waiting) || await this.refreshStatus();
    if (s.state === State.WIFI_READY) return;
    if (s.state === State.ERROR) throw new BleError(tr('设备没能连上这个 Wi-Fi。请检查密码，并确认是 2.4 GHz 网络', "The device couldn't connect to this Wi-Fi. Check the password and make sure it's a 2.4 GHz network."));
    throw new BleError(tr('等待设备连接 Wi-Fi 超时', 'Timed out waiting for the device to connect to Wi-Fi'));
  }

  /**
   * Asks the device to download and install `url` (HTTPS, exact Content-Length, no redirects).
   * Calls onProgress(0–100); resolves when the device reports READY or reboots after starting.
   */
  async install(url, size, sha256, appOffset, onProgress = () => {}) {
    const current = await this.refreshStatus();
    if (![State.WIFI_READY, State.READY, State.ERROR].includes(current.state)) throw new BleError(tr('设备还没有连上 Wi-Fi', "The device isn't connected to Wi-Fi yet"));
    let started = false, outcome = null;
    const off = this.onStatus(s => {
      if (s.state === State.DOWNLOADING) { started = true; onProgress(s.percent); }
      else if (s.state === State.READY) outcome = outcome || 'ok';
      else if (s.state === State.ERROR && (started || s.error !== 0)) outcome = outcome || `error:${s.error}`;
    });
    try {
      await this.transfer(TRANSFER_INSTALL, installPayload(appOffset, size, sha256, url));
      const deadline = Date.now() + 10 * 60000;
      while (!outcome) {
        if (!this.conn.connected) { outcome = started ? 'ok' : 'disconnected'; break; }
        if (Date.now() > deadline) throw new BleError(tr('等待设备安装超时', 'Timed out waiting for the device to install'));
        await sleep(200);
      }
    } finally { off(); }
    if (outcome === 'ok') { onProgress(100); return; }
    if (outcome === 'disconnected') throw new BleError(tr('蓝牙连接已断开，安装没有开始', "Bluetooth disconnected. The install didn't start."));
    throw new BleError(installError(Number(outcome.split(':')[1]) || 4));
  }

  /** Leaves installer mode; the device boots its installed play. */
  async reboot() {
    try { await this.conn.write(SERVICE, CONTROL, bytes(CMD_REBOOT)); } catch { /* it may drop the link at once */ }
  }
}
