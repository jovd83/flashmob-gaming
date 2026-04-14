/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - Cinematic Virtual Room
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.js';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../../shared/constants.js';
import { renderPaddleBattle } from '../renderers/renderPaddleBattle.js';
import { renderVipers } from '../renderers/renderVipers.js';
import { renderBrickBurst } from '../renderers/renderBrickBurst.js';
import JoinQR from './JoinQR.js';
import { Room } from '../../shared/types.js';
import { resolvePalette } from '../../shared/constants.js';
import './CinematicRoomView.css';

const DEFAULT_LAYOUT_ELEMENTS = {
    projector: { x: 35, y: 25, width: 30, height: 30, visible: false },
    scoreboard: { x: 80, y: 75, width: 8, height: 10, visible: false },
    qrLeft: { x: 2, y: 2, width: 5, height: 8, visible: false },
    qrRight: { x: 93, y: 2, width: 5, height: 8, visible: false },
    telemetry: { x: 5, y: 82, width: 12, height: 8, visible: false }
};

const CinematicRoomView: React.FC = () => {
    const { socket } = useSocket();
    const { roomId = 'default' } = useParams<{ roomId: string }>();
    const [room, setRoom] = useState<Room | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;

        const fetchRoom = async () => {
            try {
                const res = await fetch('/api/rooms');
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
                const rooms = await res.json();
                const found = rooms.find((r: any) => r.id === roomId);
                if (found) {
                    setRoom(found);
                } else {
                    setError(`Room "${roomId}" not found.`);
                }
            } catch (err: any) {
                console.error('Room sync failed:', err);
                setError('Failed to synchronize room data.');
            }
        };
        fetchRoom();

        socket.emit('join-room', roomId);
        const handleGameState = (state: any) => setGameState(state);
        socket.on('game-state', handleGameState);

        return () => {
            socket.off('game-state', handleGameState);
        };
    }, [roomId, socket]);

    const renderOverlays = (ctx: CanvasRenderingContext2D, state: any, canvas: HTMLCanvasElement) => {
        const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
        const gameType = state.gameType || 'paddle-battle';
  
        // Consistent overlay font definitions
        const FONT_PRIMARY = '900 72px "Outfit", sans-serif';
        const FONT_SECONDARY = '700 28px "Outfit", sans-serif';
        const FONT_COUNTDOWN = '900 120px "Outfit", sans-serif';
        const COLOR_ACCENT = '#00ffcc';
        const COLOR_WARNING = '#fbbf24';
  
        if (state.status === 'goal') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(0, canvas.height / 2 - 100, canvas.width, 200);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.strokeRect(-1, canvas.height / 2 - 100, canvas.width + 2, 200);
          ctx.shadowBlur = 40 + pulse * 20;
          ctx.shadowColor = COLOR_ACCENT;
          ctx.fillStyle = COLOR_ACCENT;
          ctx.font = FONT_PRIMARY;
          ctx.textAlign = 'center';
          ctx.fillText('GOAL!', canvas.width / 2, canvas.height / 2);
        }
  
        if (state.status === 'countdown' && state.countdown !== undefined) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(0, canvas.height / 2 - 100, canvas.width, 200);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.strokeRect(-1, canvas.height / 2 - 100, canvas.width + 2, 200);
          ctx.shadowBlur = 40 + pulse * 20;
          ctx.shadowColor = COLOR_ACCENT;
          ctx.fillStyle = COLOR_ACCENT;
          ctx.font = FONT_COUNTDOWN;
          ctx.textAlign = 'center';
          const displayValue = state.countdown > 0 ? state.countdown.toString() : 'GO!';
          ctx.fillText(displayValue, canvas.width / 2, canvas.height / 2 + 40);
        }
  
        if (state.status === 'ending' && state.countdown !== undefined) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.textAlign = 'center';
          ctx.fillStyle = COLOR_WARNING;
          ctx.font = FONT_SECONDARY;
          ctx.fillText('MATCH ENDING IN', canvas.width / 2, canvas.height / 2 - 80);
          ctx.shadowBlur = 30 + pulse * 30;
          ctx.shadowColor = COLOR_WARNING;
          ctx.font = FONT_COUNTDOWN;
          ctx.fillText(state.countdown.toString(), canvas.width / 2, canvas.height / 2 + 60);
        }
  
        if (state.status === 'finished') {
          ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ffffff';
          ctx.font = FONT_PRIMARY;
          ctx.textAlign = 'center';
          ctx.fillText('MISSION COMPLETE', canvas.width / 2, canvas.height / 2 - 40);
          ctx.font = FONT_SECONDARY;
          ctx.fillStyle = COLOR_ACCENT;
          ctx.fillText('Check scoreboard for results', canvas.width / 2, canvas.height / 2 + 40);
        } else if (['playing', 'waiting'].includes(state.status) || gameType === 'paddle-battle') {
            const teams = state.teams || state.entities || {};
            const missingTeams: any[] = [];
            Object.values(teams).forEach((t: any) => {
                const hasPlayers = t.players && t.players.length > 0;
                if (!hasPlayers) {
                    missingTeams.push(t);
                }
            });
            if (missingTeams.length > 0) {
                const allMissing = missingTeams.length === Object.values(teams).length;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fillRect(0, canvas.height / 2 - 80, canvas.width, 160);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeRect(-1, canvas.height / 2 - 80, canvas.width + 2, 160);
                ctx.textAlign = 'center';
                (ctx as any).letterSpacing = '6px';
                ctx.shadowBlur = 10 + pulse * 15;
                if (allMissing) {
                    ctx.shadowColor = COLOR_ACCENT;
                    ctx.fillStyle = COLOR_ACCENT;
                    ctx.font = '900 36px "Outfit", sans-serif';
                    ctx.fillText('WAITING FOR PARTICIPANTS', canvas.width / 2, canvas.height / 2 - 10);
                    ctx.shadowBlur = 0;
                    (ctx as any).letterSpacing = '1px';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.font = '400 italic 20px "Outfit", sans-serif';
                    ctx.fillText('Scan QR code or use the link to jump in!', canvas.width / 2, canvas.height / 2 + 40);
                } else {
                    const joining = missingTeams.map(t => (t.side || t.name || t.id).toUpperCase()).join(' & ');
                    ctx.shadowColor = COLOR_WARNING;
                    ctx.fillStyle = COLOR_WARNING;
                    ctx.font = '900 36px "Outfit", sans-serif';
                    ctx.fillText(`JOIN TEAM: ${joining}`, canvas.width / 2, canvas.height / 2 - 10);
                    ctx.shadowBlur = 0;
                    (ctx as any).letterSpacing = '1px';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.font = '400 italic 20px "Outfit", sans-serif';
                    ctx.fillText('Game starts as soon as all teams are filled!', canvas.width / 2, canvas.height / 2 + 40);
                }
            }
        }
        
        // Corner Player Counts
        const teams = state.teams || state.entities || {};
        const teamList = Object.values(teams);
        ctx.font = '900 24px "Outfit", sans-serif';
        ctx.shadowBlur = 15;
        if (teamList.length > 0) {
          const t = teamList[0] as any;
          const count = t.players?.length || 0;
          const teamColor = t.color || COLORS.LEFT_TEAM;
          ctx.fillStyle = teamColor;
          ctx.shadowColor = teamColor;
          ctx.textAlign = 'left';
          ctx.fillText(`${count} Players`, 20, 35);
        }
        if (teamList.length > 1) {
          const t = teamList[1] as any;
          const count = t.players?.length || 0;
          const teamColor = t.color || COLORS.RIGHT_TEAM;
          ctx.fillStyle = teamColor;
          ctx.shadowColor = teamColor;
          ctx.textAlign = 'right';
          ctx.fillText(`${count} Players`, canvas.width - 20, 35);
        }
        ctx.shadowBlur = 0;
    };

    // Game Rendering Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameState) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gameType = gameState.gameType || 'paddle-battle';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Background / Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x < canvas.width; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // 2. Render specific engine
        switch (gameType) {
            case 'paddle-battle': renderPaddleBattle(ctx, gameState, canvas); break;
            case 'vipers': renderVipers(ctx, gameState); break;
            case 'brick-burst': renderBrickBurst(ctx, gameState, canvas); break;
        }

        // 3. Shared Overlays (Glassmorphism, countdows, etc.)
        renderOverlays(ctx, gameState, canvas);

    }, [gameState]);

    const [parallax, setParallax] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            const { beta, gamma } = e;
            if (beta === null || gamma === null) return;

            // Compute robust pitch that doesn't flip at 90 degrees for stable parallax
            const radB = (beta * Math.PI) / 180;
            const radG = (gamma * Math.PI) / 180;
            const gy = -Math.sin(radB) * Math.cos(radG);
            const gz = -Math.cos(radB) * Math.cos(radG);
            const pitch = Math.atan2(-gy, -gz) * (180 / Math.PI);

            // Smooth parallax effect: mapping device tilt to subtle pixel shifts
            // Centered around 45deg tilt (standard viewing angle)
            const targetX = Math.min(20, Math.max(-20, gamma * 0.3));
            const targetY = Math.min(20, Math.max(-20, (pitch - 45) * 0.3));
            setParallax({ x: targetX, y: targetY });
        };
        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black text-red-500 font-black tracking-widest gap-4">
                <div className="text-xl">SYNCHRONIZATION ERROR</div>
                <div className="text-sm opacity-50 font-mono">{error}</div>
            </div>
        );
    }

    const palette = room ? resolvePalette(room) : { primary: '#00ffcc', secondary: '#0066ff', primaryGlow: 'rgba(0, 255, 204, 0.4)', secondaryGlow: 'rgba(0, 102, 255, 0.4)' };
    const teams = (gameState && gameState.teams) ? Object.values(gameState.teams) as any[] : [];

    // Cache-stable background URL to prevent flicker. Fallback to default cinematic background if none specified.
    const backgroundUrl = (room?.cinematicLayout?.backgroundUrl && room.cinematicLayout.backgroundUrl !== '') 
        ? `${room.cinematicLayout.backgroundUrl}?v=${room.updatedAt || 'static'}` 
        : '/cinematic/bg.png';

    if (!room) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-blue-400 font-black tracking-widest animate-pulse">
                SYNCHRONIZING WITH NODE...
            </div>
        );
    }

    return (
        <div className="cinematic-root" style={{
            '--palette-primary': palette.primary,
            '--palette-secondary': palette.secondary,
            '--palette-primary-glow': palette.primaryGlow,
            '--palette-secondary-glow': palette.secondaryGlow
        } as React.CSSProperties}>
            <div 
                className="cinematic-bg" 
                style={{ 
                    backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
                    transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0) scale(1.05)`,
                    transition: 'transform 0.1s ease-out'
                }} 
            />
            
            {(!gameState) && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="text-blue-400 font-black tracking-[0.5em] animate-pulse">
                        INITIALIZING GAME STREAM...
                    </div>
                </div>
            )}
            <div className="cinematic-vignette" />
            <div className="cinematic-lighting" style={{
                transform: `translate3d(${parallax.x * 1.5}px, ${parallax.y * 1.5}px, 0)`,
                transition: 'transform 0.1s ease-out'
            }} />
            <div className="projector-beam" />

            {/* Main Game Screen (Projector) */}
            {(room.cinematicLayout?.elements?.projector?.visible) && (
                <div className="projector-screen" style={room.cinematicLayout ? {
                    top: `${room.cinematicLayout.elements.projector?.y ?? 25}%`,
                    left: `${room.cinematicLayout.elements.projector?.x ?? 35}%`,
                    width: `${room.cinematicLayout.elements.projector?.width ?? 30}%`,
                    height: `${room.cinematicLayout.elements.projector?.height ?? 30}%`
                } : {}}>
                    <canvas
                        ref={canvasRef}
                        width={GAME_WIDTH}
                        height={GAME_HEIGHT}
                    />
                </div>
            )}

            {(() => {
                const elem = room.cinematicLayout?.elements?.scoreboard || (room.cinematicLayout?.elements as any)?.tv;
                if (!elem || !elem.visible) return null;
                
                return (
                    <div className="retro-tv" style={{
                        top: `${elem.y ?? 75}%`,
                        left: `${elem.x ?? 80}%`,
                        width: `${elem.width ?? 8}%`,
                        height: `${elem.height ?? 10}%`
                    }}>
                        <div className="tv-content">
                            <div className="tv-scanlines" />
                            <div className="tv-flicker" />
                            <div className="tv-scores">
                                {teams.map((team: any) => (
                                    <div key={team.id} className="tv-team-score" style={{ color: team.color }}>
                                        <div className="tv-team-val">{team.score.toString().padStart(2, '0')}</div>
                                        <div className="tv-team-name">{team.name || team.id}</div>
                                    </div>
                                ))}
                                {teams.length === 0 && (
                                    <div className="text-[10px] text-white/30 uppercase tracking-tighter">No Teams Active</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Corner Join Portals */}
            <div className="qr-corners">
                {(room.cinematicLayout?.elements?.qrLeft?.visible) && (
                    <div className="corner-portal top-left" style={room.cinematicLayout ? {
                        top: `${room.cinematicLayout.elements.qrLeft?.y ?? 2}%`,
                        left: `${room.cinematicLayout.elements.qrLeft?.x ?? 2}%`,
                        width: `${room.cinematicLayout.elements.qrLeft?.width ?? 6}%`,
                        height: `${room.cinematicLayout.elements.qrLeft?.height ?? 9}%`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    } : {}}>
                        <JoinQR side="left" minimal />
                    </div>
                )}
                {(room.cinematicLayout?.elements?.qrRight?.visible) && (
                    <div className="corner-portal top-right" style={room.cinematicLayout ? {
                        top: `${room.cinematicLayout.elements.qrRight?.y ?? 2}%`,
                        left: `${room.cinematicLayout.elements.qrRight?.x ?? 92}%`,
                        width: `${room.cinematicLayout.elements.qrRight?.width ?? 6}%`,
                        height: `${room.cinematicLayout.elements.qrRight?.height ?? 9}%`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    } : {}}>
                        <JoinQR side="right" minimal />
                    </div>
                )}
            </div>

            {/* Telemetry Element */}
            {(room.cinematicLayout?.elements?.telemetry?.visible) && (
                <div className="telemetry-element" style={{
                    top: `${room.cinematicLayout.elements.telemetry?.y ?? 80}%`,
                    left: `${room.cinematicLayout.elements.telemetry?.x ?? 5}%`,
                    width: `${room.cinematicLayout.elements.telemetry?.width ?? 14}%`,
                    height: `${room.cinematicLayout.elements.telemetry?.height ?? 10}%`
                }}>
                    <div className="telemetry-inner">
                        <div className="telemetry-header">SYSTEM_NODE_TELEMETRY</div>
                        <div className="telemetry-stats">
                            <div className="stat-row"><span>FPS</span><span style={{ color: 'var(--palette-primary)' }}>60.0</span></div>
                            <div className="stat-row"><span>PING</span><span style={{ color: 'var(--palette-secondary)' }}>12ms</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Status */}
            <footer className="absolute bottom-4 left-8 text-[10px] text-white/20 font-mono tracking-widest uppercase flex items-center gap-4">
                <span>SYSTEM: {gameState?.gameType?.toUpperCase() || 'UNKNOWN'}</span>
                <span>STATUS: {gameState?.status?.toUpperCase() || 'SYNCHRONIZING'}</span>
                <span>ROOM: {room?.name?.toUpperCase()}</span>
            </footer>
        </div>
    );
};

export default CinematicRoomView;
