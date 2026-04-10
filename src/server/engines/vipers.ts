/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { BaseGameEngine, GameEngineConfig } from './base-engine.js';
import { PALETTES } from '../../shared/constants.js';
import { logger } from '../utils/logger.js';
import { BaseEngineState } from '../../shared/types.js';

interface Point {
    x: number;
    y: number;
}

interface VipersTeam {
    id: string;
    name: string;
    color: string;
    body: Point[];
    direction: Point;
    nextDirection: Point;
    score: number;
    players: string[];
    inputs: { up: number; down: number; left: number; right: number };
    lastTickInputs: { up: number; down: number; left: number; right: number; winner: string };
}

export interface VipersState extends BaseEngineState {
    width: number;
    height: number;
    gridSize: number;
    teams: { [key: string]: VipersTeam };
    food: Point;
    status: 'playing' | 'paused' | 'goal' | 'ending' | 'finished' | 'waiting' | 'countdown';
    gameType: string;
}

export class VipersEngine extends BaseGameEngine<VipersState> {
    private state: VipersState;
    private tickCounter = 0;
    private tickRate = 8; // Game speed (frames per viper move)

    constructor(config: Partial<GameEngineConfig> = {}) {
        super(config);
        const gridSize = 20;
        const cols = Math.floor(this.width / gridSize);
        const rows = Math.floor(this.height / gridSize);
        
        const p = PALETTES[this.palette] || PALETTES['cyber-cyan'];

        this.state = {
            width: this.width,
            height: this.height,
            gridSize,
            gameType: 'vipers',
            teams: {
                left: this.createTeam('left', p.primary, { x: 0, y: 0 }, { x: 1, y: 0 }),
                right: this.createTeam('right', p.secondary, { x: 0, y: 0 }, { x: -1, y: 0 }),
            },
            food: { x: Math.floor(cols/2), y: Math.floor(rows/2) },
            status: 'waiting'
        };

        this.status = 'waiting';
        this.resetVipers();
    }

    private resetVipers() {
        const gridSize = this.state.gridSize;
        const cols = Math.floor(this.width / gridSize);
        const rows = Math.floor(this.height / gridSize);

        const leftTeam = this.state.teams['left'];
        if (leftTeam) {
            const head = { x: 5, y: Math.floor(rows/2) };
            const dir = { x: 1, y: 0 };
            leftTeam.body = [head, { x: head.x - dir.x, y: head.y - dir.y }, { x: head.x - dir.x * 2, y: head.y - dir.y * 2 }];
            leftTeam.direction = dir;
            leftTeam.nextDirection = dir;
        }

        const rightTeam = this.state.teams['right'];
        if (rightTeam) {
            const head = { x: cols - 6, y: Math.floor(rows/2) };
            const dir = { x: -1, y: 0 };
            rightTeam.body = [head, { x: head.x - dir.x, y: head.y - dir.y }, { x: head.x - dir.x * 2, y: head.y - dir.y * 2 }];
            rightTeam.direction = dir;
            rightTeam.nextDirection = dir;
        }

        this.spawnFood();
    }

    private createTeam(id: string, color: string, head: Point, dir: Point): VipersTeam {
        const defaultName = id === 'left' ? 'Alpha Serpent' : 'Omega Serpent';
        return {
            id,
            name: this.teamNames?.[id] || defaultName,
            color,
            body: [head, { x: head.x - dir.x, y: head.y - dir.y }, { x: head.x - dir.x * 2, y: head.y - dir.y * 2 }],
            direction: dir,
            nextDirection: dir,
            score: 0,
            players: [],
            inputs: { up: 0, down: 0, left: 0, right: 0 },
            lastTickInputs: { up: 0, down: 0, left: 0, right: 0, winner: 'none' }
        };
    }

