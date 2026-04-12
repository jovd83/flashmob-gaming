/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { Routes, Route, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import GameView from './components/GameView.js'
import ScoreView from './components/ScoreView.js'
import PlayerController from './components/PlayerController.js'
import JoinQR from './components/JoinQR.js'
import ManagementView from './components/ManagementView.js'
import RoomLanding from './components/RoomLanding.js'
import PresenterView from './components/PresenterView.js'
import LogView from './components/LogView.js'
import { QRBaseURLProvider } from './context/QRBaseURLContext.js'
import SettingsView from './components/SettingsView.js'
import ErrorBoundary from './components/ErrorBoundary.js'
import LandingPage from './components/LandingPage.js'
import CinematicRoomView from './components/CinematicRoomView.js'
import CinematicEditorView from './components/admin/CinematicEditorView.js'

const URLResolver: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const roomID = searchParams.get('roomID')
    const roomName = searchParams.get('roomName')
    const leftQR = searchParams.get('leftQR')
    const rightQR = searchParams.get('rightQR')
    const score = searchParams.get('score')

    if (!roomID && !roomName && !leftQR && !rightQR && !score) return

    const resolve = async () => {
      const queryValue = roomID || roomName || leftQR || rightQR || score
      let view = 'game'
      let side = ''

      if (leftQR) { view = 'qr'; side = 'left'; }
      else if (rightQR) { view = 'qr'; side = 'right'; }
      else if (score) { view = 'score'; }

      try {
        const res = await fetch('/api/rooms')
        const rooms = await res.json()
        // Find room by ID or Name
        const room = rooms.find((r: any) => 
          r.id === queryValue || 
          r.name === queryValue
        )

        if (room) {
          let path = `/${view}/${room.id}`
          if (side) path += `?side=${side}`
          navigate(path, { replace: true })
        }
      } catch (_err) {
        // Silently fail URL resolution if room not found
      }
    }

    resolve()
  }, [searchParams, navigate])

  return null
}

import { SocketProvider } from './context/SocketContext.js'

const App: React.FC = () => {
  return (
    <SocketProvider>
      <QRBaseURLProvider>
        <div className="app-container">
          <ErrorBoundary>
            <URLResolver />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/admin" element={<ManagementView />} />
              <Route path="/game/:roomId" element={<GameView />} />
              <Route path="/score/:roomId" element={<ScoreView />} />
              <Route path="/qr/:roomId" element={<JoinQR />} />
              <Route path="/player/:roomId" element={<PlayerController />} />
              <Route path="/presenter/:roomId" element={<PresenterView />} />
              <Route path="/cinematic/:roomId" element={<CinematicRoomView />} />
              <Route path="/admin/cinematic" element={<Navigate to="/admin/cinematic/default" replace />} />
              <Route path="/admin/cinematic/:roomId" element={<CinematicEditorView />} />
              <Route path="/logs/:roomId" element={<LogView />} />
              <Route path="/settings" element={<SettingsView />} />
              
              {/* Backward compatibility / Legacy routes */}
              <Route path="/game" element={<GameView />} />
              <Route path="/score" element={<ScoreView />} />
              <Route path="/qr" element={<JoinQR />} />
              <Route path="/player" element={<PlayerController />} />
              <Route path="/presenter" element={<PresenterView />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </QRBaseURLProvider>
    </SocketProvider>
  )
}

export default App
