const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../../db/redis');

// Rate limits by plan — extend as needed
const PLAN_LIMITS = {
  free:       { max: 100,  windowMs: 15 * 60 * 1000 }, // 100 req / 15 min
  pro:        { max: 500,  windowMs: 15 * 60 * 1000 }, // 500 req / 15 min
  enterprise: { max: 2000, windowMs: 15 * 60 * 1000 }, // 2000 req / 15 min
};

function createTenantRateLimiter(plan = 'free') {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  return rateLimit({
    windowMs: limits.windowMs,
    max: limits.max,
    // Key = tenant_id from verified JWT — NOT the IP address
    keyGenerator: (req) => `tenant:${req.user?.tenantId || req.ip}`,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(limits.windowMs / 1000),
      });
    },
  });
}

// Default limiter for all API routes
const defaultLimiter = createTenantRateLimiter('free');

module.exports = { defaultLimiter, createTenantRateLimiter };
