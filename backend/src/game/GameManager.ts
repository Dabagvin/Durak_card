// backend/src/game/GameManager.ts

import { GameSession } from './GameSession';
import type { RoomInfo } from '../../../frontend/src/shared/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Менеджер игровых комнат - управляет всеми активными сессиями
 */
export class GameManager {
  private sessions: Map<string, GameSession> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomId

  /**
   * Создать новую комнату
   */
  createRoom(playerId: string): { success: boolean; roomId?: string; error?: string } {
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
    const session = new GameSession(roomId);
    session.addPlayer(playerId);

    // Сохраняем
    this.sessions.set(roomId, session);
    this.playerRooms.set(playerId, roomId);

    return { success: true, roomId };
  }

  /**
   * Присоединиться к существующей комнате
   */
  joinRoom(playerId: string, roomId: string): { success: boolean; error?: string } {
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
  leaveRoom(playerId: string): { success: boolean; error?: string } {
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
  getOpenRooms(): RoomInfo[] {
    const openRooms: RoomInfo[] = [];

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
  getPlayerRoom(playerId: string): string | undefined {
    return this.playerRooms.get(playerId);
  }

  /**
   * Получить игровую сессию по ID комнаты
   */
  getSession(roomId: string): GameSession | undefined {
    return this.sessions.get(roomId);
  }

  /**
   * Получить игровую сессию по ID игрока
   */
  getSessionByPlayer(playerId: string): GameSession | undefined {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return undefined;
    return this.sessions.get(roomId);
  }

  /**
   * Проверить, находится ли игрок в комнате
   */
  isPlayerInRoom(playerId: string): boolean {
    return this.playerRooms.has(playerId);
  }

  /**
   * Получить количество активных комнат
   */
  getActiveRoomsCount(): number {
    return this.sessions.size;
  }

  /**
   * Получить количество игроков онлайн
   */
  getOnlinePlayersCount(): number {
    return this.playerRooms.size;
  }

  /**
   * Очистить пустые комнаты (для периодической очистки)
   */
  cleanupEmptyRooms(): number {
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
  cleanupFinishedGames(olderThanMs: number = 300000): number {
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
  private generateRoomId(): string {
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

// Экспортируем единственный экземпляр (singleton)
export const gameManager = new GameManager();
