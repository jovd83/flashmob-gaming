/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../shared/constants.js';
import { renderPaddleBattle } from '../renderers/renderPaddleBattle.js';
import { renderVipers } from '../renderers/renderVipers.js';
import { renderBrickBurst } from '../renderers/renderBrickBurst.js';
import JoinQR from './JoinQR.js';
import ActivityLog from './ActivityLog.js';
import GameTelemetryPanel from './GameTelemetryPanel.js';
import { Room } from '../../shared/types.js';
import './PresenterStyles.css';

import { resolvePalette } from '../../shared/constants.js';


const PresenterView: React.FC = () => {
    const { socket } = useSocket();
    const { roomId = 'default' } = useParams<{ roomId: string }>();
    const [room, setRoom] = useState<Room | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!socket) return;

        const fetchRoom = async () => {
            const res = await fetch('/api/rooms');
            if (res.ok) {
                const rooms = await res.json();
                const found = rooms.find((r: any) => r.id === roomId);
                if (found) setRoom(found);
            }
        };
        fetchRoom();

        // Join the room to receive game state
        socket.emit('join-room', roomId);

        const handleGameState = (state: any) => {
            setGameState(state);
        };
        socket.on('game-state', handleGameState);

        return () => {
            socket.off('game-state', handleGameState);
        };
    }, [roomId, socket]);

    // Render the game canvas inline (no full-screen GameView component)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameState) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gameType = gameState.gameType || 'paddle-battle';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x < canvas.width; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        switch (gameType) {
            case 'paddle-battle': renderPaddleBattle(ctx, gameState, canvas); break;
            case 'vipers': renderVipers(ctx, gameState); break;
            case 'brick-burst': renderBrickBurst(ctx, gameState, canvas); break;
        }

        // Overlays
        const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
        const FONT_PRIMARY = '900 72px "Outfit", sans-serif';
        const FONT_SECONDARY = '700 28px "Outfit", sans-serif';
        const FONT_COUNTDOWN = '900 120px "Outfit", sans-serif';
        const COLOR_ACCENT = '#00ffcc';
        const COLOR_WARNING = '#fbbf24';

        if (gameState.status === 'goal') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.shadowBlur = 20 + pulse * 20;
            ctx.shadowColor = COLOR_ACCENT;
            ctx.fillStyle = COLOR_ACCENT;
            ctx.font = FONT_PRIMARY;
            ctx.textAlign = 'center';
            ctx.fillText('GOAL!', canvas.width / 2, canvas.height / 2);
        }

        if (gameState.status === 'countdown' && gameState.countdown !== undefined) {
            // Seethrough glass effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(0, canvas.height / 2 - 120, canvas.width, 240);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeRect(-1, canvas.height / 2 - 120, canvas.width + 2, 240);

            ctx.shadowBlur = 40 + pulse * 20;
            ctx.shadowColor = COLOR_ACCENT;
            ctx.fillStyle = COLOR_ACCENT;
            ctx.textAlign = 'center';

            // Level Text
            if (gameState.level) {
                ctx.font = FONT_SECONDARY;
                ctx.fillText(`LEVEL ${gameState.level}`, canvas.width / 2, canvas.height / 2 - 60);
            }

            // Countdown Number
            ctx.font = FONT_COUNTDOWN;
            const displayValue = gameState.countdown > 0 ? gameState.countdown.toString() : 'GO!';
            ctx.fillText(displayValue, canvas.width / 2, canvas.height / 2 + 60);
        }
        if (gameState.status === 'ending' && gameState.countdown !== undefined) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = COLOR_WARNING;
            ctx.font = FONT_SECONDARY;
            ctx.fillText('MATCH ENDING IN', canvas.width / 2, canvas.height / 2 - 80);
            ctx.shadowBlur = 30 + pulse * 30;
            ctx.shadowColor = COLOR_WARNING;
            ctx.font = FONT_COUNTDOWN;
            ctx.fillText(gameState.countdown.toString(), canvas.width / 2, canvas.height / 2 + 60);
        }
        if (gameState.status === 'finished') {
            ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = FONT_PRIMARY;
            ctx.textAlign = 'center';
            ctx.fillText('MISSION COMPLETE', canvas.width / 2, canvas.height / 2 - 40);
            ctx.font = FONT_SECONDARY;
            ctx.fillStyle = COLOR_ACCENT;
            ctx.fillText('Check scoreboard for results', canvas.width / 2, canvas.height / 2 + 40);
        }
        ctx.shadowBlur = 0;

        // Player Counts - aligned in the corners
        const allTeams = Object.values(gameState.teams || gameState.entities || {}) as any[];
        
        if (allTeams.length > 0) {
            ctx.font = '900 22px "Outfit", sans-serif';
            ctx.shadowBlur = 15;

            allTeams.forEach((team, idx) => {
                const count = team.players?.length || 0;
                const teamColor = team.color || '#ffffff';
                ctx.fillStyle = teamColor;
                ctx.shadowColor = teamColor;
                
                if (idx === 0) {
                    // First team count: top-left corner
                    ctx.textAlign = 'left';
                    ctx.fillText(`${count} Players`, 24, 35);
                } else if (idx === 1) {
                    // Second team count: top-right corner
                    ctx.textAlign = 'right';
                    ctx.fillText(`${count} Players`, canvas.width - 24, 35);
                }
            });
        }

        ctx.shadowBlur = 0;
    }, [gameState]);

    const palette = resolvePalette(room);

    // Extract team data for the scoreboard
    const teams = gameState?.teams ? Object.values(gameState.teams) as any[] : [];

    return (
        <div className="presenter-main" style={{
            '--palette-primary': palette.primary,
            '--palette-secondary': palette.secondary,
            '--palette-primary-glow': palette.primaryGlow,
            '--palette-secondary-glow': palette.secondaryGlow
        } as React.CSSProperties}>
            <div className="presenter-bg" />
            <div className="presenter-grid" />

            {/* Top HUD */}
            <header className="hud-top">
                <div className="hud-logo">
                    <span className="hud-title">FlashMob Broadcasting</span>
                    <span className="hud-room">{room?.name || 'Loading Node...'} // {roomId.toUpperCase()}</span>
                </div>

                <div className="hud-status-pill">
                    <span className="status-dot" style={{
                        background: gameState?.status === 'playing' ? palette.primary : 'rgba(255,255,255,0.2)',
                        boxShadow: gameState?.status === 'playing' ? `0 0 8px ${palette.primary}` : 'none'
                    }} />
                    <span className="status-label" style={{
                        color: gameState?.status === 'playing' ? palette.primary : 'rgba(255,255,255,0.4)'
                    }}>
                        {gameState?.status?.toUpperCase() || 'IDLE'}
                    </span>
                </div>
            </header>

            {/* Content Grid */}
            <div className="presenter-content">
                {/* Left: Game Field */}
                <div className="presenter-game-col">
                    <div className="game-frame">
                        <canvas
                            ref={canvasRef}
                            width={GAME_WIDTH}
                            height={GAME_HEIGHT}
                            className="presenter-canvas"
                        />
                    </div>
                </div>

                {/* Right: Sidebar */}
                <aside className="presenter-sidebar">
                    {/* Score Panel */}
                    <div className="sidebar-panel score-panel">
                        <div className="hud-label">Scoreboard</div>
                        <div className="score-grid">
                            {teams.map((team: any) => (
                                <div key={team.id} className="score-team">
                                    <span className="score-team-name" style={{ color: team.color }}>
                                        {team.name || team.id}
                                    </span>
                                    <span className="score-team-value" style={{
                                        color: team.color,
                                        textShadow: `0 0 20px ${team.color}66`
                                    }}>
                                        {team.score}
                                    </span>
                                </div>
                            ))}
                            {teams.length === 0 && (
                                <div className="score-team">
                                    <span className="score-team-name" style={{ color: 'rgba(255,255,255,0.3)' }}>Awaiting data...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Game Telemetry Panel — universal across all game types */}
                    <GameTelemetryPanel gameState={gameState} palette={palette} />

                    {/* QR Codes Panel */}
                    <div className="sidebar-panel qr-panel">
                        <div className="hud-label">Join Portals</div>
                        <div className="qr-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                            {room?.metadata?.requiredTeams?.map((team: any) => (
                                <JoinQR key={team.id} side={team.id} minimal />
                            ))}
                        </div>
                    </div>

                    {/* Activity Log Panel */}
                    <div className="sidebar-panel log-panel">
                        <div className="hud-label">Live Transmission</div>
                        <div className="log-scroll-area">
                            <ActivityLog _roomId={roomId} palette={palette} limit={15} compact />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PresenterView;
