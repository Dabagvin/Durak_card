// backend/src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter для API endpoints
 * Ограничивает количество запросов с одного IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Максимум 100 запросов за 15 минут
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Возвращает rate limit info в headers
  legacyHeaders: false,
});

/**
 * Строгий лимитер для действий в игре
 * Предотвращает спам действиями
 */
export const gameActionLimiter = rateLimit({
  windowMs: 1000, // 1 секунда
  max: 10, // Максимум 10 действий в секунду
  message: {
    error: 'Too many game actions, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Считаем все запросы
});

/**
 * Лимитер для создания комнат
 */
export const createRoomLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 5, // Максимум 5 комнат в минуту
  message: {
    error: 'Too many rooms created, please wait a moment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
