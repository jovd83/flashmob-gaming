/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { BaseGameEngine, GameEngineConfig } from './base-engine.js';
import { PALETTES, resolvePalette } from '../../shared/constants.js';
import { BaseEngineState } from '../../shared/types.js';

interface Brick {
    x: number;
    y: number;
    width: number;
    height: number;
    active: boolean;
    color: string;
}

const BRICK_POINTS = 10;
const PENALTY_POINTS = BRICK_POINTS * 5;


interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    teamId: string;
    color: string;
}

interface BrickBurstTeam {
    id: string;
    name: string;
    color: string;
    paddleX: number;
    score: number;
    players: string[];
    tickInputs: { left: number; right: number };
    lastTickInputs: { left: number; right: number; outcome: number };
}

export interface BrickBurstState extends BaseEngineState {
    teams: { [key: string]: BrickBurstTeam };
    balls: Ball[];
    bricks: Brick[];
    level: number;
    status: 'playing' | 'paused' | 'goal' | 'ending' | 'finished' | 'waiting' | 'countdown';
    gameType: string;
    countdown?: number;
}

export class BrickBurstEngine extends BaseGameEngine<BrickBurstState> {
    private state: BrickBurstState;

    constructor(config: Partial<GameEngineConfig> = {}) {
        super(config);
        const p = resolvePalette(this);
        this.status = 'waiting';
        this.state = {
            gameType: 'brick-burst',
            teams: {
                left: this.createTeam('left', 0, 400, p.primary),
                right: this.createTeam('right', 400, 800, p.secondary)
            },
            balls: [
                { x: 200, y: 300, vx: 3, vy: -3, radius: 8, teamId: 'left', color: p.primary },
                { x: 600, y: 300, vx: -3, vy: -3, radius: 8, teamId: 'right', color: p.secondary }
            ],
            bricks: this.initBricks(1),
            level: 1,
            status: 'waiting'
        };
    }

