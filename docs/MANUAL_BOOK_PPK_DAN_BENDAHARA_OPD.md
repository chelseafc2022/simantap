# BUKU PANDUAN PENGGUNAAN (MANUAL BOOK)
## SISTEM INFORMASI MONALISA KONSEL
**Monitoring dan Evaluasi Realisasi Fisik & Keuangan**
**Pemerintah Kabupaten Konawe Selatan**

* **Alamat Akses Resmi:** [https://monalisa.konaweselatankab.go.id](https://monalisa.konaweselatankab.go.id)
* **Sasaran Pengguna:** Admin OPD — **Pejabat Pembuat Komitmen (PPK)** & **Bendahara Pengeluaran OPD**
* **Tahun Anggaran:** 2026

---

## DAFTAR ISI
1. **BAB I — Pendahuluan & Pembagian Kewenangan (PPK vs Bendahara)**
2. **BAB II — Panduan Login & Navigasi Utama Sistem**
3. **BAB III — Panduan Khusus PPK OPD (Input Paket, Target Kurva-S Mingguan, & Realisasi Fisik)**
4. **BAB IV — Panduan Khusus Bendahara OPD (Input Realisasi Keuangan & Upload Bukti Dokumen)**
5. **BAB V — Pencetakan Laporan & Tanya Jawab (FAQ) Kendala Umum**

---

## BAB I — PENDAHULUAN & PEMBAGIAN KEWENANGAN

Sistem **MONALISA KONSEL** menerapkan pemisahan kewenangan (*segregation of duties*) secara ketat antara **PPK OPD** dan **Bendahara OPD** sesuai tugas pokok dan fungsi masing-masing di Perangkat Daerah.

### 1.1 Matriks Hak Akses PPK vs Bendahara OPD

| No | Fitur / Aktivitas pada Sistem | PPK OPD (`ADMIN_PPK`) | Bendahara OPD (`BENDAHARA`) | Keterangan Sistem |
| :-: | :--- | :-: | :-: | :--- |
| 1 | Login & Melihat Dashboard OPD | ✅ Bisa | ✅ Bisa | Sesuai lingkup OPD / Sub Unit masing-masing |
| 2 | Menambah / Mengubah Info Kontrak Paket Pembangunan | ✅ Bisa | ❌ Tidak Bisa | Nomor kontrak, rekanan, nilai kontrak, masa kontrak |
| 3 | Menginput **Target Fisik Mingguan (Kurva-S)** | ✅ **Bisa** | ❌ **Tidak Bisa** | Berdasarkan jadwal minggu kalender kontrak |
| 4 | Menginput **Realisasi Fisik (%)** | ✅ **Bisa** | ❌ **Terkunci** | Kolom fisik otomatis terkunci bagi akun Bendahara |
| 5 | Menginput **Realisasi Keuangan (Rp)** | ❌ **Terkunci** | ✅ **Bisa** | Kolom keuangan otomatis terkunci bagi akun PPK |
| 6 | **Upload File Bukti / Dokumen (Foto, PDF, MP4)** | ✅ **Bisa** *(Wajib Foto/PDF Bukti Fisik)* | ✅ **Bisa** *(PDF SP2D, Kuitansi, Bukti Cair)* | Maksimal 5 file per periode (Maks. 10 MB/file) |
| 7 | Mencetak Laporan PDF Realisasi | ✅ Bisa | ✅ Bisa | Cetak rekapitulasi kapan saja |

> [!IMPORTANT]
> **Aturan Kunci Sistem:**
> * **PPK OPD** hanya dapat mengelola **Data Kontrak, Target Fisik Mingguan, Realisasi Fisik (%), dan Upload Bukti Lapangan**. Kolom *Realisasi Keuangan (Rp)* otomatis dinonaktifkan (tidak bisa diketik) pada akun PPK.
> * **Bendahara OPD** hanya dapat mengelola **Realisasi Keuangan (Rp) / Pencairan Bertahap dan Upload File Bukti/Dokumen Pencairan (PDF/Foto)**. Kolom *Target* dan *Realisasi Fisik (%)* otomatis dinonaktifkan pada akun Bendahara.

### 1.2 Dua Jenis Pola Monitoring Paket di MONALISA
Di dalam sistem, paket belanja terbagi menjadi 2 (dua) pola monitoring:
1. **Pola `FISIK & KEUANGAN`** *(Menu: **Realisasi -> Fisik & Keuangan**)*
   * Digunakan untuk paket konstruksi / belanja modal / pengadaan fisik yang memiliki kontrak dan jadwal pelaksanaan mingguan.
   * **PPK** menginput Target Mingguan & Realisasi Fisik Mingguan (%).
   * **Bendahara** menginput Realisasi Keuangan (Rp) & mengunggah file bukti pada minggu berjalan.
2. **Pola `KEUANGAN`** *(Menu: **Realisasi -> Keuangan**)*
   * Digunakan untuk paket operasional rutin / non-konstruksi yang hanya dipantau penyerapan anggarannya setiap bulan.
   * **Bendahara** menginput rincian pencairan keuangan bulanan (SP2D/Kuitansi) beserta lampiran file PDF/foto dokumen pencairan.

---

## BAB II — PANDUAN LOGIN & NAVIGASI UTAMA

### 2.1 Membuka Halaman Website MONALISA
1. Buka aplikasi peramban (*browser*) Google Chrome, Microsoft Edge, atau Safari di komputer/laptop Anda.
2. Ketik alamat resmi berikut pada bilah alamat (*address bar*):
   **`https://monalisa.konaweselatankab.go.id`**
3. Klik tombol **Masuk ke Sistem / Login**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 01 ]                             │
│                                                                              │
│   Tampilan Halaman Utama (Landing Page) monalisa.konaweselatankab.go.id      │
│   (Tampilkan halaman depan website beserta tombol Login di pojok kanan atas) │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Masuk (Login) Menggunakan Akun PPK atau Bendahara
1. Pada halaman Login (`https://monalisa.konaweselatankab.go.id/login`), masukkan:
   * **NIP / Username / Email** akun PPK atau Bendahara OPD Anda.
   * **Kata Sandi (Password)** yang telah diberikan oleh Administrator.
