// backend/src/game/CardLogic.ts

import type { Card, Suit, Rank } from '../../../frontend/src/shared/types';
import { RANK_VALUES } from '../../../frontend/src/shared/types';

/**
 * Генерация полной колоды (36 карт: 6-A, 4 масти)
 */
export function generateDeck(): Card[] {
  const ranks: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits: Suit[] = ['h', 'd', 'c', 's'];
  
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}${suit}`);
    }
  }
  
  return deck;
}

/**
 * Тасовка колоды (Fisher-Yates алгоритм)
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Извлечение ранга и масти из карты
 */
export function parseCard(card: Card): { rank: Rank; suit: Suit } {
  const suit = card.slice(-1) as Suit;
  const rank = card.slice(0, -1) as Rank;
  return { rank, suit };
}

/**
 * Проверка: может ли defenseCard побить attackCard
 * 
 * Правила:
 * 1. Если обе карты одной масти -> защита должна быть старше по рангу
 * 2. Если защита - козырь, а атака - нет -> защита побивает
 * 3. Если обе козыри -> защита должна быть старше
 * 4. В остальных случаях - не побивает
 */
export function canBeat(
  attackCard: Card,
  defenseCard: Card,
  trumpSuit: Suit
): boolean {
  const attack = parseCard(attackCard);
  const defense = parseCard(defenseCard);
  
  const attackValue = RANK_VALUES[attack.rank];
  const defenseValue = RANK_VALUES[defense.rank];
  
  const attackIsTrump = attack.suit === trumpSuit;
  const defenseIsTrump = defense.suit === trumpSuit;
  
  // Случай 1: Обе карты одной масти (не козыри)
  if (attack.suit === defense.suit && !attackIsTrump) {
    return defenseValue > attackValue;
  }
  
  // Случай 2: Обе карты козыри
  if (attackIsTrump && defenseIsTrump) {
    return defenseValue > attackValue;
  }
  
  // Случай 3: Защита козырь, атака - нет
  if (!attackIsTrump && defenseIsTrump) {
    return true;
  }
  
  // Все остальные случаи - не бьёт
  return false;
}

/**
 * Проверка: можно ли подкинуть карту на стол
 * (карта должна совпадать по рангу с любой картой на столе)
 */
export function canThrowIn(card: Card, tableCards: Card[]): boolean {
  if (tableCards.length === 0) return false;
  
  const throwRank = parseCard(card).rank;
  
  return tableCards.some(tableCard => {
    const { rank } = parseCard(tableCard);
    return rank === throwRank;
  });
}

/**
 * Сортировка карт в руке
 * Сначала по масти, потом по рангу
 */
export function sortHand(hand: Card[], trumpSuit: Suit | null): Card[] {
  return [...hand].sort((a, b) => {
    const cardA = parseCard(a);
    const cardB = parseCard(b);
    
    // Козыри идут последними
    const aIsTrump = trumpSuit && cardA.suit === trumpSuit;
    const bIsTrump = trumpSuit && cardB.suit === trumpSuit;
    
    if (aIsTrump && !bIsTrump) return 1;
    if (!aIsTrump && bIsTrump) return -1;
    
    // Сортировка по масти
    if (cardA.suit !== cardB.suit) {
      return cardA.suit.localeCompare(cardB.suit);
    }
    
    // Сортировка по рангу
    return RANK_VALUES[cardA.rank] - RANK_VALUES[cardB.rank];
  });
}
