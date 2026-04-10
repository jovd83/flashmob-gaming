/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './admin/Sidebar.js';
import { Settings, Smartphone, Shield, Zap, Wrench } from 'lucide-react';
import './ManagementView.css';
import './SettingsStyles.css';

const SettingsView: React.FC = () => {
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
    const [useGyroscope, setUseGyroscope] = useState<boolean>(
        localStorage.getItem('use_gyroscope') === 'true'
    );

    useEffect(() => {
        if (!token) {
            navigate('/admin');
        }
    }, [token, navigate]);

    const handleToggleGyroscope = () => {
        const newValue = !useGyroscope;
        setUseGyroscope(newValue);
        localStorage.setItem('use_gyroscope', String(newValue));
    };

    if (!token) return null;

    return (
        <div className="admin-layout">
            <Sidebar 
                currentTab="settings"
                onTabChange={(tab: any) => {
                    if (tab === 'settings') return;
                    navigate('/admin');
                }} 
                onLogout={() => { setToken(null); localStorage.removeItem('admin_token'); navigate('/admin'); }} 
            />

            <main className="admin-content settings-container">
                <header style={{ marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ width: '40px', height: '1px', background: 'var(--admin-accent)' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--admin-accent)', textTransform: 'uppercase', letterSpacing: '4px' }}>System Node</span>
                    </div>
                    <h2 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>
                        Control <span className="text-accent">Nexus</span>
                    </h2>
                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '1.1rem', marginTop: '1rem', maxWidth: '30rem' }}>
                        Configure platform-wide parameters and experimental input protocols.
                    </p>
                </header>

                <div className="settings-grid">
                    {/* Input Protocol Card */}
                    <div className="settings-card">
                        <div className="settings-card-header">
                            <div className="settings-card-icon">
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Input Protocols</h3>
                                <p style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase' }}>Haptic & Biosensors</p>
                            </div>
                        </div>
                        
                        <div className="settings-option">
                            <div>
                                <h4 style={{ fontWeight: 800, margin: '0 0 0.25rem 0' }}>Local Gyroscope</h4>
                                <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>Real-time tilt mapping for this device</p>
                            </div>
                            <div 
                                className={`toggle-switch ${useGyroscope ? 'active' : ''}`}
                                onClick={handleToggleGyroscope}
                            >
                                <div className="toggle-knob"></div>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-accent)', marginBottom: '0.5rem' }}>
                                <Zap size={14} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Status: Optimal</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>
                                Low-latency orientation API detected and synchronized.
                            </p>
                        </div>
                    </div>

                    {/* Security Node Card */}
                    <div className="settings-card" style={{ opacity: 0.6 }}>
                        <div className="settings-card-header">
                            <div className="settings-card-icon" style={{ color: '#94a3b8' }}>
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Security Node</h3>
                                <p style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase' }}>Encryption & Access</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '2rem' }}>
                            Hardware security modules and multi-factor authentication levels are currently locked by system administrator.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '10px', fontWeight: 900 }}>AES-256</span>
                            <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '10px', fontWeight: 900 }}>SSL/TLS</span>
                        </div>
                    </div>

                    {/* Advanced Tools Card */}
                    <div className="settings-card" style={{ opacity: 0.6 }}>
                        <div className="settings-card-header">
                            <div className="settings-card-icon" style={{ color: '#94a3b8' }}>
                                <Wrench size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>Engine Tools</h3>
                                <p style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase' }}>Low-level Config</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                            Direct engine memory access and variable overriding will be unlocked in Delta-Phase 2 distribution.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsView;
