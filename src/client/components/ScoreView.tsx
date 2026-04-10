/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext.js'

const ScoreView: React.FC = () => {
  const { socket } = useSocket()
  const [gameState, setGameState] = useState<any>(null) 
  const { roomId = 'default' } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!socket) return
    socket.emit('join-room', roomId)

    const handleRoomDeleted = () => {
      alert('This room has been deleted by an administrator.')
      navigate('/admin')
    }

    const handleUpdate = (state: any) => {
      setGameState(state)
    }
    socket.on('game-state', handleUpdate)
    socket.on('room-deleted', handleRoomDeleted)

    return () => { 
      socket.off('game-state', handleUpdate)
      socket.off('room-deleted', handleRoomDeleted)
    }
  }, [socket, roomId, navigate])

  if (!gameState) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020617', color: 'white', fontWeight: 900, letterSpacing: '0.25em', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
        CONNECTING TO SCORE FEED...
      </div>
    )
  }

  // Get scores from teams
  const scores: { id: string; name: string; score: number; color: string }[] = []
  
  if (gameState.teams) {
      Object.entries(gameState.teams).forEach(([id, team]: [string, any]) => {
          scores.push({
              id,
              name: team.name || id,
              score: team.score || 0,
              color: team.color || '#fff'
          })
      })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '500px', background: 'rgba(59, 130, 246, 0.1)', filter: 'blur(150px)', borderRadius: '9999px' }}></div>
      
      <header style={{ position: 'relative', zIndex: 10, marginBottom: '4rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '0.5rem' }}>Live Score Feedback</h1>
          <div style={{ height: '2px', width: '8rem', background: 'rgba(255, 255, 255, 0.2)', margin: '0 auto' }}></div>
      </header>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '4rem' }}>
        {scores.map((s) => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', transition: 'all 0.3s ease', color: s.color }}>
                    {s.name}
                </div>
                <div style={{ fontSize: '120px', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.7s ease', color: s.color, textShadow: `0 0 40px ${s.color}66` }}>
                    {s.score.toString().padStart(2, '0')}
                </div>
            </div>
        ))}
      </div>

    </div>
  )
}

export default ScoreView
