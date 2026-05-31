import rateLimit from 'express-rate-limit';

// Применяется строго на роуты /reserve и /checkout
export const dropRateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 секунд
  max: 5, // Не более 5 запросов с одного IP (защита от зажатой кнопки и ботов)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
