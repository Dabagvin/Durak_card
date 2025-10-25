// frontend/src/App.tsx

import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useTelegram } from './hooks/useTelegram';
import LobbyScreen from './components/LobbyScreen/LobbyScreen';
import GameTable from './components/GameTable/GameTable';
import './App.css';

function App() {
  // ============================================
  // TELEGRAM INTEGRATION
  // ============================================
  const { isInTelegram, user, hapticFeedback } = useTelegram();

  // Генерируем playerId (используем Telegram ID если доступен)
  const [playerId] = useState(() => {
    // Если в Telegram - используем Telegram ID
    if (user?.id) {
      const tgId = `tg-${user.id}`;
      localStorage.setItem('playerId', tgId);
      return tgId;
    }
    
    // Иначе берём из localStorage или генерируем
    const stored = localStorage.getItem('playerId');
    if (stored) return stored;
    
    const newId = `player-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('playerId', newId);
    return newId;
  });

  // Сохраняем имя пользователя из Telegram
  const [displayName] = useState(() => {
    if (user?.first_name) {
      return user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    }
    return playerId;
  });

  // ============================================
  // WEBSOCKET
  // ============================================
  const {
    isConnected,
    gameState,
    error,
    lastMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    attack,
    defend,
    throwIn,
    passTurn,
    takeCards,
  } = useWebSocket(playerId);

  // ============================================
  // LOGGING
  // ============================================
  useEffect(() => {
    if (isInTelegram) {
      console.log('Running in Telegram:', {
        user,
        playerId,
        displayName,
      });
    }
  }, [isInTelegram, user, playerId, displayName]);

  useEffect(() => {
    if (gameState) {
      console.log('Current game state:', gameState);
    }
  }, [gameState]);

  useEffect(() => {
    if (lastMessage) {
      console.log('Last message from server:', lastMessage);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (error) {
      console.error('Game error:', error);
    }
  }, [error]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleCreateRoom = () => {
    console.log('Creating room...');
    hapticFeedback('medium');
    createRoom();
  };

  const handleJoinRoom = (roomId: string) => {
    console.log('Joining room:', roomId);
    hapticFeedback('medium');
    joinRoom(roomId);
  };

  const handleLeaveRoom = () => {
    const confirmed = window.confirm('Вы уверены, что хотите покинуть игру?');
    if (confirmed) {
      hapticFeedback('heavy');
      leaveRoom();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleAttack = (card: string) => {
    console.log('Attacking with:', card);
    hapticFeedback('light');
    attack(card);
  };

  const handleDefend = (attackCard: string, defenseCard: string) => {
    console.log('Defending:', attackCard, 'with', defenseCard);
    hapticFeedback('light');
    defend(attackCard, defenseCard);
  };

  const handleThrowIn = (card: string) => {
    console.log('Throwing in:', card);
    hapticFeedback('light');
    throwIn(card);
  };

  const handlePassTurn = () => {
    console.log('Passing turn (Бито!)');
    hapticFeedback('medium');
    passTurn();
  };

  const handleTakeCards = () => {
    console.log('Taking cards');
    hapticFeedback('heavy');
    takeCards();
  };

  // ============================================
  // RENDERING
  // ============================================

  // 1. Loading screen (подключение)
  if (!isConnected) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <h2>Подключение к серверу...</h2>
          <p>Ожидайте, пожалуйста</p>
          {isInTelegram && user && (
            <p className="telegram-user">
              Привет, {user.first_name}! 👋
            </p>
          )}
          {error && (
            <div className="error-text">
              <p>⚠️ {error}</p>
              <p className="retry-hint">Попытка переподключения...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Проверка валидности gameState
  const hasValidGameState = gameState && 
    typeof gameState === 'object' && 
    'phase' in gameState && 
    'roomId' in gameState;

  // 3. Lobby screen (нет игры или ожидание)
  if (!hasValidGameState || gameState.phase === 'waiting') {
    return (
      <LobbyScreen
        playerId={displayName} // Показываем имя из Telegram
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        isConnected={isConnected}
      />
    );
  }

  // 4. Game table (игра идёт)
  if (gameState.phase === 'playing') {
    return (
      <GameTable
        gameState={gameState}
        playerId={playerId}
        onAttack={handleAttack}
        onDefend={handleDefend}
        onThrowIn={handleThrowIn}
        onPassTurn={handlePassTurn}
        onTakeCards={handleTakeCards}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  // 5. Result screen (игра завершена)
  if (gameState.phase === 'finished') {
    const isWinner = gameState.winner === playerId;
    const opponentId = gameState.players.find(p => p !== playerId);

    // Haptic feedback на результат
    useEffect(() => {
      if (isWinner) {
        hapticFeedback('heavy');
      }
    }, [isWinner]);

    return (
      <div className="game-result">
        <div className="result-container">
          <div className="result-icon">
            {isWinner ? '🎉' : '😢'}
          </div>
          <h1 className={`result-title ${isWinner ? 'winner' : 'loser'}`}>
            {isWinner ? 'Победа!' : 'Поражение'}
          </h1>
          <p className="result-message">
            {isWinner 
              ? 'Поздравляем! Вы выиграли эту партию!' 
              : 'В следующий раз повезёт больше!'}
          </p>

          <div className="game-summary">
            <h3>Итоги игры</h3>
            <div className="summary-item">
              <span className="label">Комната:</span>
              <span className="value">{gameState.roomId}</span>
            </div>
            <div className="summary-item">
              <span className="label">Победитель:</span>
              <span className="value winner-name">
                {isWinner ? displayName : opponentId || 'Противник'}
              </span>
            </div>
            {gameState.lastAction && (
              <div className="summary-item">
                <span className="label">Последнее действие:</span>
                <span className="value">{gameState.lastAction}</span>
              </div>
            )}
          </div>

          <div className="result-actions">
            <button
              className="btn-primary btn-large"
              onClick={() => {
                hapticFeedback('medium');
                leaveRoom();
                window.location.reload();
              }}
            >
              🏠 Вернуться в лобби
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 6. Fallback (загрузка данных)
  return (
    <div className="app-loading">
      <div className="loading-container">
        <div className="spinner"></div>
        <h2>Загрузка игры...</h2>
        <p>Получение данных от сервера</p>
      </div>
    </div>
  );
}

export default App;
