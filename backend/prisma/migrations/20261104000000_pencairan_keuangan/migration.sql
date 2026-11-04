CREATE TABLE "pencairan_keuangan" (
  "id" TEXT NOT NULL,
  "paket_id" TEXT NOT NULL,
  "bulan" INTEGER NOT NULL CHECK ("bulan" BETWEEN 1 AND 12),
  "nominal" DECIMAL(18,2) NOT NULL CHECK ("nominal" > 0),
  "catatan" TEXT NOT NULL,
  "input_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pencairan_keuangan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pencairan_keuangan_paket_id_fkey" FOREIGN KEY ("paket_id") REFERENCES "paket_pembangunan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "pencairan_keuangan_paket_id_bulan_idx" ON "pencairan_keuangan"("paket_id", "bulan");
