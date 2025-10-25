import React, { useState } from 'react';
import type { GameState, CardPair, Card } from '../../shared/types'; // Обнови путь под свой проект
import './GameTable.css';

interface GameTableProps {
  gameState: GameState;
  playerId: string;
  onAttack: (card: Card) => void;
  onDefend: (attackCard: Card, defenseCard: Card) => void;
  onThrowIn: (card: Card) => void;
  onPassTurn: () => void;
  onTakeCards: () => void;
  onLeaveRoom: () => void;
}

const GameTable: React.FC<GameTableProps> = ({
  gameState,
  playerId,
  onAttack,
  onDefend,
  onThrowIn,
  onPassTurn,
  onTakeCards,
  onLeaveRoom,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedAttackCard, setSelectedAttackCard] = useState<Card | null>(null);

  const isAttacker = gameState.attacker === playerId;
  const isDefender = gameState.defender === playerId;
  const myHand = gameState.hands[playerId] || [];
  const opponentId = gameState.players.find(p => p !== playerId);
  const opponentHand = opponentId ? gameState.hands[opponentId] || [] : [];

  const handleCardClick = (card: Card) => {
    if (card === 'back') return;

    if (isAttacker && gameState.table.length === 0) {
      onAttack(card);
      setSelectedCard(null);
    } else if (isAttacker && gameState.canThrow) {
      onThrowIn(card);
      setSelectedCard(null);
    } else if (isDefender && selectedAttackCard) {
      onDefend(selectedAttackCard, card);
      setSelectedCard(null);
      setSelectedAttackCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handleAttackCardClick = (attackCard: Card) => {
    if (isDefender) {
      setSelectedAttackCard(attackCard);
    }
  };

  const formatCard = (card: Card) => {
    if (!card || card === 'back') return '?';

    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitSymbol = getSuitSymbol(suit);

    return `${rank}${suitSymbol}`;
  };

  const getSuitSymbol = (suit: string) => {
    const suits: Record<string, string> = {
      h: '♥',
      d: '♦',
      c: '♣',
      s: '♠',
    };
    return suits[suit] || suit;
  };

  return (
    <div className="game-table">
      {/* Header */}
      <header className="game-table-header">
        <div className="header-left">
          <h2>🎴 Комната: {gameState.roomId}</h2>
          <div className="game-status">
            {isAttacker && <span className="role-badge attacker">⚔️ Атака</span>}
            {isDefender && <span className="role-badge defender">🛡️ Защита</span>}
          </div>
        </div>
        <button className="btn-leave" onClick={onLeaveRoom}>
          Выйти
        </button>
      </header>

      {/* Opponent */}
      <div className="opponent-area">
        <div className="opponent-info">
          <div className="opponent-label">Противник</div>
          <div className="opponent-cards-count">{opponentHand.length} карт</div>
        </div>
        <div className="opponent-hand">
          {opponentHand.map((_, index) => (
            <div key={index} className="card card-back">
              ?
            </div>
          ))}
        </div>
      </div>

      {/* Deck and Trump */}
      <div className="deck-area">
        <div className="deck-info">
          <div className="trump-card">
            {gameState.trumpCard ? (
              <div className="card trump">{formatCard(gameState.trumpCard)}</div>
            ) : (
              <div className="card-placeholder">Нет козыря</div>
            )}
            <div className="trump-label">Козырь: {getSuitSymbol(gameState.trumpSuit || '')}</div>
          </div>
          <div className="deck-pile">
            <div className="card card-back deck">{gameState.deck.length}</div>
            <div className="deck-label">Колода</div>
          </div>
        </div>
      </div>

      {/* Battle field */}
      <div className="battle-field">
        {gameState.lastAction && <div className="last-action">📢 {gameState.lastAction}</div>}

        {gameState.table.length === 0 ? (
          <div className="empty-field">
            <p>Поле пусто</p>
            {isAttacker && <p className="hint">Кликните на карту для атаки</p>}
          </div>
        ) : (
          <div className="card-pairs-container">
            {gameState.table.map((pair: CardPair, index: number) => (
              <div key={index} className="card-pair">
                <div
                  className={`card attack-card ${
                    selectedAttackCard === pair.attack ? 'selected' : ''
                  } ${!pair.defense ? 'undefended' : ''}`}
                  onClick={() => handleAttackCardClick(pair.attack)}
                >
                  {formatCard(pair.attack)}
                </div>
                {pair.defense ? (
                  <div className="card defense-card">{formatCard(pair.defense)}</div>
                ) : (
                  <div className="card-placeholder defense-placeholder">{isDefender ? '?' : '⏳'}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedAttackCard && isDefender && (
          <div className="defense-hint">Выберите карту для защиты от {formatCard(selectedAttackCard)}</div>
        )}
      </div>

      {/* Player hand */}
      <div className="player-area">
        <div className="player-info">
          <div className="player-label">Ваши карты</div>
          <div className="cards-count">{myHand.length} карт</div>
        </div>
        <div className="player-hand">
          {myHand.map((card: Card, index: number) => (
            <div
              key={index}
              className={`card player-card ${selectedCard === card ? 'selected' : ''}`}
              onClick={() => handleCardClick(card)}
            >
              {formatCard(card)}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        {isAttacker && (
          <button
            className="btn-action btn-pass"
            onClick={onPassTurn}
            disabled={gameState.table.some((p: CardPair) => !p.defense)}
          >
            ✅ Бито!
          </button>
        )}

        {isDefender && (
          <button className="btn-action btn-take" onClick={onTakeCards}>
            ⬇️ Взять карты
          </button>
        )}

        {isAttacker && gameState.canThrow && (
          <button
            className="btn-action btn-throw"
            onClick={() => {
              if (selectedCard) {
                onThrowIn(selectedCard);
                setSelectedCard(null);
              }
            }}
            disabled={!selectedCard}
          >
            ➕ Подкинуть
          </button>
        )}
      </div>
    </div>
  );
};

export default GameTable;