2. Klik tombol **Masuk**.
3. Setelah berhasil masuk, Anda akan diarahkan ke **Dashboard OPD**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 02 ]                             │
│                                                                              │
│   Tampilan Halaman Login (monalisa.konaweselatankab.go.id/login)             │
│   (Tampilkan form pengisian NIP/Username, Password, dan tombol Masuk)        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Mengenal Menu Navigasi (Sidebar Kiri)
Setelah login, perhatikan menu di sebelah kiri layar:
* **Dashboard:** Ringkasan pagu, kontrak, realisasi fisik & keuangan OPD Anda.
* **Paket Pembangunan:** Daftar seluruh paket pekerjaan OPD (tempat PPK melengkapi kontrak & menetapkan **Target Fisik Mingguan**).
* **Realisasi:** Memiliki 2 (dua) sub-menu:
  * **Fisik & Keuangan:** Untuk penginputan progres paket pembangunan konstruksi/modal (oleh PPK & Bendahara).
  * **Keuangan:** Untuk penginputan penyerapan anggaran paket operasional/keuangan bulanan (oleh Bendahara).
* **Laporan & Evaluasi:** Untuk melihat dan mengunduh matriks laporan TEPRA / RFK.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 03 ]                             │
│                                                                              │
│   Tampilan Dashboard OPD & Menu Sidebar Kiri                                 │
│   (Tampilkan menu Paket Pembangunan serta sub-menu Realisasi:                │
│    "Fisik & Keuangan" dan "Keuangan")                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## BAB III — PANDUAN KHUSUS PPK OPD (`ADMIN_PPK`)

