import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { SocketManager } from './network/SocketManager';
import { AuthService } from './services/AuthService';
import { prisma } from './services/db';
import { FeedbackService, createFeedbackSchema, feedbackListQuerySchema, feedbackStatusSchema } from './services/FeedbackService';

// This process is launched with cwd set to server/ (via `npm --prefix
// server`), but the monorepo's shared .env lives at the repo root. Resolve
// relative to this file (works for both ts-node in src/ and compiled
// dist/) rather than relying on cwd. In Docker there is no .env file at
// all - env vars are injected directly via docker-compose, so this is a
// harmless no-op there.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_APP_URL = process.env.CLIENT_APP_URL || 'http://localhost:3000';

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : (process.env.NODE_ENV === 'production' ? [] : ['*']);

const corsOrigin = allowedOrigins.length > 0 && allowedOrigins[0] !== '*' ? allowedOrigins : '*';

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PATCH'],
  // Browsers reject a wildcard origin combined with credentials. Sessions use
  // bearer tokens, so credentials are only needed for an explicitly allowlisted deployment.
  credentials: corsOrigin !== '*'
}));
app.use(express.json({ limit: '16kb' }));
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const credentialsSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(24, 'Username must be 24 characters or fewer').regex(/^[a-zA-Z0-9_]+$/, 'Username may only use letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long')
});

function authenticatedUserId(req: express.Request): string | null {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  return token ? AuthService.verifyToken(token)?.userId ?? null : null;
}

function requireAuthenticatedUser(req: express.Request, res: express.Response): string | null {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return userId;
}

function configuredAdminUsernames(): string[] {
  const configured = process.env.ADMIN_USERNAMES
    ? process.env.ADMIN_USERNAMES.split(',').map(value => value.trim()).filter(Boolean)
    : [];
  if (process.env.NODE_ENV !== 'production' && !configured.includes('admin')) {
    configured.push('admin');
  }
  return configured;
}

function configuredAdminUserIds(): string[] {
  return process.env.ADMIN_USER_IDS
    ? process.env.ADMIN_USER_IDS.split(',').map(value => value.trim()).filter(Boolean)
    : [];
}

async function requireAdminUser(req: express.Request, res: express.Response): Promise<string | null> {
  const userId = requireAuthenticatedUser(req, res);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
  const isAdmin = Boolean(
    user &&
    (configuredAdminUserIds().includes(user.id) || configuredAdminUsernames().includes(user.username))
  );

  if (!isAdmin) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return null;
  }

  return userId;
}

// Brute-force/enumeration guard for credential-checking endpoints. Keyed by
// IP, generous enough not to interfere with normal retries.
const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a minute.' }
});

// Check username availability (used by guest username picker)
app.post('/api/auth/check-username', authRateLimit, async (req, res) => {
  try {
    const raw = req.body?.username;
    if (typeof raw !== 'string' || !raw.trim()) {
      return res.status(400).json({ available: false, message: 'Username is required' });
    }
    const parsed = z.string().trim().min(3, 'Must be at least 3 characters').max(24, 'Must be 24 characters or fewer').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores').safeParse(raw.trim());
    if (!parsed.success) {
      return res.json({ available: false, message: parsed.error.issues[0].message });
    }
    const existing = await prisma.user.findUnique({ where: { username: parsed.data } });
    return res.json({ available: !existing });
  } catch (err: any) {
    return res.status(500).json({ available: false, message: err.message });
  }
});

// Create Guest account
app.post('/api/auth/guest', authRateLimit, async (req, res) => {
  try {
    const desiredUsername: string | undefined = typeof req.body?.username === 'string' ? req.body.username.trim() || undefined : undefined;
    const { user, token } = await AuthService.createGuestSession(desiredUsername);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        provider: user.provider,
        profile: user.profile
      }
    });
  } catch (err: any) {
    console.error('Guest creation error:', err);
    res.status(err.message === 'Username already taken' ? 409 : 500).json({ success: false, message: err.message || 'Failed to create guest user session' });
  }
});


// Sign up with username and password
app.post('/api/auth/signup', authRateLimit, async (req, res) => {
  try {
    const { username, password } = credentialsSchema.parse(req.body);
    const { user, token } = await AuthService.signUp(username, password);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        provider: user.provider,
        profile: user.profile
      }
    });
  } catch (err: any) {
    console.error('Sign up error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Sign in with username and password
app.post('/api/auth/signin', authRateLimit, async (req, res) => {
  try {
    const { username, password } = credentialsSchema.parse(req.body);
    const { user, token } = await AuthService.signIn(username, password);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        provider: user.provider,
        profile: user.profile
      }
    });
  } catch (err: any) {
    console.error('Sign in error:', err);
    res.status(err instanceof z.ZodError ? 400 : 401).json({ success: false, message: err instanceof z.ZodError ? err.issues[0].message : err.message });
  }
});

