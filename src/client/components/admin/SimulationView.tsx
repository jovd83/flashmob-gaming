/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState } from 'react';
import { Play, Square, Users, Clock, Gamepad2, Shield, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Room } from '../../../shared/types.js';

interface SimulationViewProps {
    activeSimulations: Room[];
    onStartSimulation: (data: { 
        name: string, 
        gameType: string, 
        playerCount: number, 
        team: string, 
        duration: number 
    }) => void;
    onStopSimulation: (id: string) => void;
}

const SimulationView: React.FC<SimulationViewProps> = ({ 
    activeSimulations, 
    onStartSimulation, 
    onStopSimulation 
}) => {
    const [name, setName] = useState('Autoscale Test');
    const [gameType, setGameType] = useState('paddle-battle');
    const [playerCount, setPlayerCount] = useState(50);
    const [team, setTeam] = useState('all');
    const [duration, setDuration] = useState(5);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStartSimulation({ name, gameType, playerCount, team, duration });
    };

    return (
        <div className="simulation-nexus">
            <div className="simulation-layout">
                {/* Configuration Form */}
                <section className="glass-panel simulation-form-panel">
                    <div className="panel-header">
                        <Play size={20} color="var(--admin-accent)" />
                        <h3>Initialize Simulation</h3>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="simulation-form">
                        <div className="form-group">
                            <label>Session Callsign</label>
                            <input 
                                type="text" value={name} onChange={e => setName(e.target.value)}
                                className="admin-input" placeholder="e.g. Stress Test 01"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Engine Variant</label>
                                <select value={gameType} onChange={e => setGameType(e.target.value)} className="admin-input">
                                    <option value="paddle-battle">Mass-Paddle Battle</option>
                                    <option value="brick-burst">Mass-Brick Burst</option>
                                    <option value="vipers">Mass-Vipers</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Target Team</label>
                                <select value={team} onChange={e => setTeam(e.target.value)} className="admin-input">
                                    <option value="all">All Teams (Computer vs Computer)</option>
                                    <option value="left">Left / Alpha</option>
                                    <option value="right">Right / Omega</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Virtual Units</label>
                                <div className="input-with-icon">
                                    <Users size={14} />
                                    <input 
                                        type="number" 
                                        value={isNaN(playerCount) ? '' : playerCount} 
                                        onChange={e => setPlayerCount(parseInt(e.target.value) || 0)}
                                        className="admin-input" min="1" max="500"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Duration (Min)</label>
                                <div className="input-with-icon">
                                    <Clock size={14} />
                                    <input 
                                        type="number" 
                                        value={isNaN(duration) ? '' : duration} 
                                        onChange={e => setDuration(parseInt(e.target.value) || 0)}
                                        className="admin-input" min="1" max="60"
                                    />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="admin-btn primary-btn">
                            Deploy Simulation
                        </button>
                    </form>
                </section>

                {/* Active Simulations List */}
                <section className="glass-panel active-simulations-panel">
                    <div className="panel-header">
                        <Shield size={20} color="var(--admin-accent)" />
                        <h3>Active Subsystems</h3>
                    </div>

                    <div className="sim-list">
                        {activeSimulations.length === 0 ? (
                            <div className="empty-state">
                                <p>No active simulations detected</p>
                            </div>
                        ) : (
                            activeSimulations.map(sim => (
                                <div key={sim.id} className="sim-item">
                                    <Link to={`/presenter/${sim.id}`} className="sim-info-link" title="Open Presenter Mode">
                                        <div className="sim-info">
                                            <div className="sim-main">
                                                <span className="sim-name">{sim.name}</span>
                                                <span className="sim-tag">{sim.gameType}</span>
                                            </div>
                                            <div className="sim-meta">
                                                <span>ID: {sim.id}</span>
                                                {typeof sim.expiresAt === 'number' && !isNaN(sim.expiresAt) && (
                                                    <span>Ends in: {Math.max(0, Math.round((sim.expiresAt - Date.now()) / 60000))}m</span>
                                                )}
                                            </div>
                                        </div>
                                        <Eye size={16} className="observe-icon" />
                                    </Link>
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onStopSimulation(sim.id);
                                        }}
                                        className="icon-btn danger"
                                        title="Terminate Simulation"
                                    >
                                        <Square size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            <style>{`
                .simulation-nexus {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    animation: fadeIn 0.5s ease-out;
                }
                .simulation-layout {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }
                .glass-panel {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--admin-border);
                    border-radius: 16px;
                    padding: 2rem;
                    backdrop-filter: blur(10px);
                }
                .panel-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 2rem;
                    border-bottom: 1px solid var(--admin-border);
                    padding-bottom: 1rem;
                }
                .panel-header h3 {
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    font-size: 0.9rem;
                    font-weight: 800;
                }
                .simulation-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                .form-group label {
                    display: block;
                    font-size: 0.7rem;
                    color: var(--admin-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 0.5rem;
                    font-weight: 700;
                }
                .input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .input-with-icon svg {
                    position: absolute;
                    left: 12px;
                    color: var(--admin-accent);
                    opacity: 0.5;
                }
                .input-with-icon input {
                    padding-left: 36px;
                }
                .sim-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .sim-item {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid var(--admin-border);
                    border-radius: 12px;
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.2s ease;
                }
                .sim-item:hover {
                    border-color: var(--admin-accent);
                    background: rgba(255, 255, 255, 0.05);
                }
                .sim-info-link {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex: 1;
                    text-decoration: none;
                    color: inherit;
                }
                .observe-icon {
                    color: var(--admin-accent);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                .sim-info-link:hover .observe-icon {
                    opacity: 1;
                }
                .sim-main {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }
                .sim-name {
                    font-weight: 700;
                    font-size: 0.95rem;
                }
                .sim-tag {
                    font-size: 0.6rem;
                    background: var(--admin-accent-glow);
                    color: var(--admin-accent);
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    font-weight: 800;
                }
                .sim-meta {
                    font-size: 0.65rem;
                    color: var(--admin-text-muted);
                    display: flex;
                    gap: 12px;
                }
                .empty-state {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: var(--admin-text-muted);
                    font-style: italic;
                    font-size: 0.85rem;
                }
                .primary-btn {
                    background: var(--admin-accent) !important;
                    color: black !important;
                    font-weight: 900 !important;
                    margin-top: 1rem;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SimulationView;
