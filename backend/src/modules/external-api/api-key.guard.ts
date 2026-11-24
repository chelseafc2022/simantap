import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../../core/database/prisma.service';

export interface ApiClientContext {
  id: string;
  nama: string;
}

const normalizeIp = (ip?: string | null) =>
  (ip || '').replace(/^::ffff:/, '').trim();

/**
 * Guard API key untuk endpoint eksternal read-only (/ext/*).
 * - Header: X-API-Key
 * - Key disimpan sebagai hash SHA-256
 * - Opsional: pembatasan IP (api_clients.allowed_ips, dipisah koma)
 * - Setiap akses dicatat ke api_access_logs
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { apiClient?: ApiClientContext }>();
    const res = http.getResponse<Response>();

    const rawKey = req.header('x-api-key');
    if (!rawKey) {
      throw new UnauthorizedException('Header X-API-Key wajib disertakan');
    }

    const keyHash = createHash('sha256').update(rawKey.trim()).digest('hex');
    const client = await this.prisma.apiClient.findUnique({
      where: { keyHash },
    });

    if (!client || !client.isActive) {
      throw new UnauthorizedException('API key tidak valid atau nonaktif');
    }
    if (client.expiresAt && client.expiresAt < new Date()) {
      throw new UnauthorizedException('API key sudah kedaluwarsa');
    }

    const ip = normalizeIp(req.ip);
    if (client.allowedIps) {
      const allowed = client.allowedIps
        .split(',')
        .map((x) => normalizeIp(x))
        .filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(ip)) {
        throw new ForbiddenException('Alamat IP tidak diizinkan untuk API key ini');
      }
    }

    req.apiClient = { id: client.id, nama: client.nama };

    // Catat akses (tidak menghambat respons)
    res.once('finish', () => {
      void this.prisma.apiAccessLog
        .create({
          data: {
            clientId: client.id,
            method: req.method,
            path: (req.originalUrl || req.url || '').slice(0, 500),
            statusCode: res.statusCode,
            ipAddress: ip || null,
          },
        })
        .catch(() => undefined);
    });
    void this.prisma.apiClient
      .update({ where: { id: client.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return true;
  }
}
