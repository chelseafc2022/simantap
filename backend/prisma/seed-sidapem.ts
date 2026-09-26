import { PrismaClient } from '@prisma/client';
import * as mysql from 'mysql2/promise';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Memulai Seeder Data Riil SIDAPEM ke PostgreSQL Lokal SIMANTAP (2024–2026)...');

  // 1. Koneksi READ-ONLY ke MySQL SIDAPEM & SIMPEG
  const mysqlConn = await mysql.createConnection({
    host: process.env.EGOV_MYSQL_HOST || 'mysql.konaweselatankab.go.id',
    user: process.env.EGOV_MYSQL_USER || 'diskominfosandi',
    password: process.env.EGOV_MYSQL_PASSWORD || 'NewKominfo2018',
    port: 3306,
    connectTimeout: 10000,
  });

  console.log('✅ Terhubung ke database MySQL eksternal (READ-ONLY).');

  // 2. Ambil data pembangunan tahun 2024, 2025, 2026
  const [paketRows]: any = await mysqlConn.query(`
    SELECT * FROM sidapem.data_pembangunan
    WHERE yy >= 2024
    ORDER BY yy ASC, id ASC
  `);

  console.log(`📦 Ditemukan ${paketRows.length} paket riil periode 2024–2026 di tabel sidapem.data_pembangunan.`);

  let successCount = 0;
  let skippedCount = 0;

  for (const row of paketRows) {
    const rawInstansi = row.instansi ? String(row.instansi).trim() : 'e7A5wqWrMYJB6iYC8';
    const rawUnitKerja = row.unit_kerja ? String(row.unit_kerja).trim() : null;

    const opdId = rawInstansi || 'e7A5wqWrMYJB6iYC8'; // Default Sekretariat Daerah jika kosong
    const subUnitId = rawUnitKerja || null;

    const tahunAnggaran = Number(row.yy) || 2025;
    const nilaiPagu = Math.max(0, Number(row.nilai_pagu) || 0);
    const nilaiKontrak = Math.max(0, Number(row.nilai_kontrak) || nilaiPagu);
    const namaPaket = (row.nama_paket || 'Paket Pembangunan Tanpa Nama').trim();

    // C. Simpan Paket Pembangunan ke PostgreSQL
    try {
      const paket = await prisma.paketPembangunan.create({
        data: {
          tahunAnggaran,
          opdId,
          subUnitId,
          kodeRupKontrak: row.kode_rup_kontrak ? String(row.kode_rup_kontrak).trim() : null,
          namaPaket,
          lokasiKegiatan: row.lokasi_kegiatan ? String(row.lokasi_kegiatan).trim() : null,
          metodePemilihan: row.metode_pemilihan ? String(row.metode_pemilihan).trim() : 'Pengadaan Langsung',
          jenisPengadaan: row.jenis_pengadaan ? String(row.jenis_pengadaan).trim() : 'Pekerjaan Konstruksi',
          nilaiPagu,
          nilaiKontrak,
          sumberDana: row.sumber_dana ? String(row.sumber_dana).trim() : 'APBD',
          nomorKontrak: row.nomor_kontrak ? String(row.nomor_kontrak).trim() : null,
          tanggalMulai: row.tgl_mulai ? new Date(row.tgl_mulai) : new Date(`${tahunAnggaran}-03-01`),
          tanggalSelesai: row.tgl_selesai ? new Date(row.tgl_selesai) : new Date(`${tahunAnggaran}-11-30`),
          pemenangRekanan: row.pemenang_tender ? String(row.pemenang_tender).trim() : null,
          keterangan: row.keterangan ? String(row.keterangan).trim() : null,
        },
      });

      // D. Generate 12 Bulan Target Fisik Kurva-S
      // Target menyebar realistis Jan s/d Des mencapai 100%
      const targetCurve = [
        0,    // B01
        5,    // B02
        15,   // B03
        25,   // B04
        40,   // B05
        55,   // B06
        70,   // B07
        85,   // B08
        95,   // B09
        100,  // B10
        100,  // B11
        100,  // B12
      ];

      for (let b = 1; b <= 12; b++) {
        await prisma.targetBulanan.create({
          data: {
            paketId: paket.id,
            bulan: b,
            targetFisik: targetCurve[b - 1],
          },
        });
      }

      // E. Generate 12 Bulan Realisasi Fisik & Keuangan
      // Variasikan status capaian agar ada: Aman (80%), Perhatian (15%), dan Kritis/SCM (5%)
      const isKritisScenario = successCount % 18 === 0 && tahunAnggaran >= 2025; // beberapa paket kritis
      const isPerhatianScenario = successCount % 7 === 0 && !isKritisScenario;

      for (let b = 1; b <= 12; b++) {
        let realFisik = 0;
        let realKeuangan = 0;
        let catatan: string | null = null;

        const targetBulan = targetCurve[b - 1];

        if (tahunAnggaran === 2024) {
          // Tahun lalu (2024): semua sudah selesai 100%
          realFisik = targetBulan;
          realKeuangan = parseFloat(((targetBulan / 100) * nilaiKontrak).toFixed(2));
          catatan = b === 10 ? 'Pekerjaan selesai 100% PHO' : null;
        } else if (tahunAnggaran === 2025) {
          // Tahun 2025: realisasi berjalan penuh
          if (isKritisScenario) {
            // Skenario Kontrak Kritis: keterlambatan > 10%
            realFisik = Math.max(0, targetBulan - 16);
            realKeuangan = parseFloat(((realFisik / 100) * nilaiKontrak * 0.9).toFixed(2));
            catatan = b >= 6 ? 'Keterlambatan material & tenaga kerja, perlu SCM' : null;
          } else if (isPerhatianScenario) {
            // Skenario Perhatian: deviasi -5% s/d -8%
            realFisik = Math.max(0, targetBulan - 6);
            realKeuangan = parseFloat(((realFisik / 100) * nilaiKontrak).toFixed(2));
            catatan = b >= 6 ? 'Deviasi ringan kendala cuaca hujan di lokasi' : null;
          } else {
            // Skenario Aman / On Track
            realFisik = Math.min(100, targetBulan + (b >= 5 ? 2 : 0));
            realKeuangan = parseFloat(((realFisik / 100) * nilaiKontrak).toFixed(2));
            catatan = b === 10 ? 'Pelaksanaan sesuai jadwal rencana' : null;
          }
        } else {
          // Tahun 2026: realisasi sampai bulan berjalan (misal B04 s/d B06)
          if (b <= 5) {
            realFisik = targetBulan;
            realKeuangan = parseFloat(((realFisik / 100) * nilaiKontrak).toFixed(2));
          } else {
            realFisik = 0;
            realKeuangan = 0;
          }
        }

        await prisma.realisasiBulanan.create({
          data: {
            paketId: paket.id,
            bulan: b,
            realisasiFisik: realFisik,
            realisasiKeuangan: realKeuangan,
            catatanOperator: catatan,
          },
        });
      }

      successCount++;
    } catch (err: any) {
      console.warn(`⚠️ Gagal import paket '${namaPaket}': ${err.message}`);
      skippedCount++;
    }
  }

  await mysqlConn.end();

  console.log('\n================ HASIL SEEDING ================');
  console.log(`✅ Berhasil diimpor ke PostgreSQL : ${successCount} paket`);
  console.log(`⚠️ Dilewati / Gagal              : ${skippedCount} paket`);
  console.log(`📊 Total Target & Realisasi Bulanan: ${successCount * 12} bulan tercatat lengkap`);
  console.log('================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
