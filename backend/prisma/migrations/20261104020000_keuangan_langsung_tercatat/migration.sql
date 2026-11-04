UPDATE "realisasi_bulanan" AS r
SET "status_verifikasi" = 'TERCATAT',
    "catatan_verifikasi" = NULL,
    "verifikasi_oleh_id" = NULL,
    "verifikasi_at" = NULL,
    "diajukan_at" = NULL
FROM "paket_pembangunan" AS p
WHERE r."paket_id" = p."id" AND p."pola_monitoring" = 'KEUANGAN';
