-- AlterTable
ALTER TABLE "paket_pembangunan" ADD COLUMN IF NOT EXISTS "parent_id" TEXT;
ALTER TABLE "paket_pembangunan" ADD COLUMN IF NOT EXISTS "is_induk_gelondongan" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "paket_pembangunan_parent_id_idx" ON "paket_pembangunan"("parent_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'paket_pembangunan_parent_id_fkey'
  ) THEN
    ALTER TABLE "paket_pembangunan"
      ADD CONSTRAINT "paket_pembangunan_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "paket_pembangunan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
