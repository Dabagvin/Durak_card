import { useEffect, useRef, useState, useCallback } from 'react';
import type { ClientMessage, ServerMessage, GameState } from '../shared/types';

// Для таймаутов в useRef: тип из NodeJS
type Timeout = ReturnType<typeof setTimeout>;

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export function useWebSocket(playerId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000; // 3 секунды

  const sendMessage = useCallback(
    (message: Omit<ClientMessage, 'playerId'>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const fullMessage: ClientMessage = {
          ...message,
          playerId,
        };
        wsRef.current.send(JSON.stringify(fullMessage));
        console.log('📤 Sent:', fullMessage);
      } else {
        console.error('❌ WebSocket is not connected');
        setError('Соединение потеряно. Переподключение...');
      }
    },
    [playerId]
  );

  const connect = useCallback(() => {
    try {
      console.log(`🔌 Connecting to ${WS_URL}...`);

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          console.log('📥 Received:', message);

          setLastMessage(message);

          if (message.type === 'game_state' && message.payload) {
            setGameState(message.payload as GameState);
          } else if (message.type === 'error') {
            setError(message.payload?.message || 'Unknown error');
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('Ошибка соединения');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(
            `🔄 Reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          setError('Не удалось подключиться к серверу');
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Ошибка создания соединения');
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Игровые действия

  const createRoom = useCallback(() => sendMessage({ type: 'create_room' }), [sendMessage]);
  const joinRoom = useCallback((roomId: string) => sendMessage({ type: 'join_room', payload: { roomId } }), [sendMessage]);
  const leaveRoom = useCallback(() => sendMessage({ type: 'leave_room' }), [sendMessage]);
  const attack = useCallback((card: string) => sendMessage({ type: 'attack', payload: { card } }), [sendMessage]);
  const defend = useCallback(
    (attackCard: string, defenseCard: string) =>
      sendMessage({ type: 'defend', payload: { attackCard, defenseCard } }),
    [sendMessage]
  );
  const throwIn = useCallback((card: string) => sendMessage({ type: 'throw_in', payload: { card } }), [sendMessage]);
  const passTurn = useCallback(() => sendMessage({ type: 'pass_turn' }), [sendMessage]);
  const takeCards = useCallback(() => sendMessage({ type: 'take_cards' }), [sendMessage]);

  return {
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
  };
}
