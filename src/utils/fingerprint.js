const crypto = require('crypto');

/**
 * Device Fingerprinting Utilities
 * Generates unique device identifiers to prevent device switching and link sharing
 * Uses two fingerprints: full (browser-specific) and stable (device-specific across browsers)
 */

/**
 * Generate a secure device fingerprint hash (browser-specific)
 * Used for same-browser validation
 */
function generateFingerprint(deviceInfo) {
  const {
    userAgent = '',
    platform = '',
    screenResolution = '',
    timezone = '',
    language = ''
  } = deviceInfo;

  const fingerprintString = [
    userAgent,
    platform,
    screenResolution,
    timezone,
    language
  ].join('|');

  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

/**
 * Generate a STABLE device fingerprint that persists across different browsers on the same device
 * Excludes userAgent - uses hardware/screen attributes that are identical across Chrome, Firefox, Safari, etc.
 * Prevents: same phone → Chrome gets queue → Firefox tries to get another
 */
function generateStableFingerprint(deviceInfo) {
  const {
    platform = '',
    screenResolution = '',
    timezone = '',
    language = '',
    metadata = {}
  } = deviceInfo;

  const stableAttributes = [
    platform,
    screenResolution,
    timezone,
    language,
    metadata.colorDepth || '',
    metadata.hardwareConcurrency || '',
    metadata.deviceMemory || '',
    metadata.maxTouchPoints || '',
    metadata.canvas || ''
  ].join('|');

  return crypto.createHash('sha256').update(stableAttributes).digest('hex');
}

/**
 * Validate device fingerprint matches existing record
 * @param {string} providedFingerprint - Fingerprint from current request
 * @param {string} storedFingerprint - Fingerprint from database
 * @returns {boolean}
 */
function validateFingerprint(providedFingerprint, storedFingerprint) {
  if (!providedFingerprint || !storedFingerprint) {
    return false;
  }
  
  return providedFingerprint === storedFingerprint;
}

/**
 * Validate required device info fields are present
 * @param {Object} deviceInfo - Device information object
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
function validateDeviceInfo(deviceInfo) {
  const requiredFields = ['userAgent', 'platform', 'screenResolution', 'timezone'];
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
  generateStableFingerprint,
  validateFingerprint,
  validateDeviceInfo
};
