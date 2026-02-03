/**
 * Input Validation Utilities
 * Server-side validation for all user inputs
 */

/**
 * Validate NYSC State Code format
 * Expected format: NY/23A/1234 or NY/23B/5678
 * Pattern: NY/[Year][Batch]/[Number]
 * 
 * @param {string} stateCode - NYSC state code to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
function validateStateCode(stateCode) {
  if (!stateCode || typeof stateCode !== 'string') {
    return {
      valid: false,
      message: 'State code is required'
    };
  }

  // Remove extra whitespace
  stateCode = stateCode.trim().toUpperCase();

  // Pattern: NY/YYB/NNNN (e.g., NY/23A/1234)
  // NY = State code (2 letters)
  // YY = Year (2 digits)
  // B = Batch (A, B, or C)
  // NNNN = Number (1-5 digits)
  const pattern = /^[A-Z]{2}\/\d{2}[A-C]\/\d{1,5}$/;

  if (!pattern.test(stateCode)) {
    return {
      valid: false,
      message: 'Invalid state code format. Expected: NY/23A/1234'
    };
  }

  return {
    valid: true,
    message: 'Valid state code',
    normalized: stateCode
  };
}

/**
 * Validate GPS coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Object} - { valid: boolean, message: string }
 */
function validateLocation(latitude, longitude) {
  // Check if coordinates are provided
  if (latitude === undefined || longitude === undefined) {
    return {
      valid: false,
      message: 'GPS coordinates are required'
    };
  }

  // Convert to numbers if strings
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  // Check if valid numbers
  if (isNaN(lat) || isNaN(lon)) {
    return {
      valid: false,
      message: 'Invalid GPS coordinates'
    };
  }

  // Validate latitude range (-90 to 90)
  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      message: 'Latitude must be between -90 and 90'
    };
  }

  // Validate longitude range (-180 to 180)
  if (lon < -180 || lon > 180) {
    return {
      valid: false,
      message: 'Longitude must be between -180 and 180'
    };
  }

  return {
    valid: true,
    message: 'Valid coordinates',
    latitude: lat,
    longitude: lon
  };
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean}
 */
function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} input - String to sanitize
 * @returns {string}
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 255); // Limit length
}

module.exports = {
  validateStateCode,
  validateLocation,
  validateUUID,
  sanitizeString
};
