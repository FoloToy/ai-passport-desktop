// Espressif BluFi (ESP-IDF) in security mode: DH key exchange, AES-128-CFB128 and CRC16 on data
// frames. Ported from the Android app (ble/blufi/BlufiCodec.kt, BlufiClient.kt), which matches
// FoloToy/ai-passport-blufi-miniprogram miniprogram/utils/blufi.js.

import { BleError, tr, utf8, fromUtf8, concat, bytes, uuid16, withTimeout, deferred, sleep } from './util.js';
import { md5, aesCfb as aesCfbRaw, crc16, modPow, bigFromBytes, bigToBytes, randomBytes } from './crypto.js';

export const SERVICE = uuid16(0xffff);
export const WRITE = uuid16(0xff01);
export const NOTIFY = uuid16(0xff02);

export const TYPE_CONTROL = 0, TYPE_DATA = 1;
export const CTRL_SET_SECURITY = 1, CTRL_SET_WIFI_MODE = 2, CTRL_CONNECT_WIFI = 3, CTRL_GET_WIFI_STATUS = 5, CTRL_GET_WIFI_LIST = 9;
export const DATA_NEGOTIATION = 0, DATA_STA_SSID = 2, DATA_STA_PASSWORD = 3, DATA_WIFI_STATUS = 0x0f, DATA_WIFI_LIST = 0x11, DATA_ERROR = 0x12;
export const FRAME_ENCRYPTED = 0x01, FRAME_CHECKSUM = 0x02, FRAME_FRAGMENT = 0x10;

export const DH_P = BigInt('0xcf5cf5c38419a724957ff5dd323b9c45c3cdd261eb740f69aa94b8bb1a5c96409153bd76b24222d03274e4725a5406092e9e82e9135c643cae98132b0d95f7d65347c68afc1e677da90e51bbab5f5cf429c291b4ba39c6b2dc5e8c7231e46aa7728e87664532cdf547be20c9a3fa8342be6e34371a27c06f7dc0edddd2f86373');
export const DH_G = 2n;
export const DH_LENGTH = 128;

/** User-facing texts for ESP-IDF BluFi error codes; they avoid the protocol name on purpose. */
export function errorMessage(code) {
  return ({
    0: tr('设备检测到配网序列号异常', 'The device saw an out-of-order Wi-Fi setup message'),
    1: tr('设备检测到数据校验失败', 'The device found a data check error'),
    2: tr('设备无法解密配网数据', "The device couldn't decrypt the Wi-Fi setup data"),
    3: tr('设备无法加密配网数据', "The device couldn't encrypt the Wi-Fi setup data"),
    4: tr('设备安全通道初始化失败', "The device couldn't start the secure channel"),
    5: tr('设备安全通道内存不足', 'The device ran out of memory for the secure channel'),
    6: tr('设备拒绝了 DH 安全参数', 'The device rejected the DH security settings'),
    7: tr('设备无法读取 DH 安全参数', "The device couldn't read the DH security settings"),
    8: tr('设备无法生成安全公钥', "The device couldn't create a public key"),
    9: tr('设备收到了不支持的配网数据', "The device got Wi-Fi setup data it doesn't support"),
    10: tr('设备安全密钥计算失败', "The device couldn't work out the security key"),
    11: tr('设备扫描 Wi-Fi 失败', "The device couldn't scan for Wi-Fi"),
  })[code] ?? null;
}

export { crc16 };

/** AES-128-CFB128 with IV = 16 zero bytes except iv[0] = frame sequence. */
export function aesCfb(data, key, sequence, decrypt) {
  const iv = new Uint8Array(16);
  iv[0] = sequence & 0xff;
  return aesCfbRaw(data, key, iv, decrypt);
}

export function newDhKeys(random = randomBytes) {
  const r = random(DH_LENGTH);
  r[DH_LENGTH - 1] |= 1;
  const priv = bigFromBytes(r);
  return { private: priv, public: bigToBytes(modPow(DH_G, priv, DH_P)) };
}

/** P, G and our public key, each prefixed with a u16 big-endian length. */
export function negotiationParams(publicKey) {
  const p = bigToBytes(DH_P);
  const be16 = n => bytes(n >> 8, n);
  return concat(be16(p.length), p, be16(1), bytes(2), be16(publicKey.length), publicKey);
}

export function sharedKey(keys, devicePublic) {
  return md5(bigToBytes(modPow(bigFromBytes(devicePublic), keys.private, DH_P)));
}

