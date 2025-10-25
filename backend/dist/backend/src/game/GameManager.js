"use strict";
// backend/src/game/GameManager.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameManager = exports.GameManager = void 0;
const GameSession_1 = require("./GameSession");
/**
 * Менеджер игровых комнат - управляет всеми активными сессиями
 */
class GameManager {
    constructor() {
        this.sessions = new Map();
        this.playerRooms = new Map(); // playerId -> roomId
    }
    /**
     * Создать новую комнату
     */
    createRoom(playerId) {
        // Проверяем, не находится ли игрок уже в комнате
        if (this.playerRooms.has(playerId)) {
            return {
                success: false,
                error: 'Вы уже находитесь в комнате. Сначала выйдите из текущей.',
            };
        }
        // Генерируем уникальный ID комнаты
        const roomId = this.generateRoomId();
        // Создаём новую сессию
        const session = new GameSession_1.GameSession(roomId);
        session.addPlayer(playerId);
        // Сохраняем
        this.sessions.set(roomId, session);
        this.playerRooms.set(playerId, roomId);
        return { success: true, roomId };
    }
    /**
     * Присоединиться к существующей комнате
     */
    joinRoom(playerId, roomId) {
        // Проверяем, не находится ли игрок уже в комнате
        if (this.playerRooms.has(playerId)) {
            return {
                success: false,
                error: 'Вы уже находитесь в комнате. Сначала выйдите из текущей.',
            };
        }
        // Проверяем, существует ли комната
        const session = this.sessions.get(roomId);
        if (!session) {
            return {
                success: false,
                error: 'Комната не найдена.',
            };
        }
        // Проверяем, не полная ли комната
        if (session.players.length >= 2) {
            return {
                success: false,
                error: 'Комната уже заполнена.',
            };
        }
        // Проверяем, не началась ли уже игра
        if (session.phase !== 'waiting') {
            return {
                success: false,
                error: 'Игра уже началась.',
            };
        }
        // Добавляем игрока
        session.addPlayer(playerId);
        this.playerRooms.set(playerId, roomId);
        return { success: true };
    }
    /**
     * Покинуть комнату
     */
    leaveRoom(playerId) {
        const roomId = this.playerRooms.get(playerId);
        if (!roomId) {
            return {
                success: false,
                error: 'Вы не находитесь ни в одной комнате.',
            };
        }
        const session = this.sessions.get(roomId);
        if (!session) {
            return {
                success: false,
                error: 'Комната не найдена.',
            };
        }
        // Удаляем игрока из сессии
        session.removePlayer(playerId);
        this.playerRooms.delete(playerId);
        // Если комната пустая, удаляем её
        if (session.players.length === 0) {
            this.sessions.delete(roomId);
        }
        return { success: true };
    }
    /**
     * Получить список открытых комнат (ожидающих игроков)
     */
    getOpenRooms() {
        const openRooms = [];
        for (const [roomId, session] of this.sessions.entries()) {
            if (session.phase === 'waiting' && session.players.length < 2) {
                openRooms.push({
                    roomId,
                    playerCount: session.players.length,
                    maxPlayers: 2,
                    status: 'waiting',
                    createdAt: Date.now(), // В реальной версии стоит хранить время создания
                });
            }
        }
        return openRooms;
    }
    /**
     * Получить комнату игрока
     */
    getPlayerRoom(playerId) {
        return this.playerRooms.get(playerId);
    }
    /**
     * Получить игровую сессию по ID комнаты
     */
    getSession(roomId) {
        return this.sessions.get(roomId);
    }
    /**
     * Получить игровую сессию по ID игрока
     */
    getSessionByPlayer(playerId) {
        const roomId = this.playerRooms.get(playerId);
        if (!roomId)
            return undefined;
        return this.sessions.get(roomId);
    }
    /**
     * Проверить, находится ли игрок в комнате
     */
    isPlayerInRoom(playerId) {
        return this.playerRooms.has(playerId);
    }
    /**
     * Получить количество активных комнат
     */
    getActiveRoomsCount() {
        return this.sessions.size;
    }
    /**
     * Получить количество игроков онлайн
     */
    getOnlinePlayersCount() {
        return this.playerRooms.size;
    }
    /**
     * Очистить пустые комнаты (для периодической очистки)
     */
    cleanupEmptyRooms() {
        let cleaned = 0;
        for (const [roomId, session] of this.sessions.entries()) {
            if (session.players.length === 0) {
                this.sessions.delete(roomId);
                cleaned++;
            }
        }
        return cleaned;
    }
    /**
     * Очистить завершённые игры старше указанного времени
     */
    cleanupFinishedGames(olderThanMs = 300000) {
        let cleaned = 0;
        const now = Date.now();
        for (const [roomId, session] of this.sessions.entries()) {
            if (session.phase === 'finished') {
                // В реальной версии стоит хранить время завершения
                // Пока просто удаляем все завершённые
                this.sessions.delete(roomId);
                // Удаляем игроков из маппинга
                for (const playerId of session.players) {
                    this.playerRooms.delete(playerId);
                }
                cleaned++;
            }
        }
        return cleaned;
    }
    /**
     * Генерировать уникальный ID комнаты (короткий формат для пользователей)
     */
    generateRoomId() {
        // Генерируем короткий код из 6 символов (буквы и цифры)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let roomId = '';
        for (let i = 0; i < 6; i++) {
            roomId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Проверяем уникальность
        if (this.sessions.has(roomId)) {
            return this.generateRoomId(); // Рекурсивно генерируем новый
        }
        return roomId;
    }
    /**
     * Получить статистику сервера
     */
    getServerStats() {
        return {
            activeRooms: this.sessions.size,
            onlinePlayers: this.playerRooms.size,
            waitingRooms: this.getOpenRooms().length,
            playingGames: Array.from(this.sessions.values()).filter(s => s.phase === 'playing').length,
            finishedGames: Array.from(this.sessions.values()).filter(s => s.phase === 'finished').length,
        };
    }
}
exports.GameManager = GameManager;
// Экспортируем единственный экземпляр (singleton)
exports.gameManager = new GameManager();
