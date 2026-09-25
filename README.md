# 🏛️ SIMANTAP (Sistem Informasi Monitoring dan Evaluasi Data Pembangunan Terpadu)

> **Pemerintah Kabupaten Konawe Selatan**  
> *Bagian Administrasi Pembangunan — Sekretariat Daerah*  
> Tahun Anggaran 2026

[![NestJS](https://img.shields.io/badge/Backend-NestJS%20v11-ea2849?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%20v15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 📌 1. Tentang SIMANTAP

**SIMANTAP** adalah platform web terpadu milik Pemerintah Kabupaten Konawe Selatan untuk digitalisasi koordinasi, pemantauan, evaluasi, dan pengendalian terhadap realisasi pelaksanaan program dan kegiatan pembangunan fisik maupun keuangan yang didanai oleh APBD, APBN, DAK, dan sumber dana lainnya.

### Masalah yang Diselesaikan:
1. **Pencatatan Terfragmentasi**: Mengintegrasikan data perencanaan SiRUP LKPP, kontrak riil, kurva rencana kegiatan, progres fisik lapangan, dan serapan keuangan (SP2D).
2. **Early Warning System (EWS)**: Menghitung deviasi capaian kinerja secara otomatis guna mendeteksi potensi deviasi negatif (*Show Cause Meeting / Kontrak Kritis*).
3. **Disparitas Fisik vs Keuangan**: Mencegah ketidaksesuaian antara persentase fisik pekerjaan di lapangan dengan pencairan anggaran SP2D.
4. **Otomasi Laporan RFK**: Menyediakan cetak Rekapitulasi Realisasi Fisik dan Keuangan (RFK) siap pakai dalam format baku resmi (PDF & Excel).

---

## 🔒 2. Aturan Mutlak Integrasi Sistem (Read-Only Policy)

Database eksternal **E-Gov** dan **SIMPEG** (`mysql.konaweselatankab.go.id`):
1. **MUTLAK HANYA BACA (READ-ONLY / SELECT ONLY)**.
2. **DILARANG KERAS** melakukan aksi manipulasi data apapun (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`) ke database `egov` maupun `simpeg`.
3. Seluruh penetapan hak akses role, pembuatan sesi SIMANTAP, penugasan peran, dan manajemen data proyek **HANYA DISIMPAN** di basis data lokal PostgreSQL (`simantap`).

---

## 👥 3. Matriks 7 Hak Akses Role SIMANTAP

SIMANTAP menerapkan model **Multi-Role RBAC (Role-Based Access Control)**, di mana seorang ASN dapat memiliki lebih dari satu peran sesuai surat keputusan/penugasan kedinasan:

| No | Peran (Role) | Kode Enum | Wewenang & Tanggung Jawab Utama |
| :-: | :--- | :--- | :--- |
| **1** | **Administrator Utama** | `ADMINISTRATOR` | Hak akses penuh sistem, konfigurasi master data, penetapan multi-role pengguna, cabut akses, audit trail. |
| **2** | **Admin SiRUP (Data Awal)** | `ADMIN_SIRUP` | Memasukkan dan menyinkronkan data paket pengadaan awal berbasis SiRUP LKPP. |
| **3** | **Admin Perencanaan** | `ADMIN_PERENCANAAN` | Menyusun target capaian bulanan dan kurva rencana (kurva S) fisik kegiatan. |
| **4** | **Admin PPK** | `ADMIN_PPK` | Menginput besaran capaian fisik riil mingguan/bulanan dan bukti dokumentasi lapangan. |
| **5** | **Bendahara (Realisasi Keuangan)** | `BENDAHARA` | Menginput dan merekonsiliasi realisasi keuangan paket pembangunan berbasis SP2D/Kas daerah. |
| **6** | **Kepala OPD** | `KEPALA_OPD` | Menelaah hasil capaian, validasi dan approval berkala laporan kinerja paket di unit kerjanya. |
| **7** | **Pimpinan Daerah** | `PIMPINAN_DAERAH` | *Executive dashboard monitoring* menyeluruh realisasi pembangunan se-Kabupaten Konawe Selatan (Bupati, Wabup, Sekda). |

---

## ⚙️ 4. Arsitektur & Teknologi

Aplikasi dibangun menggunakan pola **Decoupled Client-Server Architecture**:

```
[ Browser / Client ]
         │
         ▼
[ Frontend: Next.js 15 (App Router, Tailwind CSS, TanStack Query, Radix UI) ]
         │ (REST API / Bearer JWT with Token Rotation)
         ▼
[ Backend: NestJS 11 (Pipes, Guards, Audit Interceptor, Swagger) ]
         │
         ├──► [ PostgreSQL (Local SIMANTAP DB via Prisma ORM) ] ── (READ-WRITE)
         │
         └──► [ MySQL Server Konawe Selatan (E-Gov & SIMPEG) ] ── (STRICTLY READ-ONLY)
```

### Komponen Backend:
- **Framework**: NestJS v11
- **Database Utama**: PostgreSQL 16
- **ORM**: Prisma Client v6
- **Autentikasi**: JWT Access Token (15 menit) + Refresh Token Rotation (7 hari) tersimpan terenkripsi bcrypt
- **External Integration**: Connector Pool `mysql2/promise` ke MySQL E-Gov & SIMPEG (SELECT Only)
- **API Docs**: Swagger UI (`/docs`)

### Komponen Frontend:
- **Framework**: Next.js 15 (App Router, React 19)
- **State & Data Fetching**: TanStack React Query v5
- **Desain & UI**: Tailwind CSS, Shadcn UI / Radix UI, Lucide Icons, Sonner Toast
- **Filter Pintar**: `SearchableCombobox` untuk pencarian instan nama Unit Kerja (OPD) dan Sub Unit Kerja

---

## 🛠️ 5. Fitur Utama Manajemen Pengguna & Pegawai

1. **Autentikasi Terpadu E-Gov & SIMPEG**:
   - ASN dapat login menggunakan NIP atau Username E-Gov disertai password akun E-Gov masing-masing.
   - Akun yang valid dari E-Gov secara otomatis dapat ditugaskan hak akses role SIMANTAP oleh Administrator.
2. **Dukungan Multi-Role**:
   - Satu pengguna dapat memegang beberapa peran sekaligus (contoh: *Admin PPK* sekaligus *Bendahara*).
3. **Filter Unit Kerja & Sub Unit Kerja yang Dapat Diketik**:
   - Dropdown filter unit kerja berbasis combobox yang dapat diketik kata kuncinya secara instan.
4. **Mekanisme Cabut Akses vs Kembalikan ke Default**:
   - **Cabut Akses**: Status akun diubah menjadi `Non-Aktif`, sesi login ditarik, namun peran yang telah ditetapkan tetap tersimpan sebagai arsip penugasan.
   - **Kembalikan ke Default (Belum Diberi Akses)**: Menghapus data akun dari database SIMANTAP lokal, sehingga pengguna kembali bersih (*fresh*) ke Direktori ASN dengan status awal "Belum Diberi Akses".

---

## 🚀 6. Panduan Menjalankan Sistem (Local Development)

### 📋 Prasyarat
- **Node.js**: Versi `>= 20.x`
- **npm**: Versi `>= 10.x`
- **PostgreSQL**: Versi `>= 14.x` (berjalan di port 5432)

---

### A. Setup Backend

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```

2. Instal dependensi:
   ```bash
   npm install
   ```

3. Konfigurasi file `.env`:
   ```bash
   cp .env.example .env
   ```
   Pastikan variabel basis data PostgreSQL lokal telah sesuai:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/simantap?schema=public"
   PORT=4000
   NODE_ENV=development

   # Kredensial Database Eksternal (READ-ONLY)
   EGOV_DB_HOST="mysql.konaweselatankab.go.id"
   EGOV_DB_PORT=3306
   EGOV_DB_USER="***"
   EGOV_DB_PASSWORD="***"
   EGOV_DB_NAME="egov"
   SIMPEG_DB_NAME="simpeg"

   # JWT Keys
   JWT_SECRET="simantap-jwt-access-secret-super-secure-key-2026"
   JWT_REFRESH_SECRET="simantap-jwt-refresh-secret-super-secure-key-2026"
   ```

4. Sinkronkan skema dan jalankan generator Prisma:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. Jalankan seed data awal (OPD dan akun Administrator):
   ```bash
   npm run prisma:seed
   ```

6. Jalankan backend server:
   ```bash
   npm run start:dev
   ```
   - API Service: `http://localhost:4000/api/v1`
   - Dokumentasi Swagger: `http://localhost:4000/docs`
   - Health Check: `http://localhost:4000/api/v1/health`

---

### B. Setup Frontend

1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```

2. Instal dependensi:
   ```bash
   npm install
   ```

3. Konfigurasi file `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
   ```

4. Jalankan frontend development server:
   ```bash
   npm run dev
   ```
   - Aplikasi Web: `http://localhost:3000`

---

## 🔑 7. Akun Awal untuk Pengujian (Seeded Accounts)

| NIP / Username | Nama Pengguna | Peran Awal (Roles) | Kata Sandi Default |
| :--- | :--- | :--- | :--- |
| `199506082024211001` | RISWAN M. RIZAL, S.T | `ADMINISTRATOR` | `Password123!` |
| `01` | IRHAM KALENGGO, S.Sos., M.Si | `PIMPINAN_DAERAH` | `Password123!` |
| `199401182025212016` | FATMAH RIZKIDINIAH, S.T | `ADMINISTRATOR` | `Password123!` |

> *Catatan: Akun ASN lainnya dapat login langsung menggunakan kredensial username/password E-Gov Konawe Selatan setelah diberikan role oleh Administrator.*

---

## 📁 8. Struktur Direktori Proyek

```text
simantap/
├── backend/                        # Backend API (NestJS v11)
│   ├── prisma/
│   │   ├── schema.prisma           # Skema Data PostgreSQL SIMANTAP
│   │   └── seed.ts                 # Script seeding data OPD & Admin
│   ├── src/
│   │   ├── common/                 # Guards, Decorators, Enums, Interfaces
│   │   ├── core/                   # E-Gov/SIMPEG Service & Prisma Service
│   │   ├── modules/
│   │   │   ├── auth/               # Modul Login, Refresh Token, JWT Strategy
│   │   │   ├── users/              # Modul Manajemen Role, Pegawai SIMPEG
│   │   │   └── health/             # Health check endpoint
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
│
├── frontend/                       # Web Client Application (Next.js 15)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/       # Halaman Login SIMANTAP
│   │   │   └── (dashboard)/        # Layout Dashboard & Manajemen Akun
│   │   │       └── users/          # Manajemen Pengguna & Direktori Pegawai
│   │   ├── components/             # Reusable UI (Sidebar, Dialogs, Combobox)
│   │   ├── contexts/               # AuthContext & State Management
│   │   ├── hooks/                  # Custom Hooks (useAuth, useDebounce)
│   │   └── lib/                    # Axios API Client & Utility Functions
│   └── package.json
│
├── AGENTS.md                       # Aturan Absolut Sistem (Read-Only MySQL E-Gov)
├── prd.md                          # Product Requirement Document Lengkap
└── README.md                       # Dokumentasi Proyek
```

---

## 📄 9. Lisensi & Hak Cipta

Sistem ini dikembangkan khusus untuk **Pemerintah Kabupaten Konawe Selatan**, Provinsi Sulawesi Tenggara.  
Hak Cipta © 2026 Bagian Administrasi Pembangunan Sekretariat Daerah Kabupaten Konawe Selatan. Seluruh hak cipta dilindungi undang-undang.