/** DATA 0x11 payload: repeated [len][rssi i8][ssid (len-1)]; deduplicated keeping the strongest. */
export function parseWifiList(data) {
  const out = new Map();
  let i = 0;
  while (i + 2 <= data.length) {
    const len = data[i];
    if (len < 1 || i + 1 + len > data.length) break;
    const rssi = (data[i + 1] << 24) >> 24;
    const ssid = fromUtf8(data.subarray(i + 2, i + 1 + len));
    if (ssid && (!out.has(ssid) || out.get(ssid).rssi < rssi)) out.set(ssid, { ssid, rssi });
    i += 1 + len;
  }
  return [...out.values()].sort((a, b) => b.rssi - a.rssi);
}

/** Builds outgoing frames and reassembles incoming ones. One shared sequence counter per connection. */
export class BlufiFramer {
  constructor(mtu = 23) { this.mtu = mtu; this.reset(); }

  reset() { this.key = null; this.sequence = -1; this.rxKey = null; this.rxData = new Uint8Array(0); }

  nextSequence() { this.sequence = (this.sequence + 1) & 0xff; return this.sequence; }

  frames(type, subtype, payload, secure) {
    const k = this.key;
    if (secure && !k) throw new BleError(tr('安全通道尚未建立', "The secure channel isn't ready yet"));
    const maxData = Math.max(8, this.mtu - 3 - 4 - (secure ? 2 : 0));
    const out = [];
    let offset = 0;
    do {
      const remaining = payload.length - offset;
      const fragmented = remaining > maxData;
      const contentSize = fragmented ? maxData - 2 : remaining;
      let data = payload.subarray(offset, offset + contentSize);
      if (fragmented) data = concat(bytes(remaining, remaining >> 8), data);
      offset += contentSize;
      const seq = this.nextSequence();
      let control = fragmented ? FRAME_FRAGMENT : 0;
      let wire = data, tail = new Uint8Array(0);
      if (secure) {
        control |= FRAME_ENCRYPTED | FRAME_CHECKSUM;
        const sum = crc16(concat(bytes(seq, data.length), data));
        tail = bytes(sum, sum >> 8);
        wire = aesCfb(data, k, seq, false);
      }
      out.push(concat(bytes((subtype << 2) | type, control, seq, data.length), wire, tail));
    } while (offset < payload.length);
    return out;
  }

  /** CTRL set-security frame: checksum only, payload 0x03 (data frames encrypted + checksummed). */
  securityModeFrame() {
    const seq = this.nextSequence();
    const sum = crc16(bytes(seq, 1, 3));
    return bytes((CTRL_SET_SECURITY << 2) | TYPE_CONTROL, FRAME_CHECKSUM, seq, 1, 3, sum, sum >> 8);
  }

  /** Returns {type, subtype, data} for a complete packet, or null while fragments are arriving. */
  receive(frame) {
    if (frame.length < 4) return null;
    const type = frame[0] & 3, subtype = frame[0] >> 2, control = frame[1], seq = frame[2], length = frame[3];
    const hasSum = (control & FRAME_CHECKSUM) !== 0;
    if (frame.length < 4 + length + (hasSum ? 2 : 0)) return null;
    let data = frame.slice(4, 4 + length);
    if (control & FRAME_ENCRYPTED) {
      if (!this.key) throw new BleError(tr('收到加密数据时安全通道尚未就绪', 'Got encrypted data before the secure channel was ready'));
      data = aesCfb(data, this.key, seq, true);
    }
    if (hasSum) {
      const expected = frame[4 + length] | (frame[5 + length] << 8);
      if (expected !== crc16(concat(bytes(seq, length), data))) throw new BleError(tr('设备返回的数据校验失败', 'The data from the device failed its check'));
    }
    const k = `${type}:${subtype}`;
    if (control & FRAME_FRAGMENT) {
      if (this.rxKey !== k) { this.rxKey = k; this.rxData = new Uint8Array(0); }
      this.rxData = concat(this.rxData, data.subarray(2));
      return null;
    }
    if (this.rxKey === k) { data = concat(this.rxData, data); this.rxKey = null; this.rxData = new Uint8Array(0); }
    return { type, subtype, data };
  }
}

/** Provisioning steps reported by BlufiClient.provision. */
export const Step = { MODE: 'mode', SSID: 'ssid', PASSWORD: 'password', CONNECTING: 'connecting' };

export class BlufiClient {
  constructor(conn) {
    this.conn = conn;
    this.framer = new BlufiFramer();
    this.waiters = new Map();
  }

