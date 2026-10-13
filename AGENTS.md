## 🔒 ATURAN MUTLAK SISTEM (READ-ONLY E-GOV & SIMPEG)
Database eksternal E-Gov dan SIMPEG (`mysql.konaweselatankab.go.id`):
1. **MUTLAK HANYA BACA (READ-ONLY / SELECT ONLY)**.
2. **DILARANG KERAS** melakukan aksi manipulasi data apapun (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`) ke database `egov` maupun `simpeg`.
3. Seluruh penetapan hak akses, pembuatan akun MONALISA KONSEL, penugasan role, dan manajemen paket pembangunan **HANYA BOLEH** disimpan di basis data lokal PostgreSQL (`simantap`).

## ⚡ ATURAN BUILD, GIT PUSH & DEPLOYMENT HESTIACP
1. **DILARANG** menjalankan proses build (`npm run build` / `npm run build:zip`) dan **DILARANG** melakukan `git push` kecuali **HANYA JIKA DIPERINTAHKAN SECARA EKSPLISIT OLEH USER**.
2. **STANDAR BUILD FRONTEND UNTUK HOSTING HESTIACP**:
   - Jika user meminta **"build"**, **"build:zip"**, atau **"siapkan untuk hosting/upload Hestia"**:
     Jalankan perintah: `npm run build:zip` di direktori `frontend/`.
   - Perintah ini secara otomatis:
     - Melakukan kompilasi static export Next.js ke folder `frontend/out/` (termasuk membawa file `.htaccess` dari `frontend/public/`).
     - Mengompresi isi folder menjadi paket siap upload: `frontend/dist.zip`.
   - Laporkan lokasi path `dist.zip` kepada user agar siap diunggah ke `public_html` File Manager HestiaCP dan di-unzip.
3. Setiap perubahan ikuti instruksi secara fokus tanpa menambah-nambahkan aksi yang tidak diminta.
