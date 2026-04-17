/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - Cinematic Layout Editor
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { useSocket } from '../../context/SocketContext.js';
import { Room, CinematicLayout, CinematicElement } from '../../../shared/types.js';
import JoinQR from '../JoinQR.js';
import { resolvePalette } from '../../../shared/constants.js';
import { Move, Maximize, Save, RefreshCw, Play, Eye, EyeOff, Upload, ArrowLeft, RotateCcw, History } from 'lucide-react';
import '../CinematicRoomView.css';
import './CinematicEditorView.css';

const DEFAULT_ELEMENTS = {
    projector: { x: 30, y: 15, width: 35, height: 35, visible: false },
    scoreboard: { x: 80, y: 75, width: 10, height: 12, visible: false },
    qrLeft: { x: 2, y: 2, width: 6, height: 9, visible: false },
    qrRight: { x: 92, y: 2, width: 6, height: 9, visible: false },
    telemetry: { x: 5, y: 80, width: 14, height: 10, visible: false }
};

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 255, 204';
};

const CinematicEditorView: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [room, setRoom] = useState<Room | null>(null);
    const [layout, setLayout] = useState<CinematicLayout | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [bgVersion, setBgVersion] = useState(Date.now());
    const [dimensionVersion, setDimensionVersion] = useState(0);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(() => {
        const t = localStorage.getItem('admin_token');
        return (t === 'null' || t === 'undefined') ? null : t;
    });

    // Auth Guard: Redirect if not logged in
    useEffect(() => {
        if (!token) {
            console.warn('Unauthorized access to cinematic editor - redirecting');
            navigate('/admin');
        }
    }, [token, navigate]);
    
    // Track window resize to force re-calculation of relative units
    useEffect(() => {
        const handleResize = () => setDimensionVersion(v => v + 1);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const ensureCompleteLayout = (rawLayout: any): { layout: CinematicLayout, changed: boolean } => {
        const sanitized = JSON.parse(JSON.stringify(rawLayout || {}));
        if (!sanitized.elements) sanitized.elements = {};
        let changed = false;

        // Migration: tv -> scoreboard
        if (sanitized.elements.tv && !sanitized.elements.scoreboard) {
            sanitized.elements.scoreboard = sanitized.elements.tv;
            delete sanitized.elements.tv;
            changed = true;
        }

        Object.keys(DEFAULT_ELEMENTS).forEach(k => {
            const key = k as keyof CinematicLayout['elements'];
            let e = sanitized.elements[key];
            if (!e || 
                typeof e.x !== 'number' || isNaN(e.x) ||
                typeof e.y !== 'number' || isNaN(e.y) ||
                typeof e.width !== 'number' || isNaN(e.width) ||
                typeof e.height !== 'number' || isNaN(e.height)) {
                
                sanitized.elements[key] = { ...DEFAULT_ELEMENTS[key] };
                changed = true;
            } else {
                // Percentage clamping: Force 0-100 range and remove pixels
                const originalX = e.x;
                e.x = Math.max(0, Math.min(100, e.x > 100 ? (e.x / 1440) * 100 : (e.x || 0)));
                e.y = Math.max(0, Math.min(100, e.y > 100 ? (e.y / 900) * 100 : (e.y || 0)));
                e.width = Math.max(1, Math.min(100, e.width > 100 ? (e.width / 1440) * 100 : (e.width || 10)));
                e.height = Math.max(1, Math.min(100, e.height > 100 ? (e.height / 900) * 100 : (e.height || 10)));
                if (Math.abs(e.x - originalX) > 0.01) changed = true;
            }
        });
        return { layout: sanitized as CinematicLayout, changed };
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/rooms');
                if (!res.ok) throw new Error('Failed to fetch rooms');
                const rooms = await res.json();
                const found = rooms.find((r: any) => r.id === roomId);

                if (found) {
                    setRoom(found);
                    const { layout: sanitized, changed } = ensureCompleteLayout(found.cinematicLayout);
                    
                    // No background fallback here - let it be null/empty if missing
                    setLayout(sanitized);
                    
                    // AUTO-RESCUE: Persist fix if database was corrupted
                    if (changed) {
                        console.warn("Auto-Rescue: Persisting sanitized layout for", roomId);
                        // SILENT SAVE for auto-rescue
                        setTimeout(() => {
                            handleSave(false, true);
                        }, 500);
                    }
                } else {
                    setError(`Room "${roomId}" not found.`);
                }
            } catch (err: any) {
                console.error('Editor load error:', err);
                setError(err.message);
            }
        };
        fetchData();
    }, [roomId]);

    const handleSave = async (asDefault = false, silent = false) => {
        if (!layout || !room) return;
        if (!silent) setIsSaving(true);
        try {
            const endpoint = asDefault ? '/api/cinematic/default' : `/api/rooms/${roomId}/cinematic-layout`;
            const method = asDefault ? 'POST' : 'PATCH';
            const currentToken = localStorage.getItem('admin_token');

            const res = await fetch(endpoint, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(layout)
            });

            if (res.ok && !silent) {
                alert(asDefault ? 'Saved as global default!' : 'Room layout saved!');
            }
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            if (!silent) setIsSaving(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !room) return;
        
        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
            alert("File too large (max 10MB)");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('background', file);
        if (!token) {
            alert("Your session has expired. Please log in again.");
            navigate('/admin');
            return;
        }

        try {
            const res = await fetch(`/api/rooms/${roomId}/cinematic/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                // Persist the new background URL locally to avoid waiting for fetch
                setLayout(prev => prev ? { ...prev, backgroundUrl: data.url } : null);
                setBgVersion(Date.now());
                console.log('Background upload success:', data.url);
            } else {
                const errData = await res.json().catch(() => ({ error: 'Upload failed' }));
                alert(`Upload failed: ${errData.error || res.statusText}`);
            }
        } catch (err: any) {
            console.error('Upload failed', err);
            alert(`Upload system error: ${err.message}`);
        } finally {
            setUploading(false);
            // Clear the input so it triggers again for the same file if needed
            e.target.value = '';
        }
    };

    const resetLayout = () => {
        if (!confirm('Are you sure you want to reset the layout to factory defaults? All custom positions will be lost.')) return;
        setLayout(prev => {
            if (!prev) return { elements: JSON.parse(JSON.stringify(DEFAULT_ELEMENTS)) } as any;
            return {
                ...prev,
                elements: JSON.parse(JSON.stringify(DEFAULT_ELEMENTS))
            };
        });
    };

    const updateElement = (key: string, bounds: any) => {
        if (!layout || !container) return;
        const cont = container.getBoundingClientRect();
        
        // CRITICAL: Fail fast if container measurement is invalid
        if (cont.width === 0 || cont.height === 0 || isNaN(cont.width)) {
            console.warn("Skipping update: invalid container measurement", cont);
            return;
        }

        setLayout(prev => {
            if (!prev) return null;

            const newX = Math.max(0, Math.min(100, (bounds.x / cont.width) * 100));
            const newY = Math.max(0, Math.min(100, (bounds.y / cont.height) * 100));
            const newW = Math.max(1, Math.min(100, (bounds.width / cont.width) * 100));
            const newH = Math.max(1, Math.min(100, (bounds.height / cont.height) * 100));

            // Prevent saving junk data
            if (isNaN(newX) || isNaN(newW)) return prev;

            return {
                ...prev,
                elements: {
                    ...prev.elements,
                    [key]: {
                        ...prev.elements[key as keyof CinematicLayout['elements']],
                        x: newX,
                        y: newY,
                        width: newW,
                        height: newH
                    }
                }
            };
        });
    };

    const toggleVisibility = (key: keyof CinematicLayout['elements']) => {
        setLayout(prev => {
            if (!prev) return null;
            
            // Safe initialization: Merge with DEFAULT_ELEMENTS to ensure x, y, width, height are all present if the server state was partial
            const currentElem = {
                ...DEFAULT_ELEMENTS[key],
                ...(prev.elements[key] || {})
            };
            
            return {
                ...prev,
                elements: {
                    ...prev.elements,
                    [key]: { 
                        ...currentElem, 
                        visible: !currentElem.visible 
                    }
                }
            };
        });
    };

    const rescueLayout = () => {
        const rescued: any = {};
        Object.keys(DEFAULT_ELEMENTS).forEach((k) => {
            const key = k as keyof typeof DEFAULT_ELEMENTS;
            rescued[key] = { ...DEFAULT_ELEMENTS[key], visible: true };
        });
        
        setLayout(prev => {
            if (!prev) return null;
            return {
                ...prev,
                elements: rescued
            };
        });
        
        // Save immediately to persist the rescue
        setIsSaving(true);
        if (socket) {
            socket.emit('update-room', {
                ...room,
                cinematicLayout: {
                    ...layout,
                    elements: rescued
                }
            });
        }
        setTimeout(() => setIsSaving(false), 500);
    };

    if (error) {
        return (
            <div className="editor-loading">
                <div style={{ color: '#ef4444', marginBottom: '1rem' }}>ERROR</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7, maxWidth: '300px' }}>{error}</div>
                <button onClick={() => navigate('/admin')} className="action-btn secondary" style={{ marginTop: '2rem' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
        );
    }

    if (!room || !layout) return <div className="editor-loading">Loading Node...</div>;

    const palette = resolvePalette(room);

    const renderRnd = (key: string, title: string, content: React.ReactNode) => {
        const elem = layout.elements[key as keyof CinematicLayout['elements']];
        if (!elem) return null;
        
        // Robust container measurement with fallbacks
        const cont = container ? container.getBoundingClientRect() : null;
        const width = cont && cont.width > 0 ? cont.width : 1200;
        const height = cont && cont.height > 0 ? cont.height : 700;

        // SAFE VALUES: Fallback to defaults if layout properties are somehow NaN or missing
        const safeW = typeof elem.width === 'number' && !isNaN(elem.width) ? elem.width : DEFAULT_ELEMENTS[key as keyof typeof DEFAULT_ELEMENTS].width;
        const safeH = typeof elem.height === 'number' && !isNaN(elem.height) ? elem.height : DEFAULT_ELEMENTS[key as keyof typeof DEFAULT_ELEMENTS].height;
        const safeX = typeof elem.x === 'number' && !isNaN(elem.x) ? elem.x : DEFAULT_ELEMENTS[key as keyof typeof DEFAULT_ELEMENTS].x;
        const safeY = typeof elem.y === 'number' && !isNaN(elem.y) ? elem.y : DEFAULT_ELEMENTS[key as keyof typeof DEFAULT_ELEMENTS].y;

        // MINIMUM SIZE GUARD: Ensure items are always at least 50px in the editor for visibility
        const pixelSize = { 
            width: Math.max(50, (safeW / 100) * width), 
            height: Math.max(50, (safeH / 100) * height) 
        };
        const pixelPos = { 
            x: (safeX / 100) * width, 
            y: (safeY / 100) * height 
        };

        // VISUAL OVERFLOW SHIELD: overflow hidden prevents NaN-scaled icons from exploding
        return (
            <Rnd
                key={`${key}-${dimensionVersion}-${elem.visible}`}
                size={pixelSize}
                position={pixelPos}
                onDragStop={(_, d) => updateElement(key as any, { x: d.x, y: d.y, width: pixelSize.width, height: pixelSize.height })}
                onResizeStop={(_e, _direction, ref, _delta, position) => {
                    updateElement(key as any, { 
                        width: ref.offsetWidth, 
                        height: ref.offsetHeight, 
                        ...position 
                    });
                }}
                bounds="parent"
                dragHandleClassName="drag-handle"
                className={`editor-rnd-box ${elem.visible ? '' : 'hidden-element'}`}
                style={{ 
                    overflow: 'visible', 
                    border: `1px solid ${palette.primary}4D`, 
                    display: elem.visible ? 'block' : 'none', 
                    zIndex: 50,
                    maxWidth: '100%',
                    maxHeight: '100%'
                }}
            >
                <div className="rnd-header" style={{ borderTop: `2px solid ${palette.primary}` }}>
                    <div className="drag-handle">
                        <Move size={12} style={{ marginRight: '6px', opacity: 0.8 }} />
                        <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: elem.visible ? '#10b981' : '#6b7280',
                            boxShadow: elem.visible ? '0 0 10px #10b981' : 'none',
                            marginRight: '8px',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }} title={elem.visible ? 'Visible' : 'Hidden'} />
                        <span style={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.5px' }}>{title}</span>
                    </div>
                    <button onClick={() => toggleVisibility(key as any)} className="rnd-close-btn" title="Hide">
                        <EyeOff size={12} />
                    </button>
                </div>
                <div className="rnd-content">
                    {content}
                </div>
            </Rnd>
        );
    };

    return (
        <div className="editor-root" style={{
            '--palette-primary': palette.primary,
            '--palette-secondary': palette.secondary,
            '--palette-primary-rgb': hexToRgb(palette.primary),
            '--palette-secondary-rgb': hexToRgb(palette.secondary),
            '--palette-primary-glow': palette.primaryGlow,
            '--palette-secondary-glow': palette.secondaryGlow
        } as React.CSSProperties}>
            
            {/* Toolbar */}
            <div className="editor-toolbar">
                <div className="toolbar-section">
                    <button className="icon-btn" onClick={() => navigate('/admin')} title="Back to Admin">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="toolbar-divider" />
                    <h2 className="room-title">{room.name} <span className="title-tag">Cinematic Config</span></h2>
                </div>

                <div className="toolbar-section">
                    <label className="upload-btn">
                        <Upload size={16} /> {uploading ? 'Uploading...' : 'Background'}
                        <input type="file" onChange={handleUpload} accept="image/*" hidden />
                    </label>
                    <div className="toolbar-divider" />
                    <button className="action-btn secondary" onClick={resetLayout} title="Reset to Defaults">
                        <RotateCcw size={14} /> Reset
                    </button>
                    <div className="toolbar-divider" />
                    <button className="icon-btn" onClick={() => handleSave(true)} disabled={isSaving} title="Save as Global Default">
                        <History size={18} />
                    </button>
                    <button className="action-btn primary" onClick={() => handleSave(false)} disabled={isSaving}>
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Layout'}
                    </button>
                    <button className="launch-btn" onClick={() => window.open(`/cinematic/${roomId}`, '_blank')}>
                        <Play size={16} /> Launch View
                    </button>
                </div>
            </div>

            {/* Editor Workspace */}
            <div className="editor-workspace" ref={setContainer}>
                <div className="cinematic-bg" style={{ 
                    backgroundImage: layout.backgroundUrl ? `url("${layout.backgroundUrl}?v=${bgVersion}")` : 'none',
                    zIndex: 1
                }} />
                <div className="cinematic-vignette" />
                <div className="cinematic-lighting" />
                <div className="projector-beam" />

                {/* Interactive Elements */}
                {renderRnd('projector', 'Game Screen (Projector)', (
                    <div className="projector-screen-preview">
                        <div className="preview-label" style={{ color: palette.primary }}>LIVE GAME TRANSMISSION</div>
                    </div>
                ))}

                {renderRnd('scoreboard', 'Scoreboard (Retro TV)', (
                    <div className="retro-tv-preview">
                        <div className="tv-content">
                             <div className="tv-scores">
                                <div className="tv-team-score" style={{ color: palette.secondary }}><div className="tv-team-val">00</div></div>
                             </div>
                        </div>
                    </div>
                ))}

                {renderRnd('qrLeft', 'QR Portal (Left)', (
                    <div className="qr-preview-box">
                        <JoinQR side="left" minimal />
                    </div>
                ))}

                {renderRnd('qrRight', 'QR Portal (Right)', (
                    <div className="qr-preview-box">
                        <JoinQR side="right" minimal />
                    </div>
                ))}

                {renderRnd('telemetry', 'Telemetry Data', (
                    <div className="telemetry-preview">
                        <div style={{ color: palette.secondary, fontSize: '0.65rem', fontWeight: 900 }}>SYSTEM TELEMETRY</div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <div style={{ width: '30px', height: '4px', background: palette.primary, opacity: 0.5 }}></div>
                            <div style={{ width: '20px', height: '4px', background: palette.secondary, opacity: 0.5 }}></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Side Controls */}
            <div className="side-controls-container">
                {/* Element Toggles */}
                <div 
                    className="element-controls" 
                    style={{ 
                        opacity: 1, 
                        pointerEvents: 'auto',
                        transition: 'opacity 0.3s ease'
                    }}
                >
                    <h3>Elements</h3>
                    {Object.keys(layout.elements).map((key) => {
                        const isVisible = layout.elements[key as keyof CinematicLayout['elements']].visible;
                        const label = key === 'tv' || key === 'scoreboard' ? 'SCOREBOARD' : key.toUpperCase();
                        
                        return (
                            <div key={key} className="control-item">
                                <span>{label}</span>
                                <button 
                                    className={`toggle-btn ${isVisible ? 'on' : 'off'}`}
                                    onClick={() => toggleVisibility(key as any)}
                                    title={isVisible ? 'Remove Element' : 'Add Element'}
                                >
                                    {isVisible ? <Eye size={14} /> : <div className="plus-icon">+</div>}
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="admin-sidebar-section">
                    <h3 className="section-title">Emergency Rescue</h3>
                    <button 
                        className="rescue-btn"
                        onClick={() => {
                            if (confirm('Force-initialize all elements to safe positions?')) {
                                const { layout: sanitized } = ensureCompleteLayout({ elements: {} });
                                setLayout(prev => ({ ...prev, elements: sanitized.elements } as any));
                            }
                        }}
                    >
                        RESCUE ELEMENTS
                    </button>
                    <button 
                        className="reset-btn"
                        onClick={resetLayout}
                        style={{ marginTop: '8px' }}
                    >
                        RESET ALL
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CinematicEditorView;
