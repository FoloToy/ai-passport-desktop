// Default 通行证 firmware (TRAECARD service), ported from the Android app (ble/workcard/WorkCard.kt),
// which follows the mini program's utils/traeCardBle.js.
//
// Every write is a frame [01][type][len u16 LE][payload ≤256], split into MTU-sized GATT writes.
// Text config is one JSON frame. Images and RTTTL music are streams: BEGIN [00][len] (u32 for
// images, u16 for music), DATA [01][≤220 bytes]…, END [02]. The device notifies [type][status]:
// 00 = ACK (keep waiting), 01 = DONE, 0x10–0x1D = error.

import { BleError, tr, utf8, ascii, concat, bytes, withTimeout, deferred } from './util.js';

export const SERVICE = '54524145-4341-5244-0000-000000000000';
export const COMMAND = '54524145-4341-5244-0000-000000000010';
export const NOTIFY = '54524145-4341-5244-0000-000000000011';
export const IDENTITY = '54524145-4341-5244-0000-000000000012';

export const VERSION = 0x01;
export const TYPE_FRAME = 0x00, TYPE_CONFIG = 0x01, TYPE_IMAGE = 0x02, TYPE_SCORE = 0x03;
export const STATUS_ACK = 0x00, STATUS_DONE = 0x01, STATUS_UNSUPPORTED = 0x18;
export const MAX_PAYLOAD = 256, STREAM_CHUNK = 220;

function statusText(status) {
  return ({
    0x10: tr('帧格式错误', 'bad frame format'), 0x11: tr('传输超时', 'transfer timed out'), 0x12: tr('操作时序错误', 'steps out of order'),
    0x13: tr('内容解析失败', "couldn't read the content"), 0x14: tr('没有有效字段', 'no valid fields'), 0x15: tr('数据过长', 'data too long'),
    0x16: tr('设备存储失败', "device couldn't save"), 0x17: tr('图片解码失败', "couldn't decode the image"), 0x18: tr('设备不支持该操作', "device doesn't support this"),
    0x19: tr('图片格式不支持', 'image format not supported'), 0x1a: tr('图片数据不完整', 'image data incomplete'),
    0x1b: tr('设备忙，请稍后重试', 'device busy, please try again later'), 0x1c: tr('设备未就绪，请重新连接后重试', 'device not ready, please reconnect and try again'),
    0x1d: tr('头像名称无效或设备缺少对应资源', 'invalid avatar name, or the device is missing it'),
  })[status];
}

const hex2 = n => n.toString(16).padStart(2, '0');

export function message(type, status) {
  const what = ({ 0: tr('传输', 'Transfer'), 1: tr('资料同步', 'Profile sync'), 2: tr('图片', 'Image'), 3: tr('开机音乐', 'Startup music') })[type] ?? tr(`类型 0x${hex2(type)}`, `Type 0x${hex2(type)}`);
  const why = statusText(status) ?? tr(`状态 0x${hex2(status)}`, `status 0x${hex2(status)}`);
  return tr(`${what}失败：${why}`, `${what} failed: ${why}`);
}

/** A device error status; `workspaceUnavailable` means another play replaced the 通行证 content. */
export class WorkCardStatusError extends BleError {
  constructor(type, status) {
    super(message(type, status), 'workcard_status');
    this.type = type; this.status = status;
    this.workspaceUnavailable = type === TYPE_CONFIG && status === STATUS_UNSUPPORTED;
  }
}

const PREFIXED = /^(?:MOTE|TRAE[- ]CARD|AI[- ]PASSPORT)[-_ ]+([0-9A-F]{12})$/;
const BARE = /^(?:SN[-_ ]*)?([0-9A-F]{12})$/;

export function snFromName(name) {
  const n = String(name || '').trim().toUpperCase();
  const m = PREFIXED.exec(n) || BARE.exec(n);
  return m ? m[1] : null;
}

export function parseIdentity(b) {
  if (b.length < 72 || b[0] !== 1) throw new BleError(tr('设备身份信息格式不受支持', "Device identity format isn't supported"));
  const text = (from, to) => ascii(b.subarray(from, to).filter(c => c !== 0)).trim();
  const sn = text(2, 26).toUpperCase().replace(/[^0-9A-F]/g, '');
  if (sn.length !== 12) throw new BleError(tr('设备身份中缺少有效 SN', 'Device identity has no valid SN'));
  return { provisioned: (b[1] & 1) === 1, sn, hardware: text(58, 66) };
}

export function frame(type, payload) {
  if (payload.length > MAX_PAYLOAD) throw new BleError(tr(`单帧数据不能超过 ${MAX_PAYLOAD} 字节`, `A frame can't be over ${MAX_PAYLOAD} bytes`));
  return concat(bytes(VERSION, type, payload.length, payload.length >> 8), payload);
}

/** BEGIN, DATA… and END frames for an image (u32 length) or RTTTL score (u16 length). */
export function streamFrames(type, data) {
  if (type !== TYPE_IMAGE && type !== TYPE_SCORE) throw new Error('bad stream type');
  if (type === TYPE_SCORE && data.length > 0xffff) throw new BleError(tr('文件超过 65535 字节', 'File is over 65535 bytes'));
  const n = data.length;
  const begin = type === TYPE_IMAGE ? bytes(0, n, n >> 8, n >> 16, n >>> 24) : bytes(0, n, n >> 8);
  const out = [frame(type, begin)];
  for (let off = 0; off < n; off += STREAM_CHUNK) out.push(frame(type, concat(bytes(1), data.subarray(off, Math.min(n, off + STREAM_CHUNK)))));
  out.push(frame(type, bytes(2)));
  return out;
}

