/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Room } from '../../shared/types.js';

const RoomLanding: React.FC = () => {
    const [roomId, setRoomId] = useState('');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const fetchRooms = async () => {
        try {
            const res = await fetch('/api/rooms');
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim()) {
            navigate(`/game/${roomId.trim().toLowerCase()}`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans p-6" style={{ background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)' }}>
            <style>{`
                .glass-input {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                }
                .hero-glow {
                    text-shadow: 0 0 30px rgba(0, 255, 204, 0.3);
                }
                .room-btn {
                    transition: all 0.2s ease;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .room-btn:hover {
                    background: rgba(255, 255, 255, 0.05);
                    transform: scale(1.02);
                    border-color: rgba(0, 255, 204, 0.3);
                }
            `}</style>

            <div className="max-w-4xl w-full text-center mb-16">
                <h1 className="text-7xl font-black italic tracking-tighter uppercase mb-4 hero-glow" style={{ color: '#00ffcc' }}>
                    Mass-waiting-games
                </h1>
                <p className="text-slate-400 text-lg uppercase tracking-widest font-bold">The Collective Gaming Experience</p>
            </div>

            <div className="w-full max-w-md space-y-12">
                {/* Manual Join */}
                <form onSubmit={handleJoin} className="space-y-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            className="w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xl font-bold tracking-widest uppercase focus:border-emerald-500 placeholder:opacity-30 outline-none transition-all"
                            placeholder="ENTER ROOM ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-emerald-500/10 animate-pulse"></div>
                    </div>
                    <button type="submit" className="w-full p-5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-lg uppercase tracking-wider hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        JOIN SESSION
                    </button>
                </form>

                {/* Discovery Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-800"></div>
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em]">Direct Discovery</span>
                        <div className="h-px flex-1 bg-slate-800"></div>
                    </div>

                    {isLoading ? (
                        <div className="text-center text-slate-500 animate-pulse text-xs uppercase font-bold tracking-widest">Scanning Network...</div>
                    ) : rooms.length === 0 ? (
                        <div className="text-center text-slate-600 text-xs uppercase font-bold tracking-widest">No Public Sessions Found</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {rooms.map((room) => (
                                <button 
                                    key={room.id}
                                    onClick={() => navigate(`/game/${room.id}`)}
                                    className="room-btn w-full p-4 rounded-xl flex justify-between items-center bg-slate-900/50 group"
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-sm tracking-tight group-hover:text-emerald-400 transition-colors">{room.name}</div>
                                        <div className="text-[9px] font-mono opacity-40 uppercase">{room.id}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <Link to={`/qr/${room.id}`} onClick={(e) => e.stopPropagation()} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-[10px] uppercase font-bold text-emerald-400">QR</Link>
                                            <Link to={`/score/${room.id}`} onClick={(e) => e.stopPropagation()} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-[10px] uppercase font-bold text-amber-400">Board</Link>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <footer className="mt-24 text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">
                &copy; jovd83 2026 // COLLECTIVE PROTOCOL
            </footer>
        </div>
    );
};

export default RoomLanding;
