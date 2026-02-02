/**
 * Security Middleware
 * Additional security validations and checks
 */

/**
 * Validate request has required headers
 */
function validateHeaders(req, res, next) {
  const contentType = req.get('Content-Type');
  
  if (req.method === 'POST' && !contentType?.includes('application/json')) {
    return res.status(400).json({
      error: 'Content-Type must be application/json'
    });
  }
  
  next();
}

/**
 * Validate HTTPS in production
 * All requests must use HTTPS for security
 */
function enforceHTTPS(req, res, next) {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.status(403).json({
      error: 'HTTPS is required in production'
    });
  }
  
  next();
}

/**
 * Prevent sensitive data in URLs
 * Ensures no sensitive parameters are passed in query strings
 */
function preventSensitiveDataInURL(req, res, next) {
  const sensitiveParams = ['state_code', 'password', 'token', 'fingerprint'];
  const queryKeys = Object.keys(req.query);
  
  for (const key of queryKeys) {
    if (sensitiveParams.includes(key.toLowerCase())) {
      return res.status(400).json({
        error: 'Sensitive data must be sent in request body, not URL'
      });
    }
  }
  
  next();
}

/**
 * Log security events for monitoring
 */
function logSecurityEvent(req, action, result) {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[SECURITY] ${timestamp} | IP: ${ip} | Action: ${action} | Result: ${result}`);
}

module.exports = {
  validateHeaders,
  enforceHTTPS,
  preventSensitiveDataInURL,
  logSecurityEvent
};
