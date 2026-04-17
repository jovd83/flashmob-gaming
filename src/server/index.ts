/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './room-manager.js';
import { 
    GOAL_RESET_TIMEOUT, 
    DEFAULT_PALETTE,
    DEFAULT_GAME_TYPE
} from '../shared/constants.js';
import { LoginSchema, RoomCreationSchema } from '../shared/schemas.js';
import { logger } from './utils/logger.js';
import { SimulationService } from './services/simulation-service.js';
import { Room, BaseEngineState } from '../shared/types.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../shared/socket-types.js';
import { JWTUtil } from './utils/jwt-util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createApp } from './app.js';

const roomManager = new RoomManager();

const broadcastRooms = () => {
    try {
        const rooms: Room[] = roomManager.listRooms().map(room => {
            const engine = roomManager.getEngine(room.id);
            return {
                ...room,
                metadata: engine?.getMetadata(),
                state: engine?.getState() as BaseEngineState | undefined
            };
        });
        io.emit('room-update', rooms);

        const stats = {
            activeRooms: rooms.filter(r => r.state?.status === 'playing').length,
            totalPlayers: rooms.reduce((acc, r) => {
                const state = r.state;
                const teams = state?.teams || state?.entities || {};
                const playerCount = Object.values(teams).reduce((pAcc: number, t) => pAcc + (t.players?.length || 0), 0);
                return acc + playerCount;
            }, 0)
        };

        io.emit('system-stats', stats);
    } catch (err) {
        logger.error({ err }, 'Error broadcasting rooms');
    }
};

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(http.createServer(), {
    cors: {
        origin: [
            "http://localhost:5173",
            "http://localhost:4173",
            "http://localhost:3000",
            /^http:\/\/127\.0\.0\.1:\d+$/,
            "http://localhost:4173"
        ],
        methods: ["GET", "POST"]
    }
});

// Ensure JWT_SECRET is provided in production for container safety
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    logger.error('CRITICAL: JWT_SECRET environment variable is missing in production!');
    process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'mass-gaming-v3-secret-change-this';
const JWT_EXPIRES_IN = '24h';
const PORT = Number(process.env.PORT) || 3000;

const simulationService = new SimulationService(io, roomManager);
const app = createApp(roomManager, broadcastRooms, simulationService, PORT);
const server = http.createServer(app);
io.attach(server);

roomManager.onEventCallback = (roomId, data) => {
    const engine = roomManager.getEngine(roomId);
    if (!engine) return;

    // Enrich event with team names if missing
    if (data.team && !data.teamName) {
        const state = engine.getState();
        const teams = state.teams || state.entities || {};
        const team = teams[data.team];
        if (team && (team as any).name) {
            data.teamName = (team as any).name;
        } else {
            // Fallback to metadata
            const meta = engine.getMetadata();
            const teamMeta = meta.requiredTeams.find(t => t.id === data.team);
            if (teamMeta) {
                data.teamName = teamMeta.name;
            } else {
                // Last resort: capitalize ID
                data.teamName = data.team.charAt(0).toUpperCase() + data.team.slice(1);
            }
        }
    }
    if (data.winner && !data.winnerName) {
        const state = engine.getState();
        const teams = state.teams || state.entities || {};
        const team = teams[data.winner as string];
        if (team && (team as any).name) {
            data.winnerName = (team as any).name;
        } else {
            // Fallback to metadata
            const meta = engine.getMetadata();
            const teamMeta = meta.requiredTeams.find(t => t.id === data.winner);
            if (teamMeta) {
                data.winnerName = teamMeta.name;
            } else {
                // Last resort: capitalize ID
                const w = data.winner as string;
                data.winnerName = w.charAt(0).toUpperCase() + w.slice(1);
            }
        }
    }

    // Log to console for tracing
    if (data.type === 'goal' || data.type === 'game-over') {
        logger.info({ roomId, type: data.type, winner: data.winner, winnerName: data.winnerName }, 'Significant game event');
    }

    // Broadcast the event to the room
    io.to(roomId).emit('game-event', data);
    
    // Handle specific engine logic post-event
    if (data.type === 'goal') {
        setTimeout(() => {
            if (roomManager.getEngine(roomId)) engine.resetPositions();
        }, GOAL_RESET_TIMEOUT);
    } else if (data.type === 'game-over') {
        setTimeout(() => {
            if (roomManager.getEngine(roomId)) engine.reset();
        }, GOAL_RESET_TIMEOUT * 2);
    }
};

const bootstrap = async () => {
    // Initialize RoomManager (load from disk)
    await roomManager.init();

    // Ensure default room exists if not already there
    if (!roomManager.getRoom('default-room')) {
        await roomManager.createRoom('Default Room', DEFAULT_GAME_TYPE, undefined, DEFAULT_PALETTE);
    }

    server.listen(PORT, '0.0.0.0', () => {
        logger.info({ port: PORT }, 'Server running');
    });

    // Start simulation loop
    simulationService.start();

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
        logger.info({ signal }, 'Shutdown signal received');
        simulationService.stop();
        server.close(async () => {
            logger.info('HTTP server closed');
            process.exit(0);
        });

        // Force exit after timeout
        setTimeout(() => {
            logger.error('Forceful shutdown due to timeout');
            process.exit(1);
        }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

bootstrap().catch(err => {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
});

io.on('connection', (socket) => {
    let currentRoomId: string | null = null;
    let currentTeam: string | null = null;

    socket.on('join-room', (roomId) => {
        if (roomId !== 'admin' && !roomManager.getRoom(roomId)) {
            socket.emit('error', 'Room not found');
            return;
        }
        socket.join(roomId);
        currentRoomId = roomId;
        logger.info({ socketId: socket.id, roomId }, 'Socket joined room');
        
        // If joining admin room/namespace, send immediate update
        if (roomId === 'admin') {
            broadcastRooms();
        }
    });

    socket.on('join-team', (side) => {
        if (!currentRoomId) return;
        currentTeam = side;
        
        const engine = roomManager.getEngine(currentRoomId);
        if (engine) {
            engine.addPlayer(socket.id, side);
        }
        
        socket.emit('team-assigned', side);
        logger.info({ socketId: socket.id, side, roomId: currentRoomId }, 'Socket joined team');
    });

    socket.on('move', (direction) => {
        if (!currentRoomId || !currentTeam) return;
        const engine = roomManager.getEngine(currentRoomId);
        if (engine) {
            engine.handleInput(socket.id, currentTeam, direction);
        }
    });

    socket.on('admin-join', () => {
        socket.join('admin');
        logger.info({ socketId: socket.id }, 'Admin socket joined');
    });

    socket.on('disconnect', () => {
        if (currentRoomId) {
            const engine = roomManager.getEngine(currentRoomId);
            if (engine) {
                engine.removePlayer(socket.id);
            }
        }
        logger.info({ socketId: socket.id }, 'Socket disconnected');
    });
});


