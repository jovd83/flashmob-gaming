# ⚡ FlashMob Games

**The Collective Gaming Experience.**

FlashMob Games is a real-time, large-scale multiplayer gaming platform designed for presentations, events, and massive audience engagement. Built with a high-performance **Node.js/Socket.io** backend and a premium **React 19** frontend, it enables hundreds of players to control shared game entities simultaneously via their smartphones.

---

## 📸 System Overview

### Architecture Context
```mermaid
graph TD
    subgraph Client_Layer [Frontend: React 19 & Vite 8]
        LP[Landing Page /]
        PV[Presenter View /presenter]
        PC[Player Controller /player]
        AV[Admin View /admin]
    end

    subgraph Server_Layer [Backend: Node.js 25 & Express 5]
        API[Express API]
        SIO[Socket.io Server]
        RM[Room Manager]
        GE[Game Engines]
        BS[Bot Service]
    end

    PC <-->|Real-time Socket.io| SIO
    PV <-->|Real-time Socket.io| SIO
    AV -->|REST API Auth| API
    API --> RM
    RM <--> GE
    RM <--> BS
```

### Collective Input Data Flow
```mermaid
sequenceDiagram
    participant P as Multiple Players
    participant S as Socket.io Server (Node)
    participant E as Game Engine (60 FPS)
    participant V as Projected Display (Presenter)

    P->>S: Individual Input (Up/Down/Move)
    Note over S: Buffers inputs for synchronous tick
    E->>S: Request Aggregated Inputs
    S-->>E: [Input_Vector_Map]
    Note over E: Calculate Collective Mean/Vote
    E->>E: Physics & Collision Resolve
    E->>S: Broadcast State
    S->>V: Frame Update (JSON)
```

---

## 🎮 Supported Games

Manage boredom with high-octane collective action:
- **Paddle Battle**: High-speed team-based paddle sports.
- **Brick Burst**: Collaborative brick-breaking with additive impulse physics.
- **Vipers**: Multi-team survival; lead your collective snake to dominance.

---

## 🛠️ Technical Stack

Built with state-of-the-art web technologies for maximum performance and stability:

- **Frontend**: 
  - **Framework**: `React 19` + `Vite 8`
  - **Routing**: `React Router Dom 7`
  - **Real-time**: `Socket.io-client 4`
  - **Styling**: Vanilla CSS (Custom Glassmorphism & HSL Design System)
  - **Icons**: `Lucide-React`

- **Backend**: 
  - **Runtime**: `Node.js 25.5`
  - **Server**: `Express 5`
  - **Real-time Engine**: `Socket.io 4 (WebSockets)`
  - **Logging**: `Pino` + `Pino-Pretty`
  - **Validation**: `Zod` (Shared Schemas)
  - **Auth**: `JSON Web Tokens (JWT)`

---

## 🕹️ Operational Management

The platform includes a secured **Management Dashboard** for session operators.

### 1. Accessing the Dashboard
- **URL**: `http://localhost:5173/admin`
- **Authentication**: Credentials are managed via the `.env` file.
    - Default Username: `operator`
    - Default Password: `operator`

### 2. How to Start a Session
1. **Initialize Room**: Log in to the dashboard and navigate to the **Initialize Room** panel.
2. **Deploy**: Select a game type (e.g., `Brick Burst`), name your room, and click **Deploy Room**.
3. **Project**: Click **Host** to open the main game display on your projector.
4. **Join**: Navigate to the **Join** view or show the generated QR codes. Players can scan to join the "Left" or "Right" collective.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 22.x or later.
- **npm** 10.x or later.

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure your environment:
   ```bash
   cp .env.example .env
   # Update credentials in .env
   ```

### Running the Platform
1. Start the development environment:
   ```bash
   npm run dev:server
   npm run dev:client
   ```
2. Access the views:
   - **Management**: `/admin`
   - **Landing Page**: `/`
   - **Game Display**: `/presenter`

---

## 📜 Licensing & Commercial Use

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

*   **Personal Use**: Free! You can host a game for your friends or family.
*   **Educational Use**: Free! You can use this to learn or teach.
*   **Commercial Use**: Requires a paid license. If you are a company, an event organizer charging for tickets, or if you intend to rewrite/distribute this code for profit, you must at least [![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange.svg)](https://buymeacoffee.com/jovd83) to obtain a commercial license.

---

&copy; 2026 **FlashMob Games**. Maintained by **jovd83**.

