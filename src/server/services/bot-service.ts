/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { BaseGameEngine } from '../engines/base-engine.js';
import { logger } from '../utils/logger.js';

export interface Bot {
    id: string;
    team: string;
    roomId: string;
    traits: {
        errorOffset: number;    // Targeting bias (pixels from center)
        reactionChance: number; // Probability of reacting on a tick (0.05 - 0.2)
        jitter: number;         // Likelihood of random movement (0.01 - 0.05)
    }
}

export class BotService {
    private bots: Map<string, Bot[]> = new Map(); // roomId -> bots

    public addBots(roomId: string, team: string, count: number, engine: BaseGameEngine<any>): void {
        const roomBots: Bot[] = [];
        for (let i = 0; i < count; i++) {
            const botId = `bot-${roomId}-${team}-${i}`;
            
            // Generate unique personality for each bot
            const bot: Bot = { 
                id: botId, 
                team, 
                roomId,
                traits: {
                    errorOffset: (Math.random() - 0.5) * 60, // -30 to +30 pixels
                    reactionChance: 0.1 + Math.random() * 0.15, // 10% to 25% chance to act per tick
                    jitter: Math.random() * 0.05
                }
            };
            
            roomBots.push(bot);
            engine.addPlayer(botId, team);
        }
        
        const existing = this.bots.get(roomId) || [];
        this.bots.set(roomId, [...existing, ...roomBots]);
        logger.info({ roomId, team, count }, 'Added bots to room');
    }

    public removeBots(roomId: string): void {
        this.bots.delete(roomId);
    }

    public updateBots(roomId: string, engine: BaseGameEngine<any>): void {
        const roomBots = this.bots.get(roomId);
        if (!roomBots || roomBots.length === 0) return;

        const state = engine.getState() as any;
        const gameType = engine.getMetadata().id;

        for (const bot of roomBots) {
            const action = this.calculateInput(bot, state, gameType);
            if (action) {
                engine.handleInput(bot.id, bot.team, action);
            }
        }
    }

    private calculateInput(bot: Bot, state: any, gameType: string): string {
        // Simple AI logic per game type
        try {
            switch (gameType) {
                case 'paddle-battle':
                    return this.getPaddleBattleInput(bot, state);
                case 'brick-burst':
                    return this.getBrickBurstInput(bot, state);
                case 'vipers':
                    return this.getVipersInput(bot, state);
                default:
                    return Math.random() > 0.5 ? 'up' : 'down';
            }
        } catch (err) {
            return '';
        }
    }

    private getPaddleBattleInput(bot: Bot, state: any): string {
        if (!state.ball) return '';

        // Each bot independently decides whether to react this tick
        if (Math.random() > bot.traits.reactionChance) return '';

        // Random jitter: bot sends a random direction regardless of ball
        if (Math.random() < bot.traits.jitter) {
            return Math.random() > 0.5 ? 'up' : 'down';
        }

        const ballY = state.ball.y;
        const ballVx = state.ball.vx || 0;

        const team = state.teams?.[bot.team];
        if (!team) return '';

        const paddleY = team.paddleY !== undefined ? team.paddleY : team.y;
        const paddleHeight = team.paddleHeight || 80;
        const paddleCenter = paddleY + paddleHeight / 2;

        // Only react when ball is heading towards this bot's side
        const isLeft = bot.team === 'left';
        const ballApproaching = isLeft ? ballVx < 0 : ballVx > 0;
        if (!ballApproaching && Math.random() > 0.3) {
            // Ball is going away — most bots idle, some drift randomly
            return '';
        }

        // Each bot targets a slightly different spot (errorOffset)
        const targetY = ballY + bot.traits.errorOffset;
        const threshold = 10 + Math.random() * 20; // 10-30px dead zone per bot

        if (targetY < paddleCenter - threshold) return 'up';
        if (targetY > paddleCenter + threshold) return 'down';
        return '';
    }

    private getBrickBurstInput(bot: Bot, state: any): string {
        const balls = state.balls || [];
        if (balls.length === 0) return '';

        if (Math.random() > bot.traits.reactionChance) return '';

        if (Math.random() < bot.traits.jitter) {
            return Math.random() > 0.5 ? 'left' : 'right';
        }

        // Each bot targets the ball belonging to its team
        const myBall = balls.find((b: any) => b.teamId === bot.team);
        if (!myBall) return '';

        const ballX = myBall.x;
        const team = state.teams?.[bot.team];
        if (!team) return '';

        const paddleCenter = team.paddleX + 50; // 100/2

        // Each bot targets a slightly different spot
        const targetX = ballX + bot.traits.errorOffset;
        const threshold = 10 + Math.random() * 20;

        if (targetX < paddleCenter - threshold) return 'left';
        if (targetX > paddleCenter + threshold) return 'right';
        return '';
    }


    private getVipersInput(bot: Bot, state: any): string {
        // Each bot independently decides whether to act
        if (Math.random() > bot.traits.reactionChance) return '';

        const team = state.teams?.[bot.team];
        if (!team || !team.body || team.body.length === 0) return '';
        
        const head = team.body[0];
        const food = state.food;
        if (!food) return '';

        // Jitter: random direction
        if (Math.random() < bot.traits.jitter) {
            const actions = ['up', 'down', 'left', 'right'];
            return actions[Math.floor(Math.random() * actions.length)];
        }

        // Move towards food, but with offset bias
        const dx = food.x - head.x + bot.traits.errorOffset * 0.1;
        const dy = food.y - head.y + bot.traits.errorOffset * 0.1;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0 && team.direction.x === 0) return 'left';
            if (dx > 0 && team.direction.x === 0) return 'right';
        } else {
            if (dy < 0 && team.direction.y === 0) return 'up';
            if (dy > 0 && team.direction.y === 0) return 'down';
        }
        
        return '';
    }

}
