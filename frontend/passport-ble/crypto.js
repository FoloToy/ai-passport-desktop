// Small pure-JS crypto used by the protocols: MD5, SHA-256, AES-128 (CFB128), CRCs and
// BigInt modular exponentiation. WebCrypto is not used because AES-CFB is not in it and
// the desktop WebView may not count as a secure context.

/* ---------------- MD5 (RFC 1321) ---------------- */
const MD5_S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

function padded(data, bigEndianLength) {
  const n = data.length;
  const total = (((n + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(total);
  buf.set(data);
  buf[n] = 0x80;
  const bits = n * 8;
  const lo = bits >>> 0, hi = Math.floor(bits / 2 ** 32) >>> 0;
  const v = new DataView(buf.buffer);
  if (bigEndianLength) { v.setUint32(total - 8, hi); v.setUint32(total - 4, lo); }
  else { v.setUint32(total - 8, lo, true); v.setUint32(total - 4, hi, true); }
  return buf;
}

export function md5(data) {
  const buf = padded(data, false);
  const v = new DataView(buf.buffer);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const m = new Uint32Array(16);
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) m[i] = v.getUint32(off + 4 * i, true);
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) & 15; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) & 15; }
      else { f = c ^ (b | ~d); g = (7 * i) & 15; }
      const s = MD5_S[(i >> 4) * 4 + (i & 3)];
      const x = (a + f + MD5_K[i] + m[g]) >>> 0;
      a = d; d = c; c = b;
      b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((w, i) => ov.setUint32(4 * i, w, true));
  return out;
}

/* ---------------- SHA-256 (FIPS 180-4) ---------------- */
const SHA_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(data) {
  const buf = padded(data, true);
  const v = new DataView(buf.buffer);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = v.getUint32(off + 4 * i);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  h.forEach((x, i) => ov.setUint32(4 * i, x));
  return out;
}

/* ---------------- AES-128, encryption only (CFB needs no inverse cipher) ---------------- */
const SBOX = (() => {
  const s = new Uint8Array(256);
  let p = 1, q = 1;
  do {
    p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0);
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff;
    if (q & 0x80) q ^= 0x09;
    const x = q ^ ((q << 1 | q >> 7) & 0xff) ^ ((q << 2 | q >> 6) & 0xff) ^ ((q << 3 | q >> 5) & 0xff) ^ ((q << 4 | q >> 4) & 0xff);
    s[p] = (x ^ 0x63) & 0xff;
  } while (p !== 1);
  s[0] = 0x63;
  return s;
})();

const xtime = b => ((b << 1) ^ (b & 0x80 ? 0x1b : 0)) & 0xff;

function expandKey(key) {
  if (key.length !== 16) throw new Error('AES-128 needs a 16-byte key');
  const w = new Uint8Array(176);
  w.set(key);
  let rcon = 1;
  for (let i = 16; i < 176; i += 4) {
    let t = w.slice(i - 4, i);
    if (i % 16 === 0) {
      t = Uint8Array.of(SBOX[t[1]] ^ rcon, SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]);
      rcon = xtime(rcon);
    }
    for (let j = 0; j < 4; j++) w[i + j] = w[i - 16 + j] ^ t[j];
  }
  return w;
}

function encryptBlock(w, input) {
  const s = Uint8Array.from(input);
  for (let i = 0; i < 16; i++) s[i] ^= w[i];
  for (let round = 1; round <= 10; round++) {
    for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]];
    // ShiftRows (state is column-major: s[r + 4c])
    let t = s[1]; s[1] = s[5]; s[5] = s[9]; s[9] = s[13]; s[13] = t;
    t = s[2]; s[2] = s[10]; s[10] = t; t = s[6]; s[6] = s[14]; s[14] = t;
    t = s[15]; s[15] = s[11]; s[11] = s[7]; s[7] = s[3]; s[3] = t;
    if (round < 10) {
      for (let c = 0; c < 16; c += 4) {
        const a0 = s[c], a1 = s[c + 1], a2 = s[c + 2], a3 = s[c + 3];
        const all = a0 ^ a1 ^ a2 ^ a3;
        s[c] ^= all ^ xtime(a0 ^ a1);
        s[c + 1] ^= all ^ xtime(a1 ^ a2);
        s[c + 2] ^= all ^ xtime(a2 ^ a3);
        s[c + 3] ^= all ^ xtime(a3 ^ a0);
      }
    }
    for (let i = 0; i < 16; i++) s[i] ^= w[round * 16 + i];
  }
  return s;
}

/** AES-128-CFB128 over `data` with the given 16-byte IV. */
export function aesCfb(data, key, iv, decrypt) {
  const w = expandKey(key);
  const out = new Uint8Array(data.length);
  let feedback = Uint8Array.from(iv);
  for (let off = 0; off < data.length; off += 16) {
    const ks = encryptBlock(w, feedback);
    const n = Math.min(16, data.length - off);
    const next = new Uint8Array(16);
    for (let i = 0; i < n; i++) {
      out[off + i] = data[off + i] ^ ks[i];
      next[i] = decrypt ? data[off + i] : out[off + i];
    }
    feedback = next;
  }
  return out;
}

/* ---------------- CRCs ---------------- */
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32Raw(b, from, to, init) {
  let c = init >>> 0;
  for (let i = from; i < to; i++) c = CRC32_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return c >>> 0;
}

/** zlib/PNG CRC-32. */
export const crc32 = (b, from = 0, to = b.length) => (crc32Raw(b, from, to, 0xffffffff) ^ 0xffffffff) >>> 0;

/** ESP-IDF NVS CRC-32 (esp_rom_crc32_le(0xFFFFFFFF, …)): register starts at 0, result inverted. */
export const nvsCrc32 = (b, from = 0, to = b.length) => (crc32Raw(b, from, to, 0) ^ 0xffffffff) >>> 0;

/** CRC16-CCITT (poly 0x1021, init 0xFFFF) with final NOT, as ESP-IDF BluFi. */
export function crc16(b) {
  let crc = 0xffff;
  for (const x of b) {
    crc ^= x << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return ~crc & 0xffff;
}

/* ---------------- BigInt helpers for Diffie-Hellman ---------------- */
export function modPow(base, exp, mod) {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}

export const bigFromBytes = b => (b.length ? BigInt('0x' + Array.from(b, c => c.toString(16).padStart(2, '0')).join('')) : 0n);

/** Minimal big-endian bytes, no sign byte. */
export function bigToBytes(v) {
  let h = v.toString(16);
  if (h.length % 2) h = '0' + h;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(2 * i, 2), 16);
  return out;
}

export function randomBytes(n) {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}
