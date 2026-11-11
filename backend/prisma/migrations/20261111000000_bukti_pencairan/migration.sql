-- CreateTable
CREATE TABLE "bukti_pencairan" (
    "id" TEXT NOT NULL,
    "pencairan_id" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "path_file" TEXT NOT NULL,
    "mime_type" TEXT,
    "ukuran_bytes" INTEGER,
    "deskripsi" TEXT,
    "upload_oleh_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bukti_pencairan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bukti_pencairan_pencairan_id_fkey" FOREIGN KEY ("pencairan_id") REFERENCES "pencairan_keuangan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "bukti_pencairan_pencairan_id_idx" ON "bukti_pencairan"("pencairan_id");
