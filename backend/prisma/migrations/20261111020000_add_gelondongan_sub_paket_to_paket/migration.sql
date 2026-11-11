-- AlterTable
ALTER TABLE "paket_pembangunan" ADD COLUMN IF NOT EXISTS "is_gelondongan" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "paket_pembangunan" ADD COLUMN IF NOT EXISTS "sub_paket" JSONB DEFAULT '[]'::jsonb;
