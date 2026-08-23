export interface QueuedPlayer {
  socketId: string;
  userId: string;
  username: string;
}

// Owns the waiting-to-be-matched queue and pair detection only. Building
// the actual GameRoom for a matched pair is the caller's responsibility
// (it needs io/room-map access this class intentionally doesn't have).
export class MatchmakingQueue {
  private queue: QueuedPlayer[] = [];

  constructor(onPairFound: (p1: QueuedPlayer, p2: QueuedPlayer) => void, intervalMs = 3000) {
    setInterval(() => {
      if (this.queue.length >= 2) {
        const p1 = this.queue.shift()!;
        const p2 = this.queue.shift()!;
        onPairFound(p1, p2);
      }
    }, intervalMs);
  }

  has(userId: string): boolean {
    return this.queue.some(q => q.userId === userId);
  }

  join(player: QueuedPlayer) {
    this.queue.push(player);
  }

  leaveBySocket(socketId: string) {
    this.queue = this.queue.filter(q => q.socketId !== socketId);
  }
}
