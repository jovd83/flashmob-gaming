/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React from 'react';

interface GameTelemetryPanelProps {
    gameState: any;
    palette: any;
}

const GameTelemetryPanel: React.FC<GameTelemetryPanelProps> = ({ gameState, palette }) => {
    if (!gameState) return null;

    const gameType = gameState.gameType || 'paddle-battle';

    switch (gameType) {
        case 'paddle-battle':
            return <PaddleBattleTelemetry gameState={gameState} palette={palette} />;
        case 'vipers':
            return <VipersTelemetry gameState={gameState} palette={palette} />;
        case 'brick-burst':
            return <BrickBurstTelemetry gameState={gameState} palette={palette} />;
        default:
            return null;
    }
};

// ─── Paddle Battle: up↑ − down↓ / players = outcome ────────────
const PaddleBattleTelemetry: React.FC<{ gameState: any; palette: any }> = ({ gameState, palette }) => {
    if (!gameState.teams) return null;
    return (
        <div className="sidebar-panel telemetry-panel">
            <div className="hud-label">Paddle Telemetry</div>
            <div className="telemetry-grid">
                {Object.entries(gameState.teams).map(([teamId, team]: [string, any]) => {
                    const inputs = team.lastTickInputs || { up: 0, down: 0, outcome: 0 };
                    const playerCount = Math.max(1, team.players?.length || 1);
                    const outcomeDirection = inputs.outcome > 0.05 ? '▲' : inputs.outcome < -0.05 ? '▼' : '—';
                    const outcomeColor = inputs.outcome > 0.05 ? '#4ade80' : inputs.outcome < -0.05 ? '#f87171' : 'rgba(255,255,255,0.3)';
                    
                    return (
                        <div key={teamId} className="telemetry-team">
                            <div className="telemetry-team-label" style={{ color: team.color || palette.primary }}>
                                {team.name?.toUpperCase() || teamId.toUpperCase()}
                            </div>
                            <div className="telemetry-formula">
                                <span className="telemetry-val up">{inputs.up}↑</span>
                                <span className="telemetry-op">−</span>
                                <span className="telemetry-val down">{inputs.down}↓</span>
                                <span className="telemetry-op">/</span>
                                <span className="telemetry-val players">{playerCount}</span>
                                <span className="telemetry-op">=</span>
                                <span className="telemetry-result" style={{ color: outcomeColor }}>
                                    {outcomeDirection} {Math.abs(inputs.outcome).toFixed(2)}
                                </span>
                            </div>
                            <div className="telemetry-bar-track">
                                <div className="telemetry-bar-fill" style={{
                                    width: `${Math.min(100, Math.abs(inputs.outcome) * 100)}%`,
                                    marginLeft: inputs.outcome < 0 ? 'auto' : undefined,
                                    marginRight: inputs.outcome > 0 ? 'auto' : undefined,
                                    background: outcomeColor,
                                    boxShadow: `0 0 8px ${outcomeColor}66`
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Vipers: directional votes with winner highlighted ────
const VipersTelemetry: React.FC<{ gameState: any; palette: any }> = ({ gameState, palette }) => {
    if (!gameState.teams) return null;
    return (
        <div className="sidebar-panel telemetry-panel">
            <div className="hud-label">Direction Telemetry</div>
            <div className="telemetry-grid">
                {Object.entries(gameState.teams).map(([teamId, team]: [string, any]) => {
                    const inputs = team.lastTickInputs || { up: 0, down: 0, left: 0, right: 0, winner: 'none' };
                    const dirs = ['up', 'down', 'left', 'right'] as const;
                    const arrows: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' };
                    const total = inputs.up + inputs.down + inputs.left + inputs.right;
                    
                    return (
                        <div key={teamId} className="telemetry-team">
                            <div className="telemetry-team-label" style={{ color: team.color || palette.primary }}>
                                {team.name?.toUpperCase() || teamId.toUpperCase()}
                            </div>
                            <div className="telemetry-direction-grid">
                                {dirs.map(dir => {
                                    const count = inputs[dir] || 0;
                                    const isWinner = inputs.winner === dir;
                                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                    return (
                                        <div key={dir} className={`direction-cell ${isWinner ? 'winner' : ''}`}
                                             style={isWinner ? { borderColor: team.color || palette.primary, color: team.color || palette.primary } : {}}>
                                            <span className="direction-arrow">{arrows[dir]}</span>
                                            <span className="direction-count">{count}</span>
                                            {total > 0 && <span className="direction-pct">{pct}%</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// 🛡️ Brick Burst: left/right formula (like Paddle Battle but horizontal) 🛡️
const BrickBurstTelemetry: React.FC<{ gameState: any; palette: any }> = ({ gameState, palette }) => {
    if (!gameState.teams) return null;
    return (
        <div className="sidebar-panel telemetry-panel">
            <div className="hud-label">
                <span>Paddle Telemetry</span>
                {gameState.level && <span style={{ float: 'right', color: palette.primary }}>LVL {gameState.level}</span>}
            </div>
            <div className="telemetry-grid">
                {Object.entries(gameState.teams).map(([teamId, team]: [string, any]) => {
                    const inputs = team.lastTickInputs || { left: 0, right: 0, outcome: 0 };
                    const playerCount = Math.max(1, team.players?.length || 1);
                    const outcomeDirection = inputs.outcome > 0.05 ? '▶' : inputs.outcome < -0.05 ? '◀' : '—';
                    const outcomeColor = inputs.outcome > 0.05 ? '#4ade80' : inputs.outcome < -0.05 ? '#f87171' : 'rgba(255,255,255,0.3)';
                    
                    return (
                        <div key={teamId} className="telemetry-team">
                            <div className="telemetry-team-label" style={{ color: team.color || palette.primary }}>
                                {team.name?.toUpperCase() || teamId.toUpperCase()}
                            </div>
                            <div className="telemetry-formula">
                                <span className="telemetry-val down">{inputs.left}←</span>
                                <span className="telemetry-op">−</span>
                                <span className="telemetry-val up">{inputs.right}→</span>
                                <span className="telemetry-op">/</span>
                                <span className="telemetry-val players">{playerCount}</span>
                                <span className="telemetry-op">=</span>
                                <span className="telemetry-result" style={{ color: outcomeColor }}>
                                    {outcomeDirection} {Math.abs(inputs.outcome).toFixed(2)}
                                </span>
                            </div>
                            <div className="telemetry-bar-track">
                                <div className="telemetry-bar-fill" style={{
                                    width: `${Math.min(100, Math.abs(inputs.outcome) * 100)}%`,
                                    marginLeft: inputs.outcome < 0 ? 'auto' : undefined,
                                    marginRight: inputs.outcome > 0 ? 'auto' : undefined,
                                    background: outcomeColor,
                                    boxShadow: `0 0 8px ${outcomeColor}66`
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};



export default GameTelemetryPanel;
