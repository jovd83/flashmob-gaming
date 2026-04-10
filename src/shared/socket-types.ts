/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { GameEvent, Room, BaseEngineState } from './types.js';

export interface ServerToClientEvents {
    'game-state': (state: BaseEngineState) => void;
    'game-event': (data: GameEvent) => void;
    'room-update': (rooms: Room[]) => void;
    'system-stats': (stats: { activeRooms: number; totalPlayers: number }) => void;
    'team-assigned': (side: string) => void;
    'room-deleted': () => void;
    'error': (message: string) => void;
}

export interface ClientToServerEvents {
    'join-room': (roomId: string) => void;
    'join-team': (side: string) => void;
    'move': (direction: string) => void;
    'admin-join': () => void;
}

export type InterServerEvents = Record<string, never>;

export type SocketData = Record<string, never>;