  /** `conn` must already be connected (the transport asks for MTU 128 for BluFi). */
  async connect() {
    const c = this.conn;
    this.framer.reset();
    this.framer.mtu = c.mtu || 23;
    if (!c.hasService(SERVICE)) throw new BleError(tr('这台设备不支持蓝牙配网', "This device doesn't support Bluetooth Wi-Fi setup"));
    await c.subscribe(SERVICE, NOTIFY, v => this.handle(v));
    await sleep(180);
    await this.negotiate();
  }

  handle(frame) {
    let packet;
    try { packet = this.framer.receive(frame); } catch (e) {
      this.failAll(new BleError(e.message || tr('配网数据解析失败', "Couldn't read the Wi-Fi setup data")));
      return;
    }
    if (!packet || packet.type !== TYPE_DATA) return;
    if (packet.subtype === DATA_ERROR) {
      const code = packet.data.length ? packet.data[0] : -1;
      this.failAll(new BleError(errorMessage(code) || tr(`设备报告配网错误（0x${code.toString(16)}）`, `The device reported a Wi-Fi setup error (0x${code.toString(16)})`)));
      return;
    }
    const w = this.waiters.get(packet.subtype);
    if (w) { this.waiters.delete(packet.subtype); w.resolve(packet.data); }
  }

  failAll(e) {
    const all = [...this.waiters.values()];
    this.waiters.clear();
    for (const w of all) w.reject(e);
  }

  expect(subtype) { const d = deferred(); this.waiters.set(subtype, d); return d.promise; }

  async send(frames) {
    for (let i = 0; i < frames.length; i++) {
      await this.conn.write(SERVICE, WRITE, frames[i]);
      if (i + 1 < frames.length) await sleep(32);
    }
  }

  control(subtype, payload = new Uint8Array(0)) { return this.send(this.framer.frames(TYPE_CONTROL, subtype, payload, false)); }
  data(subtype, payload, secure) { return this.send(this.framer.frames(TYPE_DATA, subtype, payload, secure)); }

  async negotiate() {
    const keys = newDhKeys();
    const params = negotiationParams(keys.public);
    await this.data(DATA_NEGOTIATION, bytes(0, params.length >> 8, params.length), false);
    const response = this.expect(DATA_NEGOTIATION);
    await this.data(DATA_NEGOTIATION, concat(bytes(1), params), false);
    const devicePublic = await withTimeout(response, 20000, tr('设备没有返回安全公钥', "The device didn't send its public key"));
    if (!devicePublic.length) throw new BleError(tr('设备没有返回安全公钥', "The device didn't send its public key"));
    this.framer.key = sharedKey(keys, devicePublic);
    await this.send([this.framer.securityModeFrame()]);
  }

  async scanWifi() {
    const response = this.expect(DATA_WIFI_LIST);
    await this.control(CTRL_GET_WIFI_LIST);
    return parseWifiList(await withTimeout(response, 22000, tr('设备扫描 Wi-Fi 超时', 'The device took too long to scan for Wi-Fi')));
  }

  /** Sends station credentials and waits up to 45 s for the device to report an IP. */
  async provision(ssid, password, onStep = () => {}) {
    onStep(Step.MODE); await this.control(CTRL_SET_WIFI_MODE, bytes(1));
    onStep(Step.SSID); await this.data(DATA_STA_SSID, utf8(ssid), true);
    onStep(Step.PASSWORD); await this.data(DATA_STA_PASSWORD, utf8(password), true);
    onStep(Step.CONNECTING);
    let pending = this.expect(DATA_WIFI_STATUS);
    await this.control(CTRL_CONNECT_WIFI);
    const deadline = Date.now() + 45000;
    let wait = 6000;
    while (Date.now() < deadline) {
      let s = null;
      try { s = await withTimeout(pending, wait, 'timeout'); } catch (e) { if (e.code !== 'timeout') throw e; }
      if (s && s.length > 1) {
        if (s[1] === 0) return;
        if (s[1] === 1) throw new BleError(tr('设备没能连上这个 Wi-Fi。请检查密码，并确认是 2.4 GHz 网络', "The device couldn't join this Wi-Fi. Check the password and make sure it's a 2.4 GHz network."));
      }
      if (Date.now() >= deadline) break;
      wait = 5000;
      pending = this.expect(DATA_WIFI_STATUS);
      await this.control(CTRL_GET_WIFI_STATUS);
    }
    throw new BleError(tr('等待设备获取 IP 超时，请确认路由器信号正常', 'The device took too long to get an IP address. Check that the router signal is good.'));
  }

  close() { this.failAll(new BleError(tr('已断开', 'Disconnected'))); }
}
