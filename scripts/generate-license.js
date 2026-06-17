#!/usr/bin/env node
/**
 * Zenthoz POS - License Key Generator
 *
 * Usage:
 *   node scripts/generate-license.js <MACHINE-ID>
 *
 * Example:
 *   node scripts/generate-license.js A1B2-C3D4-E5F6-G7H8
 *
 * The client gets their Machine ID from the Setup screen (Step 2).
 */

const crypto = require('crypto');

const LICENSE_SECRET = 'ZENTHOZ-POS-2024-0779067747-SECRET-KEY';

function generateLicenseKey(machineId) {
  const normalized = machineId.trim().toUpperCase();
  const hash = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(normalized)
    .digest('hex');
  const h = hash.toUpperCase();
  return `ZPOS-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

const machineId = process.argv[2];

if (!machineId) {
  console.error('\nUsage: node scripts/generate-license.js <MACHINE-ID>');
  console.error('Example: node scripts/generate-license.js A1B2-C3D4-E5F6-G7H8\n');
  process.exit(1);
}

const licenseKey = generateLicenseKey(machineId);

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║     Zenthoz POS - License Key Generator      ║');
console.log('╠══════════════════════════════════════════════╣');
console.log(`║  Machine ID : ${machineId.toUpperCase().padEnd(30)} ║`);
console.log(`║  License Key: ${licenseKey.padEnd(30)} ║`);
console.log('╚══════════════════════════════════════════════╝');
console.log('\nSend the License Key above to your client.');
console.log('They enter it in the POS Setup screen (Step 2).\n');
