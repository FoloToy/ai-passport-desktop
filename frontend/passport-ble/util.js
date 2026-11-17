// Shared helpers for the AI Passport Bluetooth protocols.
// This folder is used as-is by the desktop app (frontend/) and by the website
// (copied into folo-ai-passport-landing-page); keep it plain ES modules with no imports
// from outside the folder and no build step.

let language = 'zh';

/** Sets the language of the messages thrown by this library ("zh" or "en"). */
export function setLanguage(l) { language = l === 'en' ? 'en' : 'zh'; }
export function getLanguage() { return language; }
export const tr = (zh, en) => (language === 'en' ? en : zh);

/** An error with a user-facing message. `code` is set for the few errors callers branch on. */
export class BleError extends Error {
  constructor(message, code) { super(message); this.name = 'BleError'; if (code) this.code = code; }
}

const enc = new TextEncoder();
const dec = new TextDecoder();
export const utf8 = s => enc.encode(s);
export const fromUtf8 = b => dec.decode(b);
export const utf8Length = s => enc.encode(s).length;
export const ascii = b => Array.from(b, c => String.fromCharCode(c)).join('');

export function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

export const bytes = (...v) => Uint8Array.from(v.map(x => x & 0xff));
export const u8 = (b, at) => b[at];
export const u16 = (b, at) => b[at] | (b[at + 1] << 8);
export const u32 = (b, at) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
export const le16 = v => bytes(v, v >>> 8);
export const le32 = v => bytes(v, v >>> 8, v >>> 16, v >>> 24);
export function putLe32(b, at, v) { b[at] = v & 0xff; b[at + 1] = (v >>> 8) & 0xff; b[at + 2] = (v >>> 16) & 0xff; b[at + 3] = (v >>> 24) & 0xff; }

export const hex = b => Array.from(b, c => c.toString(16).padStart(2, '0')).join('');
export function fromHex(s) {
  if (s.length % 2 || /[^0-9a-f]/i.test(s)) throw new Error('bad hex');
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(2 * i, 2), 16);
  return out;
}

export function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Rejects with BleError(message) when `promise` takes longer than `ms`. */
export function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new BleError(message, 'timeout')), ms); }),
  ]).finally(() => clearTimeout(timer));
}

/** A promise that can be settled from outside. */
export function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

/** Full 128-bit lower-case UUID for a 16-bit Bluetooth SIG id. */
export const uuid16 = v => `0000${v.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`;
export const normUuid = u => (typeof u === 'number' ? uuid16(u) : String(u).toLowerCase());

/** Plain words for a GATT or transport failure. */
export function gattError(e) {
  if (e instanceof BleError) return e;
  const msg = String((e && e.message) || e || '');
  if (/disconnect|not connected|GATT Server is disconnected/i.test(msg)) return new BleError(tr('蓝牙连接已断开', 'Bluetooth disconnected'), 'disconnected');
  return new BleError(tr(`蓝牙操作失败：${msg}`, `Bluetooth operation failed: ${msg}`));
}
