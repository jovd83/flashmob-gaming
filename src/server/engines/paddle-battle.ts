/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { 
    PADDLE_WIDTH, 
    PADDLE_HEIGHT, 
    PADDLE_OFFSET, 
    BALL_RADIUS, 
    INITIAL_BALL_SPEED, 
    ACCELERATION_FACTOR,
    PALETTES
} from '../../shared/constants.js';
import { BaseGameEngine, GameEngineConfig } from './base-engine.js';
import { GameConfig, BaseEngineState } from '../../shared/types.js';

export interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

interface PaddleBattleTeam {
    side: 'left' | 'right';
    name: string;
    color: string;
    score: number;
    paddleY: number;
    paddleHeight: number;
    paddleWidth: number;
    players: string[];
    tickInputs: { up: number; down: number };
    lastTickInputs: { up: number; down: number; outcome: number };
    windowInputs: { up: number; down: number; count: number };
}

export interface PaddleBattleState extends BaseEngineState {
    ball: Ball;
    teams: {
        left: PaddleBattleTeam;
        right: PaddleBattleTeam;
    };
    width: number;
    height: number;
    status: 'playing' | 'paused' | 'goal' | 'ending' | 'finished' | 'waiting' | 'countdown';
    config: GameConfig;
    countdown?: number;
    gameType: string;
}

export class PaddleBattleEngine extends BaseGameEngine<PaddleBattleState> {
    private state: PaddleBattleState;
    private endTimer: NodeJS.Timeout | null = null;

    constructor(config: Partial<GameEngineConfig> = {}) {
        super(config);
        const p = PALETTES[this.palette] || PALETTES['cyber-cyan'];
        this.state = {
            width: this.width,
            height: this.height,
            status: 'waiting',
            gameType: 'paddle-battle',
            ball: {
                x: this.width / 2,
                y: this.height / 2,
                vx: INITIAL_BALL_SPEED,
                vy: INITIAL_BALL_SPEED,
                radius: BALL_RADIUS,
            },
            teams: {
                left: this.createTeam('left', p.primary),
                right: this.createTeam('right', p.secondary),
            },
            config: {
                ballSpeed: INITIAL_BALL_SPEED,
                accelerationFactor: ACCELERATION_FACTOR,
                paddleHeight: PADDLE_HEIGHT,
            },
            countdown: 0
        };
        this.status = 'waiting';
    }

    public getMetadata() {
        const p = PALETTES[this.palette] || PALETTES['cyber-cyan'];
        return {
            id: 'paddle-battle',
            name: 'Paddle Battle',
            requiredTeams: [
                { id: 'left', name: this.state.teams['left'].name, color: p.primary },
                { id: 'right', name: this.state.teams['right'].name, color: p.secondary }
            ]
        };
    }

    private createTeam(side: 'left' | 'right', color: string): PaddleBattleTeam {
        const defaultName = side === 'left' ? 'Alpha Squad' : 'Omega Squad';
        return {
            side,
            name: this.teamNames?.[side] || defaultName,
            color,
            score: 0,
            paddleY: this.height / 2 - PADDLE_HEIGHT / 2,
            paddleHeight: PADDLE_HEIGHT,
            paddleWidth: PADDLE_WIDTH,
            players: [],
            tickInputs: { up: 0, down: 0 },
            lastTickInputs: { up: 0, down: 0, outcome: 0 },
            windowInputs: { up: 0, down: 0, count: 0 }
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

        const currentStatus = this.getStatus();
        if (currentStatus === 'playing' || currentStatus === 'ending' || currentStatus === 'goal') {
            this.movePaddles();
        }

        if (currentStatus !== 'playing') {
            this.syncState();
            return;
        }
        
        if (!this.isReady()) {
            this.status = 'waiting';
            this.syncState();
            return;
        }

        const { ball, teams, width, height } = this.state;

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= height) {
            ball.vy *= -1;
        }

        this.checkPaddleCollision(teams.left);
        this.checkPaddleCollision(teams.right);

        if (ball.x <= 0) {
            this.handleGoal('right');
        } else if (ball.x >= width) {
            this.handleGoal('left');
        }

        this.syncState();
    }

    private syncState() {
        this.state.status = this.status;
        this.state.countdown = this.countdownValue;
    }

    private movePaddles() {
        ['left', 'right'].forEach(side => {
            const team = this.state.teams[side as 'left' | 'right'];
            const playerCount = Math.max(1, team.players.length);
            const netInputs = team.tickInputs.up - team.tickInputs.down;
            const baseSpeed = 20;
            const movement = (netInputs / playerCount) * baseSpeed;
            
            team.lastTickInputs = { 
                up: team.tickInputs.up, 
                down: team.tickInputs.down, 
                outcome: netInputs / playerCount 
            };

            team.windowInputs.up += team.tickInputs.up;
            team.windowInputs.down += team.tickInputs.down;
            team.windowInputs.count++;

            if (team.windowInputs.count >= 60) {
                team.windowInputs.up = 0;
                team.windowInputs.down = 0;
                team.windowInputs.count = 0;
            }

            team.paddleY = Math.max(0, Math.min(this.state.height - team.paddleHeight, team.paddleY - movement));
            team.tickInputs.up = 0;
            team.tickInputs.down = 0;
        });
    }

