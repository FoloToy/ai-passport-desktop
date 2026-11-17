// Loads the Bluetooth protocol library (ES modules) for the classic scripts (ble.js).
import * as PB from './passport-ble/index.js';
import * as bridge from './ble-bridge.js';
import { crc32 } from './passport-ble/crypto.js';

window.PB = { ...PB, bridge, crc32 };
window.dispatchEvent(new Event('pb-ready'));
