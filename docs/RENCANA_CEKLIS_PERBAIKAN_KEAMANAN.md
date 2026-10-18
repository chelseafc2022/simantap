# 📋 RENCANA & CEKLIS PERBAIKAN KEAMANAN (SECURITY HARDENING PLAN)
**Sistem**: MONALISA KONSEL (SIMANTAP) - Pemkab Konawe Selatan  
**Tanggal Dokumen**: 18 Oktober 2026  
**Status Audit**: Berdasarkan Temuan Laporan Audit Keamanan Internal (F01 – F13)  
**Tingkat Prioritas**: P0 (Kritis/Darurat), P1 (Tinggi), P2 (Sedang), P3 (Rendah)

---

## 📊 RINGKASAN STATUS KESELURUHAN

| Prioritas | Level Risiko | Jumlah Temuan | Selesai | Dalam Proses | Belum Dikerjakan / Ditunda |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **P0** | **CRITICAL / HIGH** | 5 Temuan (F01–F05) | **4** (F01, F02, F03, F04) | 0 | 1 (F05 ditunda) |
| **P1** | **HIGH / MEDIUM** | 4 Temuan (F06–F09) | **3** (F07*, F08, F09) | 0 | 1 (F06 ditunda) |
| **P2** | **MEDIUM** | 2 Temuan (F10–F11) | **2** (F10, F11*) | 0 | 0 |
| **P3** | **LOW** | 2 Temuan (F12–F13) | **1** (F12*) | 0 | 1 (F13) |
| **TOTAL** | | **13 Temuan** | **10 (77%)** | **0** | **3 (23%)** |

---

## 🎯 FASE 1: MITIGASI KRITIS KREDENSIAL & AUTENTIKASI (PRIORITAS P0)
*Target: Menutup jalur eksploitasi credential dump, bypassing login, dan akses database eksternal.*

### ✅ [F03] Pembersihan Kredensial Database Eksternal Tertanam (CWE-798, CWE-522)
- [x] **[Pembersihan Source Code]** Hapus fallback user `'diskominfosandi'` dan password `'NewKominfo2018'` di `backend/src/config/egov.config.ts`.
- [x] **[Guard Pengaman Service]** Hapus default credentials di `backend/src/core/egov/egov.service.ts` dan batalkan inisialisasi pool koneksi secara aman jika env kosong.
- [x] **[Pembersihan Script Seeder]** Hapus fallback credentials hardcode di `backend/prisma/seed-sidapem.ts`.
- [x] **[Pembersihan JWT Secret Fallback]** Hapus default dummy string secret di `backend/src/config/jwt.config.ts`.
- [x] **[Validasi Schema Lingkungan]** Tambahkan validasi variabel `EGOV_MYSQL_*` pada Joi di `backend/src/config/validation.schema.ts`.
- [x] **[Contoh Konfigurasi Aman]** Perbarui template `backend/.env.example` dengan placeholder tanpa nilai riil.
- [ ] **[Rotasi Kredensial Server]** Minta pengelola database Diskominfo mengganti kata sandi akun MySQL `diskominfosandi` di server pusat (`mysql.konaweselatankab.go.id`) dan memperbarui nilai di `.env` server.
- [ ] **[Sanitasi Git History]** Bersihkan riwayat commit lama yang sempat memuat plaintext password sebelum repository dipublikasikan/dishare.

---

### ✅ [F01] Penghentian Kata Sandi Default & Jalur Masuk Lokal Akun EGOV (CWE-521, CWE-798)
- [x] **[Hapus Password Default]** Hentikan pengisian kata sandi default statis `Password123!` saat pembuatan akun pegawai di `backend/src/modules/users/users.service.ts` (`assignRole`), digantikan flag aman `!EGOV_AUTH_ONLY!`.
- [x] **[Pembersihan Seeder Admin]** Hapus kata sandi default statis `Password123!` dari `backend/prisma/seed.ts` dan Swagger documentation example.
- [x] **[Blokir Bypass Login Lokal]** Ubah fungsi `login` di `backend/src/modules/auth/auth.service.ts` agar akun EGOV/NIP tidak lagi diperiksa via `bcrypt.compare` lokal.
- [ ] **[Sanitasi Akun Eksisting di Database]** Jalankan query pembersihan untuk mengeset field password seluruh pengguna ber-NIP menjadi `!EGOV_AUTH_ONLY!`.

