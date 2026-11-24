/**
 * Membuat klien API eksternal (read-only) dan mencetak API key SEKALI.
 * Pemakaian:
 *   npx ts-node scripts/create-api-client.ts "Inspektorat" ["ip1,ip2"] [hariKedaluwarsa]
 */
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

async function main() {
  const [nama, allowedIps, hari] = process.argv.slice(2);
  if (!nama) {
    console.error('Pemakaian: ts-node scripts/create-api-client.ts "<nama>" ["ip1,ip2"] [hari]');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const key = `mnl_${randomBytes(32).toString('hex')}`;
  const client = await prisma.apiClient.create({
    data: {
      nama,
      keyPrefix: key.slice(0, 8),
      keyHash: createHash('sha256').update(key).digest('hex'),
      allowedIps: allowedIps || null,
      expiresAt: hari ? new Date(Date.now() + Number(hari) * 86400000) : null,
    },
  });
  console.log(`Klien dibuat: ${client.nama} (id ${client.id})`);
  console.log(`API KEY (simpan sekarang, tidak bisa dilihat lagi):\n${key}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
