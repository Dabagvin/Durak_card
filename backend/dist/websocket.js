"use strict";
// backend/src/websocket.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.getActiveConnections = getActiveConnections;
const ws_1 = require("ws");
const GameManager_1 = require("./game/GameManager");
// Маппинг: playerId -> WebSocket connection
const connections = new Map();
// Маппинг: WebSocket -> playerId (для быстрого поиска)
const playerIds = new WeakMap();
/**
 * Инициализация WebSocket сервера
 */
function initWebSocket(httpServer) {
    const wss = new ws_1.WebSocketServer({ server: httpServer });
    console.log('🔌 WebSocket server initialized');
    wss.on('connection', (ws) => {
        console.log('👤 New WebSocket connection');
        // Обработка сообщений от клиента
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleClientMessage(ws, message);
            }
            catch (error) {
                console.error('Error parsing message:', error);
                sendError(ws, 'Invalid message format');
            }
        });
        // Обработка отключения
        ws.on('close', () => {
            const playerId = playerIds.get(ws);
            if (playerId) {
                console.log(`👋 Player ${playerId} disconnected`);
                connections.delete(playerId);
                // Удаляем игрока из комнаты через 60 секунд (даём время на reconnect)
                setTimeout(() => {
                    if (!connections.has(playerId)) {
                        GameManager_1.gameManager.leaveRoom(playerId);
                        console.log(`🚪 Player ${playerId} removed from room (timeout)`);
                    }
                }, 60000); // 60 секунд на reconnect
            }
        });
        // Обработка ошибок
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        // Отправляем приветственное сообщение
        sendMessage(ws, {
            type: 'game_state',
            payload: { message: 'Connected to game server' },
        });
    });
    return wss;
}
/**
 * Обработка сообщения от клиента
 */
function handleClientMessage(ws, message) {
    const { type, payload, playerId } = message;
    if (!playerId) {
        sendError(ws, 'playerId is required');
        return;
    }
    // Регистрируем соединение
    connections.set(playerId, ws);
    playerIds.set(ws, playerId);
    console.log(`📨 Message from ${playerId}: ${type}`);
    switch (type) {
        case 'create_room':
            handleCreateRoom(playerId);
            break;
        case 'join_room':
            handleJoinRoom(playerId, payload?.roomId);
            break;
        case 'leave_room':
            handleLeaveRoom(playerId);
            break;
        case 'attack':
            handleAttack(playerId, payload?.card);
            break;
        case 'defend':
            handleDefend(playerId, payload?.attackCard, payload?.defenseCard);
            break;
        case 'throw_in':
            handleThrowIn(playerId, payload?.card);
            break;
        case 'pass_turn':
            handlePassTurn(playerId);
            break;
        case 'take_cards':
            handleTakeCards(playerId);
            break;
        default:
            sendError(ws, `Unknown message type: ${type}`);
    }
}
// ============================================
// ROOM HANDLERS
// ============================================
function handleCreateRoom(playerId) {
    const result = GameManager_1.gameManager.createRoom(playerId);
    if (!result.success) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: result.error },
        });
        return;
    }
    sendToPlayer(playerId, {
        type: 'room_created',
        payload: { roomId: result.roomId },
    });
    // Отправляем обновлённое состояние
    broadcastGameState(result.roomId);
}
function handleJoinRoom(playerId, roomId) {
    if (!roomId) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'roomId is required' },
        });
        return;
    }
    const result = GameManager_1.gameManager.joinRoom(playerId, roomId);
    if (!result.success) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: result.error },
        });
        return;
    }
    sendToPlayer(playerId, {
        type: 'room_joined',
        payload: { roomId },
    });
    // Отправляем состояние всем игрокам в комнате
    broadcastGameState(roomId);
}
function handleLeaveRoom(playerId) {
    const roomId = GameManager_1.gameManager.getPlayerRoom(playerId);
    const result = GameManager_1.gameManager.leaveRoom(playerId);
    if (!result.success) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: result.error },
        });
        return;
    }
    sendToPlayer(playerId, {
        type: 'player_left',
        payload: { message: 'You left the room' },
    });
    // Уведомляем оставшихся игроков
    if (roomId) {
        broadcastGameState(roomId);
    }
}
// ============================================
// GAME ACTION HANDLERS
// ============================================
function handleAttack(playerId, card) {
    if (!card) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'card is required' },
        });
        return;
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Game not found' },
        });
        return;
    }
    const success = session.attack(playerId, card);
    if (!success) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Invalid attack' },
        });
        return;
    }
    // Broadcast обновлённое состояние всем игрокам
    broadcastGameState(session.roomId);
}
function handleDefend(playerId, attackCard, defenseCard) {
    if (!attackCard || !defenseCard) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'attackCard and defenseCard are required' },
        });
        return;
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Game not found' },
        });
        return;
    }
    const success = session.defend(playerId, attackCard, defenseCard);
    if (!success) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Invalid defense' },
        });
        return;
    }
    broadcastGameState(session.roomId);
}
function handleThrowIn(playerId, card) {
    if (!card) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'card is required' },
        });
        return;
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Game not found' },
        });
        return;
    }
    const success = session.throwIn(playerId, card);
    if (!success) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Cannot throw in this card' },
        });
        return;
    }
    broadcastGameState(session.roomId);
}
function handlePassTurn(playerId) {
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Game not found' },
        });
        return;
    }
    const success = session.passTurn(playerId);
    if (!success) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Cannot pass turn' },
        });
        return;
    }
    broadcastGameState(session.roomId);
}
function handleTakeCards(playerId) {
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Game not found' },
        });
        return;
    }
    const success = session.takeCards(playerId);
    if (!success) {
        sendToPlayer(playerId, {
            type: 'error',
            payload: { message: 'Cannot take cards' },
        });
        return;
    }
    broadcastGameState(session.roomId);
}
// ============================================
// BROADCAST HELPERS
// ============================================
/**
 * Отправить состояние игры всем игрокам в комнате
 */
function broadcastGameState(roomId) {
    const session = GameManager_1.gameManager.getSession(roomId);
    if (!session) {
        console.error(`Session ${roomId} not found`);
        return;
    }
    // Отправляем каждому игроку его персонализированное состояние
    for (const playerId of session.players) {
        const state = session.getStateForPlayer(playerId);
        sendToPlayer(playerId, {
            type: 'game_state',
            payload: state,
            timestamp: Date.now(),
        });
    }
}
/**
 * Отправить сообщение конкретному игроку
 */
function sendToPlayer(playerId, message) {
    const ws = connections.get(playerId);
    if (ws && ws.readyState === ws_1.WebSocket.OPEN) {
        sendMessage(ws, message);
    }
}
/**
 * Отправить сообщение через WebSocket
 */
function sendMessage(ws, message) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
/**
 * Отправить ошибку
 */
function sendError(ws, message) {
    sendMessage(ws, {
        type: 'error',
        payload: { message },
    });
}
/**
 * Получить количество активных соединений
 */
function getActiveConnections() {
    return connections.size;
}
