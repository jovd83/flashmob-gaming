/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.js';
import ActivityLog from './ActivityLog.js';
import GameTelemetryPanel from './GameTelemetryPanel.js';
import { Room, BaseEngineState } from '../../shared/types.js';
import { resolvePalette } from '../../shared/constants.js';

const LogView: React.FC = () => {
    const { socket } = useSocket();
    const { roomId } = useParams<{ roomId: string }>();
    const [room, setRoom] = useState<Room | null>(null);
    const [gameState, setGameState] = useState<BaseEngineState | null>(null);

    useEffect(() => {
        if (!socket) return;

        const fetchRoom = async () => {
            if (!roomId) return;
            const res = await fetch('/api/rooms');
            if (res.ok) {
                const rooms = await res.json();
                const found = rooms.find((r: any) => r.id === roomId);
                if (found) setRoom(found);
            }
        };
        fetchRoom();

        if (roomId) {
            socket.emit('join-room', roomId);
            
            socket.on('game-state', (state: BaseEngineState) => {
                setGameState(state);
            });
        }

        return () => {
            socket.off('game-state');
        };
    }, [roomId, socket]);

    if (!roomId) return <div style={{ color: 'white', padding: '20px' }}>No Room Specified</div>;

    const palette = resolvePalette(room);
    const accentColor = palette.primary;

    return (
        <div style={{
            background: '#0a0f1e',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            fontFamily: '"Outfit", "Inter", sans-serif',
            padding: '2rem'
        }}>
            <header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem',
                borderBottom: `1px solid ${accentColor}33`,
                paddingBottom: '1.5rem'
            }}>
                <div>
                    <h1 style={{ 
                        margin: 0, 
                        fontSize: '1.5rem', 
                        fontWeight: 900, 
                        textTransform: 'uppercase', 
                        letterSpacing: '4px',
                        color: accentColor
                    }}>
                        Terminal_Link
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Session:</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{room?.name || roomId}</span>
                        <span style={{ 
                            fontSize: '0.65rem', 
                            background: `${accentColor}22`, 
                            color: accentColor, 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            border: `1px solid ${accentColor}44`
                        }}>{room?.gameType || 'unknown'}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/admin" style={{
                        textDecoration: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease'
                    }}>
                        Back to Control
                    </Link>
                </div>
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ maxWidth: '600px' }}>
                    <GameTelemetryPanel gameState={gameState} palette={palette} />
                </div>

                <div style={{ 
                    flex: 1, 
                    background: 'rgba(0, 0, 0, 0.4)', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 900, 
                        textTransform: 'uppercase', 
                        letterSpacing: '2px', 
                        color: accentColor,
                        marginBottom: '1rem',
                        opacity: 0.6
                    }}>Live Transmission Logs</div>
                    <ActivityLog _roomId={roomId} palette={palette} limit={500} />
                </div>
                
                <footer style={{ 
                    marginTop: '1.5rem', 
                    fontSize: '0.65rem', 
                    color: 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>Protocol: WebSocket 2.4.0</span>
                    <span>System Status: Optimal</span>
                </footer>
            </main>
        </div>
    );
};

export default LogView;

