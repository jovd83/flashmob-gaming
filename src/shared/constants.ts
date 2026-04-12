/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const PADDLE_WIDTH = 15;
export const PADDLE_HEIGHT = 80;
export const PADDLE_OFFSET = 20;

export const BALL_RADIUS = 8;
export const INITIAL_BALL_SPEED = 2;
export const ACCELERATION_FACTOR = 1.05;

export const COLORS = {
    LEFT_TEAM: '#00ffcc',
    RIGHT_TEAM: '#ff3366',
    BALL: '#ffffff',
    CENTER_LINE: 'rgba(255, 255, 255, 0.2)',
    BACKGROUND: '#0a0a0a',
    GRID: '#333'
};

export interface Palette {
    primary: string;
    secondary: string;
}

export const PALETTES: { [key: string]: Palette } = {
    'cyber-cyan': { primary: '#00f7ff', secondary: '#ff00ff' },
    'sunset-glow': { primary: '#f59e0b', secondary: '#ef4444' },
    'deep-sapphire': { primary: '#3b82f6', secondary: '#fbbf24' },
    'matrix-green': { primary: '#10b981', secondary: '#ffffff' }
};

export const GOAL_RESET_TIMEOUT = 2000;
export const FPS = 60;

export const DEFAULT_PALETTE = 'cyber-cyan';
export const DEFAULT_GAME_TYPE = 'paddle-battle';
export const DEFAULT_TEAM_NAMES = {
    'left': 'Alpha Squad',
    'right': 'Omega Squad'
};

export function resolvePalette(room?: any): Palette & { primaryGlow: string, secondaryGlow: string } {
    if (room?.primaryColor && room.primaryColor.startsWith('#') && room?.secondaryColor && room.secondaryColor.startsWith('#')) {
        return {
            primary: room.primaryColor,
            secondary: room.secondaryColor,
            primaryGlow: `${room.primaryColor}4D`,
            secondaryGlow: `${room.secondaryColor}4D`
        };
    }
    const base = PALETTES[room?.palette || 'cyber-cyan'] || PALETTES['cyber-cyan'];
    return {
        primary: base.primary,
        secondary: base.secondary,
        primaryGlow: `${base.primary}4D`,
        secondaryGlow: `${base.secondary}4D`
    };
}
