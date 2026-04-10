/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React from 'react';

interface StatPillProps {
    label: string;
    value: string | number;
    accent?: boolean;
}

const StatPill: React.FC<StatPillProps> = ({ label, value, accent }) => {
    return (
        <div className="stat-pill">
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: accent ? 'var(--admin-accent)' : 'inherit' }}>
                {value}
            </div>
        </div>
    );
};

export default StatPill;