    private checkPaddleCollision(team: PaddleBattleTeam) {
        const { ball, width } = this.state;
        const isLeft = team.side === 'left';
        const paddleBoundX = isLeft ? PADDLE_OFFSET + team.paddleWidth : width - PADDLE_OFFSET - team.paddleWidth;
        
        const inRangeX = isLeft 
            ? (ball.x - ball.radius <= paddleBoundX && ball.x + ball.radius >= PADDLE_OFFSET)
            : (ball.x + ball.radius >= paddleBoundX && ball.x - ball.radius <= width - PADDLE_OFFSET);

        if (inRangeX && ball.y >= team.paddleY && ball.y <= team.paddleY + team.paddleHeight) {
            const oldSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const acc = this.state.config.accelerationFactor || ACCELERATION_FACTOR;
            ball.vx *= -acc;
            ball.vy *= acc;
            const hitPos = (ball.y - (team.paddleY + team.paddleHeight / 2)) / (team.paddleHeight / 2);
            ball.vy += hitPos * 2;
            ball.x = isLeft ? paddleBoundX + ball.radius : paddleBoundX - ball.radius;

            const newSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            this.emit('hit', { team: team.side, teamName: team.name, speed: newSpeed });

            // Logic for speed-up levels
            const thresholds = [7, 10, 13, 16, 20];
            const crossed = thresholds.find(t => oldSpeed < t && newSpeed >= t);
            if (crossed) {
                this.emit('speed-up', { speed: newSpeed, level: crossed });
            }
        }
    }

    private handleGoal(winner: 'left' | 'right') {
        this.state.teams[winner].score++;
        this.status = 'goal';
        this.syncState();
        this.emit('goal', { winner, teamName: this.state.teams[winner].name });
    }

    public handleInput(playerId: string, teamId: string, action: string) {
        // Allow input during playing, ending, goal, and countdown
        if (this.status !== 'playing' && this.status !== 'ending' && this.status !== 'goal' && this.status !== 'countdown') return;
        const team = this.state.teams[teamId as 'left' | 'right'];
        if (!team) return;

        if (action === 'up') {
            team.tickInputs.up++;
        } else if (action === 'down') {
            team.tickInputs.down++;
        }
    }

    public addPlayer(socketId: string, teamId: string) {
        const team = this.state.teams[teamId as 'left' | 'right'];
        if (team) {
            team.players.push(socketId);
        }
    }

    public removePlayer(socketId: string) {
        const remove = (team: PaddleBattleTeam) => {
            team.players = team.players.filter(id => id !== socketId);
        };
        remove(this.state.teams.left);
        remove(this.state.teams.right);
    }

    public getState(): PaddleBattleState {
        return this.state;
    }

    public isReady(): boolean {
        return this.state.teams.left.players.length > 0 && this.state.teams.right.players.length > 0;
    }

    public resetBall() {
        this.state.ball.x = this.state.width / 2;
        this.state.ball.y = this.state.height / 2;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const speed = this.state.config.ballSpeed || INITIAL_BALL_SPEED;
        this.state.ball.vx = speed * direction;
        this.state.ball.vy = (Math.random() * 2 - 1) * speed;
        this.startCountdown(3);
    }

    public startEndGame() {
        this.status = 'ending';
        this.countdownValue = 10;
        this.syncState();
        if (this.endTimer) clearInterval(this.endTimer);
        
        this.endTimer = setInterval(() => {
            if (this.countdownValue > 0) {
                this.countdownValue--;
                this.syncState();
            } else {
                this.status = 'finished';
                this.countdownValue = 0;
                this.syncState();
                if (this.endTimer) {
                    clearInterval(this.endTimer);
                    this.endTimer = null;
                }
            }
        }, 1000);
    }

    public reset() {
        this.resetScore();
    }

    public resetPositions() {
        this.resetBall();
    }

    public resetScore() {
        this.state.teams.left.score = 0;
        this.state.teams.right.score = 0;
        this.resetBall();
    }

    public override destroy() {
        if (this.endTimer) {
            clearInterval(this.endTimer);
            this.endTimer = null;
        }
        super.destroy();
    }

    public updateConfig(config: Partial<GameConfig>) {
        if (config.ballSpeed !== undefined) this.state.config.ballSpeed = config.ballSpeed;
        if (config.accelerationFactor !== undefined) this.state.config.accelerationFactor = config.accelerationFactor;
        if (config.paddleHeight !== undefined) {
            this.state.config.paddleHeight = config.paddleHeight;
            this.state.teams.left.paddleHeight = config.paddleHeight;
            this.state.teams.right.paddleHeight = config.paddleHeight;
        }
    }
}
