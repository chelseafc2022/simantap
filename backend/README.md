# SIMANTAP Backend Core API
**Sistem Informasi Monitoring dan Evaluasi Data Pembangunan Terpadu**  
*Pemerintah Kabupaten Konawe Selatan — Bagian Administrasi Pembangunan Sekretariat Daerah*

---

## 🏛️ Arsitektur & Teknologi

Proyek backend ini dirancang menggunakan standar arsitektur profesional enterprise (*Clean & Modular Architecture*):

- **Framework**: [NestJS](https://nestjs.com/) v11 (TypeScript Strict Mode)
- **Database & ORM**: PostgreSQL 16 + [Prisma ORM](https://www.prisma.io/) v6
- **In-Memory Cache & Message Broker**: Redis 7 ([ioredis](https://github.com/redis/ioredis))
- **Job & Task Queue**: [BullMQ](https://docs.bullmq.io/) (`@nestjs/bullmq`)
- **Autentikasi & Keamanan**:
  - JWT Access Token (15 menit) + Refresh Token Rotation (7 hari) tersimpan di database
  - Password hashing menggunakan Bcrypt (salt rounds 10)
  - Role-Based Access Control (RBAC) 7 Role Pemkab Konawe Selatan
  - Global `JwtAuthGuard` & `RolesGuard`
  - Global `ValidationPipe` (class-validator & class-transformer)
- **Email Service**: `@nestjs-modules/mailer` + Nodemailer (Handlebars template support)
- **Dokumentasi API**: Swagger / OpenAPI di `/docs`
- **Health Check & Monitoring**: `@nestjs/terminus` di `/api/v1/health`
- **Response Format**: Standardized API Envelope `{ success, statusCode, message, data, meta, timestamp }`

---

## 📁 Struktur Direktori

```
backend/
├── prisma/
│   ├── schema.prisma         # Definisi model basis data PostgreSQL (User, Role, OPD, SubUnit, AuditLog, dsb.)
│   └── seed.ts               # Seeder data master (OPD, 7 akun pengguna role RBAC, setting default)
├── src/
│   ├── common/               # Komponen lintas modul
│   │   ├── constants/        # Konstanta metadata & key metadata decorator
│   │   ├── decorators/       # @CurrentUser(), @Roles(), @Public()
│   │   ├── dto/              # PaginationDto, ApiResponseDto
│   │   ├── enums/            # RoleEnum (7 Role Pemkab)
│   │   ├── filters/          # HttpExceptionFilter, AllExceptionsFilter
│   │   ├── guards/           # JwtAuthGuard, RolesGuard
│   │   ├── interceptors/     # TransformInterceptor, LoggingInterceptor
│   │   └── interfaces/       # ApiResponse, JwtPayload, AuthenticatedUser
│   ├── config/               # Manajemen konfigurasi environment (@nestjs/config + Joi validation)
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   ├── mail.config.ts
│   │   └── validation.schema.ts
│   ├── core/                 # Modul infrastruktur fondasi
│   │   ├── database/         # PrismaService & PrismaModule (Global)
│   │   ├── redis/            # RedisService & RedisModule (Global)
│   │   ├── queue/            # BullMQ QueueModule (Global)
│   │   ├── mail/             # MailService & MailModule (Global)
│   │   └── health/           # HealthController & TerminusModule
│   ├── modules/              # Domain/Fitur Bisnis
│   │   └── auth/             # Otentikasi, login NIP/Email, refresh token, profil
│   ├── app.module.ts         # Root module dengan registrasi global guards, interceptors, filters
│   └── main.ts               # Entrypoint, CORS, global prefix, Swagger setup
├── docker-compose.yml        # PostgreSQL & Redis container
├── .env.example              # Template variabel lingkungan
└── package.json
```

---

## 👥 7 Role RBAC Terintegrasi

| Role Enum | Deskripsi Peran & Tanggung Jawab |
| :--- | :--- |
| `ADMINISTRATOR` | Hak akses penuh, manajemen pengguna, konfigurasi sistem & penguncian periode |
| `ADMIN_SIRUP` | Pengelola data awal paket pekerjaan pembangunan & integrasi SiRUP LKPP |
| `ADMIN_PERENCANAAN` | Penginput target capaian bulanan fisik (%) & keuangan (Rp) B01 — B12 |
| `ADMIN_PPK` | Pejabat Pembuat Komitmen — input realisasi fisik riil & bukti dokumentasi foto |
| `BENDAHARA` | Bendahara Pengeluaran — input penyerapan anggaran riil berbasis SP2D / SPJ |
| `KEPALA_OPD` | Penelaah hasil capaian kegiatan OPD, penerbit rekomendasi SCM & persetujuan |
| `PIMPINAN_DAERAH` | Bupati / Wakil Bupati / Sekda — monitoring eksekutif capaian se-Kabupaten |

---

## 🚀 Panduan Menjalankan

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Variabel Lingkungan
Salin file `.env.example` menjadi `.env` dan sesuaikan koneksi database PostgreSQL serta Redis Anda:
```bash
cp .env.example .env
```

### 3. Migrasi & Seeding Basis Data
```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema ke PostgreSQL
npx prisma db push

# Jalankan Seeder data awal (OPD, 7 Akun Demo, Setting)
npm run prisma:seed
```

### 4. Menjalankan Aplikasi
```bash
# Mode Development (Hot-reload)
npm run start:dev

# Mode Production Build
npm run build
npm run start:prod
```

---

## 🔗 Endpoint Utama

- **Base URL API**: `http://localhost:4000/api/v1`
- **Swagger Documentation**: `http://localhost:4000/docs`
- **Health Check**: `http://localhost:4000/api/v1/health`

### Akun Demo Default (Hasil Seeder)
- **Password**: `Password123!`
- **Administrator**: NIP `198001012005011001` (`admin@konaweselatankab.go.id`)
- **Admin SiRUP**: NIP `198804122011011003` (`andi.sirup@konaweselatankab.go.id`)
- **Admin Perencanaan**: NIP `198607142010011002` (`budi.perencanaan@konaweselatankab.go.id`)
- **Admin PPK**: NIP `198209212008011004` (`herman.ppk@konaweselatankab.go.id`)
- **Bendahara**: NIP `199203202018012003` (`wahyuni.bendahara@konaweselatankab.go.id`)
- **Kepala OPD**: NIP `197505152000011002` (`rizki.kadis@konaweselatankab.go.id`)
- **Pimpinan Daerah**: NIP `196812101994031005` (`bupati@konaweselatankab.go.id`)
