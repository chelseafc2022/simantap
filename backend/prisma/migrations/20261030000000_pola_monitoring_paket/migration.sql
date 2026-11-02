ALTER TABLE "paket_pembangunan"
ADD COLUMN "kelompok_paket" TEXT NOT NULL DEFAULT 'PEMBANGUNAN_MODAL',
ADD COLUMN "pola_monitoring" TEXT NOT NULL DEFAULT 'FISIK_KEUANGAN';
ALTER TABLE "paket_pembangunan" ADD CONSTRAINT "paket_kelompok_check" CHECK ("kelompok_paket" IN ('PEMBANGUNAN_MODAL', 'OPERASIONAL_RUTIN', 'PERLU_DITINJAU'));
ALTER TABLE "paket_pembangunan" ADD CONSTRAINT "paket_monitoring_check" CHECK ("pola_monitoring" IN ('FISIK_KEUANGAN', 'KEUANGAN'));