---

### ✅ [F02] Penghentian Penyimpanan Hash Sandi eGov di Database Lokal (CWE-287)
- [x] **[Hapus Local Caching Password eGov]** Hapus logic penyimpanan hash kata sandi eGov ke PostgreSQL lokal di `backend/src/modules/auth/auth.service.ts`.
- [x] **[Pemberlakuan Login Realtime EGOV]** Login pegawai EGOV **selalu** memvalidasi kredensial langsung secara realtime ke server database E-Gov/SIMPEG.
- [x] **[Non-Password Flag]** Akun E-Gov yang berhasil login diperbarui dengan password flag `!EGOV_AUTH_ONLY!` sehingga tidak ada turunan kata sandi eGov yang tersimpan di database lokal.

---

### ✅ [F04] Sanitasi Paket Deploy & Proteksi Arsip Environment (CWE-312, CWE-200)
- [x] **[Hapus File Arsip Sensitif]** Hapus file backup `monalisa-backend.zip` dari direktori root proyek yang memuat file `.env`.
- [x] **[Otomasi Allowlist Build]** Tambahkan script `"build:zip"` aman di `backend/package.json` yang secara eksplisit mengecualikan `.env*` dan `node_modules`.
- [x] **[Web Server Blocking]** Tambahkan konfigurasi `FilesMatch` di `frontend/public/.htaccess` untuk memblokir akses langsung (HTTP 403) ke file `.env`, `.zip`, `.tar.gz`, `.git`, `.sql`, dan `.bak`.
- [ ] **[Rotasi JWT Secret di Hosting]** Ganti `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` di file `.env` server produksi karena secret lama pernah tersimpan di dalam arsip ZIP lawas.

---

### ⏳ [F05] Remediasi Dependency Vulnerability Kritis & Tinggi (CWE-1104)
- [ ] **[Audit Backend Dependencies]** Periksa dan perbaiki 14 temuan vulnerability pada backend (`handlebars`, `nodemailer`, `js-yaml`, dll.) menggunakan `npm audit` / upgrade versi patch.
- [ ] **[Audit Frontend Dependencies]** Perbaiki vulnerability Next.js 16.3.6, `seroval`, `sharp`, `source-map-js`, dan `xlsx` pada frontend.
- [ ] **[Isolasi Parser Excel]** Evaluasi penggantian library `xlsx` atau batasi parsing file Excel pada sandbox/worker terisolasi dengan batas ukuran memori dan timeout.
- [ ] **[Regression Test Pasca-Upgrade]** Jalankan pengujian menyeluruh pada fungsionalitas login, export data, kalkulasi pembangunan, dan generate laporan.

---

## 🛡️ FASE 2: PENGUATAN SESI, UPLOAD & RATE LIMITING (PRIORITAS P1)
*Target: Menutup risiko serangan XSS token hijacking, malicious file upload, dan brute force password spraying.*

### ⏳ [F06] Migrasi Sesi Token ke HttpOnly Secure Cookie (CWE-922, CWE-1004)
- [ ] **[Kirim Token via HttpOnly Cookie]** Ubah response backend login/refresh agar mengirim Refresh Token melalui header `Set-Cookie` dengan atribut `HttpOnly`, `Secure`, `SameSite=Strict`, dan `Path=/api/v1/auth`.
- [ ] **[Hapus Token dari LocalStorage]** Hapus penyimpanan access token & refresh token dari `localStorage` di `frontend/src/lib/token-storage.ts`.
- [ ] **[In-Memory Access Token]** Simpan access token hanya di memori JavaScript aplikasi (Pinia/React state) agar tidak dapat dicuri oleh script XSS.
- [ ] **[Proteksi CSRF]** Terapkan proteksi Double Submit Cookie atau CSRF token header untuk seluruh request mutasi (POST, PUT, DELETE, PATCH).

