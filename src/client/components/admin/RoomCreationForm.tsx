/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React from 'react';
import { Plus, QrCode, Globe, Wifi, Settings } from 'lucide-react';
import { useQRBaseURL } from '../../context/QRBaseURLContext.js';

interface RoomCreationFormProps {
    newRoomName: string;
    setNewRoomName: (val: string) => void;
    team1Name: string;
    setTeam1Name: (val: string) => void;
    team2Name: string;
    setTeam2Name: (val: string) => void;
    config: {
        gameType: string;
        palette: string;
        ballSpeed: number;
        accelerationFactor: number;
        paddleHeight: number;
        primaryColor?: string;
        secondaryColor?: string;
    };
    onConfigChange: (config: any) => void;
    onCreateRoom: (e: React.FormEvent) => void;
}

const PALETTES = [
    { id: 'cyber-cyan', name: 'Cyber Cyan', colors: ['#00f7ff', '#ff00ff'], desc: 'High-energy neon future' },
    { id: 'sunset-glow', name: 'Sunset Glow', colors: ['#f59e0b', '#ef4444'], desc: 'Warm amber and crimson' },
    { id: 'deep-sapphire', name: 'Deep Sapphire', colors: ['#3b82f6', '#fbbf24'], desc: 'Classic blue and gold' },
    { id: 'matrix-green', name: 'Matrix Green', colors: ['#10b981', '#ffffff'], desc: 'Digital rain and monochrome' }
];

