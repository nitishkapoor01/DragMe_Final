/* ==========================================================================
   DRAGME BACKEND MIDDLEWARE: MEMORY-SAFE SLIDING WINDOW RATE LIMITER
   ========================================================================== */

const ipBuckets = new Map();

// Periodic garbage collection to prevent memory leaks at scale (every 5 mins)
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets.entries()) {
    if (now > bucket.resetTime) {
      ipBuckets.delete(ip);
    }
  }
}, 300000);

function rateLimiter({ windowMs = 60000, max = 20 } = {}) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!ipBuckets.has(ip)) {
      ipBuckets.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const bucket = ipBuckets.get(ip);
    if (now > bucket.resetTime) {
      bucket.count = 1;
      bucket.resetTime = now + windowMs;
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please slow down and try again.' });
    }

    next();
  };
}

module.exports = { rateLimiter, ipBuckets };
