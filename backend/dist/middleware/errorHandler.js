"use strict";
// backend/src/middleware/errorHandler.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
/**
 * Централизованный обработчик ошибок
 */
function errorHandler(err, req, res, next) {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
    });
    // В production не показываем stack trace
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
        error: 'Internal server error',
        message: isDev ? err.message : 'Something went wrong',
        ...(isDev && { stack: err.stack }),
    });
}
/**
 * 404 handler
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        error: 'Not found',
        message: `Cannot ${req.method} ${req.path}`,
        path: req.path,
    });
}
