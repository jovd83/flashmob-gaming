/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.js';

import { GameEvent } from '../../shared/types.js';

interface ActivityLogProps {
    _roomId: string; // Known but unused in current view
    compact?: boolean;
    palette?: any;
    limit?: number;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ _roomId, compact, palette, limit = 50 }) => {
    const { socket } = useSocket();
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleEvent = (event: GameEvent) => {
            if (isPaused) return;
            setEvents(prev => [event, ...prev].slice(0, limit));
        };

        socket.on('game-event', handleEvent);
        return () => {
            socket.off('game-event', handleEvent);
        };
    }, [socket, limit, isPaused]);

    const formatEvent = (event: GameEvent) => {
        const time = new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const shortId = event.id?.slice(0, 4) || 'system';
        
        const teamDpy = (event.teamName as string) || (event.team as string)?.toUpperCase() || 'SYSTEM';
        const winnerDpy = (event.winnerName as string) || (event.winner as string)?.toUpperCase() || 'SYSTEM';

        switch (event.type) {
            case 'player-joined': return `> ${time} [CONN] USER_${shortId} established uplink`;
            case 'team-joined': return `> ${time} [JOIN] USER_${shortId} assigned to ${teamDpy}`;
            case 'goal': return `> ${time} [GOAL] ${winnerDpy} system breach detected - SCORE!`;
            case 'game-ending': return `> ${time} [SYNC] MATCH_TERMINATION sequence initiated...`;
            case 'player-disconnected': return `> ${time} [DISC] USER_${shortId} signal lost`;
            case 'sim-started': return `> ${time} [SIMU] LOAD_GEN started with ${event.id} units`;
            case 'sim-stopped': return `> ${time} [SIMU] LOAD_GEN decommissioned`;
            case 'hit': return `> ${time} [HIT] Ball deflected by ${teamDpy} ${(event as any).subType === 'brick' ? '(Brick Hit!)' : ''}`;
            case 'speed-up': return `> ${time} [SPD+] Velocity increased to ${event.level} units`;
            case 'eat': return `> ${time} [FEED] ${teamDpy} consumed energy pellet - SCORE: ${event.score}`;
            default: return `> ${time} [EVNT] ${event.type.toUpperCase()} detected: ${JSON.stringify(event)}`;
        }
    };

    const accentColor = palette?.primary || '#00ffcc';

    return (
        <div className={`activity-log ${compact ? 'compact' : ''}`} style={{
            background: compact ? 'transparent' : 'rgba(15, 23, 42, 0.8)',
            backdropFilter: compact ? 'none' : 'blur(10px)',
            border: compact ? 'none' : `1px solid ${accentColor}33`,
            borderRadius: '12px',
            padding: compact ? '0' : '16px',
            color: 'white',
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: compact ? '0.65rem' : '0.8rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {!compact && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 0' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: accentColor, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900 }}>
                        Live Transmission
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => setIsPaused(!isPaused)}
                            style={{ 
                                background: 'transparent', border: `1px solid ${accentColor}44`, color: isPaused ? '#ff4d4d' : accentColor,
                                cursor: 'pointer', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase'
                            }}
                        >
                            {isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button 
                            onClick={() => setEvents([])}
                            style={{ 
                                background: 'transparent', border: `1px solid ${accentColor}44`, color: accentColor,
                                cursor: 'pointer', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase'
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}
            
            <div ref={scrollRef} style={{ 
                flex: 1, 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)'
            }}>
                {events.map((event, i) => (
                    <div key={i} style={{ 
                        opacity: i === 0 ? 1 : Math.max(0.2, 1 - (i * (compact ? 0.1 : 0.05))),
                        color: event.type === 'goal' ? '#fbbf24' : (i === 0 ? accentColor : 'rgba(255,255,255,0.7)'),
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        borderLeft: i === 0 ? `2px solid ${accentColor}` : 'none',
                        paddingLeft: i === 0 ? '6px' : '0'
                    }}>
                        {formatEvent(event)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityLog;