Sebagai **PPK OPD**, tugas utama Anda terbagi menjadi **2 tahap**:
1. **Tahap Perencanaan Kontrak:** Melengkapi data kontrak & menginput **Target Fisik Mingguan (Kurva-S)** pada menu **Paket Pembangunan**.
2. **Tahap Pelaksanaan:** Menginput **Realisasi Fisik (%)** beserta **Foto/PDF Bukti Lapangan** setiap minggu pada menu **Realisasi -> Fisik & Keuangan**.

---

### 3.1 Tahap 1 — Melengkapi Data Kontrak & Menetapkan Target Fisik Mingguan
> [!NOTE]
> Target Fisik Mingguan **wajib diisi terlebih dahulu** agar paket dapat diinput realisasi mingguan-nya pada menu Realisasi.

#### Langkah 1: Buka Menu Paket Pembangunan
1. Klik menu **Paket Pembangunan** di sidebar sebelah kiri.
2. Gunakan kolom pencarian atau filter **Pola Monitoring: `Fisik & Keuangan`** untuk menemukan paket pekerjaan Anda.
3. Pada baris paket yang ingin diatur, klik ikon **Ubah Paket (Pensil)** di kolom **Aksi** sebelah kanan.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 04 ]                             │
│                                                                              │
│   Halaman Daftar Paket Pembangunan (Akun PPK)                                │
│   (Beri tanda panah pada tombol Aksi "Ubah Paket" di salah satu baris paket) │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Langkah 2: Lengkapi Tab 1 (Informasi Paket & Kontrak)
1. Pastikan **Pola Monitoring** terpilih **`Fisik & Keuangan`**.
2. Lengkapi data kontrak pekerjaan:
   * **Nomor Kontrak**
   * **Nilai Kontrak (Rp)** *(tidak boleh melebihi Nilai Pagu)*
   * **Pemenang / Nama Rekanan (Penyedia)**
   * **Tanggal Mulai Kontrak** dan **Tanggal Selesai Kontrak** *(Penting: Tanggal ini otomatis membagi jadwal minggu pelaksanaan kontrak)*.
3. Klik tombol **`Target Fisik Mingguan →`** di bagian kanan bawah dialog untuk berpindah ke Tab 2.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 05 ]                             │
│                                                                              │
│   Dialog Ubah Paket — Tab 1: Informasi Paket & Kontrak (Akun PPK)            │
│   (Tampilkan isian Nomor Kontrak, Nilai Kontrak, Tanggal Mulai-Selesai,      │
│    dan tombol "Target Fisik Mingguan ->" di pojok kanan bawah)               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Langkah 3: Isi Tab 2 (Target Fisik Mingguan / Kurva-S)
1. Sistem secara otomatis membentuk baris **Minggu ke-1, Minggu ke-2, dst.** pada setiap bulan sesuai rentang tanggal kontrak.
2. Pada setiap baris minggu:
   * Isi **Nama / Uraian Kegiatan Rencana** pada minggu tersebut (contoh: *Pekerjaan Pondasi dan Galian Tanah*).
   * Isi **Target Fisik Kumulatif (%)** dari `0` sampai dengan `100%` pada minggu terakhir kontrak.
   * Perhatikan indikator validasi bahwa target bersifat **kumulatif naik (monoton naik)** hingga mencapai **100%** di akhir masa kontrak.
3. Klik tombol **`Simpan Target Fisik & Perubahan`**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 06 ]                             │
│                                                                              │
│   Dialog Ubah Paket — Tab 2: Target Fisik Mingguan (Akun PPK)                │
│   (Tampilkan daftar minggu per bulan, input Uraian Kegiatan, Target %,       │
│    pratinjau Kurva-S, dan tombol "Simpan Target Fisik & Perubahan")          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Tahap 2 — Menginput Realisasi Fisik (%) & Upload Bukti Lapangan oleh PPK

