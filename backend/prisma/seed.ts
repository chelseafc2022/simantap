import { PrismaClient, RoleEnum, StatusAkun } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding data master SIMANTAP...');

  // 1. Seed Master OPD
  const opdSetda = await prisma.opd.upsert({
    where: { kodeOpd: 'OPD-SETDA' },
    update: {},
    create: {
      kodeOpd: 'OPD-SETDA',
      namaOpd: 'Sekretariat Daerah',
      singkatan: 'SETDA',
      alamat: 'Jl. Poros Andoolo Kompleks Perkantoran Pemkab Konawe Selatan',
      namaKepalaOpd: 'Ir. H. Chairun Anas, MT',
      nipKepalaOpd: '197001011995011001',
    },
  });

  const opdDpu = await prisma.opd.upsert({
    where: { kodeOpd: 'OPD-DPUPR' },
    update: {},
    create: {
      kodeOpd: 'OPD-DPUPR',
      namaOpd: 'Dinas Pekerjaan Umum dan Penataan Ruang',
      singkatan: 'DPUPR',
      alamat: 'Jl. Poros Andoolo No. 12, Konawe Selatan',
      namaKepalaOpd: 'Drs. Muhammad Rizki, M.Si',
      nipKepalaOpd: '197505152000011002',
    },
  });

  const opdDinkes = await prisma.opd.upsert({
    where: { kodeOpd: 'OPD-DINKES' },
    update: {},
    create: {
      kodeOpd: 'OPD-DINKES',
      namaOpd: 'Dinas Kesehatan',
      singkatan: 'DINKES',
      alamat: 'Jl. Kompleks Perkantoran Pemkab Konsel',
      namaKepalaOpd: 'dr. Budi Setiawan, M.Kes',
      nipKepalaOpd: '197803122005011003',
    },
  });

  const opdDikbud = await prisma.opd.upsert({
    where: { kodeOpd: 'OPD-DIKBUD' },
    update: {},
    create: {
      kodeOpd: 'OPD-DIKBUD',
      namaOpd: 'Dinas Pendidikan dan Kebudayaan',
      singkatan: 'DIKBUD',
      alamat: 'Jl. Poros Kendari - Andoolo KM 45',
      namaKepalaOpd: 'H. Ruslan, S.Pd., M.Si',
      nipKepalaOpd: '197211101998021002',
    },
  });

  console.log('✅ Master OPD berhasil dibuat');

  // 2. Default Password: Password123!
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 3. Seed OPD Diskominfo & Administrator Utama Resmi (Riswan M. Rizal dari E-Gov)
  const opdKominfo = await prisma.opd.upsert({
    where: { kodeOpd: 'OPD-KOMINFO' },
    update: {},
    create: {
      kodeOpd: 'OPD-KOMINFO',
      namaOpd: 'Dinas Komunikasi, Informatika dan Persandian',
      singkatan: 'DISKOMINFO',
      alamat: 'Jl. Poros Andoolo Kompleks Perkantoran',
      namaKepalaOpd: '-',
      nipKepalaOpd: '-',
    },
  });

  await prisma.user.upsert({
    where: { nip: '199506082024211001' },
    update: {
      namaLengkap: 'RISWAN M. RIZAL, S.T',
      jabatan: 'Pranata Komputer / Pegawai Diskominfo',
      email: 'rfbriswanmrizal@gmail.com',
      role: RoleEnum.ADMINISTRATOR,
      status: StatusAkun.AKTIF,
      opdId: opdKominfo.id,
      password: defaultPasswordHash,
    },
    create: {
      nip: '199506082024211001',
      namaLengkap: 'RISWAN M. RIZAL, S.T',
      jabatan: 'Pranata Komputer / Pegawai Diskominfo',
      email: 'rfbriswanmrizal@gmail.com',
      password: defaultPasswordHash,
      role: RoleEnum.ADMINISTRATOR,
      status: StatusAkun.AKTIF,
      opdId: opdKominfo.id,
    },
  });

  console.log('✅ Akun Administrator Utama Riswan M. Rizal (E-Gov) berhasil disiapkan');

  // 4. Seed System Settings
  const existingSetting = await prisma.systemSetting.findFirst();
  if (!existingSetting) {
    await prisma.systemSetting.create({
      data: {
        tahunAnggaran: 2026,
        ambangKuning: 5.0,
        ambangMerah: 10.0,
        egovActive: true,
        simpegActive: true,
        sirupActive: true,
      },
    });
    console.log('✅ Pengaturan sistem default 2026 berhasil dibuat');
  }

  // 5. Seed Locking Periods (B01-B12)
  for (let bulan = 1; bulan <= 12; bulan++) {
    const batasInput = new Date(2026, bulan, 5, 23, 59, 59); // Tanggal 5 bulan berikutnya
    await prisma.lockingPeriod.upsert({
      where: {
        tahun_bulan: {
          tahun: 2026,
          bulan,
        },
      },
      update: {},
      create: {
        tahun: 2026,
        bulan,
        isLocked: bulan < 7, // Bulan 1-6 dikunci
        batasInput,
        updatedById: 'Administrator',
      },
    });
  }

  console.log('✅ Periode penguncian B01-B12 berhasil dibuat');
  console.log('✨ Seeding selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
