import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

const signingSecret = JWT_SECRET || 'local-development-only-secret';

export class AuthService {
  // Local-only account for checking sign-in, profiles, friends, and saved
  // match data without needing to create a new account by hand each run.
  public static async ensureLocalDemoAccount() {
    if (process.env.NODE_ENV === 'production') return null;

    const passwordHash = await bcrypt.hash('admin@admin', 12);
    return prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        passwordHash,
        provider: 'PASSWORD',
        profile: {
          upsert: {
            create: { avatar: 'avatar_1', banner: 'banner_bronze', mmr: 1000, rankedTier: 'BRONZE_I', xp: 0, level: 1 },
            update: {}
          }
        }
      },
      create: {
        username: 'admin',
        passwordHash,
        provider: 'PASSWORD',
        profile: {
          create: { avatar: 'avatar_1', banner: 'banner_bronze', mmr: 1000, rankedTier: 'BRONZE_I', xp: 0, level: 1 }
        }
      },
      include: { profile: true }
    });
  }

  // Signs standard JSON Web Token
  public static generateToken(userId: string): string {
    return jwt.sign({ userId }, signingSecret, { expiresIn: '7d' });
  }

  // Decodes and validates JWT
  public static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, signingSecret) as { userId: string };
    } catch (e) {
      return null;
    }
  }

  // Create Guest session (instantly returns user credentials)
  public static async createGuestSession(desiredUsername?: string) {
    let guestUsername: string;

    if (desiredUsername) {
      // Validate format
      const valid = /^[a-zA-Z0-9_]{3,24}$/.test(desiredUsername);
      if (!valid) throw new Error('Invalid username format');
      // Check availability
      const existing = await prisma.user.findUnique({ where: { username: desiredUsername } });
      if (existing) throw new Error('Username already taken');
      guestUsername = desiredUsername;
    } else {
      const randomTag = Math.floor(1000 + Math.random() * 9000);
      const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
      guestUsername = `Guest_${randomTag}${timestamp}`;
    }

    const user = await prisma.user.create({
      data: {
        username: guestUsername,
        provider: 'GUEST',
        profile: {
          create: {
            avatar: `avatar_${Math.floor(Math.random() * 8) + 1}`,
            banner: 'banner_bronze',
            mmr: 1000,
            rankedTier: 'BRONZE_I',
            xp: 0,
            level: 1
          }
        }
      },
      include: {
        profile: true
      }
    });

    const token = this.generateToken(user.id);
    return { user, token };
  }

  // Delete a guest account — called when the socket disconnects
  public static async deleteGuestUser(userId: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.provider === 'GUEST') {
        await prisma.user.delete({ where: { id: userId } });
      }
    } catch {
      // Silently ignore — user may have already been deleted
    }
  }


  // Sign up with email/username and password
  public static async signUp(username: string, password: string) {
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        provider: 'PASSWORD',
        profile: {
          create: {
            avatar: `avatar_${Math.floor(Math.random() * 8) + 1}`,
            banner: 'banner_bronze',
            mmr: 1000,
            rankedTier: 'BRONZE_I',
            xp: 0,
            level: 1
          }
        }
      },
      include: {
        profile: true
      }
    });

    const token = this.generateToken(user.id);
    return { user, token };
  }

  // Sign in with username and password
  public static async signIn(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { profile: true }
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id);
    return { user, token };
  }

  // Fetches user profile stats
  public static async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, matches: true }
    });
  }

  // Accumulate XP and determine level ups. The database field remains `mmr`
  // for compatibility, but it is presented to players as their Score.
  public static async updateStats(userId: string, placement: number, playerCount: number, roundPoints: number, missedLastCardCalls = 0) {
    const outcome = placement === 1 ? 'WIN' : 'LOSS';
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return null;

    const newGamesPlayed = profile.gamesPlayed + 1;
    const newGamesWon = profile.gamesWon + (outcome === 'WIN' ? 1 : 0);

    // Dynamic XP formulas
    const xpGained = outcome === 'WIN'
      ? 200 + roundPoints
      : outcome === 'LOSS'
        ? 50 + Math.floor(roundPoints / 2)
        : 25;
    let newXp = profile.xp + xpGained;
    let newLevel = profile.level;

    // Standard RPG curve: XP threshold = level * 1000
    while (newXp >= newLevel * 1000) {
      newXp -= newLevel * 1000;
      newLevel++;
    }

    // Placement-based competitive Score, with a -5 score penalty per
    // successfully challenged missed LAST CARD call.
    const placementChange = AuthService.getPlacementScoreChange(placement, playerCount);
    const unoPenalty = missedLastCardCalls * 5;
    const newMmr = Math.max(100, profile.mmr + placementChange - unoPenalty);
    const scoreChange = newMmr - profile.mmr;

    // Rank Tier allocations
    let rankedTier = 'BRONZE_I';
    if (newMmr >= 2000) rankedTier = 'CHALLENGER';
    else if (newMmr >= 1800) rankedTier = 'DIAMOND';
    else if (newMmr >= 1600) rankedTier = 'PLATINUM';
    else if (newMmr >= 1400) rankedTier = 'GOLD';
    else if (newMmr >= 1200) rankedTier = 'SILVER';

    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        gamesPlayed: newGamesPlayed,
        gamesWon: newGamesWon,
        xp: newXp,
        level: newLevel,
        mmr: newMmr,
        rankedTier
      }
    });

    // Log match history
    await prisma.matchHistory.create({
      data: {
        userId,
        won: outcome === 'WIN',
        score: roundPoints,
        rank: placement
      }
    });

    return { profile: updatedProfile, scoreChange, xpGained, placementChange, unoPenalty };
  }

  public static getPlacementScoreChange(placement: number, playerCount: number): number {
    const table: Record<number, number[]> = {
      2: [25, -15],
      3: [30, 5, -18],
      4: [35, 10, -5, -20]
    };
    const changes = table[playerCount];
    if (changes) return changes[Math.max(0, Math.min(placement - 1, changes.length - 1))];
    if (placement === 1) return 35;
    if (placement === playerCount) return -20;
    return Math.max(-10, 15 - (placement - 2) * 8);
  }

  // Leaderboard fetcher
  public static async getLeaderboard(limit = 10) {
    return prisma.profile.findMany({
      orderBy: {
        mmr: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    });
  }

  // Send friend request
  public static async sendFriendRequest(userId: string, friendUsername: string) {
    const requester = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (requester?.provider === 'GUEST') {
      throw new Error('Create an account to add friends');
    }

    const friend = await prisma.user.findUnique({
      where: { username: friendUsername }
    });

    if (!friend) {
      throw new Error('User not found');
    }

    if (friend.id === userId) {
      throw new Error('Cannot add yourself as a friend');
    }

    // Check both directions to prevent duplicate requests
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId: friend.id },
          { userId: friend.id, friendId: userId }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACCEPTED') {
        throw new Error('You are already friends with this user');
      }
      throw new Error('A friend request already exists between you and this user');
    }

    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId: friend.id,
        status: 'PENDING'
      }
    });

    return friendship;
  }

  // Get friends list (bidirectional: accepted friendships where user is either sender or receiver)
  public static async getFriends(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    // Get the other party's ID from each friendship record
    const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);
    const uniqueFriendIds = [...new Set(friendIds)];

    const friends = await prisma.user.findMany({
      where: {
        id: { in: uniqueFriendIds }
      },
      include: {
        profile: true
      }
    });

    return friends;
  }

  // Accept friend request
  public static async acceptFriendRequest(userId: string, friendId: string) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        userId: friendId,
        friendId: userId,
        status: 'PENDING'
      }
    });

    if (!friendship) {
      throw new Error('Friend request not found');
    }

    await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED' }
    });

    return friendship;
  }

  // Get pending friend requests
  public static async getPendingRequests(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: 'PENDING'
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    return friendships;
  }
}
