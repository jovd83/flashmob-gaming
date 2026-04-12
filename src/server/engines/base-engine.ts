/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { GAME_WIDTH, GAME_HEIGHT } from '../../shared/constants.js';
import { BaseEngineState } from '../../shared/types.js';

export interface GameEngineConfig {
    width: number;
    height: number;
    palette: string;
    primaryColor?: string;
    secondaryColor?: string;
    teamNames?: { [id: string]: string };
}

export abstract class BaseGameEngine<TState extends BaseEngineState = BaseEngineState> {
    protected width: number;
    protected height: number;
    protected palette: string;
    protected primaryColor?: string;
    protected secondaryColor?: string;
    protected teamNames?: { [id: string]: string };
    protected status: 'playing' | 'paused' | 'goal' | 'ending' | 'finished' | 'waiting' | 'countdown' = 'waiting';
    protected countdownValue: number = 0;
    protected countdownFrames: number = 0;
    protected eventCallbacks: Map<string, ((data: unknown) => void)[]> = new Map();

    constructor(config: Partial<GameEngineConfig> = {}) {
        this.width = config.width || GAME_WIDTH;
        this.height = config.height || GAME_HEIGHT;
        this.palette = config.palette || 'cyber-cyan';
        this.primaryColor = config.primaryColor;
        this.secondaryColor = config.secondaryColor;
        this.teamNames = config.teamNames;
    }

    protected startCountdown(seconds: number = 3) {
        this.status = 'countdown';
        // seconds (3) + 1 for "GO!"
        this.countdownFrames = (seconds + 1) * 60;
        this.countdownValue = seconds;
    }

    /**
     * Ticks the countdown. Returns true if the countdown is active.
     */
    protected tickCountdown(): boolean {
        if (this.status !== 'countdown') return false;
        
        this.countdownFrames--;
        if (this.countdownFrames <= 0) {
            this.status = 'playing';
            this.countdownValue = 0;
        } else {
            // This math ensures:
            // 240-181 frames -> 3
            // 180-121 frames -> 2
            // 120-61 frames -> 1
            // 60-1 frames -> 0 ("GO!")
            this.countdownValue = Math.floor((this.countdownFrames - 1) / 60);
        }
        return true;
    }

    /**
     * Subscribe to engine events (e.g. 'goal', 'collision', 'game-over')
     */
    public on(event: string, callback: (data: unknown) => void) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event)!.push(callback);
    }

    /**
     * Internal helper to trigger registered callbacks
     */
    protected emit(event: string, data: unknown) {
        const callbacks = this.eventCallbacks.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }

    /**
     * Called every tick (60fps) to calculate next frame
     */
    abstract update(): void;

    /**
     * Returns the serializable state for broadcasting to clients
     */
    abstract getState(): TState;

    /**
     * Process player input
     */
    abstract handleInput(playerId: string, teamId: string, action: string): void;

    /**
     * Player lifecycle
     */
    abstract addPlayer(playerId: string, teamId: string): void;
    abstract removePlayer(playerId: string): void;

    /**
     * Static metadata about the game (for Admin/UI)
     */
    abstract getMetadata(): {
        id: string;
        name: string;
        requiredTeams: { id: string; name: string; color: string }[];
    };

    /**
     * Resets the entire game state (including scores)
     */
    abstract reset(): void;

    /**
     * Resets only element positions (ball, units, etc.) while preserving scores.
     * Used for goal recovery or round transitions.
     */
    abstract resetPositions(): void;

    /**
     * Cleanup resources when the engine is no longer needed (stop timers, intervals, etc.)
     */
    public destroy(): void {
        this.eventCallbacks.clear();
    }

    public getStatus() {
        return this.status;
    }

    /**
     * Checks if the game has enough players to start/resume physics
     */
    abstract isReady(): boolean;

    /**
     * Updates engine-specific configuration (e.g. speed, grid scale)
     */
    public updateConfig(_config: Record<string, unknown>): void {
        // Base implementation does nothing
    }
}