export const chunkSize = mtu => Math.max(20, Math.min(mtu - 3, 240));

/** Device wall clock = UTC seconds + local offset (matches the mini program). */
export const localTime = (now = new Date()) => Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 1000);

export class WorkCardClient {
  constructor(conn) {
    this.conn = conn;
    this.replies = [];
    this.wake = null;
    this.busy = Promise.resolve();
    this.timeSyncSupported = false;
  }

  /**
   * Returns the identity. The SN comes from the identity characteristic, or from the advertised
   * name on older firmware that only exposes command/notify (as the mini program does).
   */
  async connect(advertisedName) {
    const c = this.conn;
    if (!c.hasService(SERVICE)) throw new BleError(tr('没有识别到通行证功能', 'Passport features not found on this device'), 'workcard_missing');
    await c.subscribe(SERVICE, NOTIFY, v => { this.replies.push(v); if (this.wake) this.wake.resolve(); });
    let identity;
    try {
      identity = parseIdentity(await c.read(SERVICE, IDENTITY));
    } catch {
      const sn = snFromName(advertisedName || c.name);
      if (!sn) throw new BleError(tr('没有读到设备 SN，请重新连接', "Couldn't read the device SN. Please reconnect."));
      identity = { provisioned: false, sn, hardware: '' };
    }
    try {
      await this.sendConfig({ time: localTime() });
      this.timeSyncSupported = true;
    } catch (e) {
      // 0x14/0x18: firmware has no clock field; 0x13: some variants reject unknown fields. Keep going.
      if (!(e instanceof WorkCardStatusError && [0x13, 0x14, 0x18].includes(e.status))) throw e;
    }
    return identity;
  }

  sendConfig(obj, onProgress) {
    const payload = utf8(JSON.stringify(obj));
    if (payload.length > MAX_PAYLOAD) return Promise.reject(new BleError(tr('文本配置超过 256 字节', 'Text settings are over 256 bytes')));
    return this.exchange(TYPE_CONFIG, [frame(TYPE_CONFIG, payload)], 30000, onProgress);
  }

  /** TRAE firmware ships its avatars; pick one by name (avatar-01…). */
  sendTraeAvatar(name) {
    if (!/^[a-z0-9_-]{1,15}$/.test(name)) return Promise.reject(new BleError(tr('请选择有效的头像', 'Please choose a valid avatar')));
    return this.sendConfig({ avatar_name: name });
  }

  /** Avatar: RGB PNG 96×156. Selects the avatar slot first, then streams the image. */
  async sendAvatar(png, onProgress) {
    await this.sendConfig({ img_mode: 'avatar' });
    await this.exchange(TYPE_IMAGE, streamFrames(TYPE_IMAGE, png), 45000, onProgress);
  }

  /** Full-screen picture: baseline JPEG ≤240×320, ≤124 KB. TRAE firmware has no img_mode switch. */
  async sendFullscreen(jpeg, legacyTrae, onProgress) {
    if (!legacyTrae) await this.sendConfig({ img_mode: 'fullscreen' });
    await this.exchange(TYPE_IMAGE, streamFrames(TYPE_IMAGE, jpeg), 45000, onProgress);
  }

  /** RTTTL boot music (≤1024 bytes). The score "a:" clears it. */
  sendScore(rtttl, onProgress) {
    return this.exchange(TYPE_SCORE, streamFrames(TYPE_SCORE, utf8(rtttl.trim())), 30000, onProgress);
  }

  /** Writes `frames` and waits for DONE on `type` (or a frame-layer error). One exchange at a time. */
  exchange(type, frames, timeoutMs, onProgress = () => {}) {
    const run = this.busy.then(() => this.exchangeNow(type, frames, timeoutMs, onProgress));
    this.busy = run.catch(() => {});
    return run;
  }

  async exchangeNow(type, frames, timeoutMs, onProgress) {
    const c = this.conn;
    this.replies = [];
    const size = chunkSize(c.mtu || 23);
    const writes = [];
    for (const f of frames) for (let off = 0; off < f.length; off += size) writes.push(f.subarray(off, Math.min(f.length, off + size)));
    onProgress(0);
    const step = Math.max(1, Math.floor(writes.length / 50));
    for (let i = 0; i < writes.length; i += step) {
      await c.writeMany(SERVICE, COMMAND, writes.slice(i, i + step));
      onProgress(Math.min(i + step, writes.length) / writes.length);
    }
    const wait = async () => {
      for (;;) {
        while (this.replies.length) {
          const r = this.replies.shift();
          if (r.length < 2) continue;
          if (r[0] !== type && r[0] !== TYPE_FRAME) continue;
          if (r[1] === STATUS_ACK) continue;
          if (r[1] === STATUS_DONE) return;
          throw new WorkCardStatusError(r[0], r[1]);
        }
        this.wake = deferred();
        await this.wake.promise;
        this.wake = null;
      }
    };
    await withTimeout(wait(), timeoutMs, tr('等待设备确认超时', 'Timed out waiting for the device to confirm'));
  }
}
