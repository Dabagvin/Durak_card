"use strict";
// backend/src/middleware/validation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerIdQuerySchema = exports.throwSchema = exports.defendSchema = exports.attackSchema = exports.joinRoomSchema = exports.createRoomSchema = exports.playerIdSchema = void 0;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
const zod_1 = require("zod");
/**
 * Middleware для валидации тела запроса через Zod схему
 */
function validateBody(schema) {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    error: 'Validation error',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}
/**
 * Middleware для валидации query параметров
 */
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    error: 'Validation error',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}
// ============================================
// СХЕМЫ ВАЛИДАЦИИ
// ============================================
/**
 * Валидация playerId
 */
exports.playerIdSchema = zod_1.z.object({
    playerId: zod_1.z.string().min(1, 'playerId is required').max(100),
});
/**
 * Валидация создания комнаты
 */
exports.createRoomSchema = zod_1.z.object({
    playerId: zod_1.z.string().min(1).max(100),
});
/**
 * Валидация присоединения к комнате
 */
exports.joinRoomSchema = zod_1.z.object({
    playerId: zod_1.z.string().min(1).max(100),
    roomId: zod_1.z.string().length(6, 'roomId must be 6 characters'),
});
/**
 * Валидация карты (формат: ранг + масть, например "7h")
 */
const cardSchema = zod_1.z.string().regex(/^(6|7|8|9|10|J|Q|K|A)[hdcs]$/, 'Invalid card format. Must be rank (6-A) + suit (h/d/c/s)');
/**
 * Валидация атаки
 */
exports.attackSchema = zod_1.z.object({
    playerId: zod_1.z.string().min(1).max(100),
    card: cardSchema,
});
/**
 * Валидация защиты
 */
exports.defendSchema = zod_1.z.object({
    playerId: zod_1.z.string().min(1).max(100),
    attackCard: cardSchema,
    defenseCard: cardSchema,
});
/**
 * Валидация подкидывания
 */
exports.throwSchema = zod_1.z.object({
    playerId: zod_1.z.string().min(1).max(100),
    card: cardSchema,
});
/**
 * Валидация query параметра playerId
 */
exports.playerIdQuerySchema = zod_1.z.object({
    playerId: zod_1.z.string().min(1).max(100),
});
