import { describe, expect, it } from 'vitest';
import { createFeedbackSchema, feedbackListQuerySchema, feedbackStatusSchema } from './FeedbackService';

describe('Feedback validation', () => {
  it('accepts a safe feedback report with minimal diagnostics', () => {
    const parsed = createFeedbackSchema.parse({
      category: 'BUG_GLITCH',
      rating: 4,
      message: 'A playable card stayed disabled after I drew from the pile.',
      page: '/game',
      browser: 'Chrome',
      os: 'macOS',
      viewportWidth: 1440,
      viewportHeight: 900,
      gameContext: {
        status: 'PLAYING',
        activeColor: 'RED',
        activeSide: 'LIGHT',
        activeValue: 'DRAW_TWO',
        currentTurn: 1,
        playerCount: 4,
        roomId: '123456',
        rules: { stacking: true, timerSeconds: 15 },
        recentEventIds: ['PLAY:user-1:123'],
      },
    });

    expect(parsed.category).toBe('BUG_GLITCH');
    expect(parsed.gameContext?.roomId).toBe('123456');
  });

  it('rejects underspecified messages and out-of-range ratings', () => {
    expect(() => createFeedbackSchema.parse({
      category: 'GENERAL_FEEDBACK',
      rating: 6,
      message: 'bad',
    })).toThrow();
  });

  it('rejects unexpected diagnostic fields', () => {
    expect(() => createFeedbackSchema.parse({
      category: 'GAMEPLAY_ISSUE',
      message: 'The turn order looked wrong after a reverse card.',
      gameContext: {
        status: 'PLAYING',
        chatMessages: ['do not store this'],
      },
    })).toThrow();
  });

  it('parses admin filters and status updates', () => {
    const query = feedbackListQuerySchema.parse({
      category: 'UI_MOBILE_ISSUE',
      status: 'NEW',
      limit: '25',
    });
    const status = feedbackStatusSchema.parse({ status: 'INVESTIGATING' });

    expect(query.limit).toBe(25);
    expect(status.status).toBe('INVESTIGATING');
  });
});
