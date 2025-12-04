const rateLimit = require('express-rate-limit');

// General API rate limiter - Increased for frontend normal usage
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (allows ~33 req/min)
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for expensive endpoints (transfers with large page sizes)
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute (2 req/sec)
  message: { error: 'Rate limit exceeded. Please slow down your requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  strictLimiter,
};
