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

  // 3. Seed 7 Role Users
  const usersToSeed = [
    {
      nip: '198001012005011001',
      namaLengkap: 'Ir. H. Ahmad Fauzan, M.Si',
      jabatan: 'Kabag Administrasi Pembangunan',
      email: 'admin@konaweselatankab.go.id',
      role: RoleEnum.ADMINISTRATOR,
      opdId: opdSetda.id,
    },
    {
      nip: '198804122011011003',
      namaLengkap: 'Andi Pratama, S.Kom',
      jabatan: 'Operator Pengadaan & SiRUP',
      email: 'andi.sirup@konaweselatankab.go.id',
      role: RoleEnum.ADMIN_SIRUP,
      opdId: opdDpu.id,
    },
    {
      nip: '198607142010011002',
      namaLengkap: 'Budi Santoso, ST',
      jabatan: 'Kasubag Perencanaan & Program',
      email: 'budi.perencanaan@konaweselatankab.go.id',
      role: RoleEnum.ADMIN_PERENCANAAN,
      opdId: opdDpu.id,
    },
    {
      nip: '198209212008011004',
      namaLengkap: 'Ir. Herman Syahputra, ST',
      jabatan: 'Pejabat Pembuat Komitmen (PPK)',
      email: 'herman.ppk@konaweselatankab.go.id',
      role: RoleEnum.ADMIN_PPK,
      opdId: opdDpu.id,
    },
    {
      nip: '199203202018012003',
      namaLengkap: 'Sri Wahyuni, SE',
      jabatan: 'Bendahara Pengeluaran',
      email: 'wahyuni.bendahara@konaweselatankab.go.id',
      role: RoleEnum.BENDAHARA,
      opdId: opdDpu.id,
    },
    {
      nip: '197505152000011002',
      namaLengkap: 'Drs. Muhammad Rizki, M.Si',
      jabatan: 'Kepala Dinas DPUPR',
      email: 'rizki.kadis@konaweselatankab.go.id',
      role: RoleEnum.KEPALA_OPD,
      opdId: opdDpu.id,
    },
    {
      nip: '196812101994031005',
      namaLengkap: 'H. Surunuddin Dangga, ST., MM',
      jabatan: 'Bupati Konawe Selatan',
      email: 'bupati@konaweselatankab.go.id',
      role: RoleEnum.PIMPINAN_DAERAH,
      opdId: opdSetda.id,
    },
  ];

  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { nip: u.nip },
      update: {
        namaLengkap: u.namaLengkap,
        jabatan: u.jabatan,
        email: u.email,
        role: u.role,
        opdId: u.opdId,
      },
      create: {
        nip: u.nip,
        namaLengkap: u.namaLengkap,
        jabatan: u.jabatan,
        email: u.email,
        password: defaultPasswordHash,
        role: u.role,
        status: StatusAkun.AKTIF,
        opdId: u.opdId,
      },
    });
  }

  console.log('✅ 7 Akun Pengguna Role RBAC berhasil dibuat (Password: Password123!)');

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
