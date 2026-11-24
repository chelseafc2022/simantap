import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { RupSourceService } from './rup-source.service';

/**
 * Menyalin kode MAK dari tabel RUP (READ-ONLY) ke tabel lokal paket_mak.
 * Kode MAK disimpan utuh, tidak dipecah.
 */
@Injectable()
export class MakSyncService {
  private readonly logger = new Logger(MakSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rupSource: RupSourceService,
    private readonly redisService: RedisService,
  ) {}

  async syncTahun(tahun: number) {
    return this.sync(tahun);
  }

  /** Sinkron MAK hanya untuk kode RUP yang baru disinkronkan. */
  async syncPaketByKodeRup(tahun: number, kodeRupList: string[]) {
    if (kodeRupList.length === 0) return null;
    return this.sync(tahun, kodeRupList);
  }

  private async sync(tahun: number, kodeRupList?: string[]) {
    const pakets = await this.prisma.paketPembangunan.findMany({
      where: {
        tahunAnggaran: tahun,
        kodeRupKontrak: kodeRupList ? { in: kodeRupList } : { not: null },
      },
      select: { id: true, kodeRupKontrak: true },
    });

    const paketByKode = new Map<string, string[]>();
    for (const p of pakets) {
      const kode = (p.kodeRupKontrak || '').trim();
      if (!kode) continue;
      const list = paketByKode.get(kode) || [];
      list.push(p.id);
      paketByKode.set(kode, list);
    }

    const kodes = [...paketByKode.keys()];
    let paketDenganMak = 0;
    let totalMak = 0;

    for (let i = 0; i < kodes.length; i += 500) {
      const chunk = kodes.slice(i, i + 500);
      const rows = await this.rupSource.getMakByKodeRup(chunk);

      const byKode = new Map<string, typeof rows>();
      for (const r of rows) {
        const list = byKode.get(String(r.kodeRup)) || [];
        list.push(r);
        byKode.set(String(r.kodeRup), list);
      }

      const targetPaketIds: string[] = [];
      const toInsert: Array<{
        id: string;
        paketId: string;
        mak: string;
        pagu: number;
        sumberDana: string | null;
      }> = [];

      for (const [kode, makRows] of byKode) {
        for (const paketId of paketByKode.get(kode) || []) {
          targetPaketIds.push(paketId);
          for (const r of makRows) {
            toInsert.push({
              id: randomUUID(),
              paketId,
              mak: String(r.mak).trim(),
              pagu: Number(r.pagu || 0),
              sumberDana: r.sumberDana ? String(r.sumberDana) : null,
            });
          }
          paketDenganMak += 1;
          totalMak += makRows.length;
        }
      }

      if (targetPaketIds.length > 0) {
        await this.prisma.paketMak.deleteMany({
          where: { paketId: { in: targetPaketIds } },
        });
        for (let j = 0; j < toInsert.length; j += 2000) {
          await this.prisma.paketMak.createMany({
            data: toInsert.slice(j, j + 2000),
          });
        }
      }
    }

    await this.redisService.delByPattern('*paket*');
    this.logger.log(
      `Sinkron MAK TA ${tahun}: ${paketDenganMak}/${pakets.length} paket, ${totalMak} baris MAK`,
    );

    return {
      tahun,
      totalPaket: pakets.length,
      paketDenganMak,
      paketTanpaMak: pakets.length - paketDenganMak,
      totalBarisMak: totalMak,
    };
  }
}
