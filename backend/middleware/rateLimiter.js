const rateStore = new Map();
const WINDOW_MS = 60000;
const MAX_REQUESTS = 60;

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateStore.has(ip)) {
    rateStore.set(ip, []);
  }
  
  const timestamps = rateStore.get(ip).filter(t => now - t < WINDOW_MS);
  
  if (timestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      msg: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(WINDOW_MS / 1000)
    });
  }
  
  timestamps.push(now);
  rateStore.set(ip, timestamps);
  
  if (rateStore.size > 10000) {
    const cutoff = now - WINDOW_MS;
    for (const [key, times] of rateStore) {
      const filtered = times.filter(t => now - t < WINDOW_MS);
      if (filtered.length === 0) rateStore.delete(key);
      else rateStore.set(key, filtered);
    }
  }
  
  next();
}

module.exports = rateLimiter;
