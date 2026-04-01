import crypto from 'crypto';

interface CacheEntry {
  response: string;
  timestamp: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Generate a cache key from query and context
   */
  private generateKey(query: string, context: Record<string, any>): string {
    const contextStr = JSON.stringify(context);
    const combined = `${query}:${contextStr}`;
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  /**
   * Get cached response if available and not expired
   */
  get(query: string, context: Record<string, any>): string | null {
    const key = this.generateKey(query, context);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if entry has expired
    if (age > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  /**
   * Set cached response
   */
  set(query: string, context: Record<string, any>, response: string): void {
    const key = this.generateKey(query, context);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
    });

    // Periodically clean up expired entries
    this.cleanupExpired();
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      if (age > this.TTL) {
        entriesToDelete.push(key);
      }
    });

    entriesToDelete.forEach((key) => {
      this.cache.delete(key);
    });
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    ttl: number;
  } {
    return {
      size: this.cache.size,
      ttl: this.TTL,
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();