---

### ⏳ [F07] Hardening File Upload & Proteksi Akses Bukti Fisik (CWE-434, CWE-862)
- [ ] **[Validasi Magic Bytes & MIME Asli]** Ganti validasi ekstensi nama file di `backend/src/modules/pembangunan/pembangunan.controller.ts` dengan validasi byte header (magic bytes) menggunakan library seperti `file-type`.
- [ ] **[Isolasi Direktori Unggahan]** Hapus ekspos direktori publik `app.useStaticAssets('/uploads')` di `backend/src/main.ts`. Pindahkan file ke folder privat di luar web root.
- [ ] **[Endpoint Download Terproteksi]** Buat endpoint controller `GET /pembangunan/dokumen/:id/view` yang dilindungi `JwtAuthGuard` dan verifikasi kewenangan scope OPD.
- [x] **[Random Kriptografis Nama File]** Ubah penamaan file upload dari `Date.now() + Math.random()` menjadi UUID v4 kriptografis (`crypto.randomUUID()`).
- [ ] **[Header Proteksi Unduhan]** Tambahkan header `X-Content-Type-Options: nosniff` dan `Content-Disposition: attachment` pada dokumen hasil upload.

---

### ✅ [F08] Pembatasan Request & Rate Limiter Autentikasi (CWE-307)
- [x] **[Instalasi Rate Limiter]** Pasang modul `@nestjs/throttler` pada backend dengan batasan burst dan sliding window.
- [x] **[Proteksi Endpoint Login]** Batasi percobaan login maksimal 5 kali per menit per IP pada `/api/v1/auth/login`.
- [x] **[Proteksi Endpoint Refresh]** Batasi pemanggilan endpoint `/api/v1/auth/refresh` maksimal 15 kali per menit untuk mencegah token harvesting.

---

### ✅ [F09] Penerapan Security Headers & Enforce HTTPS Penuh (CWE-693, CWE-319)
- [x] **[Pasang Helmet di NestJS]** Aktifkan middleware `helmet()` di `backend/src/main.ts` untuk mengaktifkan X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, dan Referrer Policy.
- [x] **[Konfigurasi .htaccess Frontend]** Tambahkan security headers dan pemblokiran file privat di `frontend/public/.htaccess`.

---

## 🔍 FASE 3: MANAJEMEN DOKUMENTASI API & MONITORING (PRIORITAS P2)
*Target: Mengurangi jejak serangan informasi (reconnaissance) dan meningkatkan visibilitas insiden keamanan.*

### ✅ [F10] Pembatasan Akses Dokumentasi Swagger / OpenAPI (CWE-200)
- [x] **[Nonaktifkan Swagger di Produksi]** Swagger di `backend/src/main.ts` hanya aktif pada environment non-production atau saat `ENABLE_SWAGGER=true`.
- [x] **[Matikan Persist Authorization]** Setel `persistAuthorization: false` pada Swagger UI agar bearer token tidak tersimpan otomatis di browser dokumentasi.
- [x] **[Sanitasi Model DTO]** Bersihkan contoh password riil dari schema Swagger menjadi placeholder rahasia `********`.

---

### ⏳ [F11] Monitoring, Audit Log & Pencegahan Kebocoran Log (CWE-778)
- [ ] **[Audit Percobaan Gagal]** Tambahkan pencatatan `auditLog` untuk event kritis: login gagal (*failed attempt*), akun terkunci, refresh token tidak valid, dan percobaan akses lintas OPD.
- [x] **[Sanitasi Log Bebas]** Bersihkan pencatatan NIP, username, nama lengkap pegawai pada format log teks bebas di `backend/src/core/egov/egov.service.ts`.
- [ ] **[Correlation ID]** Tambahkan UUID unik (*Correlation ID / Request ID*) pada setiap request HTTP untuk mempermudah pelacakan insiden di `backend/src/common/interceptors/logging.interceptor.ts`.
- [x] **[Proteksi Trust Proxy]** Atur `app.set('trust proxy', 1)` di NestJS agar IP address klien yang tercatat pada log akurat dan tidak dapat dimanipulasi melalui header palsu.

