# 🚀 PANDUAN BUILD & DEPLOYMENT KE HESTIACP
**Aplikasi: MONALISA KONSEL (SIMANTAP)**  
Pemerintah Kabupaten Konawe Selatan — Bagian Administrasi Pembangunan

---

## 📌 1. INFORMASI VERSI BUILD TERBARU

| Parameter | Keterangan |
| :--- | :--- |
| **Versi Aplikasi** | `v0.1.0-prod` (MONALISA KONSEL) |
| **Framework** | Next.js `16.3.6` (Turbopack Static Export) |
| **Core UI Engine** | React `19.2.8` + Tailwind CSS v4 + Radix UI |
| **Git Commit Terakhir** | `7c5b203` (*feat: validasi kontrak paket, wajib bukti fisik realisasi, foto sekda di login, dan user scope*) |
| **Waktu Build Terakhir** | **16 Oktober 2026, 00:40 WITA** |
| **Nama File Paket Upload** | `frontend/dist.zip` (~34 MB) |
| **Direktori Sumber Build** | `frontend/out/` |

---

## ❓ 2. APAKAH HASIL BUILD ITU FOLDER `out`?

**YA, BENAR.**  
Karena konfigurasi Next.js menggunakan mode static export (`output: "export"` di `next.config.ts`), seluruh halaman Next.js dikompilasi menjadi berkas web statis (`HTML`, `JS`, `CSS`, gambar, serta file konfigurasi `.htaccess`) di dalam folder:
```
frontend/out/
```

---

## 📦 3. FILE MANA YANG DI-UPLOAD KE FILE MANAGER HESTIACP?

Untuk kemudahan dan kecepatan, yang Anda upload adalah:
👉 **`frontend/dist.zip`** (Path absolut: `[simantap]/frontend/dist.zip`)

> [!TIP]
> **Mengapa mengunggah `dist.zip`?**  
> Mengunggah 1 file arsip ZIP (`dist.zip`) berukuran ~34 MB lalu menekan tombol **"Extract / Unpack"** di File Manager HestiaCP membutuhkan waktu kurang dari 30 detik.  
> Jika mengunggah folder `out/` secara langsung, Anda harus mengunggah ribuan file satu per satu melalui browser yang rentan putus/gagal transfer.

---

## 🛠️ 4. LANGKAH-LANGKAH DEPLOYMENT DI HESTIACP

### Langkah 1: Buka File Manager HestiaCP
1. Login ke panel HestiaCP Anda.
2. Klik menu **File Manager**.
3. Navigasikan ke direktori web domain aplikasi Anda:
   ```
   web/<nama-domain-anda>/public_html/
   ```

### Langkah 2: Bersihkan File Lama (Kecuali Folder Khusus Jika Ada)
- Tandai semua file/folder aplikasi lama di dalam `public_html/` (seperti `_next`, folder `dashboard`, file `index.html`, dll.).
- Klik tombol **Delete** agar tidak ada sisa file versi lawas yang saling bertabrakan.

### Langkah 3: Upload `dist.zip`
- Klik tombol **Upload** di File Manager HestiaCP.
- Pilih file: `frontend/dist.zip` dari komputer Anda.
- Tunggu hingga proses upload 100% selesai.

### Langkah 4: Unpack / Extract
- Klik kanan atau pilih menu pada file `dist.zip` yang baru diunggah.
- Pilih menu **Unpack** (atau **Extract**).
- Pastikan hasil ekstrak langsung berada di dalam `public_html/`, sehingga struktur foldernya adalah:
  ```
  public_html/
  ├── .htaccess             <-- Routing halaman statis Next.js
  ├── index.html            <-- Halaman utama
  ├── login/                <-- Halaman login
  ├── dashboard/            <-- Halaman dashboard
  ├── pembangunan/          <-- Halaman paket pembangunan
  ├── realisasi/            <-- Halaman realisasi fisik & keuangan
  ├── laporan/              <-- Cetak laporan RFK
  ├── _next/                <-- Bundle JS & CSS statis
  ├── sekda.jpg             <-- Foto Sekda Konsel
  ├── bupati.png            <-- Foto Bupati
  ├── wakil_bupati.png      <-- Foto Wakil Bupati
  └── ...
  ```

### Langkah 5: Hapus File `dist.zip`
- Setelah berhasil diekstrak, hapus file `dist.zip` dari `public_html/` untuk menghemat ruang disk hosting.

### Langkah 6: Refresh Browser (Hard Refresh)
- Buka website di browser dan tekan **Ctrl + F5** (Windows/Linux) atau **Cmd + Shift + R** (Mac) untuk memastikan cache lama terhapus dan aset terbaru termuat sempurna.

---

## ⚡ 5. CARA MEMBUAT BUILD BARU DI MASA DEPAN

Kapan pun ada perubahan kode baru dan ingin membuat file `dist.zip` baru, jalankan satu perintah ini di terminal:

```bash
cd frontend
npm run build:zip
```

Perintah `build:zip` secara otomatis:
1. Menjalankan `next build` yang mengompilasi halaman ke `frontend/out/`.
2. Menyalin otomatis file konfigurasi server `.htaccess` ke dalam `frontend/out/`.
3. Mengompresi seluruh isi `out/` menjadi paket siap upload: `frontend/dist.zip`.
