# SIMANTAP
**Sistem Informasi Monitoring dan Evaluasi Data Pembangunan Terpadu**  
*Pemerintah Kabupaten Konawe Selatan — Bagian Administrasi Pembangunan Sekretariat Daerah*

---

## 📂 Struktur Proyek

Repositori ini menggunakan struktur modular terpisah antara backend dan frontend:

- **`backend/`**: RESTful API berbasis NestJS v11, PostgreSQL, Prisma ORM, Redis, BullMQ, Mailer, JWT Auth (Access + Refresh Token), RBAC 7 Role, dan Swagger.
- **`frontend/`**: Web Application berbasis Next.js, TanStack Query, Tailwind CSS, wrapper refresh token (fase pengembangan berikutnya).
- **`prd.md`**: Dokumen Spesifikasi Kebutuhan Produk (*Product Requirement Document*).

---

## 🚀 Memulai Backend

Silakan masuk ke direktori `backend` dan ikuti petunjuk pada [README Backend](./backend/README.md):

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npx prisma db push
npm run prisma:seed
npm run start:dev
```

- API Base URL: `http://localhost:4000/api/v1`
- Swagger Docs: `http://localhost:4000/docs`
- Health Check: `http://localhost:4000/api/v1/health`
