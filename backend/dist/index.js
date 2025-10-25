"use strict";
// backend/src/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const GameManager_1 = require("./game/GameManager");
const http_1 = __importDefault(require("http"));
const websocket_1 = require("./websocket");
// Загружаем переменные окружения
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ============================================
// MIDDLEWARE
// ============================================
// CORS - разрешаем запросы с любых доменов (для разработки)
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true,
}));
// Парсинг JSON
app.use(express_1.default.json());
// Логирование запросов (простая версия)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// ============================================
// HEALTH CHECK
// ============================================
/**
 * GET / - Проверка работы сервера
 */
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Durak Game Server is running',
        version: '1.0.0',
        timestamp: Date.now(),
    });
});
/**
 * GET /health - Healthcheck для мониторинга
 */
app.get('/health', (req, res) => {
    const stats = GameManager_1.gameManager.getServerStats();
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        stats,
    });
});
// ============================================
// ROOM MANAGEMENT API
// ============================================
/**
 * POST /api/room/create - Создать новую комнату
 * Body: { playerId: string }
 */
app.post('/api/room/create', (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: 'playerId is required' });
    }
    const result = GameManager_1.gameManager.createRoom(playerId);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    res.json({
        success: true,
        roomId: result.roomId,
        message: 'Комната создана',
    });
});
/**
 * POST /api/room/join - Присоединиться к комнате
 * Body: { playerId: string, roomId: string }
 */
app.post('/api/room/join', (req, res) => {
    const { playerId, roomId } = req.body;
    if (!playerId || !roomId) {
        return res.status(400).json({ error: 'playerId and roomId are required' });
    }
    const result = GameManager_1.gameManager.joinRoom(playerId, roomId);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    res.json({
        success: true,
        message: 'Вы присоединились к комнате',
    });
});
/**
 * POST /api/room/leave - Покинуть комнату
 * Body: { playerId: string }
 */
app.post('/api/room/leave', (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: 'playerId is required' });
    }
    const result = GameManager_1.gameManager.leaveRoom(playerId);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    res.json({
        success: true,
        message: 'Вы покинули комнату',
    });
});
/**
 * GET /api/room/list - Получить список открытых комнат
 */
app.get('/api/room/list', (req, res) => {
    const rooms = GameManager_1.gameManager.getOpenRooms();
    res.json({
        success: true,
        rooms,
        count: rooms.length,
    });
});
// ============================================
// GAME STATE API
// ============================================
/**
 * GET /api/game/state - Получить состояние игры
 * Query: playerId
 */
app.get('/api/game/state', (req, res) => {
    const playerId = req.query.playerId;
    if (!playerId) {
        return res.status(400).json({ error: 'playerId is required' });
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        return res.status(404).json({ error: 'Вы не находитесь в игре' });
    }
    // Отправляем состояние с скрытыми картами противника
    const state = session.getStateForPlayer(playerId);
    res.json({
        success: true,
        state,
    });
});
// ============================================
// GAME ACTIONS API
// ============================================
/**
 * POST /api/game/attack - Атаковать картой
 * Body: { playerId: string, card: string }
 */
app.post('/api/game/attack', (req, res) => {
    const { playerId, card } = req.body;
    if (!playerId || !card) {
        return res.status(400).json({ error: 'playerId and card are required' });
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        return res.status(404).json({ error: 'Игра не найдена' });
    }
    const success = session.attack(playerId, card);
    if (!success) {
        return res.status(400).json({ error: 'Невозможно атаковать этой картой' });
    }
    res.json({
        success: true,
        message: 'Атака успешна',
        state: session.getStateForPlayer(playerId),
    });
});
/**
 * POST /api/game/defend - Защититься картой
 * Body: { playerId: string, attackCard: string, defenseCard: string }
 */
