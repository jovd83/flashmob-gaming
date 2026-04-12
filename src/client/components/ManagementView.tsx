/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.js';
import Sidebar from './admin/Sidebar.js';
import StatPill from './admin/StatPill.js';
import RoomCard from './admin/RoomCard.js';
import RoomCreationForm from './admin/RoomCreationForm.js';
import SimulationView from './admin/SimulationView.js';
import './ManagementView.css';
import { Room as RoomInfo, BaseEngineState } from '../../shared/types.js';

import { useQRBaseURL } from '../context/QRBaseURLContext.js';

export interface RoomState extends RoomInfo {
    // We can keep specific extensions here if needed, but it must be compatible
    // with RoomInfo.state which is BaseEngineState
    state?: BaseEngineState;
}

const ManagementView: React.FC = () => {
    const { socket } = useSocket();
    const navigate = useNavigate();
    const { getBaseUrl } = useQRBaseURL();
    const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rooms, setRooms] = useState<RoomState[]>([]);
    const [stats, setStats] = useState({ activeRooms: 0, totalPlayers: 0 });
    const [newRoomName, setNewRoomName] = useState('');
    const [currentTab, setCurrentTab] = useState<'dashboard' | 'config' | 'simulation' | 'settings'>('dashboard');
    const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set());
    const [simulatingRooms, setSimulatingRooms] = useState<Set<string>>(new Set());
    const [showSimulationPanel, setShowSimulationPanel] = useState<string | null>(null);
    const [team1Name, setTeam1Name] = useState('Alpha Squad');
    const [team2Name, setTeam2Name] = useState('Omega Squad');

    const [config, setConfig] = useState({
        gameType: 'paddle-battle',
        palette: 'cyber-cyan',
        primaryColor: '',
        secondaryColor: '',
        ballSpeed: 3,
        accelerationFactor: 1.05,
        paddleHeight: 80
    });

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            setToken(null);
            localStorage.removeItem('admin_token');
        }
        return res;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            setToken(data.token);
            localStorage.setItem('admin_token', data.token);
        } else {
            alert('Invalid credentials');
        }
    };

    useEffect(() => {
        if (!token || !socket) return;

        socket.emit('join-room', 'admin');

        socket.on('room-update', (data: RoomInfo[]) => {
            setRooms(data as RoomState[]);
        });

        socket.on('system-stats', (data: { activeRooms: number, totalPlayers: number }) => {
            setStats(data);
        });

        return () => {
            socket.off('room-update');
            socket.off('system-stats');
        };
    }, [token, socket]);

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetchWithAuth('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: newRoomName, 
                gameType: config.gameType,
                palette: config.palette,
                primaryColor: (config.primaryColor && config.primaryColor.length > 0) ? config.primaryColor : undefined,
                secondaryColor: (config.secondaryColor && config.secondaryColor.length > 0) ? config.secondaryColor : undefined,
                teamNames: { left: team1Name, right: team2Name },
                config: {
                    ballSpeed: config.ballSpeed,
                    accelerationFactor: config.accelerationFactor,
                    paddleHeight: config.paddleHeight
                }
            })
        });
        if (res.ok) {
            setNewRoomName('');
            setCurrentTab('dashboard');
        } else {
            const err = await res.json();
            alert(err.error);
        }
    };

    const handleDeleteRoom = async (id: string) => {
        if (!confirm(`Delete room ${id}?`)) return;
        await fetchWithAuth(`/api/rooms/${id}`, { method: 'DELETE' });
    };

    const handleCloseAllRooms = async () => {
        if (!confirm('Are you absolutely sure you want to close ALL active rooms? This action cannot be undone.')) return;
        const res = await fetchWithAuth('/api/rooms', { method: 'DELETE' });
        if (!res.ok) {
            alert('Failed to close all rooms');
        }
    };

    const handleResetScore = async (id: string) => {
        await fetchWithAuth(`/api/rooms/${id}/reset-score`, { method: 'POST' });
    };

    const handleSetGameType = async (id: string, gameType: string) => {
        await fetchWithAuth(`/api/rooms/${id}/game-type`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameType })
        });
    };

    const handleEndGame = async (id: string) => {
        await fetchWithAuth(`/api/rooms/${id}/end-game`, { method: 'POST' });
    };

    const startSimulation = async (id: string, count: number) => {
        const res = await fetchWithAuth(`/api/rooms/${id}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerCount: count })
        });
        if (res.ok) {
            const next = new Set(simulatingRooms);
            next.add(id);
            setSimulatingRooms(next);
            setShowSimulationPanel(null);
        }
    };

    const stopSimulation = async (id: string) => {
        await fetchWithAuth(`/api/rooms/${id}`, { method: 'DELETE' });
    };

    const handleStartSimulation = async (data: { name: string, gameType: string, playerCount: number, team: string, duration: number }) => {
        const res = await fetchWithAuth('/api/simulation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            setCurrentTab('simulation');
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to start simulation');
        }
    };

    const copyToClipboard = (path: string) => {
        const url = `${getBaseUrl()}${path}`;
        navigator.clipboard.writeText(url);
    };

    if (!token) {
        return (
            <div className="auth-portal">
                <div className="glass-portal">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ color: 'var(--admin-accent)', marginBottom: '1rem' }}>🛡️</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px', margin: 0, textAlign: 'center' }}>
                            Access Portal
                        </h2>
                    </div>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <input 
                            type="text" placeholder="Operator Identity" 
                            className="admin-input"
                            value={username} onChange={(e) => setUsername(e.target.value)}
                        />
                        <input 
                            type="password" placeholder="Secure Key" 
                            className="admin-input"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />
                        <button type="submit" className="admin-btn">Authenticate</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <Sidebar 
                currentTab={currentTab} 
                onTabChange={(tab) => {
                    if (tab === 'settings') {
                        navigate('/settings');
                    } else {
                        setCurrentTab(tab);
                    }
                }} 
                onLogout={() => { setToken(null); localStorage.removeItem('admin_token'); }} 
            />

            <main className="admin-content">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                            {currentTab === 'dashboard' ? 'Control Center' : 
                             currentTab === 'config' ? 'System Configuration' : 
                             currentTab === 'settings' ? 'System Settings' : 'Simulation Nexus'}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="status-pip status-active"></span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-accent)', textTransform: 'uppercase' }}>Synchronized</span>
                        </div>
                    </div>
                    {currentTab === 'dashboard' && rooms.length > 0 && (
                        <button 
                            onClick={handleCloseAllRooms} 
                            className="admin-btn danger"
                            style={{ width: 'auto', padding: '0.75rem 1.5rem', fontSize: '0.75rem' }}
                        >
                            Close All Rooms
                        </button>
                    )}
                </header>

                {currentTab === 'dashboard' ? (
                    <>
                        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                            <StatPill label="Active Sessions" value={rooms.filter(r => !r.isSimulation).length} />
                            <StatPill label="Live Engines" value={stats.activeRooms} />
                            <StatPill label="Connected Players" value={stats.totalPlayers} accent />
                            <StatPill label="Uptime" value="99.9%" />
                        </section>

                        <div className="dashboard-grid">
                            {rooms.filter(r => !r.isSimulation).map(room => (
                                <RoomCard 
                                    key={room.id}
                                    room={room}
                                    isCollapsed={collapsedRooms.has(room.id)}
                                    onToggleCollapse={(id) => {
                                        const next = new Set(collapsedRooms);
                                        if (next.has(id)) next.delete(id); else next.add(id);
                                        setCollapsedRooms(next);
                                    }}
                                    onResetScore={handleResetScore}
                                    onEndGame={handleEndGame}
                                    onDeleteRoom={handleDeleteRoom}
                                    onCopyLink={copyToClipboard}
                                />
                            ))}
                        </div>
                    </>
                ) : currentTab === 'config' ? (
                    <RoomCreationForm 
                        newRoomName={newRoomName} setNewRoomName={setNewRoomName}
                        team1Name={team1Name} setTeam1Name={setTeam1Name}
                        team2Name={team2Name} setTeam2Name={setTeam2Name}
                        config={config} onConfigChange={setConfig}
                        onCreateRoom={handleCreateRoom}
                    />
                ) : currentTab === 'simulation' ? (
                    <SimulationView 
                        activeSimulations={rooms.filter(r => r.isSimulation)}
                        onStartSimulation={handleStartSimulation}
                        onStopSimulation={stopSimulation}
                    />
                ) : (
                    <div className="empty-state">
                        <p>Redirecting to settings...</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ManagementView;
