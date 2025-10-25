// frontend/src/components/LobbyScreen/LobbyScreen.tsx

import  { useState, useEffect } from 'react';
import './LobbyScreen.css';

interface RoomInfo {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

interface LobbyScreenProps {
  playerId: string;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  isConnected: boolean;
}

export function LobbyScreen({ 
  playerId, 
  onCreateRoom, 
  onJoinRoom,
  isConnected 
}: LobbyScreenProps) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  /**
   * Загрузка списка открытых комнат
   */
  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/room/list`);
      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms || []);
      } else {
        setError('Не удалось загрузить список комнат');
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Автоматическое обновление списка комнат каждые 3 секунды
   */
  useEffect(() => {
    fetchRooms();

    const interval = setInterval(() => {
      fetchRooms();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Создание новой комнаты
   */
  const handleCreateRoom = () => {
    onCreateRoom();
  };

  /**
   * Присоединение к комнате из списка
   */
  const handleJoinRoom = (roomId: string) => {
    onJoinRoom(roomId);
  };

  /**
   * Присоединение к комнате по коду
   */
  const handleJoinByCode = () => {
    if (roomIdInput.trim().length === 6) {
      onJoinRoom(roomIdInput.trim().toUpperCase());
      setRoomIdInput('');
    } else {
      setError('Код комнаты должен содержать 6 символов');
    }
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-container">
        {/* Шапка */}
        <header className="lobby-header">
          <h1 className="lobby-title">🎴 Игра "Дурак"</h1>
          <div className="player-info">
            <span className="player-id">ID: {playerId}</span>
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 Онлайн' : '🔴 Офлайн'}
            </span>
          </div>
        </header>

        {/* Ошибка */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button onClick={() => setError(null)} className="close-error">✕</button>
          </div>
        )}

        {/* Создание комнаты */}
        <section className="create-room-section">
          <h2>Создать комнату</h2>
          <button 
            className="btn btn-primary btn-large"
            onClick={handleCreateRoom}
            disabled={!isConnected}
          >
            ➕ Создать новую комнату
          </button>
        </section>

        {/* Присоединение по коду */}
        <section className="join-by-code-section">
          <h2>Присоединиться по коду</h2>
          <div className="join-input-group">
            <input
              type="text"
              className="room-code-input"
              placeholder="Введите код (6 символов)"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={!isConnected}
            />
            <button
              className="btn btn-secondary"
              onClick={handleJoinByCode}
              disabled={!isConnected || roomIdInput.length !== 6}
            >
              Присоединиться
            </button>
          </div>
        </section>

        {/* Список открытых комнат */}
        <section className="available-rooms-section">
          <div className="section-header">
            <h2>Открытые комнаты</h2>
            <button 
              className="btn btn-small"
              onClick={fetchRooms}
              disabled={isLoading}
            >
              {isLoading ? '⏳' : '🔄'} Обновить
            </button>
          </div>

          {isLoading && rooms.length === 0 ? (
            <div className="loading">Загрузка комнат...</div>
          ) : rooms.length === 0 ? (
            <div className="no-rooms">
              <p>🏚️ Нет открытых комнат</p>
              <p className="hint">Создайте новую комнату или присоединитесь по коду</p>
            </div>
          ) : (
            <div className="rooms-list">
              {rooms.map((room) => (
                <div key={room.roomId} className="room-card">
                  <div className="room-info">
                    <div className="room-id">
                      <strong>Код комнаты:</strong> {room.roomId}
                    </div>
                    <div className="room-players">
                      👥 {room.playerCount}/{room.maxPlayers} игроков
                    </div>
                    <div className="room-status">
                      <span className={`status-badge status-${room.status}`}>
                        {room.status === 'waiting' ? '⏳ Ожидание' : '🎮 Игра'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-join"
                    onClick={() => handleJoinRoom(room.roomId)}
                    disabled={!isConnected || room.playerCount >= room.maxPlayers}
                  >
                    {room.playerCount >= room.maxPlayers ? '🔒 Полная' : '▶️ Войти'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Футер */}
        <footer className="lobby-footer">
          <p>Всего открытых комнат: {rooms.length}</p>
        </footer>
      </div>
    </div>
  );
}

export default LobbyScreen;
