import { FeedbackCategory, FeedbackStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './db';

export const FEEDBACK_CATEGORIES = [
  'BUG_GLITCH',
  'GAMEPLAY_ISSUE',
  'UI_MOBILE_ISSUE',
  'FEATURE_SUGGESTION',
  'GENERAL_FEEDBACK',
] as const;

export const FEEDBACK_STATUSES = [
  'NEW',
  'INVESTIGATING',
  'PLANNED',
  'RESOLVED',
  'CLOSED',
] as const;

const safeText = (max: number) => z.string().trim().max(max).optional();

const gameContextSchema = z.object({
  status: safeText(40),
  activeColor: safeText(24),
  activeSide: safeText(24),
  activeValue: safeText(40),
  currentTurn: z.number().int().min(0).max(20).optional(),
  playerCount: z.number().int().min(0).max(12).optional(),
  roomId: safeText(64),
  rules: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  recentEventIds: z.array(z.string().max(80)).max(8).optional(),
}).strict();

export const createFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  message: z.string().trim().min(10, 'Tell us a little more so we can act on it.').max(2000, 'Feedback must be 2000 characters or fewer.'),
  page: safeText(240),
  appVersion: safeText(80),
  userAgent: safeText(500),
  browser: safeText(120),
  os: safeText(120),
  viewportWidth: z.number().int().min(0).max(10000).optional(),
  viewportHeight: z.number().int().min(0).max(10000).optional(),
  roomId: safeText(64),
  gameContext: gameContextSchema.nullable().optional(),
});

export const feedbackListQuerySchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const feedbackStatusSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES),
});

export class FeedbackService {
  public static async create(input: z.infer<typeof createFeedbackSchema>, userId: string | null) {
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } })
      : null;

    return prisma.feedback.create({
      data: {
        category: input.category as FeedbackCategory,
        rating: input.rating ?? null,
        message: input.message,
        page: input.page,
        appVersion: input.appVersion,
        userAgent: input.userAgent,
        browser: input.browser,
        os: input.os,
        viewportWidth: input.viewportWidth,
        viewportHeight: input.viewportHeight,
        roomId: input.roomId ?? input.gameContext?.roomId,
        gameContext: input.gameContext ? input.gameContext as Prisma.InputJsonValue : undefined,
        userId: user?.id,
        username: user?.username,
      },
      select: { id: true, createdAt: true },
    });
  }

  public static async list(query: z.infer<typeof feedbackListQuerySchema>) {
    const where: Prisma.FeedbackWhereInput = {};

    if (query.category) where.category = query.category as FeedbackCategory;
    if (query.status) where.status = query.status as FeedbackStatus;
    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }
    if (query.search) {
      where.OR = [
        { message: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
        { page: { contains: query.search, mode: 'insensitive' } },
        { roomId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, counts] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        select: {
          id: true,
          category: true,
          status: true,
          rating: true,
          message: true,
          page: true,
          roomId: true,
          username: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.feedback.groupBy({ by: ['status'], _count: { status: true } }),
    ]);

    return {
      items,
      counts: counts.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count.status;
        return acc;
      }, {}),
    };
  }

  public static async getById(id: string) {
    return prisma.feedback.findUnique({ where: { id } });
  }

  public static async updateStatus(id: string, status: FeedbackStatus) {
    return prisma.feedback.update({
      where: { id },
      data: { status },
    });
  }
}