#### Langkah 1: Buka Menu Realisasi -> Fisik & Keuangan
1. Klik menu **Realisasi** -> pilih sub-menu **Fisik & Keuangan** (`/realisasi`).
2. Pilih **Bulan Pelaporan** pada dropdown filter di bagian atas (misal: *November*).
3. Cari paket pekerjaan Anda, lalu klik tombol **`Input`** atau **`Ubah`** pada kolom **Aksi** (paling kanan).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 07 ]                             │
│                                                                              │
│   Halaman Realisasi Fisik & Keuangan (Akun PPK)                              │
│   (Tampilkan daftar paket, kartu statistik di atas, dan tombol "Input/Ubah"  │
│    pada kolom Aksi di sebelah kanan tabel)                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Langkah 2: Pilih Bulan & Minggu Kontrak
1. Setelah jendela **Realisasi Progres Mingguan** terbuka, perhatikan bagian atas yang menampilkan informasi Rekanan, Nilai Kontrak, dan Total Hari Kalender.
2. Pilih **Filter Bulan Kontrak** (contoh: *B11 · November*).
3. Klik tombol tab minggu yang ingin dilaporkan: **`Minggu 1`**, **`Minggu 2`**, **`Minggu 3`**, atau **`Minggu 4`**.

#### Langkah 3: Input Realisasi Fisik (%) & Catatan
1. **Nama/Uraian Kegiatan Mingguan:** Sesuaikan uraian pekerjaan aktual yang dikerjakan di lapangan pada minggu tersebut.
2. **Realisasi Fisik (%):** Ketik persentase capaian fisik kumulatif (rentang `0` – `100%`, mendukung hingga 2 angka desimal, contoh: `57,14`).
   * *Catatan:* Kolom **Realisasi Keuangan (Rp)** di sebelahnya otomatis **terkunci (abu-abu)** karena hanya dapat diisi oleh **Bendahara OPD**.
3. **Catatan Kendala dan Tindak Lanjut:** Isi keterangan progres atau kendala lapangan (jika ada).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 08 ]                             │
│                                                                              │
│   Dialog Realisasi Progres Mingguan — Tampilan Akun PPK                      │
│   (Tunjukkan bahwa kolom "Realisasi Fisik (%)" AKTIF dan diisi angka,        │
│    sedangkan kolom "Realisasi Keuangan (Rp)" TERKUNCI / nonaktif)            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Langkah 4: Upload Foto / Dokumen Bukti Fisik Mingguan (Wajib bagi PPK)
> [!WARNING]
> Sistem mewajibkan minimal **1 (satu) file bukti** pada minggu yang memiliki Realisasi Fisik > 0%.

1. Pada panel sebelah kanan (**Bukti Minggu Ini**):
   * Ketik **Deskripsi Bukti** (opsional, contoh: *Dokumentasi pengecoran titik STA 0+150*).
   * Klik tombol **`Pilih Bukti`**.
   * Pilih file dari komputer/HP Anda (mendukung **Foto JPG/PNG/WEBP, Video MP4, atau Dokumen PDF**, maksimal **5 file per minggu**, ukuran maks. **10 MB/file**).
2. Anda dapat langsung menekan tombol ungu **`Upload`** untuk mengunggah bukti, atau langsung klik tombol hijau **`Simpan Minggu Ini`** di pojok kanan bawah (file yang dipilih akan otomatis ikut ter-upload saat disimpan).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 09 ]                             │
│                                                                              │
│   Panel Upload Bukti Minggu Ini & Tombol Simpan Minggu Ini (Akun PPK)        │
│   (Tampilkan kartu "Bukti Minggu X" di sisi kanan, foto/PDF yang berhasil    │
│    diunggah, Kurva-S di bawahnya, dan tombol "Simpan Minggu Ini")            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## BAB IV — PANDUAN KHUSUS BENDAHARA OPD (`BENDAHARA`)

Sebagai **Bendahara OPD**, Anda memiliki wewenang penuh untuk:
1. Menginput **Realisasi Keuangan (Rp)** dan **mengunggah file bukti/dokumen pencairan (PDF SP2D, Kuitansi, atau Foto)** pada paket **Fisik & Keuangan** (`/realisasi`).
2. Menginput **Pencairan Keuangan Bulanan Bertahap (Rp)** dan **mengunggah file dokumen bukti pencairan (PDF/Foto)** pada paket **Keuangan Saja** (`/realisasi/keuangan`).

