/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext.js'
import { COLORS } from '../../shared/constants.js'
import { Smartphone, RefreshCw } from 'lucide-react'

const PlayerController: React.FC = () => {
  const { socket } = useSocket()
  const [team, setTeam] = useState<string | null>(null)
  const { roomId = 'default-room' } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [gameState, setGameState] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [pressedButton, setPressedButton] = useState<string | null>(null)
  const [gyroActive, setGyroActive] = useState(false)
  const [gyroPermission, setGyroPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const [useGyroscope, setUseGyroscope] = useState(localStorage.getItem('use_gyroscope') !== 'false')
  const [isSecure, setIsSecure] = useState(true)
  const [hasSelectedMode, setHasSelectedMode] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
        if (window.isSecureContext === false) {
            setIsSecure(false)
        }
        
        // Stabilize: Perform initial permission check after mount
        const DOE = (window as any).DeviceOrientationEvent
        if (DOE && typeof DOE.requestPermission === 'function') {
            setGyroPermission('default')
        } else {
            setGyroPermission('granted')
        }
    }
  }, [])

  const isInactive = gameState?.status === 'goal' || gameState?.status === 'finished'
  const isEnding = gameState?.status === 'ending'
  const isFinished = gameState?.status === 'finished'
  const gameType = gameState?.gameType || 'paddle-battle'

  useEffect(() => {
    if (!socket) return
    socket.emit('join-room', roomId)

    const handleRoomDeleted = () => {
      alert('This room has been deleted by an administrator.')
      navigate('/')
    }

    const handleTeamAssigned = (side: string) => {
        setTeam(side)
        setError(null)
    }
    const handleGameState = (state: any) => setGameState(state)
    const handleError = (msg: string) => setError(msg)

    socket.on('team-assigned', handleTeamAssigned)
    socket.on('room-deleted', handleRoomDeleted)
    socket.on('game-state', handleGameState)
    socket.on('error', handleError)
    
    // Instrument for E2E testing
    if (typeof window !== 'undefined') {
        (window as any).__PLAYER_SOCKET__ = socket;
    }

    const params = new URLSearchParams(window.location.search)
    const teamParam = params.get('team')
    if (teamParam) {
        socket.emit('join-team', teamParam)
    }

    return () => { 
      socket.off('team-assigned', handleTeamAssigned)
      socket.off('room-deleted', handleRoomDeleted)
      socket.off('game-state', handleGameState)
      socket.off('error', handleError)
    }
  }, [socket, roomId, navigate])

  // FIX: Clear input state whenever game becomes inactive (goal/finished)
  useEffect(() => {
    if (isInactive) {
        setPressedButton(null)
    }
  }, [isInactive])

  // Input repetition loop for smooth movement
  useEffect(() => {
    if (!pressedButton || isInactive || !socket) return

    const interval = setInterval(() => {
      socket.emit('move', pressedButton)
    }, 50) // 20 times per second

    return () => clearInterval(interval)
  }, [pressedButton, isInactive, socket])

  // Gyroscope handling
  useEffect(() => {
    if (!useGyroscope || !socket || isInactive || !team) return

    const handleOrientation = (event: DeviceOrientationEvent) => {
        const { beta, gamma } = event
        if (beta === null || gamma === null) return

        if (!gyroActive) return;

        // Handle input based on game type using absolute orientation values
        // Vertical games (e.g. Paddle Battle side paddles)
        if (gameType === 'paddle-battle') {
            const threshold = 10;
            if (beta > threshold) setPressedButton('down');
            else if (beta < -threshold) setPressedButton('up');
            else setPressedButton(null);
        } 
        // Horizontal games (e.g. Brick Burst bottom paddles)
        else if (gameType === 'brick-burst') {
            const threshold = 8; // Lowered for more responsive horizontal play
            if (gamma > threshold) setPressedButton('right');
            else if (gamma < -threshold) setPressedButton('left');
            else setPressedButton(null);
        }
        // 4-Way games (Vipers, Pacman, etc.)
        else {
            const threshold = gameType === 'vipers' ? 8 : 12; // Lower threshold for vipers
            const absB = Math.abs(beta);
            const absG = Math.abs(gamma);
            
            if (absB > threshold || absG > threshold) {
                // Determine direction based on strongest axis
                if (absB > absG) {
                    setPressedButton(beta > 0 ? 'down' : 'up');
                } else {
                    setPressedButton(gamma > 0 ? 'right' : 'left');
                }
            } else {
                setPressedButton(null);
            }
        }
    }

    const DOE = (window as any).DeviceOrientationEvent;
    const isPermissionNotRequired = !DOE || typeof DOE.requestPermission !== 'function';
    
    if (isPermissionNotRequired || gyroActive) {
        window.addEventListener('deviceorientation', handleOrientation)
        if (isPermissionNotRequired && !gyroActive) {
            setGyroActive(true)
        }
    }

    return () => {
        window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [useGyroscope, socket, isInactive, team, gameType])



  const requestGyroPermission = async () => {
    const DOE = (window as any).DeviceOrientationEvent
    if (DOE && typeof DOE.requestPermission === 'function') {
        try {
            const permission = await DOE.requestPermission()
            setGyroPermission(permission)
            if (permission === 'granted') {
                setGyroActive(true)
                setUseGyroscope(true)
                localStorage.setItem('use_gyroscope', 'true')
                return true;
            }
        } catch (err) {
            console.error('Gyro permission error:', err)
            setGyroPermission('denied')
        }
    } else {
        // For devices where permission is not explicitly required (e.g. most Androids/Desktop)
        setGyroActive(true)
        setUseGyroscope(true)
        localStorage.setItem('use_gyroscope', 'true')
        return true;
    }
    return false;
  }

  const handleMove = (direction: string) => {
    socket?.emit('move', direction)
  }

  const handleJoinTeam = (side: string) => {
    socket?.emit('join-team', side)
  }

  const getButtonStyle = (direction: string): React.CSSProperties => {
      const isPressed = pressedButton === direction;
      const teamColor = gameState?.teams?.[team!]?.color || (team === 'left' ? COLORS.LEFT_TEAM : COLORS.RIGHT_TEAM);
      
      // Visual feedback: solid team color when pressed, semi-transparent by default
      const baseShadow = isPressed ? 'none' : `0 10px 20px -5px ${teamColor}60`;
      const gyroGlow = (isPressed && gyroActive) ? `0 0 25px ${teamColor}` : baseShadow;

      return {
          backgroundColor: teamColor,
          color: '#020617',
          borderColor: 'rgba(0,0,0,0.2)',
          borderStyle: 'solid',
          borderWidth: isPressed ? '0 0 2px 0' : '0 0 6px 0',
          transform: isPressed ? 'scale(0.96) translateY(4px)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '2rem',
          transition: 'all 0.05s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          width: '100%',
          height: '100%',
          boxShadow: gyroGlow,
          opacity: isInactive ? 0.3 : (isPressed ? 1 : 0.8),
          filter: isPressed ? 'brightness(1.2) saturate(1.2)' : 'none'
      }
  }

  if (!team) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'white', background: '#020617', padding: '2rem', textAlign: 'center', gap: '3rem' }}>
        {error ? (
          <div style={{ maxWidth: '24rem' }}>
            <div style={{ width: '5rem', height: '5rem', background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(244, 63, 94, 0.5)' }}>
              <svg style={{ width: '2.5rem', height: '2.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Connection Failed</h1>
            <p style={{ fontSize: '0.875rem', opacity: 0.6, marginBottom: '2.5rem', fontFamily: 'monospace', fontStyle: 'italic' }}>[{error.toUpperCase()}]</p>
            <button 
                onClick={() => navigate('/')} 
                style={{ width: '100%', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1rem', color: 'white', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
            >
                Return to Landing
            </button>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
                <div style={{ width: '6rem', height: '6rem', border: '4px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', borderRadius: '9999px', animation: 'spin 1s linear infinite' }}></div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Choose Your Side</h1>
                <p style={{ fontSize: '0.75rem', opacity: 0.4, maxWidth: '24rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Operational Room: {roomId.toUpperCase()}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%', maxWidth: '20rem' }}>
                <button 
                    onClick={() => handleJoinTeam('left')}
                    style={{ position: 'relative', padding: '1.5rem 2rem', background: COLORS.LEFT_TEAM, color: '#020617', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '1rem', border: 'none', cursor: 'pointer', boxShadow: `0 0 30px -10px ${COLORS.LEFT_TEAM}80` }}
                >
                    <span style={{ fontSize: '1.25rem' }}>Join Alpha</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                    <div style={{ height: '1px', flex: 1, background: 'rgba(255, 255, 255, 0.1)' }}></div>
                    <span style={{ fontSize: '10px', fontWeight: 900, opacity: 0.2, textTransform: 'uppercase', letterSpacing: '0.5em' }}>OR</span>
                    <div style={{ height: '1px', flex: 1, background: 'rgba(255, 255, 255, 0.1)' }}></div>
                </div>
                <button 
                    onClick={() => handleJoinTeam('right')}
                    style={{ position: 'relative', padding: '1.5rem 2rem', background: COLORS.RIGHT_TEAM, color: '#020617', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '1rem', border: 'none', cursor: 'pointer', boxShadow: `0 0 30px -10px ${COLORS.RIGHT_TEAM}80` }}
                >
                    <span style={{ fontSize: '1.25rem' }}>Join Omega</span>
                </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'white', padding: '1rem', background: '#020617' }}>
      
      {isFinished ? (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em', marginBottom: '1rem', opacity: 0.5 }}>Mission Terminated</div>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, marginBottom: '2rem', fontStyle: 'italic' }}>FIN</div>
            <button onClick={() => navigate('/')} style={{ padding: '1rem 2rem', background: '#10b981', color: '#020617', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '1rem', border: 'none', cursor: 'pointer' }}>Return to Fleet</button>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isEnding && (
                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                    <span style={{ fontSize: '2.25rem', fontWeight: 900, color: '#f43f5e' }}>{gameState?.countdown}</span>
                </div>
            )}
 
            {/* 4. Mode Selection Screen (Onboarding) */}
            {team && !hasSelectedMode && (
                <div style={{ position: 'fixed', inset: 0, background: '#020617', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 1000 }}>
                    <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                        <div style={{ marginBottom: '3rem' }}>
                            <div style={{ display: 'inline-flex', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                                <Smartphone size={48} style={{ color: '#22d3ee' }} />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.025em' }}>PREPARE FOR BATTLE</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>Enable gyroscope and tilt your phone to play, or use standard touch buttons.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button 
                                onClick={async () => {
                                    const granted = await requestGyroPermission();
                                    if (granted) {
                                        setUseGyroscope(true);
                                        localStorage.setItem('use_gyroscope', 'true');
                                        setHasSelectedMode(true);
                                    } else {
                                        // Fallback if permission rejected but user clicked gyro
                                        alert("Gyroscope permission is required for this mode. Please enable it in your browser settings.");
                                    }
                                }}
                                style={{ 
                                    padding: '1.25rem', borderRadius: '1rem', border: 'none', background: 'white', color: '#020617', 
                                    fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <RefreshCw size={20} />
                                START WITH GYROSCOPE
                            </button>
                            
                            <button 
                                onClick={() => {
                                    setUseGyroscope(false);
                                    localStorage.setItem('use_gyroscope', 'false');
                                    setHasSelectedMode(true);
                                }}
                                style={{ 
                                    padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', 
                                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' 
                                }}
                            >
                                OR PLAY WITH ON-SCREEN BUTTONS
                            </button>
                        </div>

                        <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                            Tip: You can reset this by refreshing the browser.
                        </div>
                    </div>
                </div>
            )}



            {/* Controller Surface */}
            {gameType === 'paddle-battle' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', height: '85vh', maxWidth: '32rem', padding: '0.5rem' }}>
                    <button 
                        onPointerDown={() => {
                            if (!isInactive) {
                                setPressedButton('up');
                                handleMove('up');
                            }
                        }}
                        onPointerUp={() => setPressedButton(null)}
                        onPointerLeave={() => setPressedButton(null)}
                        disabled={isInactive}
                        style={getButtonStyle('up')}
                        aria-label="move-up"
                    >
                        <svg style={{ width: '12rem', height: '12rem', padding: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button 
                        onPointerDown={() => {
                            if (!isInactive) {
                                setPressedButton('down');
                                handleMove('down');
                            }
                        }}
                        onPointerUp={() => setPressedButton(null)}
                        onPointerLeave={() => setPressedButton(null)}
                        disabled={isInactive}
                        style={getButtonStyle('down')}
                        aria-label="move-down"
                    >
                        <svg style={{ width: '12rem', height: '12rem', padding: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>
            ) : gameType === 'brick-burst' ? (
                <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', height: '50vh', maxWidth: '40rem', padding: '0.5rem' }}>
                    <button 
                        onPointerDown={() => {
                            if (!isInactive) {
                                setPressedButton('left');
                                handleMove('left');
                            }
                        }}
                        onPointerUp={() => setPressedButton(null)}
                        onPointerLeave={() => setPressedButton(null)}
                        disabled={isInactive}
                        style={getButtonStyle('left')}
                        aria-label="move-left"
                    >
                        <svg style={{ width: '8rem', height: '8rem', padding: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button 
                        onPointerDown={() => {
                            if (!isInactive) {
                                setPressedButton('right');
                                handleMove('right');
                            }
                        }}
                        onPointerUp={() => setPressedButton(null)}
                        onPointerLeave={() => setPressedButton(null)}
                        disabled={isInactive}
                        style={getButtonStyle('right')}
                        aria-label="move-right"
                    >
                        <svg style={{ width: '8rem', height: '8rem', padding: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            ) : (
                /* 4-Way D-Pad Layout */
                <div style={{ position: 'relative', width: '20rem', height: '20rem' }}>
                    {/* Background Plate */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(30, 41, 59, 0.5)', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}></div>
                    
                    {/* Directional Buttons */}
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '6rem', height: '8rem', zIndex: 10 }}>
                      <button 
                          onPointerDown={() => {
                              if (!isInactive) {
                                  setPressedButton('up');
                                  handleMove('up');
                              }
                          }}
                          onPointerUp={() => setPressedButton(null)}
                          onPointerLeave={() => setPressedButton(null)}
                          style={{ ...getButtonStyle('up'), borderRadius: '2rem 2rem 0 0' }}
                          disabled={isInactive}
                          aria-label="move-up"
                      >
                          <svg style={{ width: '3rem', height: '3rem', padding: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 15l7-7 7 7" /></svg>
                      </button>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '6rem', height: '8rem', zIndex: 10 }}>
                      <button 
                          onPointerDown={() => {
                              if (!isInactive) {
                                  setPressedButton('down');
                                  handleMove('down');
                              }
                          }}
                          onPointerUp={() => setPressedButton(null)}
                          onPointerLeave={() => setPressedButton(null)}
                          style={{ ...getButtonStyle('down'), borderRadius: '0 0 2rem 2rem' }}
                          disabled={isInactive}
                          aria-label="move-down"
                      >
                          <svg style={{ width: '3rem', height: '3rem', padding: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                    <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '8rem', height: '6rem', zIndex: 10 }}>
                      <button 
                          onPointerDown={() => {
                              if (!isInactive) {
                                  setPressedButton('left');
                                  handleMove('left');
                              }
                          }}
                          onPointerUp={() => setPressedButton(null)}
                          onPointerLeave={() => setPressedButton(null)}
                          style={{ ...getButtonStyle('left'), borderRadius: '2rem 0 0 2rem' }}
                          disabled={isInactive}
                          aria-label="move-left"
                      >
                          <svg style={{ width: '3rem', height: '3rem', padding: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: '8rem', height: '6rem', zIndex: 10 }}>
                      <button 
                          onPointerDown={() => {
                              if (!isInactive) {
                                  setPressedButton('right');
                                  handleMove('right');
                              }
                          }}
                          onPointerUp={() => setPressedButton(null)}
                          onPointerLeave={() => setPressedButton(null)}
                          style={{ ...getButtonStyle('right'), borderRadius: '0 2rem 2rem 0' }}
                          disabled={isInactive}
                          aria-label="move-right"
                      >
                          <svg style={{ width: '3rem', height: '3rem', padding: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
 
                    {/* Center Cap */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '4rem', height: '4rem', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', background: gyroActive ? '#10b981' : 'rgba(255,255,255,0.1)', animation: gyroActive ? 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none' }}></div>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  )
}

export default PlayerController
