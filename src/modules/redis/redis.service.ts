import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryCache = new Map<
    string,
    { value: string; expiresAt?: number }
  >();
  private useMemoryFallback = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    try {
      const redisOptions = {
        maxRetriesPerRequest: 1, // Fail fast to trigger fallback
        connectTimeout: 2000,
        retryStrategy: () => null, // Do not reconnect on failure to prevent hanging
      };

      if (redisUrl) {
        this.logger.log(`Connecting to Redis via connection URL`);
        this.client = new Redis(redisUrl, redisOptions);
      } else {
        this.logger.log(`Connecting to Redis at ${redisHost}:${redisPort}`);
        this.client = new Redis({
          host: redisHost,
          port: redisPort,
          ...redisOptions,
        });
      }

      this.client.on('connect', () => {
        this.logger.log('Successfully connected to Redis server.');
        this.useMemoryFallback = false;
      });

      this.client.on('error', (err) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Redis connection error: ${errMsg}. Falling back to in-memory cache.`,
        );
        this.useMemoryFallback = true;
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to initialize Redis: ${errMsg}. Falling back to in-memory cache.`,
      );
      this.useMemoryFallback = true;
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.logger.log('Disconnected from Redis server.');
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemoryFallback || !this.client) {
      const cached = this.memoryCache.get(key);
      if (!cached) return null;
      if (cached.expiresAt && cached.expiresAt < Date.now()) {
        this.memoryCache.delete(key);
        return null;
      }
      return cached.value;
    }

    try {
      return await this.client.get(key);
    } catch {
      this.logger.warn(
        `Redis GET failed, falling back to memory for key "${key}"`,
      );
      this.useMemoryFallback = true;
      return this.get(key);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useMemoryFallback || !this.client) {
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
      this.memoryCache.set(key, { value, expiresAt });
      return;
    }

    try {
      if (ttlSeconds !== undefined && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      this.logger.warn(
        `Redis SET failed, falling back to memory for key "${key}"`,
      );
      this.useMemoryFallback = true;
      await this.set(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    if (this.useMemoryFallback || !this.client) {
      this.memoryCache.delete(key);
      return;
    }

    try {
      await this.client.del(key);
    } catch {
      this.logger.warn(
        `Redis DEL failed, falling back to memory for key "${key}"`,
      );
      this.useMemoryFallback = true;
      await this.del(key);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (this.useMemoryFallback || !this.client) {
      const globToRegex = (pat: string) => {
        const escaped = pat.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
        const wildcards = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
        return new RegExp('^' + wildcards + '$');
      };
      const regex = globToRegex(pattern);
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch {
      this.logger.warn(
        `Redis deletePattern failed, falling back to memory pattern "${pattern}"`,
      );
      this.useMemoryFallback = true;
      await this.deletePattern(pattern);
    }
  }

  async flushAll(): Promise<void> {
    this.memoryCache.clear();
    if (this.client && !this.useMemoryFallback) {
      try {
        await this.client.flushall();
      } catch {
        // ignore
      }
    }
  }
}