> [!IMPORTANT]
> Ketika Anda login menggunakan akun **Bendahara**, seluruh kolom **Target Fisik** dan **Realisasi Fisik (%)** otomatis terkunci (tidak dapat diubah) sehingga tidak akan mengganggu data teknis milik PPK.

---

### 4.1 Skenario A — Input Realisasi Keuangan & Upload File pada Paket Konstruksi / Modal (`Fisik & Keuangan`)

Gunakan menu ini untuk mengisi nilai pencairan uang (Uang Muka, Termin 1, Termin 2, MC-100, dsb.) pada paket pekerjaan fisik yang dikelola bersama PPK.

#### Langkah 1: Buka Menu Realisasi -> Fisik & Keuangan
1. Pada sidebar kiri, klik menu **Realisasi** -> pilih sub-menu **Fisik & Keuangan**.
2. Pilih **Bulan Pelaporan** di bagian atas.
3. Cari paket pekerjaan yang bersangkutan, kemudian klik tombol **`Input`** atau **`Ubah`** pada kolom **Aksi**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 10 ]                             │
│                                                                              │
│   Halaman Realisasi -> Fisik & Keuangan (Akun Bendahara)                     │
│   (Tampilkan tabel daftar paket beserta kolom Realisasi Keuangan dan         │
│    tombol Aksi "Input / Ubah")                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Langkah 2: Isi Kolom Realisasi Keuangan (Rp)
1. Pilih **Bulan Kontrak** dan klik **Minggu** tempat terjadinya pencairan anggaran.
2. Perhatikan pada formulir:
   * Kolom *Nama/Uraian Kegiatan* dan *Realisasi Fisik (%)* berstatus **terkunci (nonaktif)** — menampilkan angka yang sudah diinput oleh PPK.
   * Kolom **`Realisasi Keuangan (Rp)`** berstatus **AKTIF**.
3. Ketik nominal realisasi keuangan kumulatif dalam Rupiah (contoh: `150000000` — sistem otomatis memformat titik ribuan `150.000.000` dan menampilkan persentase serapan di bawah kolom).
4. Isi **Catatan Kendala dan Tindak Lanjut** bila diperlukan (misal: *Cair Termin I sesuai SP2D Nomor...*).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 11 ]                             │
│                                                                              │
│   Dialog Realisasi Progres Mingguan — Tampilan Akun Bendahara                │
│   (Tunjukkan bahwa kolom "Realisasi Fisik (%)" TERKUNCI/abu-abu, sedangkan   │
│    kolom "Realisasi Keuangan (Rp)" AKTIF dan terisi angka Rupiah)            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Langkah 3: Upload File Bukti / Dokumen oleh Bendahara (PDF / Foto)
1. Pada panel sebelah kanan (**Bukti Minggu Ini**), Bendahara juga dapat melampirkan dokumen bukti keuangan (seperti **Scan PDF SP2D, SPM, Kuitansi, BAST, atau Foto Bukti**):
   * Isi **Deskripsi** (contoh: *PDF SP2D Pencairan Termin 1*).
   * Klik tombol **`Pilih Bukti`** lalu pilih file **PDF** atau **Gambar (JPG/PNG)** dari komputer Anda.
   * Klik tombol ungu **`Upload`** atau langsung klik tombol hijau **`Simpan Minggu Ini`** di kanan bawah.
2. File PDF yang terunggah akan tampil dengan ikon **PDF** dan tombol **`Buka PDF`** sehingga dapat diperiksa sewaktu-waktu oleh Pimpinan / Tim MONEV.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 12 ]                             │
│                                                                              │
│   Upload File PDF / Bukti pada Dialog Mingguan (Akun Bendahara)              │
│   (Tampilkan kartu Bukti di sebelah kanan dengan file PDF yang sudah         │
│    diunggah beserta tombol "Buka PDF" dan tombol "Simpan Minggu Ini")        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Skenario B — Input Pencairan Keuangan Bulanan & Upload File pada Paket Operasional (`Realisasi -> Keuangan`)

