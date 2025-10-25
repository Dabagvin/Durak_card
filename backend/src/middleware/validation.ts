// backend/src/middleware/validation.ts

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Middleware для валидации тела запроса через Zod схему
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
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
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
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
export const playerIdSchema = z.object({
  playerId: z.string().min(1, 'playerId is required').max(100),
});

/**
 * Валидация создания комнаты
 */
export const createRoomSchema = z.object({
  playerId: z.string().min(1).max(100),
});

/**
 * Валидация присоединения к комнате
 */
export const joinRoomSchema = z.object({
  playerId: z.string().min(1).max(100),
  roomId: z.string().length(6, 'roomId must be 6 characters'),
});

/**
 * Валидация карты (формат: ранг + масть, например "7h")
 */
const cardSchema = z.string().regex(
  /^(6|7|8|9|10|J|Q|K|A)[hdcs]$/,
  'Invalid card format. Must be rank (6-A) + suit (h/d/c/s)'
);

/**
 * Валидация атаки
 */
export const attackSchema = z.object({
  playerId: z.string().min(1).max(100),
  card: cardSchema,
});

/**
 * Валидация защиты
 */
export const defendSchema = z.object({
  playerId: z.string().min(1).max(100),
  attackCard: cardSchema,
  defenseCard: cardSchema,
});

/**
 * Валидация подкидывания
 */
export const throwSchema = z.object({
  playerId: z.string().min(1).max(100),
  card: cardSchema,
});

/**
 * Валидация query параметра playerId
 */
export const playerIdQuerySchema = z.object({
  playerId: z.string().min(1).max(100),
});
