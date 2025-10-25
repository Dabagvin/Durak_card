// backend/src/game/GameSession.ts

import type { GameState, Card, Suit, CardPair } from '../../../frontend/src/shared/types';
import {
  generateDeck,
  shuffleDeck,
  canBeat,
  canThrowIn,
  parseCard,
  sortHand
} from './CardLogic';

/**
 * Класс игровой сессии - управляет одной игрой в "Дурак"
 */
export class GameSession {
  public roomId: string;
  public players: string[] = [];
  public hands: Record<string, Card[]> = {};
  public deck: Card[] = [];
  public trumpCard: Card | null = null;
  public trumpSuit: Suit | null = null;
  public table: CardPair[] = [];
  public attacker: string | null = null;
  public defender: string | null = null;
  public phase: 'waiting' | 'playing' | 'finished' = 'waiting';
  public winner: string | null = null;
  public canThrow: boolean = false;
  public lastAction: string = '';

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  // ============================================
  // УПРАВЛЕНИЕ ИГРОКАМИ
  // ============================================

  /**
   * Добавить игрока в сессию
   */
  addPlayer(playerId: string): boolean {
    if (this.players.length >= 2) {
      return false; // Комната полная
    }
    
    if (this.players.includes(playerId)) {
      return false; // Игрок уже в комнате
    }
    
    this.players.push(playerId);
    this.hands[playerId] = [];
    
    // Если набралось 2 игрока, начинаем игру
    if (this.players.length === 2) {
      this.startGame();
    }
    
    return true;
  }

  /**
   * Удалить игрока из сессии
   */
  removePlayer(playerId: string): void {
    this.players = this.players.filter(p => p !== playerId);
    delete this.hands[playerId];
    
    // Если игрок вышел во время игры, объявляем победителем оставшегося
    if (this.phase === 'playing' && this.players.length === 1) {
      this.winner = this.players[0];
      this.phase = 'finished';
      this.lastAction = 'Противник покинул игру';
    }
  }

  // ============================================
  // НАЧАЛО ИГРЫ
  // ============================================

  /**
   * Начать игру (когда собралось 2 игрока)
   */
  private startGame(): void {
    // Генерируем и тасуем колоду
    this.deck = shuffleDeck(generateDeck());
    
    // Раздаём по 6 карт каждому игроку
    for (let i = 0; i < 6; i++) {
      for (const playerId of this.players) {
        const card = this.deck.pop();
        if (card) {
          this.hands[playerId].push(card);
        }
      }
    }
    
    // Определяем козырь (последняя карта колоды)
    this.trumpCard = this.deck.shift() || null;
    if (this.trumpCard) {
      this.trumpSuit = parseCard(this.trumpCard).suit;
    }
    
    // Определяем атакующего (у кого младший козырь)
    this.determineFirstAttacker();
    
    // Устанавливаем защищающегося
    this.defender = this.players.find(p => p !== this.attacker) || null;
    
    // Сортируем карты у игроков
    for (const playerId of this.players) {
      this.hands[playerId] = sortHand(this.hands[playerId], this.trumpSuit);
    }
    
    this.phase = 'playing';
    this.lastAction = 'Игра началась!';
  }

  /**
   * Определить первого атакующего (у кого младший козырь)
   */
  private determineFirstAttacker(): void {
    let lowestTrump: Card | null = null;
    let firstAttacker: string | null = null;
    
    for (const playerId of this.players) {
      const hand = this.hands[playerId];
      
      for (const card of hand) {
        const { suit, rank } = parseCard(card);
        
        if (suit === this.trumpSuit) {
          if (!lowestTrump || this.compareCards(card, lowestTrump) < 0) {
            lowestTrump = card;
            firstAttacker = playerId;
          }
        }
      }
    }
    
    // Если козырей нет ни у кого, выбираем случайно
    this.attacker = firstAttacker || this.players[Math.floor(Math.random() * 2)];
  }

