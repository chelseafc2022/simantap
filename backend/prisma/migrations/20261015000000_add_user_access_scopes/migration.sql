-- Cakupan penugasan lintas OPD disimpan terpisah dari OPD asal pegawai.
CREATE TABLE "user_access_scopes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "RoleEnum" NOT NULL,
    "opd_id" TEXT NOT NULL,
    "sub_unit_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_access_scopes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_access_scopes_user_id_role_idx"
    ON "user_access_scopes"("user_id", "role");

CREATE INDEX "user_access_scopes_opd_id_idx"
    ON "user_access_scopes"("opd_id");

ALTER TABLE "user_access_scopes"
    ADD CONSTRAINT "user_access_scopes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
