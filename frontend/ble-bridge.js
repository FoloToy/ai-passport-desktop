// Desktop Bluetooth transport: the passport-ble "conn" contract (see passport-ble/index.js)
// over the app's local API (/api/ble/*, internal/ble in Go). The app's WebViews have no
// usable Web Bluetooth, so the Go side owns the radio and this file only moves bytes.

import { BleError, tr } from './passport-ble/util.js';

const TOKEN = document.querySelector('meta[name="plays-token"]').content;

function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function unb64(s) {
  const bin = atob(s || '');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function errorFor(code, message) {
  switch (code) {
    case 'ble_unavailable': return new BleError(tr(`蓝牙不可用：${message}`, `Bluetooth isn't available: ${message}`), 'unavailable');
    case 'ble_not_found': return new BleError(tr('没有找到这台设备，请重新搜索', "Couldn't find this device. Search again."), 'not_found');
    case 'ble_connect': return new BleError(tr('蓝牙连接失败，请让设备靠近电脑后重试', "Couldn't connect over Bluetooth. Move the device closer to the computer and try again."), 'connect');
    case 'ble_disconnected': return new BleError(tr('蓝牙连接已断开', 'Bluetooth disconnected'), 'disconnected');
    default: return new BleError(tr(`蓝牙操作失败：${message}`, `Bluetooth operation failed: ${message}`));
  }
}

async function call(op, body) {
  const opt = { headers: { 'X-Plays-Token': TOKEN } };
  if (body !== undefined) {
    opt.method = 'POST';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  let r;
  try { r = await fetch('/api/ble/' + op, opt); } catch (e) { throw new BleError(tr('蓝牙服务没有响应', "The Bluetooth service didn't answer")); }
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!r.ok) throw errorFor(data && data.code, (data && data.error) || text || r.statusText);
  return data;
}

/** {supported, ready, scanning, error?} */
export const state = () => call('state');
/** Starts or extends a scan for `seconds`. */
export const scan = (seconds = 20) => call('scan', { seconds });
export const stopScan = () => call('scan/stop', {});
/** {scanning, devices: [{id, name, rssi, services}]} */
export const devices = () => call('devices');

class BridgeConnection {
  constructor(id, info) {
    this.id = id;
    this.conn = info.conn;
    this.name = info.name || '';
    this.mtu = info.mtu || 23;
    this.services = new Set((info.services || []).map(s => s.toLowerCase()));
    this.listeners = new Map();
    this.alive = true;
    this.after = 0;
    this.pumping = false;
    this.onDisconnect = () => {};
  }

  get connected() { return this.alive; }

  hasService(uuid) { return this.services.has(String(uuid).toLowerCase()); }

  gone() {
    if (!this.alive) return;
    this.alive = false;
    try { this.onDisconnect(); } catch { /* listener errors are not ours */ }
  }

  async op(name, body) {
    if (!this.alive) throw errorFor('ble_disconnected');
    try { return await call(name, { conn: this.conn, ...body }); } catch (e) {
      if (e.code === 'disconnected') this.gone();
      throw e;
    }
  }

  async read(service, char) {
    const r = await this.op('read', { service, char });
    return unb64(r.data);
  }

  write(service, char, bytes) { return this.writeMany(service, char, [bytes]); }

  async writeMany(service, char, list) {
    if (!list.length) return;
    await this.op('write', { service, char, data: list.map(b64) });
  }

  async subscribe(service, char, fn) {
    const key = `${String(service).toLowerCase()}/${String(char).toLowerCase()}`;
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(fn);
    this.pump();
    await this.op('subscribe', { service, char });
  }

  /** Long-polls notifications in order until the link drops or close(). */
  async pump() {
    if (this.pumping) return;
    this.pumping = true;
    while (this.alive) {
      let r;
      try { r = await call('events', { conn: this.conn, after: this.after, wait: 20 }); } catch {
        await new Promise(res => setTimeout(res, 500));
        continue;
      }
      for (const e of r.events || []) {
        this.after = Math.max(this.after, e.seq);
        const fns = this.listeners.get(`${e.service}/${e.char}`) || [];
        const data = unb64(e.data);
        for (const fn of fns) { try { fn(data); } catch { /* a bad frame must not stop the pump */ } }
      }
      if (!r.connected) this.gone();
    }
    this.pumping = false;
  }

  close() {
    if (!this.alive) return;
    this.alive = false;
    call('close', { conn: this.conn }).catch(() => {});
  }
}

/** Connects to a scanned device (by the id from devices()) and discovers its services. */
export async function connect(id) {
  const info = await call('connect', { id });
  return new BridgeConnection(id, info);
}
