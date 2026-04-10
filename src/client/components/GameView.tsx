/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext.js'
import './PresenterStyles.css'
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  COLORS 
} from '../../shared/constants.js'

// Strategy Renderers
import { renderPaddleBattle } from '../renderers/renderPaddleBattle.js'
import { renderVipers } from '../renderers/renderVipers.js'
import { renderBrickBurst } from '../renderers/renderBrickBurst.js'
import { PALETTES, PALETTES as RICH_PALETTES } from './PresenterView.js' // Reuse the glow-aware palettes

const GameView: React.FC = () => {
  const { socket } = useSocket()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { roomId = 'default' } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<any>(null)

  useEffect(() => {
    const fetchRoom = async () => {
      const res = await fetch('/api/rooms')
      if (res.ok) {
        const rooms = await res.json()
        const found = rooms.find((r: any) => r.id === roomId)
        if (found) setRoom(found)
      }
    }
    fetchRoom()
  }, [roomId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !socket) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Join the specified room
    socket.emit('join-room', roomId)
    
    const handleRoomDeleted = () => {
      alert('This room has been deleted by an administrator.')
      navigate('/admin')
    }

    const handleUpdate = (state: any) => {
      const gameType = state.gameType || 'paddle-battle';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background / Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Execute Strategy based on game type
      switch(gameType) {
        case 'paddle-battle': renderPaddleBattle(ctx, state, canvas); break;
        case 'vipers': renderVipers(ctx, state); break;
        case 'brick-burst': renderBrickBurst(ctx, state, canvas); break;
      }

      renderOverlays(ctx, state, canvas);
    };

    const renderOverlays = (ctx: CanvasRenderingContext2D, state: any, canvas: HTMLCanvasElement) => {
      const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
      const gameType = state.gameType || 'paddle-battle';

      // Consistent overlay font definitions
      const FONT_PRIMARY = '900 72px "Outfit", sans-serif';
      const FONT_SECONDARY = '700 28px "Outfit", sans-serif';
      const FONT_COUNTDOWN = '900 120px "Outfit", sans-serif';
      const COLOR_ACCENT = '#00ffcc';
      const COLOR_WARNING = '#fbbf24';

      if (state.status === 'goal') {
        // Seethrough glass effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, canvas.height / 2 - 100, canvas.width, 200);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(-1, canvas.height / 2 - 100, canvas.width + 2, 200);

        ctx.shadowBlur = 40 + pulse * 20;

        ctx.shadowColor = COLOR_ACCENT;
        ctx.fillStyle = COLOR_ACCENT;
        ctx.font = FONT_PRIMARY;
        ctx.textAlign = 'center';
        ctx.fillText('GOAL!', canvas.width / 2, canvas.height / 2);
      }

      if (state.status === 'countdown' && state.countdown !== undefined) {
        // Seethrough glass effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, canvas.height / 2 - 100, canvas.width, 200);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(-1, canvas.height / 2 - 100, canvas.width + 2, 200);

        ctx.shadowBlur = 40 + pulse * 20;
        ctx.shadowColor = COLOR_ACCENT;
        ctx.fillStyle = COLOR_ACCENT;
        ctx.font = FONT_COUNTDOWN;
        ctx.textAlign = 'center';

        const displayValue = state.countdown > 0 ? state.countdown.toString() : 'GO!';
        ctx.fillText(displayValue, canvas.width / 2, canvas.height / 2 + 40);
      }

      if (state.status === 'ending' && state.countdown !== undefined) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = COLOR_WARNING;
        ctx.font = FONT_SECONDARY;
        ctx.fillText('MATCH ENDING IN', canvas.width / 2, canvas.height / 2 - 80);
        ctx.shadowBlur = 30 + pulse * 30;
        ctx.shadowColor = COLOR_WARNING;
        ctx.font = FONT_COUNTDOWN;
        ctx.fillText(state.countdown.toString(), canvas.width / 2, canvas.height / 2 + 60);
      }

      if (state.status === 'finished') {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = FONT_PRIMARY;
        ctx.textAlign = 'center';
        ctx.fillText('MISSION COMPLETE', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = FONT_SECONDARY;
        ctx.fillStyle = COLOR_ACCENT;
        ctx.fillText('Check scoreboard for results', canvas.width / 2, canvas.height / 2 + 40);
      } else if (state.status === 'playing' || gameType === 'paddle-battle') {
          // Check for missing players
          const teams = state.teams || state.entities || {};
          const missingTeams: any[] = [];
          
          Object.values(teams).forEach((t: any) => {
              const isGhost = false;
              if (!isGhost && (!t.players || t.players.length === 0)) {
                  missingTeams.push(t);
              }
          });

          if (missingTeams.length > 0) {
              const allMissing = missingTeams.length === Object.values(teams).length;
              
              // Glassmorphism banner
              ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
              ctx.fillRect(0, canvas.height / 2 - 80, canvas.width, 160);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
              ctx.strokeRect(-1, canvas.height / 2 - 80, canvas.width + 2, 160);

              ctx.textAlign = 'center';
              ctx.letterSpacing = '6px';
              ctx.shadowBlur = 10 + pulse * 15;

              if (allMissing) {
                  ctx.shadowColor = COLOR_ACCENT;
                  ctx.fillStyle = COLOR_ACCENT;
                  ctx.font = '900 36px "Outfit", sans-serif';
                  ctx.fillText('WAITING FOR PARTICIPANTS', canvas.width / 2, canvas.height / 2 - 10);
                  
                  ctx.shadowBlur = 0;
                  ctx.letterSpacing = '1px';
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  ctx.font = '400 italic 20px "Outfit", sans-serif';
                  ctx.fillText('Scan QR code or use the link to jump in!', canvas.width / 2, canvas.height / 2 + 40);
              } else {
                  const joining = missingTeams.map(t => (t.side || t.name || t.id).toUpperCase()).join(' & ');
                  ctx.shadowColor = COLOR_WARNING;
                  ctx.fillStyle = COLOR_WARNING;
                  ctx.font = '900 36px "Outfit", sans-serif';
                  ctx.fillText(`JOIN TEAM: ${joining}`, canvas.width / 2, canvas.height / 2 - 10);

                  ctx.shadowBlur = 0;
                  ctx.letterSpacing = '1px';
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  ctx.font = '400 italic 20px "Outfit", sans-serif';
                  ctx.fillText('Game starts as soon as all teams are filled!', canvas.width / 2, canvas.height / 2 + 40);
              }
          }
      }
      
      // Render Player Counts in upper corners
      const teams = state.teams || state.entities || {};
      let leftTeam: any = null;
      let rightTeam: any = null;

      if (teams.left) leftTeam = teams.left;
      if (teams.right) rightTeam = teams.right;


      if (!leftTeam || !rightTeam) {
        Object.values(teams).forEach((t: any) => {
          if (t.side === 'left' && !leftTeam) leftTeam = t;
          if (t.side === 'right' && !rightTeam) rightTeam = t;
        });
      }

      const teamList = Object.values(teams);
      if (!leftTeam && teamList.length > 0) leftTeam = teamList[0];
      if (!rightTeam && teamList.length > 1) rightTeam = teamList[1];

      ctx.font = '900 24px "Outfit", sans-serif';
      ctx.shadowBlur = 15;
      
      if (leftTeam) {
        const count = leftTeam.players?.length || 0;
        const teamColor = leftTeam.color || COLORS.LEFT_TEAM;
        ctx.fillStyle = teamColor;
        ctx.shadowColor = teamColor;
        ctx.textAlign = 'left';
        ctx.fillText(`${count} Players`, 20, 35);
      }

      if (rightTeam) {
        const count = rightTeam.players?.length || 0;
        const teamColor = rightTeam.color || COLORS.RIGHT_TEAM;
        ctx.fillStyle = teamColor;
        ctx.shadowColor = teamColor;
        ctx.textAlign = 'right';
        ctx.fillText(`${count} Players`, canvas.width - 20, 35);
      }

      ctx.shadowBlur = 0;
    };

    socket.on('game-state', handleUpdate)
    socket.on('room-deleted', handleRoomDeleted)
    
    return () => { 
      socket.off('game-state', handleUpdate)
      socket.off('room-deleted', handleRoomDeleted)
    }
  }, [socket, roomId, navigate])

  const palette = RICH_PALETTES[room?.palette || 'cyber-cyan'] || RICH_PALETTES['cyber-cyan'];

  return (
    <div className="presenter-main" style={{ 
      width: '100vw',
      height: '100vh', 
      overflow: 'hidden',
      '--palette-primary': palette.primary,
      '--palette-secondary': palette.secondary,
      '--palette-primary-glow': palette.primaryGlow,
      '--palette-secondary-glow': palette.secondaryGlow
    } as React.CSSProperties}>
      <div className="presenter-bg" />
      <div className="presenter-grid" />
      
      <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
      }}>
          <canvas 
            ref={canvasRef} 
            width={GAME_WIDTH} 
            height={GAME_HEIGHT} 
            style={{ 
              width: '100vw', 
              height: '100vh', 
              objectFit: 'contain',
              aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
              filter: 'drop-shadow(0 0 50px rgba(0,0,0,0.8))'
            }} 
          />
      </div>
    </div>
  )
}

export default GameView
