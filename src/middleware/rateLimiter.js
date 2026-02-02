const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and excessive API requests
 */

/**
 * General API rate limiter
 * Applies to all API endpoints
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

/**
 * Strict rate limiter for queue generation
 * More restrictive to prevent abuse
 */
const queueGenerationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 queue generation attempts per 5 minutes
  message: {
    error: 'Too many queue generation attempts. Please try again later',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to rate limit by IP and state code combination
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const stateCode = req.body.state_code || '';
    return `${ip}-${stateCode}`;
  }
});

/**
 * Rate limiter for verification endpoints
 */
const verificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Limit each IP to 50 verification requests per 10 minutes
  message: {
    error: 'Too many verification attempts. Please try again later',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  queueGenerationLimiter,
  verificationLimiter
};
