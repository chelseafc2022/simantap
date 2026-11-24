/**
 * Menyalin MAK dari RUP ke paket_mak untuk satu tahun anggaran.
 * Pemakaian: npx ts-node scripts/sync-mak.ts [tahun=2026]
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MakSyncService } from '../src/modules/sirup/mak-sync.service';

async function main() {
  const tahun = Number(process.argv[2] || 2026);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const result = await app.get(MakSyncService).syncTahun(tahun);
  console.log(JSON.stringify(result, null, 2));
  await app.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
