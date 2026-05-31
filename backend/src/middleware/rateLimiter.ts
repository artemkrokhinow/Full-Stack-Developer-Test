import rateLimit from 'express-rate-limit';

export const dropRateLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds
  max: 500, // Increased to 500 for the concurrency simulation test (was 5)
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