app.post('/api/game/defend', (req, res) => {
    const { playerId, attackCard, defenseCard } = req.body;
    if (!playerId || !attackCard || !defenseCard) {
        return res.status(400).json({
            error: 'playerId, attackCard, and defenseCard are required',
        });
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        return res.status(404).json({ error: 'Игра не найдена' });
    }
    const success = session.defend(playerId, attackCard, defenseCard);
    if (!success) {
        return res.status(400).json({ error: 'Невозможно защититься этой картой' });
    }
    res.json({
        success: true,
        message: 'Защита успешна',
        state: session.getStateForPlayer(playerId),
    });
});
/**
 * POST /api/game/throw - Подкинуть карту
 * Body: { playerId: string, card: string }
 */
app.post('/api/game/throw', (req, res) => {
    const { playerId, card } = req.body;
    if (!playerId || !card) {
        return res.status(400).json({ error: 'playerId and card are required' });
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        return res.status(404).json({ error: 'Игра не найдена' });
    }
    const success = session.throwIn(playerId, card);
    if (!success) {
        return res.status(400).json({ error: 'Невозможно подкинуть эту карту' });
    }
    res.json({
        success: true,
        message: 'Карта подкинута',
        state: session.getStateForPlayer(playerId),
    });
});
/**
 * POST /api/game/pass - Пропустить ход (Бито!)
 * Body: { playerId: string }
 */
app.post('/api/game/pass', (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: 'playerId is required' });
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        return res.status(404).json({ error: 'Игра не найдена' });
    }
    const success = session.passTurn(playerId);
    if (!success) {
        return res.status(400).json({ error: 'Невозможно пропустить ход' });
    }
    res.json({
        success: true,
        message: 'Бито! Раунд завершён',
        state: session.getStateForPlayer(playerId),
    });
});
/**
 * POST /api/game/take - Взять карты
 * Body: { playerId: string }
 */
app.post('/api/game/take', (req, res) => {
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: 'playerId is required' });
    }
    const session = GameManager_1.gameManager.getSessionByPlayer(playerId);
    if (!session) {
        return res.status(404).json({ error: 'Игра не найдена' });
    }
    const success = session.takeCards(playerId);
    if (!success) {
        return res.status(400).json({ error: 'Невозможно взять карты' });
    }
    res.json({
        success: true,
        message: 'Карты взяты',
        state: session.getStateForPlayer(playerId),
    });
});
// ============================================
// ADMIN / DEBUG ENDPOINTS
// ============================================
/**
 * GET /api/admin/stats - Статистика сервера
 */
app.get('/api/admin/stats', (req, res) => {
    const stats = GameManager_1.gameManager.getServerStats();
    res.json({
        success: true,
        stats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    });
});
/**
 * POST /api/admin/cleanup - Очистка неактивных комнат
 */
app.post('/api/admin/cleanup', (req, res) => {
    const emptyRooms = GameManager_1.gameManager.cleanupEmptyRooms();
    const finishedGames = GameManager_1.gameManager.cleanupFinishedGames();
    res.json({
        success: true,
        cleaned: {
            emptyRooms,
            finishedGames,
        },
    });
});
// ============================================
// ERROR HANDLING
// ============================================
/**
 * 404 - Маршрут не найден
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
    });
});
/**
 * Глобальный обработчик ошибок
 */
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
// ============================================
// START SERVER
// ============================================
// Создаём HTTP сервер
const httpServer = http_1.default.createServer(app);
// Инициализируем WebSocket
(0, websocket_1.initWebSocket)(httpServer);
// Запускаем сервер
httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🎴 DURAK GAME SERVER STARTED 🎴     ║
╠════════════════════════════════════════╣
║  HTTP Port: ${PORT}                      ║
║  WebSocket: ws://localhost:${PORT}       ║
║  Environment: ${process.env.NODE_ENV || 'development'}         ║
║  Time: ${new Date().toLocaleString()}  ║
╚════════════════════════════════════════╝
  `);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