// Send friend request
app.post('/api/friends/request', async (req, res) => {
  try {
    const userId = requireAuthenticatedUser(req, res);
    const { friendUsername } = req.body;
    if (!userId) return;
    if (typeof friendUsername !== 'string' || !friendUsername.trim()) {
      return res.status(400).json({ success: false, message: 'Friend username is required' });
    }
    const friendship = await AuthService.sendFriendRequest(userId, friendUsername.trim());
    res.json({ success: true, friendship });
  } catch (err: any) {
    console.error('Friend request error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get friends list
app.get('/api/friends', async (req, res) => {
  try {
    const userId = requireAuthenticatedUser(req, res);
    if (!userId) return;
    const friends = await AuthService.getFriends(userId);
    res.json({ success: true, friends });
  } catch (err: any) {
    console.error('Get friends error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Accept friend request
app.post('/api/friends/accept', async (req, res) => {
  try {
    const userId = requireAuthenticatedUser(req, res);
    const { friendId } = req.body;
    if (!userId) return;
    if (typeof friendId !== 'string' || !friendId) {
      return res.status(400).json({ success: false, message: 'Friend ID is required' });
    }
    const friendship = await AuthService.acceptFriendRequest(userId, friendId);
    res.json({ success: true, friendship });
  } catch (err: any) {
    console.error('Accept friend request error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get pending friend requests
app.get('/api/friends/pending', async (req, res) => {
  try {
    const userId = requireAuthenticatedUser(req, res);
    if (!userId) return;
    const requests = await AuthService.getPendingRequests(userId);
    res.json({ success: true, requests });
  } catch (err: any) {
    console.error('Get pending requests error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fetch Top Leaderboards
app.get('/api/leaderboard', async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
    const list = await AuthService.getLeaderboard(limit);
    res.json({ success: true, leaderboard: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard rankings', error: err.message });
  }
});

// Fetch User Profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await AuthService.getProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load user stats', error: err.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const payload = createFeedbackSchema.parse(req.body);
    const feedback = await FeedbackService.create(payload, authenticatedUserId(req));
    res.status(201).json({ success: true, feedback });
  } catch (err: any) {
    console.error('Create feedback error:', err);
    const message = err instanceof z.ZodError ? err.issues[0].message : 'Unable to submit feedback';
    res.status(err instanceof z.ZodError ? 400 : 500).json({ success: false, message });
  }
});

app.get('/api/admin/feedback', async (req, res) => {
  try {
    const adminUserId = await requireAdminUser(req, res);
    if (!adminUserId) return;
    const query = feedbackListQuerySchema.parse(req.query);
    const result = await FeedbackService.list(query);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('List feedback error:', err);
    const message = err instanceof z.ZodError ? err.issues[0].message : 'Unable to load feedback';
    res.status(err instanceof z.ZodError ? 400 : 500).json({ success: false, message });
  }
});

app.get('/api/admin/feedback/:id', async (req, res) => {
  try {
    const adminUserId = await requireAdminUser(req, res);
    if (!adminUserId) return;
    const feedback = await FeedbackService.getById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    res.json({ success: true, feedback });
  } catch (err: any) {
    console.error('Get feedback error:', err);
    res.status(500).json({ success: false, message: 'Unable to load feedback' });
  }
});

app.patch('/api/admin/feedback/:id/status', async (req, res) => {
  try {
    const adminUserId = await requireAdminUser(req, res);
    if (!adminUserId) return;
    const { status } = feedbackStatusSchema.parse(req.body);
    const feedback = await FeedbackService.updateStatus(req.params.id, status);
    res.json({ success: true, feedback });
  } catch (err: any) {
    console.error('Update feedback status error:', err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    const message = err instanceof z.ZodError ? err.issues[0].message : 'Unable to update feedback';
    res.status(err instanceof z.ZodError ? 400 : 500).json({ success: false, message });
  }
});

// Health Checks
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'Only Cards game server',
    status: 'online',
    frontend: CLIENT_APP_URL,
    health: '/health',
    ready: '/ready'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Only Cards game server',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      database: 'unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Boot servers
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 && allowedOrigins[0] !== '*' 
      ? allowedOrigins 
      : '*',
    methods: ['GET', 'POST'],
  }
});

const socketManager = new SocketManager(io);

io.on('connection', (socket) => {
  socketManager.handleConnection(socket);
});

// Defense-in-depth: log and continue instead of letting Node's default
// behavior (crashing the process) take down every active game over one
// unexpected rejection. This is a safety net, not a substitute for handling
// rejections at their source.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// Setup Prisma DB and push tables
async function boot() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established via Prisma');
    await AuthService.ensureLocalDemoAccount();
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Local test account is ready: admin');
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 AAA Game Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup failure:', error);
    process.exit(1);
  }
}

boot();

async function shutdown(signal: string) {
  console.log(`${signal} received; closing game server.`);
  io.close();
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
