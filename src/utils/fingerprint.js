const crypto = require('crypto');

/**
 * Device Fingerprinting Utilities
 *
 * The hash now incorporates:
 *   1. deviceId      — persistent localStorage UUID (primary differentiator)
 *   2. userAgent     — browser + OS version string
 *   3. platform      — OS platform
 *   4. screenResolution
 *   5. timezone
 *   6. language
 *   7. canvas        — GPU-level rendering fingerprint
 *   8. hardwareConcurrency — CPU core count
 *   9. deviceMemory  — RAM tier
 *  10. maxTouchPoints
 *  11. screenDepth   — colour depth
 *
 * This eliminates the collision problem where two users with the same
 * phone model + Chrome version were hashing to the same fingerprint.
 */

/**
 * Generate a secure device fingerprint hash.
 * @param {Object} deviceInfo - Device information from the client
 * @returns {string} SHA-256 hex hash
 */
function generateFingerprint(deviceInfo) {
  const {
    deviceId            = '',
    userAgent           = '',
    platform            = '',
    screenResolution    = '',
    timezone            = '',
    language            = '',
    canvas              = '',
    hardwareConcurrency = 0,
    deviceMemory        = 0,
    maxTouchPoints      = 0,
    screenDepth         = 0
  } = deviceInfo;

  const fingerprintString = [
    deviceId,
    userAgent,
    platform,
    screenResolution,
    timezone,
    language,
    canvas,
    String(hardwareConcurrency),
    String(deviceMemory),
    String(maxTouchPoints),
    String(screenDepth)
  ].join('|');

  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex');
}

/**
 * Validate device fingerprint matches existing record.
 * @param {string} providedFingerprint
 * @param {string} storedFingerprint
 * @returns {boolean}
 */
function validateFingerprint(providedFingerprint, storedFingerprint) {
  if (!providedFingerprint || !storedFingerprint) return false;
  return providedFingerprint === storedFingerprint;
}

/**
 * Validate required device info fields are present.
 * deviceId is now required — it is the persistent localStorage UUID.
 * @param {Object} deviceInfo
 * @returns {{ valid: boolean, missing: string[] }}
 */
function validateDeviceInfo(deviceInfo) {
  const requiredFields = ['deviceId', 'userAgent', 'platform', 'screenResolution', 'timezone'];
  const missing = [];

  for (const field of requiredFields) {
    if (!deviceInfo[field]) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = {
  generateFingerprint,
  validateFingerprint,
  validateDeviceInfo
};
