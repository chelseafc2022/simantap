import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');
    const db = this.configService.get<number>('redis.db', 0);

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        db,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(
              'Gagal terhubung ke Redis setelah 3 percobaan. Fitur cache Redis dinonaktifkan sementara.',
            );
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Berhasil terhubung ke Redis server (${host}:${port})`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Peringatan Redis: ${err.message}`);
      });

      this.client.connect().catch((err) => {
        this.logger.warn(
          `Redis tidak tersedia: ${err.message}. Aplikasi tetap dapat berjalan.`,
        );
      });
    } catch (err) {
      this.logger.warn('Inisialisasi client Redis dilewati');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.logger.log('Koneksi Redis ditutup');
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      const strVal = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, strVal, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, strVal);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      return false;
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // Abaikan jika gagal flush pattern
    }
  }
}
