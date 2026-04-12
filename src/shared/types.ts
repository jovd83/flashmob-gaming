/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
export interface GameConfig {
    ballSpeed?: number;
    accelerationFactor?: number;
    paddleHeight?: number;
    speed?: number;
    gridSize?: number;
    ghostCount?: number;
    brickRows?: number;
    brickCols?: number;
}

export interface TeamMetadata {
    id: string;
    name: string;
    color: string;
}

export interface CinematicElement {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
}

export interface CinematicLayout {
    backgroundUrl?: string;
    elements: {
        projector: CinematicElement;
        scoreboard: CinematicElement;
        qrLeft: CinematicElement;
        qrRight: CinematicElement;
        telemetry: CinematicElement;
    };
}

export interface Room {
    id: string;
    name: string;
    gameType: string;
    palette: string;
    primaryColor?: string;
    secondaryColor?: string;
    config: GameConfig;
    teamNames?: { [id: string]: string };
    isSimulation?: boolean;
    expiresAt?: number;
    metadata?: {
        id: string;
        name: string;
        requiredTeams: TeamMetadata[];
    };
    cinematicLayout?: CinematicLayout;
    state?: BaseEngineState;
    updatedAt?: number;
}

export interface RoomState {
    rooms: Room[];
}

export interface BaseEngineState {
    status: 'playing' | 'paused' | 'goal' | 'ending' | 'finished' | 'waiting' | 'countdown';
    countdown?: number;
    teams?: { [id: string]: { players: string[]; [key: string]: any } };
    entities?: { [id: string]: { [key: string]: any } };
}

export interface GameEvent {
    type: string;
    id?: string;
    team?: string;
    teamName?: string;
    winner?: string;
    winnerName?: string;
    timestamp: number;
    [key: string]: unknown;
}