Gunakan menu ini untuk paket belanja yang berpola **Monitoring Keuangan Saja** (paket rutin/operasional non-konstruksi).

#### Langkah 1: Buka Menu Realisasi -> Keuangan
1. Pada sidebar kiri, klik menu **Realisasi** -> pilih sub-menu **Keuangan** (`https://monalisa.konaweselatankab.go.id/realisasi/keuangan`).
2. Pilih **Tahun Anggaran** dan **Bulan Pelaporan** di bagian atas halaman.
3. Cari nama paket kegiatan, lalu klik tombol **`Input`** atau **`Ubah`** pada kolom **Aksi**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 13 ]                             │
│                                                                              │
│   Halaman Realisasi -> Keuangan (monalisa.konaweselatankab.go.id/realisasi/keuangan) │
│   (Tampilkan kartu ringkasan Realisasi Keuangan di atas dan daftar paket     │
│    berpola keuangan beserta tombol "Input / Ubah")                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Langkah 2: Catat Pencairan Bertahap (Tab "Tambah Pencairan")
1. Pada jendela **Realisasi Keuangan Bulanan**, pastikan **Bulan Pelaporan** di bagian atas sudah sesuai dengan bulan pencairan.
2. Perhatikan kotak ringkasan di atas yang menampilkan:
   * **Pagu Anggaran**
   * **Total Pencairan Bulan Ini**
   * **Kumulatif sampai Bulan Ini**
   * **Sisa Anggaran**
3. Pada bagian **Tambah Pencairan**:
   * **Nominal Pencairan (Rp):** Ketik nilai nominal SP2D/pencairan kali ini (contoh: `25.000.000`). *Catatan: Anda dapat mencatat beberapa kali pencairan dalam 1 bulan, sistem akan menjumlahkannya secara otomatis.*
   * **Catatan / Referensi Dokumen Pencairan (SP2D / Kuitansi):** Ketik nomor SP2D, tanggal, atau uraian pembayaran (wajib diisi).

#### Langkah 3: Lampirkan File Dokumen Bukti Pencairan (PDF / Foto)
1. Pada bagian **Lampiran Dokumen / Bukti Pencairan** di bawah form nominal:
   * Isi **Keterangan dokumen lampiran** (contoh: *Scan SP2D GU Bulan November*).
   * Klik tombol **`Pilih File (PDF / Foto)`** dan pilih file dokumen dari komputer Anda (mendukung PDF, JPG, PNG; maksimal 5 file per bulan).
   * Anda dapat klik **`Upload File`** secara langsung, atau klik tombol hijau **`Catat Pencairan`** (file yang dipilih akan otomatis terunggah bersamaan dengan pencatatan nominal pencairan).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 14 ]                             │
│                                                                              │
│   Dialog Realisasi Keuangan Bulanan — Tab "Tambah Pencairan" & Upload File   │
│   (Tampilkan input Nominal Pencairan, Catatan SP2D, bagian Lampiran Dokumen  │
│    "Pilih File (PDF / Foto)", daftar file terlampir, dan tombol              │
│    "Catat Pencairan")                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Langkah 4: Melihat, Mengubah (Edit), atau Menghapus Riwayat Pencairan
1. Klik tab **`Riwayat`** di sebelah tab *Tambah Pencairan*.
2. Anda akan melihat daftar seluruh transaksi pencairan yang pernah dicatat pada bulan tersebut beserta jam pencatatannya (WITA).
3. Jika terdapat kesalahan ketik nominal atau nomor SP2D:
   * Klik tombol **`Edit`** pada transaksi yang ingin diperbaiki, ubah nominal/catatan, lalu klik **`Simpan Perubahan`**.
   * Atau klik tombol **`Hapus`** (ikon tempat sampah merah) jika ingin membatalkan transaksi pencairan tersebut.
