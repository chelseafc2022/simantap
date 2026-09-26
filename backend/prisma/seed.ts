import { PrismaClient, RoleEnum, StatusAkun } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding data master SIMANTAP...');

  // 1. Default Password: Password123!
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 2. Master Roles SIMANTAP
  const MASTER_ROLES = [
    {
      kode: RoleEnum.ADMINISTRATOR,
      nama: 'Administrator Utama',
      deskripsi: 'Akses penuh sistem, manajemen user, dan pengaturan global (Bagian Adm. Pembangunan Setda).',
      urutan: 1,
    },
    {
      kode: RoleEnum.ADMIN_SIRUP,
      nama: 'Admin SiRUP',
      deskripsi: 'Input data awal kegiatan pembangunan: kode RUP, pagu, nomor kontrak, rekanan, lokasi dari SiRUP LKPP.',
      urutan: 2,
    },
    {
      kode: RoleEnum.ADMIN_PERENCANAAN,
      nama: 'Admin Perencanaan',
      deskripsi: 'Menyusun rencana target fisik bulanan B01-B12 (Kurva-S): target 30%, 60%, 100% per paket.',
      urutan: 3,
    },
    {
      kode: RoleEnum.ADMIN_PPK,
      nama: 'Admin PPK (Pejabat Pembuat Komitmen)',
      deskripsi: 'Input realisasi fisik (%) kumulatif bulanan, kendala lapangan, upload bukti foto/video, dan pengajuan ke MONEV.',
      urutan: 4,
    },
    {
      kode: RoleEnum.BENDAHARA,
      nama: 'Bendahara Pengeluaran',
      deskripsi: 'Input realisasi keuangan kumulatif berbasis SP2D / Kas yang sudah dicairkan BPKAD per paket.',
      urutan: 5,
    },
    {
      kode: RoleEnum.KEPALA_OPD,
      nama: 'Kepala OPD / Pengguna Anggaran',
      deskripsi: 'Monitoring, evaluasi, dan pertanggungjawaban capaian realisasi paket pembangunan di tingkat OPD.',
      urutan: 6,
    },
    {
      kode: RoleEnum.PIMPINAN_DAERAH,
      nama: 'Pimpinan Daerah (Bupati / Sekda)',
      deskripsi: 'Executive dashboard pemantauan makro capaian pembangunan lintas seluruh OPD se-Kabupaten Konawe Selatan.',
      urutan: 7,
    },
    {
      kode: RoleEnum.MONEV,
      nama: 'Tim MONEV Pembangunan',
      deskripsi: 'Verifikasi, validasi, approval atau penolakan pengajuan realisasi PPK & Bendahara serta analisis deviasi.',
      urutan: 8,
    },
  ];

  const roleMap = new Map<RoleEnum, string>();
  for (const r of MASTER_ROLES) {
    const roleRecord = await prisma.role.upsert({
      where: { kode: r.kode },
      update: {
        nama: r.nama,
        deskripsi: r.deskripsi,
        urutan: r.urutan,
      },
      create: r,
    });
    roleMap.set(r.kode, roleRecord.id);
  }
  console.log('✅ 8 Master roles SIMANTAP berhasil disiapkan');

  // 3. Seed Administrator Utama Resmi (Riswan M. Rizal dari E-Gov / SIMPEG)
  const adminUser = await prisma.user.upsert({
    where: { nip: '199506082024211001' },
    update: {
      namaLengkap: 'RISWAN M. RIZAL, S.T',
      jabatan: 'Pranata Komputer / Pegawai Diskominfo',
      email: 'rfbriswanmrizal@gmail.com',
      role: RoleEnum.ADMINISTRATOR,
      roles: [RoleEnum.ADMINISTRATOR],
      status: StatusAkun.AKTIF,
      opdId: 'e7A5wqWrMYJB6iYC8', // Sekretariat Daerah
      subUnitId: '3CB2cqdwEihsq9yK4', // Bagian Administrasi Pembangunan
      password: defaultPasswordHash,
    },
    create: {
      nip: '199506082024211001',
      namaLengkap: 'RISWAN M. RIZAL, S.T',
      jabatan: 'Pranata Komputer / Pegawai Diskominfo',
      email: 'rfbriswanmrizal@gmail.com',
      password: defaultPasswordHash,
      role: RoleEnum.ADMINISTRATOR,
      roles: [RoleEnum.ADMINISTRATOR],
      status: StatusAkun.AKTIF,
      opdId: 'e7A5wqWrMYJB6iYC8',
      subUnitId: '3CB2cqdwEihsq9yK4',
    },
  });

  const adminRoleId = roleMap.get(RoleEnum.ADMINISTRATOR);
  if (adminRoleId) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRoleId,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRoleId,
      },
    });
  }

  console.log('✅ Akun Administrator Utama Riswan M. Rizal & UserRole berhasil disiapkan');

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