    private initBricks(level: number = 1): Brick[] {
        const bricks: Brick[] = [];
        const rows = Math.min(8, 4 + level);
        const cols = 12;
        const bWidth = (this.width / cols) - 10;
        const bHeight = 20;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                bricks.push({
                    x: c * (bWidth + 10) + 5,
                    y: 50 + r * (bHeight + 10),
                    width: bWidth,
                    height: bHeight,
                    active: true,
                    color: level === 1 ? '#ffffff' : level === 2 ? '#00f7ff' : level === 3 ? '#ff00ff' : '#fbbf24'
                });
            }
        }
        return bricks;
    }


    private createTeam(id: string, minX: number, maxX: number, color: string): BrickBurstTeam {
        const defaultName = id === 'left' ? 'Alpha Squad' : 'Omega Squad';
        return { 
            id, 
            name: this.teamNames?.[id] || defaultName,
            color, 
            paddleX: minX + (maxX - minX)/2 - 50, 
            score: 0, 
            players: [], 
            tickInputs: { left: 0, right: 0 }, 
            lastTickInputs: { left: 0, right: 0, outcome: 0 } 
        };
    }
    public update() {
        // Initial transition from waiting to countdown
        if (this.status === 'waiting' && this.isReady()) {
            this.startCountdown(3);
        }

        // Handle countdown ticking
        if (this.tickCountdown()) {
            this.movePaddles();
            this.syncState();
            return;
        }

        // Process accumulated inputs into paddle movement
        const currentStatus = this.getStatus();
        if (currentStatus === 'playing' || currentStatus === 'waiting' || currentStatus === 'countdown') {
            this.movePaddles();
        }

        if (this.status !== 'playing') {
            this.syncState();
            return;
        }

        if (!this.isReady()) {
            this.status = 'waiting';
            this.syncState();
            return;
        }
        this.state.balls.forEach(ball => {

            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall collisions
            if (ball.x <= 0 || ball.x >= this.width) ball.vx *= -1;
            if (ball.y <= 0) ball.vy *= -1;

            // Brick collisions (all balls can hit all bricks)
            this.state.bricks.forEach(brick => {
                if (brick.active && this.checkCollision(ball, brick)) {
                    brick.active = false;
                    ball.vy *= -1;
                    // The team associated with the ball gets the points
                    const scoringTeam = this.state.teams[ball.teamId];
                    if (scoringTeam) scoringTeam.score += BRICK_POINTS;
                    this.emit('hit', { team: ball.teamId, teamName: scoringTeam?.name, subType: 'brick' });
                    
                    // Ball speed increase over time
                    ball.vx *= 1.01;
                    ball.vy *= 1.01;
                }
            });

            // Paddle collision (Only bounce own color)
            Object.values(this.state.teams).forEach(team => {
                const paddle = { x: team.paddleX, y: this.height - 30, width: 100, height: 10 };
                if (ball.teamId === team.id && this.checkCollision(ball, paddle)) {
                    ball.vy *= -1;
                    // Add some variation based on hit position
                    const hitPos = (ball.x - (paddle.x + paddle.width/2)) / (paddle.width/2);
                    ball.vx += hitPos * 2;
                    this.emit('hit', { team: team.id, teamName: team.name, subType: 'paddle' });
                }
            });

            // Bottom collision (Reset/Loss)
            if (ball.y >= this.height) {
                // Award penalty points to the other team
                const otherTeamId = ball.teamId === 'left' ? 'right' : 'left';
                const otherTeam = this.state.teams[otherTeamId];
                if (otherTeam) otherTeam.score += PENALTY_POINTS;

                // Reset this specific ball
                this.resetBall(ball);
            }
        });

        // Level Completion Check
        const activeBricks = this.state.bricks.filter(b => b.active);
        if (this.state.bricks.length > 0 && activeBricks.length === 0) {
            this.nextLevel();
        }

        this.syncState();
    }

    private nextLevel() {
        this.state.level++;
        this.state.bricks = this.initBricks(this.state.level);
        
        // Boost ball speeds slightly for higher levels
        this.state.balls.forEach(ball => {
            this.resetBall(ball);
            const speedMultiplier = 1 + (this.state.level - 1) * 0.1;
            ball.vx *= speedMultiplier;
            ball.vy *= speedMultiplier;
        });

        this.emit('message', { text: `LEVEL ${this.state.level} LOADING...`, duration: 3000 });
        this.startCountdown(3);
    }

    private movePaddles() {
        Object.values(this.state.teams).forEach(team => {
            const playerCount = Math.max(1, team.players.length);
            const netInputs = team.tickInputs.right - team.tickInputs.left;
            const speed = 15;
            const movement = (netInputs / playerCount) * speed;

            team.lastTickInputs = {
                left: team.tickInputs.left,
                right: team.tickInputs.right,
                outcome: netInputs / playerCount
            };

            team.paddleX = Math.max(0, Math.min(this.width - 100, team.paddleX + movement));
            team.tickInputs = { left: 0, right: 0 };
        });
    }

    private syncState() {
        this.state.status = this.status as any;
        this.state.countdown = this.countdownValue;
    }

    private resetBall(ball: Ball) {
        ball.x = ball.teamId === 'left' ? 200 : 600;
        ball.y = 300;
        ball.vy = -3;
        ball.vx = ball.teamId === 'left' ? 3 : -3;
    }

    private checkCollision(ball: { x: number; y: number; radius: number }, rect: { x: number; y: number; width: number; height: number }) {
        return ball.x > rect.x && 
               ball.x < rect.x + (rect.width || 0) &&
               ball.y > rect.y &&
               ball.y < rect.y + (rect.height || 0);
    }

    public handleInput(playerId: string, teamId: string, action: string) {
        if (this.status !== 'playing' && this.status !== 'countdown' && this.status !== 'waiting') return;
        const team = this.state.teams[teamId];
        if (!team) return;
        if (action === 'left') team.tickInputs.left++;
        else if (action === 'right') team.tickInputs.right++;
    }

    public addPlayer(playerId: string, teamId: string) {
        const team = this.state.teams[teamId];
        if (team && !team.players.includes(playerId)) {
            team.players.push(playerId);
        }
    }

    public removePlayer(playerId: string) {
        Object.values(this.state.teams).forEach(team => {
            team.players = team.players.filter(id => id !== playerId);
        });
    }

    public getState(): BrickBurstState {
        return this.state;
    }

    public isReady(): boolean {
        const teams = Object.values(this.state.teams);
        if (teams.length < 2) return false;
        return teams.every(team => team.players.length > 0);
    }

    public getMetadata() {
        const p = resolvePalette(this);
        return {
            id: 'brick-burst',
            name: 'Brick Burst',
            requiredTeams: [
                { id: 'left', name: this.teamNames?.['left'] || 'Alpha Squad', color: p.primary },
                { id: 'right', name: this.teamNames?.['right'] || 'Omega Squad', color: p.secondary }
            ]
        };
    }
    public reset() {
        this.resetScore();
    }

    public resetPositions() {
        const p = resolvePalette(this);
        this.state.balls = [
            { x: 200, y: 300, vx: 3, vy: -3, radius: 8, teamId: 'left', color: p.primary },
            { x: 600, y: 300, vx: -3, vy: -3, radius: 8, teamId: 'right', color: p.secondary }
        ];
        this.startCountdown(3);
    }

    public resetScore() {
        const p = resolvePalette(this);
        this.state.teams = {
            left: this.createTeam('left', 0, 400, p.primary),
            right: this.createTeam('right', 400, 800, p.secondary)
        };
        this.state.level = 1;
        this.state.bricks = this.initBricks(1);
        this.resetPositions();
    }
}
