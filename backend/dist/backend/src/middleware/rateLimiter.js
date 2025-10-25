"use strict";
// backend/src/middleware/rateLimiter.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoomLimiter = exports.gameActionLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Rate limiter для API endpoints
 * Ограничивает количество запросов с одного IP
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
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
exports.gameActionLimiter = (0, express_rate_limit_1.default)({
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
exports.createRoomLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 минута
    max: 5, // Максимум 5 комнат в минуту
    message: {
        error: 'Too many rooms created, please wait a moment.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
