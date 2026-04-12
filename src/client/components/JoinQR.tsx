/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import { useQRBaseURL } from '../context/QRBaseURLContext.js';

interface Team {
    id: string;
    name: string;
    color: string;
}

interface RoomMetadata {
    id: string;
    name: string;
    requiredTeams: Team[];
}

interface JoinQRProps {
    side?: string; 
    minimal?: boolean;
}

const JoinQR: React.FC<JoinQRProps> = ({ side: propSide, minimal }) => {
    const { getBaseUrl } = useQRBaseURL();
    const { roomId = 'default' } = useParams<{ roomId: string }>();
    const [searchParams] = useSearchParams();
    const querySide = searchParams.get('side') || searchParams.get('team');
    
    const [metadata, setMetadata] = useState<RoomMetadata | null>(null);
    const [teamNames, setTeamNames] = useState<{[id: string]: string}>({});
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const res = await fetch('/api/rooms');
                if (res.ok) {
                    const rooms = await res.json();
                    const room = rooms.find((r: any) => r.id === roomId);
                    if (room && room.metadata) {
                        setMetadata(room.metadata);
                        if (room.teamNames) {
                            setTeamNames(room.teamNames);
                        }
                        
                        // If side is specified in URL, jump to index
                        const targetSide = propSide || querySide;
                        if (targetSide) {
                            const idx = room.metadata.requiredTeams?.findIndex((t: Team) => t.id === targetSide) ?? -1;
                            if (idx !== -1) setCurrentIdx(idx);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch room metadata:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetadata();
    }, [roomId, propSide, querySide]);

    if (isLoading) return null;
    if (!metadata || !metadata.requiredTeams?.length) return null;

    const currentTeam = metadata.requiredTeams[currentIdx];
    if (!currentTeam) return null;

    const displayName = teamNames[currentTeam.id] || currentTeam.name;
    const qrUrl = `${getBaseUrl()}/player/${roomId}?team=${currentTeam.id}`;

    if (minimal) {
        return (
            <div className="qr-presenter-minimal-fix" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1cqh' }}>
                <div className="qr-presenter-code-box" style={{ background: 'white', padding: '4%', borderRadius: '1cqw', width: '90%', maxWidth: '90%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QRCodeSVG value={qrUrl} size={256} level="H" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
                <div className="qr-presenter-label" style={{ color: currentTeam.color, fontSize: 'min(10cqh, 4cqw)', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.2cqw' }}>
                    JOIN {displayName}
                </div>
            </div>
        );
    }

    const qrSize = 360;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-0 font-sans overflow-hidden">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Team Join Label */}
                <div 
                    style={{ 
                        color: currentTeam.color, 
                        width: `${qrSize + 48}px`, 
                        textAlign: 'center',
                        fontSize: '2.5rem',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        lineHeight: '1.1',
                        marginBottom: '2rem',
                        letterSpacing: '-0.02em',
                        textShadow: `0 0 30px ${currentTeam.color}44`
                    }}
                >
                    Join team <span style={{ color: currentTeam.color }}>{displayName}</span>
                </div>

                {/* QR Code Container */}
                <div style={{ background: 'white', padding: '8px', borderRadius: '16px', boxShadow: `0 25px 50px -12px ${currentTeam.color}44` }}>
                    <QRCodeSVG value={qrUrl} size={qrSize} level="H" />
                </div>
            </div>
        </div>
    );
};

export default JoinQR;
