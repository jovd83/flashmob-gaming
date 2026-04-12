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
import { Room, CinematicLayout } from '../shared/types.js';
import multer from 'multer';
import fs from 'fs/promises';
import { existsSync } from 'fs';

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

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

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

        const { name, gameType, config, palette, teamNames, primaryColor, secondaryColor } = result.data;
        logger.info({ roomId: name, gameType }, 'API request: Create room');
        
        const room = await roomManager.createRoom(name, gameType, config, palette, teamNames, primaryColor, secondaryColor);
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

    app.post('/api/rooms/:id/game-type', authMiddleware, async (req, res) => {
        const { gameType } = req.body;
        const id = req.params.id as string;
        
        if (!gameType) {
            return res.status(400).json({ error: 'Missing gameType' });
        }

        if (roomManager.getRoom(id)) {
            await roomManager.setGameType(id, gameType);
            broadcastRooms();
            res.json({ message: 'Game type updated', gameType });
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

    // --- Cinematic Editor API ---

    // Multer setup for background uploads
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/uploads/cinematic/');
        },
        filename: (req, file, cb) => {
            const roomId = req.params.id || 'default';
            const ext = path.extname(file.originalname);
            cb(null, `bg-${roomId}-${Date.now()}${ext}`);
        }
    });
    const upload = multer({ 
        storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/')) cb(null, true);
            else cb(new Error('Only images are allowed'));
        }
    });

    const DEFAULT_LAYOUT_FILE = path.join(__dirname, './data/default-cinematic.json');

    app.get('/api/cinematic/default', async (req, res) => {
        try {
            if (existsSync(DEFAULT_LAYOUT_FILE)) {
                const data = await fs.readFile(DEFAULT_LAYOUT_FILE, 'utf8');
                res.json(JSON.parse(data));
            } else {
                res.status(404).json({ error: 'Default layout not found' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Error loading default layout' });
        }
    });

    app.post('/api/cinematic/default', authMiddleware, async (req, res) => {
        try {
            await fs.writeFile(DEFAULT_LAYOUT_FILE, JSON.stringify(req.body, null, 2));
            res.json({ message: 'Global default layout updated' });
        } catch (err) {
            res.status(500).json({ error: 'Error saving default layout' });
        }
    });

    app.post('/api/rooms/:id/cinematic/upload', authMiddleware, upload.single('background'), async (req, res) => {
        const id = req.params.id as string;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileUrl = `/uploads/cinematic/${req.file.filename}`;
        await roomManager.setCinematicBackground(id, fileUrl);
        broadcastRooms();
        res.json({ url: fileUrl });
    });

    app.patch('/api/rooms/:id/cinematic-layout', authMiddleware, async (req, res) => {
        const id = req.params.id as string;
        const { primaryColor, secondaryColor, ...layout } = req.body;
        
        if (layout.elements) {
            await roomManager.setCinematicLayout(id, layout);
        }
        
        if (primaryColor && secondaryColor) {
            await roomManager.setRoomColors(id, primaryColor, secondaryColor);
        }
        
        broadcastRooms();
        res.json({ message: 'Cinematic layout updated' });
    });

    // Serve static files
    app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));
    const staticPath = path.join(__dirname, '../../dist');
    app.use(express.static(staticPath));
    app.use((req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
    });

    return app;
}
