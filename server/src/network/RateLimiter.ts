// Per-socket/player request guarding: replay-attack prevention, a sliding
// rate limit, and action locks to keep concurrent actions from the same
// player from racing each other. Extracted from SocketManager so this
// bookkeeping can be tested and reasoned about independent of socket wiring.
export class RateLimiter {
  private processedRequests: Map<string, number> = new Map(); // RequestID -> Timestamp
  private playerActionLocks: Map<string, boolean> = new Map(); // PlayerID -> Lock
  private rateLimits: Map<string, number[]> = new Map(); // SocketID -> Timestamps

  constructor() {
    this.setupCleanupIntervals();
  }

  // Check if request was already processed (replay attack prevention)
  isRequestProcessed(requestId: string): boolean {
    if (!requestId) return false;
    const now = Date.now();
    const timestamp = this.processedRequests.get(requestId);

    if (timestamp && (now - timestamp) < 30000) {
      // Request was processed within last 30 seconds
      return true;
    }

    this.processedRequests.set(requestId, now);
    return false;
  }

  // Check rate limit (max 10 requests per second)
  checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const timestamps = this.rateLimits.get(socketId) || [];

    // Remove timestamps older than 1 second
    const recentTimestamps = timestamps.filter(t => now - t < 1000);

    if (recentTimestamps.length >= 10) {
      return false; // Rate limit exceeded
    }

    recentTimestamps.push(now);
    this.rateLimits.set(socketId, recentTimestamps);
    return true;
  }

  // Acquire player action lock (prevent race conditions)
  acquireActionLock(playerId: string): boolean {
    if (this.playerActionLocks.get(playerId)) {
      return false; // Lock already held
    }
    this.playerActionLocks.set(playerId, true);
    return true;
  }

  // Release player action lock
  releaseActionLock(playerId: string) {
    this.playerActionLocks.delete(playerId);
  }

  // Called on socket disconnect to drop that socket's rate-limit history
  clearSocket(socketId: string) {
    this.rateLimits.delete(socketId);
  }

  // Cleanup intervals for old data
  private setupCleanupIntervals() {
    // Clean up old request IDs every 30 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [requestId, timestamp] of this.processedRequests.entries()) {
        if (now - timestamp > 30000) {
          this.processedRequests.delete(requestId);
        }
      }
    }, 30000);

    // Clean up old rate limit data every 5 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [socketId, timestamps] of this.rateLimits.entries()) {
        const recent = timestamps.filter(t => now - t < 1000);
        if (recent.length === 0) {
          this.rateLimits.delete(socketId);
        } else {
          this.rateLimits.set(socketId, recent);
        }
      }
    }, 5000);
  }
}