const RoomCreationForm: React.FC<RoomCreationFormProps> = ({
    newRoomName, setNewRoomName,
    team1Name, setTeam1Name,
    team2Name, setTeam2Name,
    config, onConfigChange, onCreateRoom
}) => {
    const { config: qrConfig, setConfig: setQrConfig, getBaseUrl, fetchNetworkDefaults } = useQRBaseURL();
    


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                <div className="session-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--admin-accent)' }}><Plus size={18} /></span> Deploy Unit
                    </h3>
                    <form onSubmit={onCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label htmlFor="room-name" className="admin-label">Callsign</label>
                            <input 
                                id="room-name"
                                type="text" className="admin-input"
                                value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} 
                                placeholder="OMEGA-1" required
                            />
                        </div>
                        <div>
                            <label htmlFor="game-variant" className="admin-label">Engine Variant</label>
                            <select 
                                id="game-variant"
                                className="admin-input"
                                value={config.gameType}
                                onChange={(e) => onConfigChange({ ...config, gameType: e.target.value })}
                            >
                                <option value="paddle-battle">Paddle Battle</option>
                                <option value="vipers">Vipers</option>
                                <option value="brick-burst">Brick Burst</option>
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label htmlFor="team1-name" className="admin-label">Team 1 Name</label>
                                <input 
                                    id="team1-name"
                                    type="text" className="admin-input"
                                    value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} 
                                    placeholder="Alpha Squad"
                                />
                            </div>
                            <div>
                                <label htmlFor="team2-name" className="admin-label">Team 2 Name</label>
                                <input 
                                    id="team2-name"
                                    type="text" className="admin-input"
                                    value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} 
                                    placeholder="Omega Squad"
                                />
                            </div>
                        </div>
                        {config.gameType === 'paddle-battle' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label htmlFor="ball-speed" className="admin-label">Ball Speed</label>
                                    <input 
                                        id="ball-speed"
                                        type="number" className="admin-input"
                                        value={config.ballSpeed} 
                                        onChange={(e) => onConfigChange({ ...config, ballSpeed: Number(e.target.value) })} 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="paddle-height" className="admin-label">Paddle Height</label>
                                    <input 
                                        id="paddle-height"
                                        type="number" className="admin-input"
                                        value={config.paddleHeight} 
                                        onChange={(e) => onConfigChange({ ...config, paddleHeight: Number(e.target.value) })} 
                                    />
                                </div>
                            </div>
                        )}
                        <button type="submit" className="admin-btn">Deploy Engine</button>
                    </form>
                </div>

                <div className="session-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--admin-accent)' }}><Settings size={18} /></span> Visual Environment
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '1rem', letterSpacing: '1px' }}>Theme Presets</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {PALETTES.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => onConfigChange({ ...config, palette: p.id, primaryColor: '', secondaryColor: '' })}
                                        className={`palette-option ${config.palette === p.id && !config.primaryColor ? 'active' : ''}`}
                                        type="button"
                                        style={{
                                            background: config.palette === p.id && !config.primaryColor ? 'rgba(0, 255, 204, 0.05)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${config.palette === p.id && !config.primaryColor ? 'var(--admin-accent)' : 'rgba(255,255,255,0.05)'}`,
                                            padding: '1.25rem',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: config.palette === p.id && !config.primaryColor ? 'white' : 'var(--admin-text-muted)' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{p.desc}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {p.colors.map((c, i) => (
                                                <div key={i} style={{ width: '24px', height: '8px', background: c, borderRadius: '40px', boxShadow: `0 0 10px ${c}44` }}></div>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '1rem', letterSpacing: '1px' }}>Custom Atmosphere</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label className="admin-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Primary Aura</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {[
                                            '#00f7ff', '#ff00ff', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#fbbf24', '#ffffff',
                                            '#a855f7', '#ec4899', '#84cc16', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#facc15',
                                            '#00ffaa', '#ff0055', '#7000ff', '#20ffd0', '#ccff00', '#ff4d00'
                                        ].map(c => (
                                            <button 
                                                key={c} type="button"
                                                onClick={() => onConfigChange({ ...config, primaryColor: c, secondaryColor: config.secondaryColor || '#ff00ff' })}
                                                style={{ 
                                                    width: '16px', height: '16px', flexShrink: 0, background: c, borderRadius: '4px', cursor: 'pointer',
                                                    border: config.primaryColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                                                    transform: config.primaryColor === c ? 'scale(1.2)' : 'none',
                                                    boxShadow: config.primaryColor === c ? `0 0 10px ${c}` : 'none'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="admin-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Secondary Aura</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {[
                                            '#00f7ff', '#ff00ff', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#fbbf24', '#ffffff',
                                            '#a855f7', '#ec4899', '#84cc16', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#facc15',
                                            '#00ffaa', '#ff0055', '#7000ff', '#20ffd0', '#ccff00', '#ff4d00'
                                        ].map(c => (
                                            <button 
                                                key={c} type="button"
                                                onClick={() => onConfigChange({ ...config, secondaryColor: c, primaryColor: config.primaryColor || '#00f7ff' })}
                                                style={{ 
                                                    width: '16px', height: '16px', flexShrink: 0, background: c, borderRadius: '4px', cursor: 'pointer',
                                                    border: config.secondaryColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                                                    transform: config.secondaryColor === c ? 'scale(1.2)' : 'none',
                                                    boxShadow: config.secondaryColor === c ? `0 0 10px ${c}` : 'none'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="session-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <span style={{ color: 'var(--admin-accent)' }}><QrCode size={18} /></span> QR Access Configuration
                    </h3>
                    <div className="preview-badge" style={{ fontSize: '0.65rem', padding: '4px 8px', background: 'rgba(0, 255, 204, 0.1)', color: 'var(--admin-accent)', borderRadius: '4px', fontWeight: 800 }}>
                        PREVIEW: {getBaseUrl()}/player/room-id?team=left
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button 
                        type="button"
                        onClick={() => setQrConfig({ ...qrConfig, mode: 'auto' })}
                        className={`mode-option ${qrConfig.mode === 'auto' ? 'active' : ''}`}
                    >
                        <Settings size={16} />
                        <div>
                            <div className="mode-label">Auto Detect</div>
                            <div className="mode-desc">Use current browser host</div>
                        </div>
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            setQrConfig({ ...qrConfig, mode: 'lan' });
                            fetchNetworkDefaults();
                        }}
                        className={`mode-option ${qrConfig.mode === 'lan' ? 'active' : ''}`}
                    >
                        <Wifi size={16} />
                        <div>
                            <div className="mode-label">LAN Address</div>
                            <div className="mode-desc">Local IP and custom port</div>
                        </div>
                    </button>
                    <button 
                        type="button"
                        onClick={() => setQrConfig({ ...qrConfig, mode: 'custom' })}
                        className={`mode-option ${qrConfig.mode === 'custom' ? 'active' : ''}`}
                    >
                        <Globe size={16} />
                        <div>
                            <div className="mode-label">Custom Domain</div>
                            <div className="mode-desc">External URL or tunnel</div>
                        </div>
                    </button>
                </div>

                {qrConfig.mode === 'lan' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1rem', animation: 'fadeIn 0.2s ease' }}>
                        <div>
                            <label htmlFor="lan-ip" className="admin-label">Local IP Address</label>
                            <input 
                                id="lan-ip"
                                type="text" className="admin-input"
                                placeholder="e.g. 192.168.1.50"
                                value={qrConfig.lanIp}
                                onChange={(e) => setQrConfig({ ...qrConfig, lanIp: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="lan-port" className="admin-label">Port</label>
                            <input 
                                id="lan-port"
                                type="text" className="admin-input"
                                placeholder="3000"
                                value={qrConfig.lanPort}
                                onChange={(e) => setQrConfig({ ...qrConfig, lanPort: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {qrConfig.mode === 'custom' && (
                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                        <label htmlFor="custom-url" className="admin-label">Base URL</label>
                        <input 
                            id="custom-url"
                            type="text" className="admin-input"
                            placeholder="https://games.prompthive.be"
                            value={qrConfig.customUrl}
                            onChange={(e) => setQrConfig({ ...qrConfig, customUrl: e.target.value })}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomCreationForm;
