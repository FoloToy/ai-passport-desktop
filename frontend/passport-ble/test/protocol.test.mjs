// Run with: node --test frontend/passport-ble/test/
import assert from 'node:assert/strict';
import test from 'node:test';
import nodeCrypto from 'node:crypto';
import { md5, sha256, aesCfb, crc32, crc16 } from '../crypto.js';
import * as blufi from '../blufi.js';
import * as rec from '../recovery.js';
import * as wc from '../workcard.js';
import { hex, utf8 } from '../util.js';

const sizes = [0, 1, 55, 56, 63, 64, 65, 1000, 4096 + 7];

test('md5 and sha256 match node', () => {
  for (const n of sizes) {
    const b = nodeCrypto.randomBytes(n);
    assert.equal(hex(md5(b)), nodeCrypto.createHash('md5').update(b).digest('hex'));
    assert.equal(hex(sha256(b)), nodeCrypto.createHash('sha256').update(b).digest('hex'));
  }
});

test('aes-128-cfb matches node both ways', () => {
  for (const n of [1, 15, 16, 17, 100]) {
    const key = nodeCrypto.randomBytes(16), iv = nodeCrypto.randomBytes(16), data = nodeCrypto.randomBytes(n);
    const c = nodeCrypto.createCipheriv('aes-128-cfb', key, iv);
    const expect = Buffer.concat([c.update(data), c.final()]);
    assert.equal(hex(aesCfb(data, key, iv, false)), expect.toString('hex'));
    assert.equal(hex(aesCfb(expect, key, iv, true)), data.toString('hex'));
  }
});

test('crc32 matches zlib and crc16 matches the ESP-IDF check value', () => {
  assert.equal(crc32(utf8('123456789')), 0xcbf43926);
  // CRC-16/GENIBUS (CCITT poly, init FFFF, final NOT) check value
  assert.equal(crc16(utf8('123456789')), 0xd64e);
});

test('blufi frames round-trip through a second framer with the same key', () => {
  const a = new blufi.BlufiFramer(30), b = new blufi.BlufiFramer(30);
  const key = nodeCrypto.randomBytes(16);
  a.key = key; b.key = key;
  const payload = utf8('a fairly long wi-fi password that will need fragments');
  let got = null;
  for (const f of a.frames(blufi.TYPE_DATA, blufi.DATA_STA_PASSWORD, payload, true)) got = b.receive(f) || got;
  assert.equal(new TextDecoder().decode(got.data), new TextDecoder().decode(payload));
  assert.equal(got.subtype, blufi.DATA_STA_PASSWORD);
});

test('blufi dh agrees with a node DH peer', () => {
  const keys = blufi.newDhKeys();
  const peer = nodeCrypto.createDiffieHellman(Buffer.from(blufi.DH_P.toString(16), 'hex'), Buffer.from([2]));
  peer.generateKeys();
  const ours = blufi.sharedKey(keys, peer.getPublicKey());
  const theirs = nodeCrypto.createHash('md5').update(peer.computeSecret(Buffer.from(keys.public)).toString('hex').replace(/^(00)+/, ''), 'hex').digest();
  assert.equal(hex(ours), theirs.toString('hex'));
});

test('recovery transfer writes stay within 48 bytes and carry the payload', () => {
  const payload = rec.installPayload(0x10000, 123456, 'ab'.repeat(32), 'https://example.com/fw.bin');
  const writes = rec.transferWrites(rec.TRANSFER_INSTALL, payload);
  assert.deepEqual([...writes[0]], [0x0a, 2, payload.length & 0xff, payload.length >> 8]);
  assert.ok(writes.every(w => w.length <= 48));
  assert.equal(writes.at(-1)[0], 0x0c);
  assert.equal(rec.snFromName('AI-PASSPORT-OTA-A1B2C3D4E5F6'), 'a1b2c3d4e5f6');
  assert.equal(rec.snFromName('000000000000'), null);
  const st = rec.parseStatus(Uint8Array.of(7, 0, 0, 0, 40, 0, 0, 0, 100, 0, 0, 0));
  assert.equal(st.percent, 40);
});

test('workcard frames and names', () => {
  const frames = wc.streamFrames(wc.TYPE_IMAGE, new Uint8Array(500));
  assert.equal(frames.length, 1 + 3 + 1);
  assert.deepEqual([...frames[0]], [1, 2, 5, 0, 0, 0xf4, 1, 0, 0]);
  assert.equal(wc.snFromName('TRAE-CARD-a1b2c3d4e5f6'), 'A1B2C3D4E5F6');
  assert.equal(wc.snFromName('SN-A1B2C3D4E5F6'), 'A1B2C3D4E5F6');
  assert.equal(wc.chunkSize(247), 240);
});
