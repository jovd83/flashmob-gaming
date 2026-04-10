/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { Server } from 'socket.io';
import { RoomManager } from '../room-manager.js';
import { FPS } from '../../shared/constants.js';
import { logger } from '../utils/logger.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../../shared/socket-types.js';
import { BotService } from './bot-service.js';
import { Room } from '../../shared/types.js';

export class SimulationService {
    private interval: NodeJS.Timeout | null = null;
    private frameCount: number = 0;
    private readonly BROADCAST_INTERVAL = 3; // Broadcast every 3rd physics tick (~20Hz)
    private lastTickMetrics = {
        durationMs: 0,
        roomCount: 0,
        timestamp: Date.now()
    };

    constructor(
        private readonly io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
        private readonly roomManager: RoomManager,
        private readonly botService: BotService = new BotService()
    ) {}

    public getMetrics() {
        return {
            ...this.lastTickMetrics,
            fps: FPS,
            budgetMs: 1000 / FPS
        };
    }

    public start(): void {
        if (this.interval) return;

        logger.info({ fps: FPS, broadcastRatio: `1:${this.BROADCAST_INTERVAL}` }, 'Starting simulation loop [Stable-Frame Mode]');
        this.interval = setInterval(() => {
            this.tick();
        }, 1000 / FPS);
    }

    public stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info('Simulation loop stopped');
        }
    }

    public addBots(roomId: string, team: string, count: number): void {
        const engine = this.roomManager.getEngine(roomId);
        if (engine) {
            if (team === 'all') {
                const metadata = engine.getMetadata();
                metadata.requiredTeams.forEach(t => {
                    this.botService.addBots(roomId, t.id, count, engine);
                });
            } else {
                this.botService.addBots(roomId, team, count, engine);
            }
        }
    }

    private tick(): void {
        const startTime = process.hrtime();
        this.frameCount++;
        const isBroadcastFrame = this.frameCount % this.BROADCAST_INTERVAL === 0;

        const rooms = this.roomManager.listRooms();
        for (const room of rooms) {
            // Room Expiration Check
            if (room.isSimulation && room.expiresAt && Date.now() > room.expiresAt) {
                logger.info({ roomId: room.id }, 'Simulation room expired, decommissioning');
                this.roomManager.deleteRoom(room.id);
                this.botService.removeBots(room.id);
                continue;
            }

            const engine = this.roomManager.getEngine(room.id);
            if (!engine) {
                logger.warn({ roomId: room.id }, 'Engine not found for room');
                continue;
            }
            
            if (room.id === 'default-room' && isBroadcastFrame) {
                logger.debug({ roomId: room.id, status: engine.getStatus(), isReady: engine.isReady() }, 'Ticking default room');
            }

            // Update Bots if any
            if (room.isSimulation) {
                this.botService.updateBots(room.id, engine);
            }

            // Idle Hibernation: Only update if the game is ready (has players) or active
            const shouldActive = engine.isReady() || engine.getStatus() !== 'playing' || (room.isSimulation && engine.getStatus() === 'playing');
            



            try {
                // Physics Update (Always @ 60fps)
                if (shouldActive) {
                    engine.update();
                }

                // Unlinked Sync (Broadcast @ ~20fps)
                if (isBroadcastFrame) {
                    this.io.to(room.id).emit('game-state', engine.getState());
                }
            } catch (err) {
                logger.error({ err, roomId: room.id }, 'Error during engine update/sync');
            }
        }

        // Performance Telemetry
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const durationMs = (seconds * 1000) + (nanoseconds / 1000000);
        const tickBudget = 1000 / FPS;

        this.lastTickMetrics = {
            durationMs,
            roomCount: rooms.length,
            timestamp: Date.now()
        };

        if (durationMs > tickBudget * 0.8) { // Alert if over 80% budget
            logger.warn({ 
                durationMs: durationMs.toFixed(3), 
                rooms: rooms.length,
                budgetMs: tickBudget.toFixed(3)
            }, 'Tick budget exceeded 80% threshold');
        }
    }
}
