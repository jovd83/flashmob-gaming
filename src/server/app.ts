/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import express from 'express';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { RoomManager } from './room-manager.js';
import { SimulationService } from './services/simulation-service.js';
import { LoginSchema, RoomCreationSchema } from '../shared/schemas.js';
import { logger } from './utils/logger.js';
import { JWTUtil } from './utils/jwt-util.js';
import { Room } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(roomManager: RoomManager, broadcastRooms: () => void, simulationService: SimulationService, port: number) {
    const app = express();
    app.use(express.json());

    // Helper to get local IP
    const getLocalIp = () => {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const ifaceList = interfaces[name];
            if (!ifaceList) continue;
            for (const iface of ifaceList) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    };

    app.get('/api/network-info', (req, res) => {
        res.json({
            ip: getLocalIp(),
            port: port
        });
    });

    const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token' });
        }
        
        const token = authHeader.split(' ')[1];
        const payload = JWTUtil.verify(token);
        
        if (payload && payload.role === 'admin') {
            next();
        } else {
            res.status(401).json({ error: 'Unauthorized: Access denied' });
        }
    };

    app.post('/api/login', (req, res) => {
        const result = LoginSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Invalid input', details: result.error.format() });
        }
        
        const { username, password } = result.data;
        const ADMIN_USER = process.env.ADMIN_USER || 'admin';
        const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

        if (username === ADMIN_USER && password === ADMIN_PASS) {
            const token = JWTUtil.sign({ username: ADMIN_USER, role: 'admin' });
            res.json({ success: true, token });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    });

    app.get('/api/rooms', (req, res) => {
        try {
            const rooms: Room[] = roomManager.listRooms().map(room => {
                const engine = roomManager.getEngine(room.id);
                return {
                    ...room,
                    metadata: engine?.getMetadata(),
                    state: engine?.getState()
                };
            });
            res.json(rooms);
        } catch (err) {
            logger.error({ err }, 'Error listing rooms');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/rooms', authMiddleware, async (req, res) => {
        const result = RoomCreationSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Validation failed', details: result.error.format() });
        }

        const { name, gameType, config, palette, teamNames } = result.data;
        logger.info({ roomId: name, gameType }, 'API request: Create room');
        
        const room = await roomManager.createRoom(name, gameType, config, palette, teamNames);
        broadcastRooms();
        res.status(201).json(room);
    });

    app.delete('/api/rooms', authMiddleware, async (req, res) => {
        await roomManager.deleteAllRooms();
        broadcastRooms();
        res.json({ message: 'All rooms deleted' });
    });

    app.delete('/api/rooms/:id', authMiddleware, async (req, res) => {
        const id = req.params.id as string;
        if (roomManager.getRoom(id)) {
            await roomManager.deleteRoom(id);
            broadcastRooms();
            res.json({ message: 'Room deleted' });
        } else {
            res.status(404).json({ error: 'Room not found' });
        }
    });

    app.post('/api/rooms/:id/reset-score', authMiddleware, (req, res) => {
        const engine = roomManager.getEngine(req.params.id as string);
        if (engine) {
            engine.reset();
            broadcastRooms();
            res.json({ message: 'Score reset' });
        } else {
            res.status(404).json({ error: 'Room not found' });
        }
    });

    app.post('/api/rooms/:id/end-game', authMiddleware, (req, res) => {
        const engine = roomManager.getEngine(req.params.id as string) as any;
        if (engine) {
            if (typeof engine.startEndGame === 'function') {
                engine.startEndGame();
            } else {
                // For engines without startEndGame, just set status to finished
                const state = engine.getState();
                if (state) state.status = 'finished';
            }
            broadcastRooms();
            res.json({ message: 'Game ending' });
        } else {
            res.status(404).json({ error: 'Room not found' });
        }
    });

    app.post('/api/simulation', authMiddleware, async (req, res) => {
        const { name, gameType, playerCount, team, duration } = req.body;
        
        if (!name || !gameType || !playerCount || !duration) {
            return res.status(400).json({ error: 'Missing simulation parameters' });
        }

        try {
            const room = await roomManager.createSimulationRoom(name, gameType, duration);
            simulationService.addBots(room.id, team || 'left', playerCount);
            broadcastRooms();
            res.status(201).json(room);
        } catch (err) {
            logger.error({ err }, 'Failed to start simulation');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/perf/metrics', authMiddleware, (req, res) => {
        res.json(simulationService.getMetrics());
    });

    // Serve static files
    const staticPath = path.join(__dirname, '../../dist');
    app.use(express.static(staticPath));
    app.use((req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
    });

    return app;
}
