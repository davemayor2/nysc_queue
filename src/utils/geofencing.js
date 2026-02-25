/**
 * Geofencing Utilities
 * GPS-based location validation using Haversine formula
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if user is within allowed radius of LGA center.
 *
 * GPS receivers can report a position that is offset from the true position by
 * up to their reported accuracy value. To avoid falsely rejecting users who are
 * physically inside the LGA but whose device reports a slightly drifted position,
 * we subtract the device-reported accuracy from the measured distance before
 * comparing it against the radius.  The adjustment is capped at MAX_ACCURACY_ADJUST
 * so that an artificially inflated accuracy value cannot be used to bypass the check.
 *
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} lgaLat - LGA center latitude
 * @param {number} lgaLon - LGA center longitude
 * @param {number} radiusMeters - Allowed radius in meters
 * @param {number} [gpsAccuracy=0] - Device-reported GPS accuracy in meters (1-sigma)
 * @returns {Object} - { isWithin: boolean, distance: number, effectiveDistance: number, allowed: number }
 */
const MAX_ACCURACY_ADJUST = 150; // cap adjustment to prevent abuse

function isWithinGeofence(userLat, userLon, lgaLat, lgaLon, radiusMeters, gpsAccuracy = 0) {
  const distance = calculateDistance(userLat, userLon, lgaLat, lgaLon);

  // Clamp accuracy adjustment between 0 and the cap
  const accuracyAdjust = Math.min(Math.max(gpsAccuracy, 0), MAX_ACCURACY_ADJUST);
  const effectiveDistance = Math.max(0, distance - accuracyAdjust);

  return {
    isWithin: effectiveDistance <= radiusMeters,
    distance: Math.round(distance),
    effectiveDistance: Math.round(effectiveDistance),
    accuracyAdjust: Math.round(accuracyAdjust),
    allowed: radiusMeters
  };
}

/**
 * Validate GPS coordinates format
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean}
 */
function validateCoordinates(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return false;
  }
  
  // Latitude must be between -90 and 90
  if (lat < -90 || lat > 90) {
    return false;
  }
  
  // Longitude must be between -180 and 180
  if (lon < -180 || lon > 180) {
    return false;
  }
  
  return true;
}

module.exports = {
  calculateDistance,
  isWithinGeofence,
  validateCoordinates
};
