# UNO Reimagined — AAA Board Platform

A luxurious, high-fidelity browser implementation of UNO, designed to resemble a premium desktop launcher client (like Riot Client/FIFA Ultimate Team). It features frosted glassmorphic styling, server-authoritative multiplayer state synchronization, modular strategic AI solvers, and procedural real-time synth audio generation.

---

## 🌟 Key Features

1. **AAA Visual Language & Animations**:
   - futuristic glassmorphism theme with dark cyber accents.
   - Smooth hover scaling, card dealing overlaps, and victory celebrations.
   - Built with Tailwind CSS and Framer Motion.

2. **Server-Authoritative Game Engine**:
   - Strict server verification of every play, draw, pass, and Uno call action.
   - Built-in tolerances for network disconnects: automatically swaps players with tactical AI proxies after 15 seconds to prevent stall blocks, allowing reconnect resumes.
   - Customizable game rulesets (stacking, 7-0 hand-swaps, jump-ins, custom timers).

3. **Advanced AI Strategic Solver**:
   - Multi-persona agents: *Strategist* (threat tracking and probabilities), *Aggressive* (maximizes skips and drawer penalties), *Defensive* (saves wildcards and blocks), *Chaotic* (random/noisy outputs), *Troll* (deliberate timing stalls and target punishments).
   - Real-time developer telemetry overlay exposing decision matrices, card weight calculations, and player danger quotients.

4. **Zero-Latency Real-Time Audio Synthesis**:
   - Synthesizes organic game sound cues (card deals, clicks, warning alarms, victory and defeat major/minor chords) directly using native browser **HTML5 Web Audio API**.
   - No brittle static asset files to download, guaranteeing offline capability and instant sound delivery.

5. **Self-Contained DB & Matchmaking**:
   - Automatic guest account generation with JWT security tokens.
   - Live lobby matchmaking queues, private rooms, spectator joins, and integrated lobby chat.

---

## 🛠️ Tech Stack

- **Shared**: TypeScript compiles to CommonJS.
- **Server**: Express, Node, Socket.IO, Prisma ORM (PostgreSQL).
- **Client**: Next.js (App Router), Zustand State, Tailwind CSS, Framer Motion, canvas-confetti.

---

## 🚀 Quickstart Development

### 1. Pre-requisites
- **Node.js** v20.0.0 or higher
- **NPM** v10.0.0 or higher
- **PostgreSQL** running locally (or via `docker compose up postgres`, see below)

### 2. Scaffold and Install Everything
Install each workspace from the root directory:
```bash
npm run install:all
```

### 3. Compile Shared types and Setup DB
Point `DATABASE_URL` in `.env` at a running Postgres instance (the fastest way
is `docker compose up postgres -d`, which needs no manual Postgres install),
then compile the shared libraries and apply migrations:
```bash
npm run build:shared && npm run db:generate && npm run db:migrate
```

### 4. Run Developers Server
Launch both server (`localhost:3001`) and frontend (`localhost:3000`) concurrently:
```bash
npm run dev
```

---

## 🐳 Docker Deployment

To launch the entire platform (including Postgres) inside production-ready containers:
```bash
cp .env.example .env
# Update JWT_SECRET in .env with a unique, long random value.
docker-compose up --build
```
- Open `http://localhost:3000` to play!

Never commit `.env`. Set `ALLOWED_ORIGINS` and `NEXT_PUBLIC_SERVER_URL` to your public client and API addresses before deploying.

---

## 📈 Scalability and Production Guide

The database already runs on PostgreSQL (see `server/prisma/schema.prisma` and `docker-compose.yml`). In-memory socket/room state is still process-local, so to scale beyond a single server process:

### 1. Swap Sockets state to Redis Adapter
To support multiple server pods behind a load balancer, attach the `@socket.io/redis-adapter` inside `server/src/server.ts`:
```typescript
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});
```
This distributes all matchmaking and card play relays seamlessly across server instances.
