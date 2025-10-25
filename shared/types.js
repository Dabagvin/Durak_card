"use strict";
// shared/types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUIT_ORDER = exports.RANK_VALUES = void 0;
/**
 * Значения рангов для сравнения
 */
exports.RANK_VALUES = {
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
};
/**
 * Порядок мастей (для сортировки)
 */
exports.SUIT_ORDER = {
    'c': 1, // Трефы
    'd': 2, // Бубны
    'h': 3, // Червы
    's': 4, // Пики
};
