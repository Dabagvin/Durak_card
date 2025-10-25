"use strict";
// backend/src/middleware/logger.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
/**
 * Простой логгер запросов (можно заменить на Winston)
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    // Логируем после завершения ответа
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = [
            `[${new Date().toISOString()}]`,
            req.method,
            req.path,
            `→ ${res.statusCode}`,
            `(${duration}ms)`,
        ].join(' ');
        // Цветной вывод в зависимости от статуса
        if (res.statusCode >= 500) {
            console.error(`❌ ${logMessage}`);
        }
        else if (res.statusCode >= 400) {
            console.warn(`⚠️  ${logMessage}`);
        }
        else {
            console.log(`✅ ${logMessage}`);
        }
    });
    next();
}
