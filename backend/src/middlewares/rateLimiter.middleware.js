const ipBuckets = new Map();

// Periodic cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipBuckets.entries()) {
    if (now - data.resetTime > 60000) {
      ipBuckets.delete(ip);
    }
  }
}, 300000);

export function rateLimiterMiddleware(req, res, next) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown_ip';
  const reqUrl = req.originalUrl || req.url || '';
  const now = Date.now();
  const WINDOW_MS = 60 * 1000; // 1 minute window

  // Stricter limits for authentication endpoints to prevent brute-force attacks
  const isAuthRoute = reqUrl.includes('/api/auth/login') || reqUrl.includes('/api/auth/register');
  const maxRequests = isAuthRoute ? 20 : 120;

  let bucket = ipBuckets.get(clientIp);

  if (!bucket || now - bucket.resetTime > WINDOW_MS) {
    bucket = { count: 1, resetTime: now };
    ipBuckets.set(clientIp, bucket);
  } else {
    bucket.count += 1;
  }

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - bucket.count));

  if (bucket.count > maxRequests) {
    return res.status(429).json({
      success: false,
      statusCode: 429,
      message: 'Too many requests. Please wait a minute before trying again.'
    });
  }

  next();
}
