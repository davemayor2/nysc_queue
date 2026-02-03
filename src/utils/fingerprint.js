const crypto = require('crypto');

/**
 * Device Fingerprinting Utilities
 * Generates unique device identifiers to prevent device switching and link sharing
 */

/**
 * Generate a secure device fingerprint hash
 * Combines multiple device characteristics to create a unique identifier
 * 
 * @param {Object} deviceInfo - Device information from client
 * @param {string} deviceInfo.userAgent - Browser user agent
 * @param {string} deviceInfo.platform - Operating system platform
 * @param {string} deviceInfo.screenResolution - Screen width x height
 * @param {string} deviceInfo.timezone - User's timezone
 * @param {string} deviceInfo.language - Browser language
 * @returns {string} SHA-256 hash of device characteristics
 */
function generateFingerprint(deviceInfo) {
  const {
    userAgent = '',
    platform = '',
    screenResolution = '',
    timezone = '',
    language = ''
  } = deviceInfo;

  // Concatenate device characteristics
  const fingerprintString = [
    userAgent,
    platform,
    screenResolution,
    timezone,
    language
  ].join('|');

  // Generate SHA-256 hash
  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex');
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
  validateFingerprint,
  validateDeviceInfo
};
