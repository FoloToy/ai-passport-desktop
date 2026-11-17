// Web Bluetooth transport for the protocol clients (Chrome and Edge on Windows, macOS, ChromeOS and
// Android; not Safari, iOS or Firefox). See the contract in index.js.

import { BleError, tr, gattError, normUuid, withTimeout, sleep } from './util.js';
import { SERVICES, REQUEST_FILTERS } from './index.js';

export function supported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function';
}

export async function available() {
  if (!supported()) return false;
  try { return await navigator.bluetooth.getAvailability(); } catch { return true; }
}

/** Shows the browser's device chooser. Must be called from a click. */
export async function requestDevice() {
  if (!supported()) throw new BleError(tr('这个浏览器不支持蓝牙，请用电脑上的 Chrome 或 Edge', "This browser doesn't support Bluetooth. Use Chrome or Edge on a computer."), 'unsupported');
  try {
    return await navigator.bluetooth.requestDevice({ filters: REQUEST_FILTERS, optionalServices: SERVICES });
  } catch (e) {
    if (e && e.name === 'NotFoundError') throw new BleError(tr('没有选择设备', 'No device chosen'), 'cancelled');
    throw gattError(e);
  }
}

class WebConnection {
  constructor(device) {
    this.device = device;
    this.name = device.name || '';
    this.mtu = 23;
    this.services = new Map();
    this.chars = new Map();
    this.queue = Promise.resolve();
    this.onDisconnect = () => {};
    device.addEventListener('gattserverdisconnected', () => this.onDisconnect());
  }

  get connected() { return !!(this.device.gatt && this.device.gatt.connected); }

  async open() {
    const server = await withTimeout(this.device.gatt.connect(), 15000, tr('蓝牙连接超时，请让设备靠近电脑', 'Bluetooth connection timed out. Move the device closer to the computer.'));
    await sleep(150);
    for (const uuid of SERVICES) {
      try { this.services.set(uuid, await server.getPrimaryService(uuid)); } catch { /* not on this device */ }
    }
    // Web Bluetooth negotiates the MTU itself and does not report it. Chrome asks for the maximum on
    // every platform; assume the size the firmware accepts so writes are not split needlessly.
    this.mtu = 185;
  }

  hasService(uuid) { return this.services.has(normUuid(uuid)); }

  async characteristic(service, uuid) {
    const key = `${normUuid(service)}/${normUuid(uuid)}`;
    if (this.chars.has(key)) return this.chars.get(key);
    const s = this.services.get(normUuid(service));
    if (!s) throw new BleError(tr('设备缺少蓝牙服务', 'The device is missing a Bluetooth service'));
    let c;
    try { c = await s.getCharacteristic(normUuid(uuid)); } catch {
      throw new BleError(tr(`设备缺少蓝牙特征 ${normUuid(uuid).slice(4, 8)}`, `Device is missing Bluetooth characteristic ${normUuid(uuid).slice(4, 8)}`));
    }
    this.chars.set(key, c);
    return c;
  }

  /** GATT operations must not overlap in Web Bluetooth ("GATT operation already in progress"). */
  op(fn) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {});
    return run.catch(e => { throw gattError(e); });
  }

  read(service, uuid) {
    return this.op(async () => new Uint8Array((await (await this.characteristic(service, uuid)).readValue()).buffer.slice(0)));
  }

  write(service, uuid, value) {
    return this.op(async () => {
      const c = await this.characteristic(service, uuid);
      await withTimeout(c.writeValueWithResponse ? c.writeValueWithResponse(value) : c.writeValue(value), 10000,
        tr('蓝牙操作超时，请让设备靠近电脑', 'Bluetooth operation timed out. Move the device closer to the computer.'));
    });
  }

  async writeMany(service, uuid, values) { for (const v of values) await this.write(service, uuid, v); }

  subscribe(service, uuid, fn) {
    return this.op(async () => {
      const c = await this.characteristic(service, uuid);
      c.addEventListener('characteristicvaluechanged', ev => fn(new Uint8Array(ev.target.value.buffer.slice(0))));
      await c.startNotifications();
    });
  }

  close() { try { if (this.connected) this.device.gatt.disconnect(); } catch { /* already gone */ } }
}

/** Connects to a device from requestDevice() and discovers our services. */
export async function connect(device) {
  const conn = new WebConnection(device);
  try { await conn.open(); } catch (e) { conn.close(); throw gattError(e); }
  return conn;
}
