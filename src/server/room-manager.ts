/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { Room, GameConfig, GameEvent } from '../shared/types.js';
import { BaseGameEngine } from './engines/base-engine.js';
import { PaddleBattleEngine } from './engines/paddle-battle.js';
import { VipersEngine } from './engines/vipers.js';
import { BrickBurstEngine } from './engines/brick-burst.js';
import { RoomRepository } from './storage/room-repository.js';
import { logger } from './utils/logger.js';
import { 
    GAME_WIDTH, 
    GAME_HEIGHT,
    INITIAL_BALL_SPEED,
    ACCELERATION_FACTOR,
    PADDLE_HEIGHT
} from '../shared/constants.js';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    private engines: Map<string, BaseGameEngine<any>> = new Map();
    private repository: RoomRepository = new RoomRepository();
    public onEventCallback?: (roomId: string, data: GameEvent) => void;

    constructor() {
        // Initialization moved to async init()
    }

    public async init() {
        await this.repository.ensureDataDir();
        await this.loadRooms();
    }

    private async loadRooms() {
        try {
            const savedRooms = await this.repository.loadAll();
            savedRooms.forEach(room => {
                this.rooms.set(room.id, room);
                this.initializeEngine(room.id);
            });
            logger.info({ count: this.rooms.size }, 'Restored rooms from repository');
        } catch (err) {
            logger.error({ err }, 'Failed to initialize rooms');
        }
    }

    private async saveRooms() {
        const roomsArray = Array.from(this.rooms.values()).filter(r => !r.isSimulation);
        await this.repository.saveAll(roomsArray);
    }

    private createEngineInstance(gameType: string, palette: string = 'cyber-cyan', teamNames?: { [id: string]: string }, primaryColor?: string, secondaryColor?: string): BaseGameEngine<any> {
        logger.debug({ gameType, palette }, 'Creating engine instance');
        const config = { width: GAME_WIDTH, height: GAME_HEIGHT, palette, teamNames, primaryColor, secondaryColor };
        switch (gameType) {
            case 'vipers':
                return new VipersEngine(config);
            case 'brick-burst':
                return new BrickBurstEngine(config);
            case 'paddle-battle':
            default:
                return new PaddleBattleEngine(config);
        }
    }

    private initializeEngine(roomId: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        logger.debug({ roomId, palette: room.palette }, 'Initializing engine');
        const engine = this.createEngineInstance(room.gameType, room.palette, room.teamNames, room.primaryColor, room.secondaryColor);
        
        // Generic Event Subscriptions
        const relay = (type: string) => (data: any) => {
            if (this.onEventCallback) {
                this.onEventCallback(roomId, { ...data, type, timestamp: Date.now() });
            }
        };

        engine.on('goal', relay('goal'));
        engine.on('game-over', relay('game-over'));
        engine.on('hit', relay('hit'));
        engine.on('speed-up', relay('speed-up'));
        engine.on('eat', relay('eat'));
        engine.on('message', relay('message'));

        this.engines.set(roomId, engine);
    }

    public async createRoom(
        name: string, 
        gameType: string = 'paddle-battle', 
        config?: GameConfig, 
        palette: string = 'cyber-cyan', 
        teamNames?: { [id: string]: string },
        primaryColor?: string,
        secondaryColor?: string
    ): Promise<Room> {
        const id = this.generateId(name);
        
        logger.info({ roomId: id, name, gameType }, 'Creating new room');
        const room: Room = { 
            id, 
            name, 
            gameType, 
            palette, 
            primaryColor,
            secondaryColor,
            config: config || this.getDefaultConfig(gameType),
            teamNames
        };
        
        this.rooms.set(id, room);
        this.initializeEngine(id);
        await this.saveRooms();
        return room;
    }

    private getDefaultConfig(gameType: string): GameConfig {
        switch (gameType) {
            case 'paddle-battle':
                return {
                    ballSpeed: INITIAL_BALL_SPEED,
                    accelerationFactor: ACCELERATION_FACTOR,
                    paddleHeight: PADDLE_HEIGHT
                };
            case 'vipers':
                return {
                    speed: 10,
                    gridSize: 20
                };
            case 'brick-burst':
                return {
                    brickRows: 5,
                    brickCols: 6
                };
            default:
                return {};
        }
    }

    public async createSimulationRoom(name: string, gameType: string, durationMinutes: number): Promise<Room> {
        const id = `sim-${this.generateId(name)}`;
        const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
        
        logger.info({ roomId: id, name, gameType, durationMinutes }, 'Creating simulation room');
        const room: Room = { 
            id, 
            name: `[SIM] ${name}`, 
            gameType, 
            palette: 'cyber-cyan', 
            config: this.getDefaultConfig(gameType),
            teamNames: {
                left: 'Alpha Squad',
                right: 'Omega Squad'
            },
            isSimulation: true,
            expiresAt
        };
        
        this.rooms.set(id, room);
        this.initializeEngine(id);
        // Do NOT call saveRooms() for simulations
        return room;
    }

    private generateId(name: string): string {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let id = slug || 'room';
        let counter = 1;
        while (this.rooms.has(id)) {
            id = `${slug}-${counter++}`;
        }
        return id;
    }

    public getRoom(id: string): Room | undefined {
        return this.rooms.get(id);
    }

    public getEngine(id: string): BaseGameEngine<any> | undefined {
        return this.engines.get(id);
    }

    public listRooms(): Room[] {
        return Array.from(this.rooms.values());
    }

    public async deleteRoom(id: string) {
        if (!this.rooms.has(id)) return;
        
        logger.info({ roomId: id }, 'Deleting room');
        const engine = this.engines.get(id);
        if (engine) {
            engine.destroy();
        }
        this.rooms.delete(id);
        this.engines.delete(id);
        await this.saveRooms();
    }

    public async deleteAllRooms() {
        logger.info('Deleting all rooms');
        for (const engine of this.engines.values()) {
            engine.destroy();
        }
        this.rooms.clear();
        this.engines.clear();
        // Clear snapshots for all active engines immediately
        await this.saveRooms();
    }

    public async updateRoomConfig(id: string, config: Partial<GameConfig>) {
        const room = this.rooms.get(id);
        const engine = this.engines.get(id);
        if (room && engine) {
            room.config = { ...room.config, ...config };
            engine.updateConfig(config);
            await this.saveRooms();
        }
    }

    public async setGameType(id: string, gameType: string) {
        const room = this.rooms.get(id);
        if (!room) return;

        logger.info({ roomId: id, from: room.gameType, to: gameType }, 'Switching game type');
        
        // 1. Destroy old engine
        const oldEngine = this.engines.get(id);
        if (oldEngine) {
            oldEngine.destroy();
        }

        // 2. Update room metadata
        room.gameType = gameType;
        room.config = this.getDefaultConfig(gameType);

        // 3. Re-initialize engine
        this.initializeEngine(id);
        
        // 4. Persistence
        if (!room.isSimulation) {
            await this.saveRooms();
        }
    }

    public async setCinematicLayout(id: string, layout: any) {
        const room = this.rooms.get(id);
        if (room) {
            // Backend Sanitization: Ensure elements exists
            const sanitized = layout || { elements: {} };
            if (!sanitized.elements) sanitized.elements = {};

            // Ensure all required components are present (Backend parity with Auto-Rescue)
            const DEFAULT_ELEMENTS = {
                projector: { x: 35, y: 25, width: 30, height: 30, visible: true },
                scoreboard: { x: 80, y: 75, width: 8, height: 10, visible: true },
                qrLeft: { x: 5, y: 75, width: 10, height: 15, visible: true },
                qrRight: { x: 85, y: 75, width: 10, height: 15, visible: true },
                telemetry: { x: 35, y: 80, width: 30, height: 10, visible: true }
            };

            Object.keys(DEFAULT_ELEMENTS).forEach(key => {
                if (!sanitized.elements[key]) {
                    sanitized.elements[key] = { ...(DEFAULT_ELEMENTS as any)[key] };
                }
            });
            
            sanitized.backgroundUrl = layout.backgroundUrl;
            
            room.cinematicLayout = sanitized;
            room.updatedAt = Date.now();
            if (!room.isSimulation) {
                await this.saveRooms();
            }
        }
    }

    public async setCinematicBackground(id: string, url: string) {
        const room = this.rooms.get(id);
        if (room) {
            if (!room.cinematicLayout) {
                // Initialize with minimal structure
                room.cinematicLayout = { elements: {} as any };
            }
            room.cinematicLayout.backgroundUrl = url;
            room.updatedAt = Date.now();
            if (!room.isSimulation) {
                await this.saveRooms();
            }
        }
    }
    public async setRoomColors(id: string, primary: string, secondary: string) {
        const room = this.rooms.get(id);
        if (room) {
            room.primaryColor = primary;
            room.secondaryColor = secondary;
            room.updatedAt = Date.now();
            if (!room.isSimulation) {
                await this.saveRooms();
            }
        }
    }
}
