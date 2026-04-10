/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React from 'react';
import { LayoutDashboard, Users, PlusCircle, LogOut, Terminal, Settings } from 'lucide-react';

interface SidebarProps {
    currentTab: 'dashboard' | 'config' | 'simulation' | 'settings';
    onTabChange: (tab: 'dashboard' | 'config' | 'simulation' | 'settings') => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, onLogout }) => {
    return (
        <aside className="admin-sidebar">
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--admin-accent)' }}>
                    FlashMob Gaming
                </h1>
                <p style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Platform Commander v1.0
                </p>
            </div>

            <nav style={{ flex: 1 }}>
                <button 
                    onClick={() => onTabChange('dashboard')} 
                    className={`sidebar-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                    <LayoutDashboard size={18} /> Dashboard
                </button>
                <button 
                    onClick={() => onTabChange('config')} 
                    className={`sidebar-nav-item ${currentTab === 'config' ? 'active' : ''}`}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                    <PlusCircle size={18} /> Configuration
                </button>
                <button 
                    onClick={() => onTabChange('simulation')} 
                    className={`sidebar-nav-item ${currentTab === 'simulation' ? 'active' : ''}`}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                    <Terminal size={18} /> Simulation
                </button>
                <button 
                    onClick={() => onTabChange('settings')} 
                    className={`sidebar-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                    <Settings size={18} /> Settings
                </button>
            </nav>

            <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem' }}>
                <button onClick={onLogout} className="sidebar-nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <LogOut size={18} /> End Session
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
