-- Detail target dan realisasi paket per minggu. Rekap bulanan tetap dipertahankan
-- sebagai sumber laporan TEPRA dan dashboard yang sudah berjalan.
CREATE TABLE "target_mingguan" (
    "id" TEXT NOT NULL,
    "paket_id" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "minggu_ke" INTEGER NOT NULL,
    "tanggal_mulai" TIMESTAMP(3) NOT NULL,
    "tanggal_selesai" TIMESTAMP(3) NOT NULL,
    "uraian_kegiatan" TEXT,
    "target_fisik" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_mingguan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "realisasi_mingguan" (
    "id" TEXT NOT NULL,
    "paket_id" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "minggu_ke" INTEGER NOT NULL,
    "realisasi_fisik" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realisasi_keuangan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "catatan_operator" TEXT,
    "input_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "realisasi_mingguan_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bukti_fisik" ADD COLUMN "minggu_ke" INTEGER;

CREATE UNIQUE INDEX "target_mingguan_paket_id_bulan_minggu_ke_key"
ON "target_mingguan"("paket_id", "bulan", "minggu_ke");
CREATE INDEX "target_mingguan_paket_id_bulan_idx"
ON "target_mingguan"("paket_id", "bulan");
CREATE UNIQUE INDEX "realisasi_mingguan_paket_id_bulan_minggu_ke_key"
ON "realisasi_mingguan"("paket_id", "bulan", "minggu_ke");
CREATE INDEX "realisasi_mingguan_paket_id_bulan_idx"
ON "realisasi_mingguan"("paket_id", "bulan");

ALTER TABLE "target_mingguan"
ADD CONSTRAINT "target_mingguan_paket_id_fkey"
FOREIGN KEY ("paket_id") REFERENCES "paket_pembangunan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "realisasi_mingguan"
ADD CONSTRAINT "realisasi_mingguan_paket_id_fkey"
FOREIGN KEY ("paket_id") REFERENCES "paket_pembangunan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill paket lama yang sudah mempunyai tanggal kontrak dan target bulanan.
-- Nilai antar-minggu diinterpolasi dari target bulan sebelumnya ke target bulan berjalan.
WITH contract_months AS (
    SELECT
        p."id" AS paket_id,
        p."tanggal_mulai"::date AS contract_start,
        p."tanggal_selesai"::date AS contract_end,
        month_start::date,
        EXTRACT(MONTH FROM month_start)::integer AS bulan
    FROM "paket_pembangunan" p
    CROSS JOIN LATERAL generate_series(
        date_trunc('month', p."tanggal_mulai"),
        date_trunc('month', p."tanggal_selesai"),
        interval '1 month'
    ) month_start
    WHERE p."tanggal_mulai" IS NOT NULL
      AND p."tanggal_selesai" IS NOT NULL
      AND p."tanggal_selesai" >= p."tanggal_mulai"
), week_starts AS (
    SELECT
        cm.*,
        week_start::date,
        LEAST(
            (week_start + interval '6 days')::date,
            cm.contract_end,
            (cm.month_start + interval '1 month - 1 day')::date
        ) AS week_end
    FROM contract_months cm
    CROSS JOIN LATERAL generate_series(
        GREATEST(cm.contract_start, cm.month_start),
        LEAST(cm.contract_end, (cm.month_start + interval '1 month - 1 day')::date),
        interval '7 days'
    ) week_start
), numbered_weeks AS (
    SELECT
        ws.*,
        ROW_NUMBER() OVER (PARTITION BY ws.paket_id, ws.bulan ORDER BY ws.week_start)::integer AS minggu_ke,
        COUNT(*) OVER (PARTITION BY ws.paket_id, ws.bulan)::integer AS jumlah_minggu
    FROM week_starts ws
)
INSERT INTO "target_mingguan" (
    "id", "paket_id", "bulan", "minggu_ke", "tanggal_mulai", "tanggal_selesai",
    "uraian_kegiatan", "target_fisik", "created_at", "updated_at"
)
SELECT
    md5(nw.paket_id || '-' || nw.bulan::text || '-' || nw.minggu_ke::text),
    nw.paket_id,
    nw.bulan,
    nw.minggu_ke,
    nw.week_start,
    nw.week_end,
    NULL,
    ROUND((
        COALESCE(prev."target_fisik", 0)
        + (COALESCE(curr."target_fisik", 0) - COALESCE(prev."target_fisik", 0))
          * nw.minggu_ke::numeric / nw.jumlah_minggu::numeric
    )::numeric, 2)::double precision,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM numbered_weeks nw
LEFT JOIN "target_bulanan" curr
  ON curr."paket_id" = nw.paket_id AND curr."bulan" = nw.bulan
LEFT JOIN "target_bulanan" prev
  ON prev."paket_id" = nw.paket_id AND prev."bulan" = nw.bulan - 1
ON CONFLICT ("paket_id", "bulan", "minggu_ke") DO NOTHING;

-- Tempatkan capaian bulanan lama pada minggu terakhir bulan terkait agar histori
-- tetap terlihat dan dapat dilanjutkan melalui alur mingguan.
INSERT INTO "realisasi_mingguan" (
    "id", "paket_id", "bulan", "minggu_ke", "realisasi_fisik",
    "realisasi_keuangan", "catatan_operator", "input_by_id", "created_at", "updated_at"
)
SELECT
    md5(rb."paket_id" || '-real-' || rb."bulan"::text || '-' || weeks.minggu_ke::text),
    rb."paket_id",
    rb."bulan",
    weeks.minggu_ke,
    rb."realisasi_fisik",
    rb."realisasi_keuangan",
    rb."catatan_operator",
    rb."input_by_id",
    rb."created_at",
    rb."updated_at"
FROM "realisasi_bulanan" rb
JOIN (
    SELECT "paket_id", "bulan", MAX("minggu_ke") AS minggu_ke
    FROM "target_mingguan"
    GROUP BY "paket_id", "bulan"
) weeks ON weeks."paket_id" = rb."paket_id" AND weeks."bulan" = rb."bulan"
WHERE rb."realisasi_fisik" > 0
   OR rb."realisasi_keuangan" > 0
   OR rb."catatan_operator" IS NOT NULL
ON CONFLICT ("paket_id", "bulan", "minggu_ke") DO NOTHING;

UPDATE "bukti_fisik" bf
SET "minggu_ke" = weeks.minggu_ke
FROM "realisasi_bulanan" rb
JOIN (
    SELECT "paket_id", "bulan", MAX("minggu_ke") AS minggu_ke
    FROM "target_mingguan"
    GROUP BY "paket_id", "bulan"
) weeks ON weeks."paket_id" = rb."paket_id" AND weeks."bulan" = rb."bulan"
WHERE bf."realisasi_id" = rb."id"
  AND bf."minggu_ke" IS NULL;
