/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { 
    ChevronDown, ChevronRight, Users, RefreshCw, Flag, 
    Terminal, Trash2, Maximize, QrCode, Link as LinkIcon, Square, MonitorPlay, Trophy 
} from 'lucide-react';
import { RoomState } from '../ManagementView.js';

interface RoomCardProps {
    room: RoomState;
    isCollapsed: boolean;
    onToggleCollapse: (id: string) => void;
    onResetScore: (id: string) => void;
    onEndGame: (id: string) => void;
    onDeleteRoom: (id: string) => void;
    onCopyLink: (path: string) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({
    room, isCollapsed,
    onToggleCollapse,
    onResetScore, onEndGame, onDeleteRoom, onCopyLink
}) => {
    if (!room) return null;

    const teams = room.state?.teams || room.state?.entities || {};
    const roomName = room.name || 'Unnamed Session';
    const slugifiedName = roomName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const isRedundantId = room.id === slugifiedName;

    return (
        <div className={`session-card status-${room.state?.status || 'idle'} ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <button 
                        onClick={() => onToggleCollapse(room.id)}
                        className="collapse-toggle"
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h4 style={{ fontSize: '1.125rem', fontWeight: 900, margin: 0 }}>{roomName}</h4>
                            <span style={{ 
                                fontSize: '0.6rem', 
                                background: 'rgba(255,255,255,0.1)', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                fontWeight: 800,
                                letterSpacing: '1px'
                            }}>{room.gameType || 'unknown'}</span>
                        </div>
                        {!isRedundantId && (
                            <p style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)', fontFamily: 'monospace', marginTop: 0 }}>{room.id}</p>
                        )}
                    </div>
                </div>
                <span className="badge" style={{ 
                    background: room.state?.status === 'playing' ? 'var(--admin-accent-glow)' : 'rgba(255,255,255,0.05)',
                    color: room.state?.status === 'playing' ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                    border: `1px solid ${room.state?.status === 'playing' ? 'var(--admin-accent)' : 'var(--admin-border)'}`
                }}>
                    {room.state?.status?.toUpperCase() || 'IDLE'}
                </span>
            </div>

            <div className="card-body">
                    {Object.entries(teams).map(([id, t]: [string, any]) => {
                        if (!t) return null;
                        const teamMeta = room.metadata?.requiredTeams?.find(rt => rt.id === id);
                        const displayName = room.teamNames?.[id] || teamMeta?.name || t.name || id;
                        const teamColor = teamMeta?.color || t.color || 'var(--admin-accent)';
                        
                        return (
                            <div key={id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', borderLeft: `4px solid ${teamColor}` }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.6 }}>
                                    {displayName}
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: teamColor }}>
                                    {t.score !== undefined ? `${t.score}` : (t.players?.length || 0)}
                                </div>
                            </div>
                        );
                    })}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => onResetScore(room.id)} className="icon-btn" title="Refresh State"><RefreshCw size={16} /></button>
                        <button onClick={() => onEndGame(room.id)} className="icon-btn" title="Finalize Engine"><Flag size={16} /></button>
                        <Link to={`/logs/${room.id}`} target="_blank" className="icon-btn" title="Verbose Logs" style={{ color: 'var(--admin-accent)', borderColor: 'var(--admin-accent-glow)' }}>
                            <Terminal size={16} />
                        </Link>
                        <button onClick={() => onDeleteRoom(room.id)} className="icon-btn danger" title="Decommission"><Trash2 size={16} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/presenter/${room.id}`} target="_blank" className="icon-btn" title="Presenter View" style={{ color: 'var(--admin-accent)' }}>
                            <MonitorPlay size={14} />
                        </Link>
                        <Link to={`/score/${room.id}`} target="_blank" className="icon-btn" title="Scoreboard" style={{ color: 'var(--admin-accent)' }}>
                            <Trophy size={14} />
                        </Link>
                        <Link to={`/game/${room.id}`} target="_blank" className="icon-btn" title="Observe Host"><Maximize size={14} /></Link>
                        {Object.entries(teams).map(([id, t]: [string, any]) => {
                            if (!t) return null;
                            const teamMeta = room.metadata?.requiredTeams?.find(rt => rt.id === id);
                            const displayName = room.teamNames?.[id] || teamMeta?.name || t.name || id;
                            const teamColor = teamMeta?.color || t.color || 'var(--admin-accent)';
                            
                            return (
                                <Link key={id} to={`/qr/${room.id}?team=${id}`} target="_blank" className="icon-btn" title={`QR for ${displayName}`} style={{ color: teamColor, borderColor: `${teamColor}44` }}>
                                    <QrCode size={14} />
                                </Link>
                            );
                        })}
                        <button onClick={() => onCopyLink(`/player/${room.id}`)} className="icon-btn" title="Copy Link"><LinkIcon size={14} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomCard;
