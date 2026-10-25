import Redis from 'ioredis';
import { config } from '../config/index.js';

class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.isRedisReady = false;
    this.init();
  }

  init() {
    const redisUrl = config.redisUrl || 'redis://127.0.0.1:6379';
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null // don't spam if local redis is not running
      });

      this.redis.on('connect', () => {
        this.isRedisReady = true;
        console.log('[CacheService] Connected to Redis instance successfully.');
      });

      this.redis.on('error', (err) => {
        if (this.isRedisReady) {
          console.warn('[CacheService] Redis error:', err.message);
        }
        this.isRedisReady = false;
      });
    } catch (e) {
      console.warn('[CacheService] Redis initialization skipped. Using high-speed In-Memory Cache.');
      this.isRedisReady = false;
    }
  }

  async get(key) {
    if (this.isRedisReady && this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val) {
          return JSON.parse(val);
        }
      } catch (err) {
        console.warn(`[CacheService] Redis get failed for ${key}, falling back to memory.`);
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.data;
  }

  async set(key, value, ttlSeconds = 300) {
    if (this.isRedisReady && this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return true;
      } catch (err) {
        console.warn(`[CacheService] Redis set failed for ${key}, using memory.`);
      }
    }

    this.memoryCache.set(key, {
      data: value,
      expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    });
    return true;
  }

  async del(key) {
    if (this.isRedisReady && this.redis) {
      try {
        await this.redis.del(key);
      } catch (e) {}
    }
    this.memoryCache.delete(key);
  }

  async delPattern(pattern) {
    if (this.isRedisReady && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (e) {}
    }

    // Delete matching regex from memory cache
    const regex = new RegExp(`^${pattern.replace('*', '.*')}`);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async invalidateEvent(eventId) {
    await this.del(`event:${eventId}`);
    await this.delPattern('events:*');
  }

  getStatus() {
    return {
      driver: this.isRedisReady ? 'Redis' : 'Memory Cache (Redis-compatible)',
      activeKeysCount: this.memoryCache.size,
      connectedToRedis: this.isRedisReady
    };
  }
}

export const cacheService = new CacheService();
export default cacheService;