    public update() {
        try {
            // Initial transition from waiting to countdown
            if (this.status === 'waiting' && this.isReady()) {
                this.startCountdown(3);
            }

            // Handle countdown ticking
            if (this.tickCountdown()) {
                this.syncState();
                return;
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

            this.tickCounter++;
            if (this.tickCounter < this.tickRate) {
                this.syncState();
                return;
            }
            this.tickCounter = 0;

            // Process Collective Inputs
            Object.values(this.state.teams).forEach(team => {
                const { up, down, left, right } = team.inputs;
                const max = Math.max(up, down, left, right);
                
                // Determine winning direction
                let winner = 'none';
                if (max > 0) {
                    let newDir = team.direction;
                    if (up === max && team.direction.y === 0) { newDir = { x: 0, y: -1 }; winner = 'up'; }
                    else if (down === max && team.direction.y === 0) { newDir = { x: 0, y: 1 }; winner = 'down'; }
                    else if (left === max && team.direction.x === 0) { newDir = { x: -1, y: 0 }; winner = 'left'; }
                    else if (right === max && team.direction.x === 0) { newDir = { x: 1, y: 0 }; winner = 'right'; }
                    team.nextDirection = newDir;
                }

                // Snapshot inputs for telemetry
                team.lastTickInputs = { up, down, left, right, winner };

                // Reset inputs for next decision window
                team.inputs = { up: 0, down: 0, left: 0, right: 0 };
            });

            // Move vipers
            Object.values(this.state.teams).forEach(team => {
                if (team.body.length === 0) return;
                
                team.direction = team.nextDirection;
                const head = { 
                    x: team.body[0].x + team.direction.x, 
                    y: team.body[0].y + team.direction.y 
                };

                // Wrap around logic
                const cols = Math.floor(this.width / this.state.gridSize);
                const rows = Math.floor(this.height / this.state.gridSize);
                head.x = (head.x + cols) % cols;
                head.y = (head.y + rows) % rows;

                // Check Food
                if (head.x === this.state.food.x && head.y === this.state.food.y) {
                    team.score++;
                    this.spawnFood();
                    this.emit('eat', { team: team.id, teamName: team.name, score: team.score });
                } else {
                    team.body.pop();
                }
                team.body.unshift(head);
            });

            // Collision Detection
            let collisionOccurred = false;
            const crashedTeams: string[] = [];

            Object.values(this.state.teams).forEach(team => {
                if (team.body.length === 0) return;
                const head = team.body[0];
                
                // Check against ALL vipers (including self)
                Object.values(this.state.teams).forEach(otherTeam => {
                    const startIndex = (team.id === otherTeam.id) ? 1 : 0; // Skip head if self-checking
                    for (let i = startIndex; i < otherTeam.body.length; i++) {
                        const segment = otherTeam.body[i];
                        if (segment && head.x === segment.x && head.y === segment.y) {
                            collisionOccurred = true;
                            if (!crashedTeams.includes(team.id)) {
                                crashedTeams.push(team.id);
                            }
                        }
                    }
                });
            });

            if (collisionOccurred) {
                crashedTeams.forEach(crashedTeamId => {
                    this.emit('hit', { team: crashedTeamId, teamName: this.state.teams[crashedTeamId].name, type: 'crash' });
                    // Award 10 points to the opposite team
                    Object.keys(this.state.teams).forEach(teamId => {
                        if (teamId !== crashedTeamId) {
                            this.state.teams[teamId].score += 10;
                        }
                    });
                });
                this.resetVipers();
                this.startCountdown(3);
            }
            this.syncState();
        } catch (error: unknown) {
            logger.error({ error }, '[VipersEngine] Update Error');
            if (this.state) {
                this.resetVipers(); 
            }
        }
    }

    private syncState() {
        this.state.status = this.status as any;
        this.state.countdown = this.countdownValue;
    }

    private spawnFood() {
        const cols = Math.floor(this.width / this.state.gridSize);
        const rows = Math.floor(this.height / this.state.gridSize);
        this.state.food = {
            x: Math.floor(Math.random() * cols),
            y: Math.floor(Math.random() * rows)
        };
    }

    public getState(): VipersState {
        return this.state;
    }

    public handleInput(playerId: string, teamId: string, action: string) {
        // Allow input during playing and countdown
        if (this.status !== 'playing' && this.status !== 'countdown') return;
        const team = this.state.teams[teamId];
        if (!team) return;

        if (action === 'up') team.inputs.up++;
        else if (action === 'down') team.inputs.down++;
        else if (action === 'left') team.inputs.left++;
        else if (action === 'right') team.inputs.right++;
    }

    public addPlayer(playerId: string, teamId: string) {
        const team = this.state.teams[teamId];
        if (team) team.players.push(playerId);
    }

    public removePlayer(playerId: string) {
        Object.values(this.state.teams).forEach(team => {
            team.players = team.players.filter(id => id !== playerId);
        });
    }

    public isReady(): boolean {
        return Object.values(this.state.teams).every(t => t.players.length > 0);
    }

    public getMetadata() {
        const p = PALETTES[this.palette] || PALETTES['cyber-cyan'];
        return {
            id: 'vipers',
            name: 'Vipers',
            requiredTeams: [
                { id: 'left', name: this.teamNames?.['left'] || this.teamNames?.['alpha'] || 'Alpha Serpent', color: p.primary },
                { id: 'right', name: this.teamNames?.['right'] || this.teamNames?.['omega'] || 'Omega Serpent', color: p.secondary }
            ]
        };
    }

    public reset() {
        this.resetScore();
    }

    public resetPositions() {
        this.resetVipers();
        this.startCountdown(3);
    }

    public resetScore() {
        Object.values(this.state.teams).forEach(team => {
            team.score = 0;
        });
        this.resetVipers();
        this.startCountdown(3);
    }
}
