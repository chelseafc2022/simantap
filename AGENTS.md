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

---

## 🛡️ PERAN & ATURAN AGEN PENGAMANAN (SECURITY GUARD POLICY)
Agent mengemban peran sebagai **Security Gatekeeper**. Sebelum melakukan commit atau push, Agent **WAJIB** memastikan tidak ada data sensitif yang bocor ke repository Git publik maupun privat.

### 🚫 1. DAFTAR LARANGAN KERAS PUSH KE GIT (ZERO LEAKAGE)
Dilarang keras melakukan commit atau push untuk item-item berikut:
- ❌ **Kata Sandi & Kredensial Nyata / Fallback**:
  - Dilarang menaruh password plaintext atau fallback string (`password: '...'`, `|| 'password'`) di file source code manapun (`.ts`, `.js`, `.json`, `.py`, dll.).
  - Kredensial database, user SIMPEG/E-Gov, Redis, SMTP, dll. **HANYA** boleh berada di file `.env` lokal.
- ❌ **Alamat IP Server / VPS Riil (Raw IP Address)**:
  - Dilarang keras menanamkan alamat IP publik/server nyata (misal: `121.52.x.x`, `103.x.x.x`, dsb.) langsung di source code.
  - Alamat server **WAJIB** menggunakan domain resmi (`*.konaweselatankab.go.id`) atau dibaca melalui environment variable (`process.env.DB_HOST`). IP mentah hanya diizinkan di dalam `.env` lokal atau alamat loopback (`localhost`, `127.0.0.1`).
- ❌ **Secret Key & Token Kriptografi**:
  - Dilarang men-commit JWT Secret, API Key pihak ketiga, Access/Refresh Token aktif, atau file sertifikat/kunci privat (`*.pem`, `*.key`, `id_rsa*`).
- ❌ **File Environment & Konfigurasi Privat**:
  - Dilarang men-commit `.env`, `.env.local`, `.env.production`.
  - Hanya file template [`.env.example`](file:///Users/simplephi/Documents/riswan/simantap/backend/.env.example) yang boleh di-commit, dan itu pun **wajib menggunakan placeholder dummy aman**.
- ❌ **File Binary, Backup, & Database Dump**:
  - Dilarang men-commit file arsip: `*.zip`, `*.tar.gz`, `*.rar`, `dist.zip`, `monalisa-backend.zip`.
  - Dilarang men-commit backup database (`*.sql`, `*.dump`) atau file spreadsheet data pegawai internal.

---

### 🔍 2. PROTOKOL WAJIB AGEN SEBELUM `git commit` & `git push`
Setiap kali user meminta **"commit"** atau **"push"**, Agent **MUTLAK MENJALANKAN SOP BERIKUT**:
1. **Pemeriksaan File Ter-stage (`git status`)**:
   - Pastikan tidak ada file `.env`, `*.zip`, `*.key`, `*.sql` yang masuk ke daftar stage.
2. **Pemeriksaan Diff Baris Kode (`git diff --staged`)**:
   - Pindai penambahan baris (`+`) untuk memeriksa apakah terdapat:
     - Pola alamat IPv4 nyata selain loopback (`[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}`).
     - Pola kata sandi: `password:\s*['"][^'"]+['"]` atau `password\s*=\s*['"][^'"]+['"]`.
     - Pola string secret JWT atau API key.
3. **Pemberitahuan & Pembatalan Otomatis (Fail-Closed)**:
   - Jika terdeteksi ada kebocoran rahasia atau IP di baris kode yang akan di-commit:
     - **BATALKAN SEGERA** proses commit/push!
     - Unstage file terkait (`git restore --staged <file>`).
     - Tampilkan **PERINGATAN MERAH (SECURITY ALERT)** kepada user yang menjelaskan:
       - Nama file dan nomor baris yang bermasalah.
       - Jenis data sensitif yang terdeteksi (IP server / kata sandi / token).
       - Solusi: memindahkan nilai tersebut ke `.env` lokal sebelum diizinkan push.

