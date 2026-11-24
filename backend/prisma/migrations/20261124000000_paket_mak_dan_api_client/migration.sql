-- Migrasi ADITIF: hanya membuat tabel baru, tidak mengubah tabel yang sudah berjalan.

CREATE TABLE IF NOT EXISTS "paket_mak" (
    "id" TEXT NOT NULL,
    "paket_id" TEXT NOT NULL,
    "mak" TEXT NOT NULL,
    "pagu" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sumber_dana" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paket_mak_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "paket_mak_paket_id_fkey" FOREIGN KEY ("paket_id") REFERENCES "paket_pembangunan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "paket_mak_paket_id_idx" ON "paket_mak"("paket_id");
CREATE INDEX IF NOT EXISTS "paket_mak_mak_idx" ON "paket_mak"("mak");

CREATE TABLE IF NOT EXISTS "api_clients" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "allowed_ips" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_clients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "api_clients_key_hash_key" ON "api_clients"("key_hash");

CREATE TABLE IF NOT EXISTS "api_access_logs" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status_code" INTEGER,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_access_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_access_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "api_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "api_access_logs_client_id_created_at_idx" ON "api_access_logs"("client_id", "created_at");
