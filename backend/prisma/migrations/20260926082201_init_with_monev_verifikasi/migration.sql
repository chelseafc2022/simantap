-- CreateEnum
CREATE TYPE "RoleEnum" AS ENUM ('ADMINISTRATOR', 'ADMIN_SIRUP', 'ADMIN_PERENCANAAN', 'ADMIN_PPK', 'BENDAHARA', 'KEPALA_OPD', 'PIMPINAN_DAERAH', 'MONEV');

-- CreateEnum
CREATE TYPE "StatusVerifikasi" AS ENUM ('DRAFT', 'DIAJUKAN', 'TERVERIFIKASI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusAkun" AS ENUM ('AKTIF', 'NON_AKTIF', 'TERKUNCI');

-- CreateTable
CREATE TABLE "opd" (
    "id" TEXT NOT NULL,
    "kode_opd" TEXT NOT NULL,
    "nama_opd" TEXT NOT NULL,
    "singkatan" TEXT,
    "alamat" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "nama_kepala_opd" TEXT,
    "nip_kepala_opd" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_unit" (
    "id" TEXT NOT NULL,
    "opd_id" TEXT NOT NULL,
    "kode_sub_unit" TEXT NOT NULL,
    "nama_sub_unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "RoleEnum",
    "roles" "RoleEnum"[] DEFAULT ARRAY[]::"RoleEnum"[],
    "status" "StatusAkun" NOT NULL DEFAULT 'AKTIF',
    "opd_id" TEXT,
    "sub_unit_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "payload" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "tahun_anggaran" INTEGER NOT NULL DEFAULT 2026,
    "ambang_kuning" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "ambang_merah" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "egov_active" BOOLEAN NOT NULL DEFAULT true,
    "simpeg_active" BOOLEAN NOT NULL DEFAULT true,
    "sirup_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locking_periods" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "batas_input" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locking_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paket_pembangunan" (
    "id" TEXT NOT NULL,
    "tahun_anggaran" INTEGER NOT NULL DEFAULT 2026,
    "opd_id" TEXT NOT NULL,
    "sub_unit_id" TEXT,
    "kode_rup_kontrak" TEXT,
    "nama_paket" TEXT NOT NULL,
    "lokasi_kegiatan" TEXT,
    "metode_pemilihan" TEXT,
    "jenis_pengadaan" TEXT,
    "nilai_pagu" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "nilai_kontrak" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sumber_dana" TEXT,
    "nomor_kontrak" TEXT,
    "tanggal_mulai" TIMESTAMP(3),
    "tanggal_selesai" TIMESTAMP(3),
    "pemenang_rekanan" TEXT,
    "keterangan" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paket_pembangunan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_bulanan" (
    "id" TEXT NOT NULL,
    "paket_id" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "target_fisik" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_bulanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realisasi_bulanan" (
    "id" TEXT NOT NULL,
    "paket_id" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "realisasi_fisik" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realisasi_keuangan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "catatan_operator" TEXT,
    "input_by_id" TEXT,
    "status_verifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'DRAFT',
    "catatan_verifikasi" TEXT,
    "verifikasi_oleh_id" TEXT,
    "verifikasi_at" TIMESTAMP(3),
    "diajukan_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realisasi_bulanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bukti_fisik" (
    "id" TEXT NOT NULL,
    "realisasi_id" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "path_file" TEXT NOT NULL,
    "mime_type" TEXT,
    "ukuran_bytes" INTEGER,
    "deskripsi" TEXT,
    "upload_oleh_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bukti_fisik_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opd_kode_opd_key" ON "opd"("kode_opd");

-- CreateIndex
CREATE UNIQUE INDEX "sub_unit_opd_id_kode_sub_unit_key" ON "sub_unit"("opd_id", "kode_sub_unit");

-- CreateIndex
CREATE UNIQUE INDEX "users_nip_key" ON "users"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "locking_periods_tahun_bulan_key" ON "locking_periods"("tahun", "bulan");

-- CreateIndex
CREATE INDEX "paket_pembangunan_tahun_anggaran_opd_id_idx" ON "paket_pembangunan"("tahun_anggaran", "opd_id");

-- CreateIndex
CREATE INDEX "target_bulanan_paket_id_idx" ON "target_bulanan"("paket_id");

-- CreateIndex
CREATE UNIQUE INDEX "target_bulanan_paket_id_bulan_key" ON "target_bulanan"("paket_id", "bulan");

-- CreateIndex
CREATE INDEX "realisasi_bulanan_paket_id_idx" ON "realisasi_bulanan"("paket_id");

-- CreateIndex
CREATE INDEX "realisasi_bulanan_status_verifikasi_idx" ON "realisasi_bulanan"("status_verifikasi");

-- CreateIndex
CREATE UNIQUE INDEX "realisasi_bulanan_paket_id_bulan_key" ON "realisasi_bulanan"("paket_id", "bulan");

-- CreateIndex
CREATE INDEX "bukti_fisik_realisasi_id_idx" ON "bukti_fisik"("realisasi_id");

-- AddForeignKey
ALTER TABLE "sub_unit" ADD CONSTRAINT "sub_unit_opd_id_fkey" FOREIGN KEY ("opd_id") REFERENCES "opd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_opd_id_fkey" FOREIGN KEY ("opd_id") REFERENCES "opd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sub_unit_id_fkey" FOREIGN KEY ("sub_unit_id") REFERENCES "sub_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paket_pembangunan" ADD CONSTRAINT "paket_pembangunan_opd_id_fkey" FOREIGN KEY ("opd_id") REFERENCES "opd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paket_pembangunan" ADD CONSTRAINT "paket_pembangunan_sub_unit_id_fkey" FOREIGN KEY ("sub_unit_id") REFERENCES "sub_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paket_pembangunan" ADD CONSTRAINT "paket_pembangunan_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_bulanan" ADD CONSTRAINT "target_bulanan_paket_id_fkey" FOREIGN KEY ("paket_id") REFERENCES "paket_pembangunan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realisasi_bulanan" ADD CONSTRAINT "realisasi_bulanan_paket_id_fkey" FOREIGN KEY ("paket_id") REFERENCES "paket_pembangunan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realisasi_bulanan" ADD CONSTRAINT "realisasi_bulanan_input_by_id_fkey" FOREIGN KEY ("input_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realisasi_bulanan" ADD CONSTRAINT "realisasi_bulanan_verifikasi_oleh_id_fkey" FOREIGN KEY ("verifikasi_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bukti_fisik" ADD CONSTRAINT "bukti_fisik_realisasi_id_fkey" FOREIGN KEY ("realisasi_id") REFERENCES "realisasi_bulanan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bukti_fisik" ADD CONSTRAINT "bukti_fisik_upload_oleh_id_fkey" FOREIGN KEY ("upload_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
