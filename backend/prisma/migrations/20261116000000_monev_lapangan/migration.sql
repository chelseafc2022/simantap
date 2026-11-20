-- CreateTable
CREATE TABLE IF NOT EXISTS "monev_lapangan" (
    "id" TEXT NOT NULL,
    "paket_id" TEXT NOT NULL,
    "tanggal_monev" TIMESTAMP(3) NOT NULL,
    "progres_fisik" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kondisi_fisik" TEXT NOT NULL,
    "permasalahan" TEXT,
    "saran" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monev_lapangan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "monev_lapangan_paket_id_fkey" FOREIGN KEY ("paket_id") REFERENCES "paket_pembangunan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "monev_lapangan_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "monev_foto" (
    "id" TEXT NOT NULL,
    "monev_id" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "path_file" TEXT NOT NULL,
    "mime_type" TEXT,
    "ukuran_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monev_foto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "monev_foto_monev_id_fkey" FOREIGN KEY ("monev_id") REFERENCES "monev_lapangan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "monev_lapangan_paket_id_idx" ON "monev_lapangan"("paket_id");
CREATE INDEX IF NOT EXISTS "monev_foto_monev_id_idx" ON "monev_foto"("monev_id");
