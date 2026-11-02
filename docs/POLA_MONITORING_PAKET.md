# Pola input setelah sinkronisasi seluruh paket RUP

1. Buka Paket Pembangunan → Sinkronisasi RUP.
2. Nonaktifkan “Hanya Impor Paket Pembangunan & Belanja Modal”, lalu sinkronkan.
3. Di daftar paket, periksa label kelompok dan pola monitoring.
4. Paket baru yang lolos filter pembangunan memakai Pembangunan/Modal dan Fisik mingguan + Keuangan. Paket lainnya memakai Perlu ditinjau dan Keuangan saja. Klasifikasi masih berupa saran berdasarkan aturan filter RUP yang sudah ada.
5. Buka Ubah Paket untuk mengonfirmasi kelompok Operasional/Rutin atau Pembangunan/Modal, serta memilih pola monitoring secara terpisah.

## Keuangan saja

Form utama: identitas paket, OPD/subunit, pagu, sumber dana, kode RUP, dan keterangan. Tidak wajib kontrak atau penyedia. Rincian pengadaan/kontrak opsional dapat dibuka jika paket memang memiliki kontrak. Pengisian nilai kontrak tetap memerlukan kelengkapan dokumen kontraknya.

Simpan, lalu buka menu Realisasi dan klik paket. Pilih bulan dan isi realisasi keuangan **kumulatif sejak Januari sampai bulan terpilih**, serta catatan/referensi dokumen. Jika ada pencairan berikutnya pada bulan sama, perbarui nominal kumulatif tersebut. Ini rekap bulanan, bukan buku transaksi. Simpan sebelum mengajukan ke MONEV. Hak input Bendahara, verifikasi MONEV, dan penguncian periode tetap digunakan.

Paket keuangan saja tidak menggunakan target/realisasi fisik mingguan dan tidak masuk rata-rata atau status keterlambatan fisik. Keuangannya tetap masuk rekap anggaran.

## Fisik mingguan + keuangan

Lengkapi nilai kontrak, penyedia, tanggal dan kelengkapan kontrak sebelum menetapkan target mingguan. Alur realisasi mingguan tetap digunakan.

## Data lama dan sinkronisasi ulang

Data lama mempertahankan pola fisik + keuangan untuk menghindari perubahan otomatis pada paket yang sudah berjalan. Paket lama dapat ditinjau melalui Ubah Paket. Peralihan ke keuangan saja ditolak jika sudah ada target mingguan atau realisasi fisik, agar riwayat tidak hilang. Sinkronisasi ulang tidak menimpa kelompok dan pola yang telah disimpan.

“Seluruh paket RUP” hanya mencakup data pada sumber RUP. Belanja gaji yang tidak tersedia di RUP harus dimasukkan dari sumber anggaran lain atau secara manual.

## Aktivasi skema

Migrasi `20261030000000_pola_monitoring_paket` menambahkan dua kolom dan constraint tanpa menghapus data. Terapkan migrasi pada PostgreSQL aplikasi sebelum menjalankan backend yang baru. Periksa status migrasi proyek sebelum menjalankan `npx prisma migrate deploy` di direktori backend, kemudian jalankan `npx prisma generate` dan mulai ulang backend.

Migrasi berhasil diterapkan pada database aplikasi pada 30 Oktober 2026 setelah koneksi diperiksa di luar sandbox. Penambahan kolom tidak menghapus data paket. Sinkronisasi paket tetap dijalankan oleh operator melalui aplikasi.
