"use strict";
// backend/src/game/CardLogic.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeck = generateDeck;
exports.shuffleDeck = shuffleDeck;
exports.parseCard = parseCard;
exports.canBeat = canBeat;
exports.canThrowIn = canThrowIn;
exports.sortHand = sortHand;
const types_1 = require("../../../shared/types");
/**
 * Генерация полной колоды (36 карт: 6-A, 4 масти)
 */
function generateDeck() {
    const ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits = ['h', 'd', 'c', 's'];
    const deck = [];
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
function shuffleDeck(deck) {
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
function parseCard(card) {
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);
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
function canBeat(attackCard, defenseCard, trumpSuit) {
    const attack = parseCard(attackCard);
    const defense = parseCard(defenseCard);
    const attackValue = types_1.RANK_VALUES[attack.rank];
    const defenseValue = types_1.RANK_VALUES[defense.rank];
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
function canThrowIn(card, tableCards) {
    if (tableCards.length === 0)
        return false;
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
function sortHand(hand, trumpSuit) {
    return [...hand].sort((a, b) => {
        const cardA = parseCard(a);
        const cardB = parseCard(b);
        // Козыри идут последними
        const aIsTrump = trumpSuit && cardA.suit === trumpSuit;
        const bIsTrump = trumpSuit && cardB.suit === trumpSuit;
        if (aIsTrump && !bIsTrump)
            return 1;
        if (!aIsTrump && bIsTrump)
            return -1;
        // Сортировка по масти
        if (cardA.suit !== cardB.suit) {
            return cardA.suit.localeCompare(cardB.suit);
        }
        // Сортировка по рангу
        return types_1.RANK_VALUES[cardA.rank] - types_1.RANK_VALUES[cardB.rank];
    });
}
