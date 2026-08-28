# Only Cards Deployment

This project is best deployed as two pieces:

- Frontend on Vercel.
- Backend on a Node-capable server/service that supports long-lived Socket.IO connections.

## Frontend: Vercel

Set these values in the Vercel project environment variables:

```env
NEXT_PUBLIC_SERVER_URL=https://your-backend-url.example.com
```

After changing `NEXT_PUBLIC_SERVER_URL`, redeploy the Vercel project. Next.js places public environment values into the browser build, so the current deployment keeps using the old value until a new build is created.

Recommended Vercel setup for this repo:

- Deploy from the repository root, not only the `client` folder, because the client depends on `shared`.
- Build command: `npm run build:shared && npm run build --prefix client`
- Install command: `npm install && npm install --prefix shared && npm install --prefix client`
- Output directory: `client/.next`

## Backend: Node Server

Set these environment variables on the backend host:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
CLIENT_APP_URL=https://your-vercel-app.vercel.app
TRUST_PROXY=true
```

Use `TRUST_PROXY=true` only when the backend host puts Express behind a trusted proxy or load balancer. Most managed hosts and reverse-proxy setups do.

The backend exposes these checks:

- `/health`: confirms the server process is running.
- `/ready`: confirms the server can reach the database.

Use `/ready` for host health checks when possible.

## Important

Active game rooms, matchmaking, reconnect timers, and Socket.IO rate limits are currently kept in server memory. That is fine for one backend instance and a beta release, but it means active games are lost if the backend restarts.

For higher traffic or multiple backend instances, add:

- Redis for Socket.IO scaling.
- Shared room and matchmaking state outside process memory.
- A managed Postgres database with backups.
- Backend logs and uptime alerts.

Until that is done, run one backend instance and scale it vertically.