4. Anda juga dapat memilih **"Semua Bulan 2026"** pada dropdown Bulan Pelaporan untuk melihat buku besar rincian pencairan paket tersebut dari Januari hingga Desember.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 15 ]                             │
│                                                                              │
│   Dialog Realisasi Keuangan Bulanan — Tab "Riwayat"                          │
│   (Tampilkan daftar riwayat transaksi pencairan beserta tombol "Edit" dan    │
│    "Hapus" pada masing-masing item transaksi)                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## BAB V — PENCETAKAN LAPORAN & TANYA JAWAB (FAQ)

### 5.1 Mencetak Laporan Realisasi ke PDF
Baik **PPK** maupun **Bendahara** dapat mencetak rekapitulasi realisasi kapan saja:
1. Buka halaman **Realisasi -> Fisik & Keuangan** atau **Realisasi -> Keuangan**.
2. Pastikan filter **Bulan** dan **Sub Unit Kerja** sudah sesuai dengan yang ingin dicetak.
3. Klik tombol **`Cetak PDF`** (ikon printer) di pojok kanan atas halaman.
4. Dokumen laporan siap dicetak atau disimpan sebagai file PDF untuk bahan rapat TEPRA / pelaporan pimpinan OPD.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         [ TEMPAT SCREENSHOT 16 ]                             │
│                                                                              │
│   Tombol "Cetak PDF" dan Hasil Pratinjau Cetak Laporan Realisasi             │
│   (Tampilkan tombol Cetak PDF di pojok kanan atas halaman Realisasi)         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Tanya Jawab (FAQ) Kendala Umum Pengguna OPD

| No | Pertanyaan / Kendala di Lapangan | Penyebab & Solusi |
| :-: | :--- | :--- |
| **1** | **Saat PPK klik tombol Input Realisasi, muncul pesan *"Target mingguan belum tersedia"*.** | **Penyebab:** Paket belum memiliki tanggal mulai-selesai kontrak atau belum diisi Target Fisik Mingguan.<br>**Solusi:** PPK buka menu **Paket Pembangunan** -> klik **Ubah Paket (ikon pensil)** -> isi Tanggal Mulai & Selesai Kontrak di Tab 1 -> lanjut ke Tab 2 (**Target Fisik Mingguan**) -> isi target hingga 100% -> klik **Simpan**. |
| **2** | **Mengapa PPK tidak bisa mengetik di kolom Realisasi Keuangan (Rp)?** | **Penyebab:** Sesuai aturan sistem MONALISA, kolom Realisasi Keuangan dikhususkan bagi akun **Bendahara OPD**. PPK hanya menginput Target & Realisasi Fisik (%). |
| **3** | **Mengapa Bendahara tidak bisa mengetik di kolom Realisasi Fisik (%)?** | **Penyebab:** Kolom Realisasi Fisik (%) dikhususkan bagi akun **PPK OPD**. Bendahara cukup mengisi kolom Realisasi Keuangan (Rp) dan mengunggah file dokumen pencairan. |
| **4** | **PPK gagal menyimpan realisasi fisik dengan peringatan *"Realisasi fisik wajib disertai minimal satu foto bukti"*.** | **Solusi:** Klik tombol **Pilih Bukti** di panel sebelah kanan, pilih minimal 1 foto lapangan atau dokumen PDF progres minggu tersebut, lalu klik **Simpan Minggu Ini**. |
| **5** | **Muncul keterangan *"Periode input bulan ini sudah ditutup oleh Administrator"*.** | **Penyebab:** Batas waktu (*cut-off*) pelaporan bulan tersebut telah berakhir.<br>**Solusi:** Hubungi Administrator / Tim MONEV Bagian Pembangunan Setda Kab. Konawe Selatan apabila memerlukan pembukaan kunci (*unlock*) periode. |
| **6** | **Bagaimana jika dalam 1 bulan ada lebih dari 1 kali pencairan SP2D pada paket Keuangan?** | **Solusi:** Pada menu **Realisasi -> Keuangan**, Bendahara cukup menginput setiap SP2D satu per satu di tab **Tambah Pencairan**. Sistem otomatis menjumlahkan seluruh transaksi di bulan tersebut dan menghitung nilai kumulatifnya. |
