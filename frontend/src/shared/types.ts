// shared/types.ts

// ============================================
// ТИПЫ КАРТ И КОЛОДЫ
// ============================================

/**
 * Масть карты
 * h - Червы (hearts) ♥
 * d - Бубны (diamonds) ♦
 * c - Трефы (clubs) ♣
 * s - Пики (spades) ♠
 */
export type Suit = 'h' | 'd' | 'c' | 's';

/**
 * Ранг карты (6-10, J, Q, K, A)
 */
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

/**
 * Карта представлена строкой: ранг + масть
 * Примеры: "6h", "Ah", "Kc", "10d"
 */
export type Card = string;

/**
 * Значения рангов для сравнения
 */
export const RANK_VALUES: Record<Rank, number> = {
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
export const SUIT_ORDER: Record<Suit, number> = {
  'c': 1, // Трефы
  'd': 2, // Бубны
  'h': 3, // Червы
  's': 4, // Пики
};

// ============================================
// ИГРОВЫЕ СОСТОЯНИЯ
// ============================================

/**
 * Фаза игры
 */
export type GamePhase = 
  | 'waiting'    // Ожидание игроков
  | 'playing'    // Идёт игра
  | 'finished';  // Игра завершена

/**
 * Роль игрока в текущем раунде
 */
export type PlayerRole = 'attacker' | 'defender';

/**
 * Пара карт на столе (атака-защита)
 */
export interface CardPair {
  attack: Card;
  defense: Card | null; // null = карта не защищена
}

// ============================================
// СОСТОЯНИЕ ИГРЫ
// ============================================

/**
 * Полное состояние игровой сессии
 */
export interface GameState {
  roomId: string;                    // ID комнаты
  players: string[];                 // Массив ID игроков (2 игрока)
  phase: GamePhase;                  // Фаза игры
  
  // Карты игроков
  hands: Record<string, Card[]>;     // { playerId: [карты на руке] }
  
  // Поле битвы
  table: CardPair[];                 // Пары карт на столе
  
  // Колода
  deck: Card[];                      // Оставшиеся карты в колоде
  trumpCard: Card | null;            // Козырная карта (под колодой)
  trumpSuit: Suit | null;            // Козырная масть
  
  // Роли игроков
  attacker: string | null;           // ID атакующего
  defender: string | null;           // ID защищающегося
  
  // Победитель
  winner: string | null;             // ID победителя (если игра окончена)
  
  // Дополнительно
  canThrow: boolean;                 // Можно ли подкидывать карты
  lastAction?: string;               // Описание последнего действия
}

// ============================================
// WEBSOCKET СООБЩЕНИЯ
// ============================================

/**
 * Типы WebSocket сообщений от клиента
 */
export type ClientMessageType =
  | 'create_room'
  | 'join_room'
  | 'leave_room'
  | 'attack'
  | 'defend'
  | 'throw_in'     // Подкинуть карту
  | 'pass_turn'    // Бито!
  | 'take_cards';  // Взять карты

/**
 * Сообщение от клиента
 */
export interface ClientMessage {
  type: ClientMessageType;
  payload?: any;
  playerId: string;
}

/**
 * Типы WebSocket сообщений от сервера
 */
export type ServerMessageType =
  | 'game_state'      // Обновление состояния игры
  | 'error'           // Ошибка
  | 'room_created'    // Комната создана
  | 'room_joined'     // Присоединились к комнате
  | 'player_left'     // Игрок вышел
  | 'game_started';   // Игра началась

/**
 * Сообщение от сервера
 */
export interface ServerMessage {
  type: ServerMessageType;
  payload?: any;
  timestamp?: number;
}

// ============================================
// LOBBY / КОМНАТЫ
// ============================================

/**
 * Информация о комнате
 */
export interface RoomInfo {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

/**
 * Профиль пользователя
 */
export interface UserProfile {
  userId: string;
  displayName?: string;
  wins?: number;
  losses?: number;
}

// ============================================
// API ЗАПРОСЫ/ОТВЕТЫ
// ============================================

/**
 * Ответ API с ошибкой
 */
export interface ApiError {
  error: string;
  details?: string;
}

/**
 * Успешный ответ API
 */
export interface ApiSuccess {
  success: true;
  data?: any;
}

export type ApiResponse = ApiSuccess | ApiError;