---

## ⚙️ FASE 4: VALIDASI INPUT & HARDENING INFORMASI OPERASIONAL (PRIORITAS P3)
*Target: Memperketat validasi data administrasi dan menutup kebocoran informasi arsitektur teknis.*

### ⏳ [F12] Penutupan Informasi Operasional Berlebih (CWE-200)
- [x] **[Pemisahan Health Check]** Ubah `/api/v1/health` agar hanya menampilkan status sederhana (`{"status": "ok"}`) untuk publik, dan sembunyikan detail heap memory, database latency, serta versi disk.
- [ ] **[Proteksi Subunit Endpoint]** Tinjau endpoint subunit OPD di `backend/src/modules/pembangunan/pembangunan.controller.ts`, berikan otentikasi jika bukan merupakan data yang ditujukan untuk publik.

---

### ⏳ [F13] Pengetatan Validasi DTO & Role Matrix (CWE-20)
- [ ] **[Validasi Enum Array Roles]** Tambahkan `@IsEnum(RoleEnum, { each: true })`, `@ArrayMinSize(1)`, dan `@ArrayMaxSize(5)` pada `backend/src/modules/users/dto/set-role.dto.ts`.
- [ ] **[DTO Role Matrix Kuat]** Buat DTO terstruktur dengan schema ketat untuk endpoint update matriks hak akses menu di `backend/src/modules/users/users.controller.ts` (menggantikan tipe `any[]`).
- [ ] **[Batasan Karakter DTO Pembangunan]** Tambahkan validator `@MaxLength(255)` / `@MaxLength(1000)` pada seluruh string payload di DTO modul pembangunan.

---

## 📅 JADWAL & MILESTONE PELAKSANAAN

| No | Tahapan Pelaksanaan | Estimasi Durasi | Target PIC | Status |
| :---: | :--- | :---: | :---: | :---: |
| 1 | **Fase 1**: Perbaikan Kredensial, Autentikasi EGOV & Sanitasi Paket Deploy (P0) | 2–3 Hari Kerja | Backend Lead | **Sedang Berjalan (F03 Selesai)** |
| 2 | **Fase 2**: Migrasi Cookie Sesi, Hardening File Upload & Rate Limiting (P1) | 3–4 Hari Kerja | Fullstack Team | Siap Dimulai |
| 3 | **Fase 3**: Swagger Lockdown & Peningkatan Audit Log (P2) | 1–2 Hari Kerja | Backend Dev | Terjadwal |
| 4 | **Fase 4**: Validasi DTO & Hardening Endpoint Operasional (P3) | 1–2 Hari Kerja | Backend Dev | Terjadwal |
| 5 | **Pengujian & Verifikasi**: Security Regression & Penetration Test Terbatas | 2 Hari Kerja | QA / Security Lead | Terjadwal |

---

## 📝 CATATAN PENTING & ATURAN KERJA
1. **Aturan Database Eksternal**: Database E-Gov dan SIMPEG (`mysql.konaweselatankab.go.id`) adalah **READ-ONLY / SELECT ONLY**. Tidak boleh ada modifikasi data ke database eksternal.
2. **Kerahasiaan Kredensial**: File `.env` **HARUS SELALU** berada dalam `.gitignore` dan tidak boleh diikutsertakan dalam file ZIP rilis.
3. **Penyimpanan Dokumen**: File ceklis ini disimpan di [`docs/RENCANA_CEKLIS_PERBAIKAN_KEAMANAN.md`](file:///Users/simplephi/Documents/riswan/simantap/docs/RENCANA_CEKLIS_PERBAIKAN_KEAMANAN.md) sebagai panduan kerja dan rekapitulasi progres keamanan berkelanjutan.
