// AI Passport Bluetooth: device classification and the protocol clients, shared by the desktop app
// and the website. Ported from the Android app (ble/BleScanner.kt and friends).
//
// Transport ("conn") contract — implemented by webbluetooth.js (browsers) and by the desktop
// bridge (Go, through the local API):
//   conn.name                          advertised name
//   conn.mtu                           negotiated ATT MTU (23 if unknown)
//   conn.connected                     boolean, false after the link drops
//   conn.hasService(uuid)              boolean
//   conn.read(service, char)           Promise<Uint8Array>
//   conn.write(service, char, bytes)   Promise (write with response)
//   conn.writeMany(service, char, [])  Promise; writes in order (the bridge sends them in one call)
//   conn.subscribe(service, char, fn)  Promise; fn(Uint8Array) per notification
//   conn.close()

import * as recovery from './recovery.js';
import * as blufi from './blufi.js';
import * as workcard from './workcard.js';

export { recovery, blufi, workcard };
export { setLanguage, BleError } from './util.js';

export const Mode = { INSTALLER: 'installer', BLUFI: 'blufi', WORK_CARD: 'workcard' };

/** Every service the clients may use; Web Bluetooth needs them listed up front. */
export const SERVICES = [recovery.SERVICE, blufi.SERVICE, workcard.SERVICE];

/** MTU each mode asks for (BluFi keeps frames small on purpose). */
export const MTU = { [Mode.INSTALLER]: 517, [Mode.BLUFI]: 128, [Mode.WORK_CARD]: 247 };

/** Classifies an advertisement by its service UUIDs (lower-case, 128-bit) and name; null if not ours. */
export function classify(name, uuids = []) {
  const set = new Set(uuids.map(u => String(u).toLowerCase()));
  name = name || '';
  if (set.has(recovery.SERVICE)) return Mode.INSTALLER;
  if (set.has(blufi.SERVICE) || name.startsWith('BLUFI_')) return Mode.BLUFI;
  if (set.has(workcard.SERVICE)) return Mode.WORK_CARD;
  if (name.startsWith('AI-PASSPORT-OTA-') && recovery.snFromName(name)) return Mode.INSTALLER;
  // The default 通行证 firmware may advertise only its SN as the name, with no room for the 128-bit UUID.
  if (workcard.snFromName(name)) return Mode.WORK_CARD;
  return null;
}

/** Classifies a connected device by the services it actually has. */
export function classifyConnected(conn) {
  if (conn.hasService(recovery.SERVICE)) return Mode.INSTALLER;
  if (conn.hasService(blufi.SERVICE)) return Mode.BLUFI;
  if (conn.hasService(workcard.SERVICE)) return Mode.WORK_CARD;
  return classify(conn.name);
}

export function snOf(mode, name) {
  if (mode === Mode.INSTALLER) return recovery.snFromName(name);
  if (mode === Mode.WORK_CARD) return workcard.snFromName(name);
  return null;
}

export function displayName(name, mode, sn) {
  if (mode === Mode.BLUFI && (name === 'BLUFI_FoloPassport' || !name)) return 'FoloToy AI Passport';
  if (mode === Mode.BLUFI) return name.replace(/^BLUFI_/, '');
  if (sn && mode === Mode.INSTALLER) return `AI Passport ${sn}`;
  return name || 'AI Passport';
}

/** Filters for navigator.bluetooth.requestDevice: our services, plus the name forms that carry none. */
export const REQUEST_FILTERS = [
  { services: [recovery.SERVICE] },
  { services: [blufi.SERVICE] },
  { services: [workcard.SERVICE] },
  { namePrefix: 'AI-PASSPORT-OTA-' },
  { namePrefix: 'BLUFI_' },
  { namePrefix: 'TRAE' },
  { namePrefix: 'MOTE' },
  { namePrefix: 'AI PASSPORT' },
  { namePrefix: 'AI-PASSPORT' },
  { namePrefix: 'SN' },
  ...'0123456789ABCDEFabcdef'.split('').map(c => ({ namePrefix: c })),
];
