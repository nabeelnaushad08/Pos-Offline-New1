import crypto from "crypto";

const LICENSE_SECRET = "ZENTHOZ-POS-2024-0779067747-SECRET-KEY";

export function generateLicenseKey(machineId: string): string {
  const normalized = machineId.trim().toUpperCase();
  const hash = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(normalized)
    .digest("hex");
  const h = hash.toUpperCase();
  return `ZPOS-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

export function validateLicenseKey(key: string, machineId: string): boolean {
  const expected = generateLicenseKey(machineId);
  return key.trim().toUpperCase() === expected;
}

export function getMachineId(): string {
  return process.env.MACHINE_ID || "localhost";
}
