import rateLimit from 'express-rate-limit';

// Применяется строго на роуты /reserve и /checkout
export const dropRateLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 секунд
  max: 5, // Не более 5 запросов с одного IP
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  // По умолчанию используется In-Memory Store, внешняя БД не требуется
});