  /**
   * Сравнить две карты (-1 если a < b, 0 если равны, 1 если a > b)
   */
  private compareCards(a: Card, b: Card): number {
    const cardA = parseCard(a);
    const cardB = parseCard(b);
    
    const rankValues: Record<string, number> = {
      '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    
    return rankValues[cardA.rank] - rankValues[cardB.rank];
  }

  // ============================================
  // ИГРОВЫЕ ДЕЙСТВИЯ
  // ============================================

  /**
   * Атака картой
   */
  attack(playerId: string, card: Card): boolean {
    // Проверки
    if (this.phase !== 'playing') return false;
    if (playerId !== this.attacker) return false;
    if (!this.hands[playerId].includes(card)) return false;
    
    // Первая атака - любая карта
    if (this.table.length === 0) {
      this.removeCardFromHand(playerId, card);
      this.table.push({ attack: card, defense: null });
      this.canThrow = false; // Нельзя подкидывать, пока защита не отбита
      this.lastAction = `${playerId} атакует картой ${card}`;
      return true;
    }
    
    return false;
  }

  /**
   * Защита картой
   */
  defend(playerId: string, attackCard: Card, defenseCard: Card): boolean {
    // Проверки
    if (this.phase !== 'playing') return false;
    if (playerId !== this.defender) return false;
    if (!this.hands[playerId].includes(defenseCard)) return false;
    if (!this.trumpSuit) return false;
    
    // Находим пару на столе
    const pair = this.table.find(p => p.attack === attackCard && p.defense === null);
    if (!pair) return false;
    
    // Проверяем, может ли карта побить
    if (!canBeat(attackCard, defenseCard, this.trumpSuit)) {
      return false;
    }
    
    // Защищаемся
    this.removeCardFromHand(playerId, defenseCard);
    pair.defense = defenseCard;
    
    // Если все карты отбиты, можно подкидывать
    const allDefended = this.table.every(p => p.defense !== null);
    this.canThrow = allDefended;
    
    this.lastAction = `${playerId} защищается картой ${defenseCard}`;
    return true;
  }

  /**
   * Подкинуть карту (после успешной защиты)
   */
  throwIn(playerId: string, card: Card): boolean {
    // Проверки
    if (this.phase !== 'playing') return false;
    if (!this.canThrow) return false;
    if (!this.hands[playerId].includes(card)) return false;
    
    // Проверяем, можно ли подкинуть (ранг должен совпадать с картами на столе)
    const tableCards = this.table.flatMap(p => [p.attack, p.defense].filter(Boolean) as Card[]);
    if (!canThrowIn(card, tableCards)) {
      return false;
    }
    
    // Проверяем, может ли защищающийся принять карту (у него должны быть карты)
    const defenderHandSize = this.defender ? this.hands[this.defender].length : 0;
    const undefendedCount = this.table.filter(p => p.defense === null).length;
    
    if (defenderHandSize <= undefendedCount) {
      return false; // Нельзя подкидывать больше, чем может принять
    }
    
    // Подкидываем
    this.removeCardFromHand(playerId, card);
    this.table.push({ attack: card, defense: null });
    this.canThrow = false; // Ждём защиты
    
    this.lastAction = `${playerId} подкидывает карту ${card}`;
    return true;
  }

  /**
   * Пропустить ход (Бито!) - завершить раунд
   */
  passTurn(playerId: string): boolean {
    // Проверки
    if (this.phase !== 'playing') return false;
    if (playerId !== this.attacker) return false;
    
    // Все карты должны быть отбиты
    const allDefended = this.table.every(p => p.defense !== null);
    if (!allDefended) return false;
    
    // Раунд завершён - карты в отбой
    this.table = [];
    this.canThrow = false;
    
    // Добор карт
    this.refillHands();
    
    // Меняем роли (защищающийся становится атакующим)
    [this.attacker, this.defender] = [this.defender, this.attacker];
    
    this.lastAction = 'Бито! Раунд завершён';
    
    // Проверяем победителя
    this.checkWinner();
    
    return true;
  }

  /**
   * Взять карты (защищающийся сдаётся)
   */
  takeCards(playerId: string): boolean {
    // Проверки
    if (this.phase !== 'playing') return false;
    if (playerId !== this.defender) return false;
    if (this.table.length === 0) return false;
    
    // Берём все карты со стола
    const cardsToTake = this.table.flatMap(p => 
      [p.attack, p.defense].filter(Boolean) as Card[]
    );
    
    if (this.defender) {
      this.hands[this.defender].push(...cardsToTake);
      this.hands[this.defender] = sortHand(this.hands[this.defender], this.trumpSuit);
    }
    
    this.table = [];
    this.canThrow = false;
    
    // Добор карт (сначала атакующий)
    this.refillHands();
    
    // Атакующий остаётся атакующим
    this.lastAction = `${playerId} взял карты`;
    
    // Проверяем победителя
    this.checkWinner();
    
    return true;
  }

  // ============================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ============================================

  /**
   * Добор карт из колоды (сначала атакующий, потом защищающийся)
   */
  private refillHands(): void {
    const refillOrder = [this.attacker, this.defender].filter(Boolean) as string[];
    
    for (const playerId of refillOrder) {
      while (this.hands[playerId].length < 6 && this.deck.length > 0) {
        const card = this.deck.pop();
        if (card) {
          this.hands[playerId].push(card);
        }
      }
      
      this.hands[playerId] = sortHand(this.hands[playerId], this.trumpSuit);
    }
    
    // Если колода закончилась, убираем козырную карту
    if (this.deck.length === 0 && this.trumpCard) {
      this.trumpCard = null;
    }
  }

  /**
   * Убрать карту из руки игрока
   */
  private removeCardFromHand(playerId: string, card: Card): void {
    const hand = this.hands[playerId];
    const index = hand.indexOf(card);
    if (index > -1) {
      hand.splice(index, 1);
    }
  }

  /**
   * Проверить победителя
   */
  private checkWinner(): void {
    // Колода закончилась и у кого-то нет карт
    if (this.deck.length === 0 && !this.trumpCard) {
      for (const playerId of this.players) {
        if (this.hands[playerId].length === 0) {
          // Победил тот, у кого нет карт
          const opponent = this.players.find(p => p !== playerId);
          if (opponent && this.hands[opponent].length > 0) {
            this.winner = playerId;
            this.phase = 'finished';
            this.lastAction = `${playerId} победил!`;
          }
        }
      }
    }
  }

  // ============================================
  // ПОЛУЧЕНИЕ СОСТОЯНИЯ
  // ============================================

  /**
   * Получить полное состояние игры
   */
  getState(): GameState {
    return {
      roomId: this.roomId,
      players: this.players,
      phase: this.phase,
      hands: this.hands,
      table: this.table,
      deck: this.deck,
      trumpCard: this.trumpCard,
      trumpSuit: this.trumpSuit,
      attacker: this.attacker,
      defender: this.defender,
      winner: this.winner,
      canThrow: this.canThrow,
      lastAction: this.lastAction,
    };
  }

  /**
   * Получить состояние для конкретного игрока (скрыть карты противника)
   */
  getStateForPlayer(playerId: string): GameState {
    const state = this.getState();
    
    // Скрываем карты противника
    const hiddenHands: Record<string, Card[]> = {};
    for (const pid of this.players) {
      if (pid === playerId) {
        hiddenHands[pid] = state.hands[pid];
      } else {
        // Показываем только количество карт
        hiddenHands[pid] = new Array(state.hands[pid].length).fill('back');
      }
    }
    
    return {
      ...state,
      hands: hiddenHands,
    };
  }
}
