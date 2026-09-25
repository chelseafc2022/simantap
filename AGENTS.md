
## 🔒 ATURAN MUTLAK SISTEM (READ-ONLY E-GOV & SIMPEG)
Database eksternal E-Gov dan SIMPEG (`mysql.konaweselatankab.go.id`):
1. **MUTLAK HANYA BACA (READ-ONLY / SELECT ONLY)**.
2. **DILARANG KERAS** melakukan aksi manipulasi data apapun (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`) ke database `egov` maupun `simpeg`.
3. Seluruh penetapan hak akses, pembuatan akun SIMANTAP, penugasan role, dan manajemen paket pembangunan **HANYA BOLEH** disimpan di basis data lokal PostgreSQL (`simantap`).
