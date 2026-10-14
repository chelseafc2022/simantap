# Diagram Sistem MONALISA KONSEL

Disusun berdasarkan kode proyek SIMANTAP/MONALISA pada 14 Oktober 2026. Diagram menggambarkan implementasi lokal, bukan hasil pemeriksaan database produksi. Diagram alir data (DFD) menjelaskan perpindahan data, sedangkan ERD menjelaskan relasi tabel; keduanya disediakan agar dokumentasi lengkap.

## 1. Diagram use case

Diagram berikut menggunakan bentuk use case melalui Mermaid: kotak di luar batas sistem adalah aktor, bentuk oval adalah fungsi sistem, dan garis adalah asosiasi. “Semua pengguna” mewakili kedelapan peran untuk fungsi bersama, bukan peran tambahan. Autentikasi menjadi prasyarat fungsi yang dilindungi.

```mermaid
flowchart LR
    ALL["Semua pengguna"]
    ADM["Administrator"]
    SIR["Admin SiRUP"]
    REN["Admin Perencanaan"]
    PPK["Admin PPK"]
    BEN["Bendahara"]
    MON["MONEV"]
    KEP["Kepala OPD"]
    PIM["Pimpinan Daerah"]
    EG["E-Gov / SIMPEG"]
    IN["SiRUP melalui INAPROC"]

    subgraph SYS["MONALISA KONSEL"]
      U1([Login, lihat profil, dan logout])
      U2([Kelola akun dan penugasan peran])
      U3([Kelola periode dan batas input])
      U4([Cari dan sinkronkan paket SiRUP])
      U5([Tambah dan ubah paket pembangunan])
      U6([Susun target fisik bulanan])
      U7([Input realisasi fisik dan bukti])
      U8([Input realisasi keuangan])
      U9([Ajukan realisasi untuk verifikasi])
      U10([Verifikasi atau tolak realisasi])
      U11([Lihat antrian verifikasi])
      U12([Pantau paket, realisasi, dan laporan])
      U13([Hapus paket / reset paket SiRUP])
    end

    ALL --- U1
    ALL --- U12
    ADM --- U2
    ADM --- U3
    ADM --- U4
    ADM --- U5
    ADM --- U6
    ADM --- U7
    ADM --- U8
    ADM --- U9
    ADM --- U10
    ADM --- U11
    ADM --- U13
    SIR --- U4
    SIR --- U5
    REN --- U5
    REN --- U6
    PPK --- U7
    PPK --- U9
    BEN --- U8
    BEN --- U9
    MON --- U4
    MON --- U10
    MON --- U11
    KEP --- U11
    PIM --- U11
    EG --- U1
    EG --- U2
    IN --- U4
```

### Penjelasan hak akses

| Aktor | Kewenangan khusus |
| --- | --- |
| Administrator | Kelola akun/peran, periode, paket, target, fisik, keuangan, bukti, pengajuan, verifikasi, penghapusan dan reset paket. |
| Admin SiRUP | Tambah/ubah paket dan sinkronkan paket SiRUP. |
| Admin Perencanaan | Ubah paket yang sudah ada dan susun target fisik bulanan; tidak memiliki endpoint tambah paket. |
| Admin PPK | Input fisik, unggah/hapus bukti fisik, dan ajukan realisasi. |
| Bendahara | Input keuangan dan ajukan realisasi. |
| MONEV | Sinkronkan SiRUP, lihat antrian, verifikasi atau tolak realisasi. |
| Kepala OPD | Pantau data sesuai cakupan akses dan lihat antrian verifikasi. |
| Pimpinan Daerah | Pantau lintas OPD dan lihat antrian verifikasi. |

Semua peran dapat membaca paket, realisasi, laporan, periode, serta pencarian SiRUP sesuai pembatasan endpoint dan cakupan akses. Administrator, MONEV, dan Pimpinan Daerah memiliki cakupan lintas OPD pada layanan pembangunan; peran lain mengikuti OPD/subunit pengguna. Satu pengguna dapat memiliki beberapa peran. Input fisik dan keuangan dibatasi per kolom sesuai peran.

**Catatan implementasi:** persetujuan/penolakan realisasi dilakukan oleh MONEV atau Administrator. Kepala OPD dan Pimpinan Daerah hanya dapat membaca antrian melalui endpoint yang tersedia. Ini mengikuti controller saat ini, meskipun README lama menyebut approval oleh Kepala OPD.

## 2. Diagram alir data (DFD)

### 2.1 Diagram konteks

Satu proses mewakili seluruh MONALISA. Panah menuju sistem eksternal merupakan permintaan baca, bukan perubahan data eksternal.

```mermaid
flowchart LR
    A["Administrator"]
    O["Operator: SiRUP, Perencanaan, PPK, Bendahara"]
    M["MONEV"]
    P["Kepala OPD / Pimpinan Daerah"]
    S(("0. MONALISA KONSEL"))
    E["E-Gov / SIMPEG"]
    I["SiRUP / INAPROC"]
    A -->|"Data akun, peran, periode, dan operasional"| S
    S -->|"Status pengelolaan, data, dan laporan"| A
    O -->|"Paket, target, realisasi, bukti, dan pengajuan"| S
    S -->|"Data paket, status input, hasil verifikasi, laporan"| O
    M -->|"Permintaan sinkronisasi dan keputusan verifikasi"| S
    S -->|"Hasil sinkronisasi, antrian, bukti, laporan"| M
    P -->|"Filter monitoring, antrian, dan laporan"| S
    S -->|"Rekap capaian, antrian, dan laporan"| P
    S -->|"Permintaan baca akun, ASN, OPD, subunit"| E
    E -->|"Data identitas dan organisasi"| S
    S -->|"Permintaan baca paket RUP"| I
    I -->|"Data paket pengadaan"| S
```

### 2.2 DFD level 1

Data store D1–D6 merupakan pengelompokan tabel PostgreSQL. D7 menyimpan berkas bukti; metadata dan lokasi berkas berada pada D5. Cache teknis tidak ditampilkan agar fokus pada aliran data bisnis.

```mermaid
flowchart TB
    U["Pengguna sesuai peran"]
    E["E-Gov / SIMPEG: hanya baca"]
    I["SiRUP / INAPROC: sumber paket"]
    P1(("1.0 Autentikasi dan akses"))
    P2(("2.0 Kelola paket dan target"))
    P3(("3.0 Catat dan ajukan realisasi"))
    P4(("4.0 Verifikasi realisasi"))
    P5(("5.0 Monitoring dan laporan"))
    P6(("6.0 Kelola periode input"))
    D1[("D1 users, roles, user_roles, refresh_tokens")]
    D2[("D2 paket_pembangunan")]
    D3[("D3 target_bulanan")]
    D4[("D4 realisasi_bulanan")]
    D5[("D5 bukti_fisik")]
    D6[("D6 locking_periods")]
    D7[("D7 Berkas bukti fisik")]
    DA[("audit_logs")]

    U -->|"Kredensial / pengaturan akses"| P1
    P1 -->|"Profil, token, status akses"| U
    P1 -->|"Permintaan baca identitas"| E
    E -->|"Identitas ASN dan akun"| P1
    D1 -->|"Akun, peran, sesi"| P1
    P1 -->|"Akun lokal, peran, sesi"| D1
    U -->|"Data paket, target, permintaan sinkronisasi"| P2
    P2 -->|"Permintaan data RUP"| I
    I -->|"Paket pengadaan"| P2
    P2 -->|"Permintaan referensi organisasi"| E
    E -->|"OPD dan subunit"| P2
    D2 -->|"Paket tersimpan"| P2
    P2 -->|"Paket baru / perubahan"| D2
    D3 -->|"Target tersimpan"| P2
    P2 -->|"Target bulanan"| D3
    P2 -->|"Hasil pengelolaan"| U
    U -->|"Fisik, keuangan, bukti, pengajuan"| P3
    D2 -->|"Paket dan tahun anggaran"| P3
    D6 -->|"Kunci dan batas input"| P3
    D4 -->|"Realisasi dan status saat ini"| P3
    P3 -->|"Realisasi dan status pengajuan"| D4
    P3 -->|"Metadata bukti"| D5
    P3 -->|"Berkas unggahan"| D7
    P3 -->|"Status input / pengajuan"| U
    U -->|"Permintaan antrian / keputusan dan catatan"| P4
    D2 -->|"Identitas paket dan OPD"| P4
    D4 -->|"Realisasi diajukan"| P4
    D5 -->|"Metadata bukti"| P4
    D7 -->|"Dokumentasi pendukung"| P4
    P4 -->|"Status, catatan, verifikator, waktu"| D4
    P4 -->|"Antrian / hasil verifikasi"| U
    U -->|"Filter tahun, bulan, OPD"| P5
    D2 -->|"Paket dan nilai anggaran"| P5
    D3 -->|"Target fisik"| P5
    D4 -->|"Realisasi dan status verifikasi"| P5
    P5 -->|"Permintaan referensi organisasi"| E
    E -->|"Nama OPD dan subunit"| P5
    P5 -->|"Rekap fisik, keuangan, dan laporan"| U
    U -->|"Aturan periode oleh Administrator"| P6
    D6 -->|"Aturan tersimpan"| P6
    P6 -->|"Kunci dan tenggat periode"| D6
    P6 -->|"Status periode"| U
    P1 -->|"Jejak aktivitas akses"| DA
    P2 -->|"Jejak perubahan paket"| DA
    P3 -->|"Jejak realisasi"| DA
    P4 -->|"Jejak verifikasi"| DA
```

Otorisasi melekat pada setiap proses sesuai use case. Proses 4.0 menerima keputusan hanya dari Administrator/MONEV; pembacaan antrian juga tersedia bagi Kepala OPD/Pimpinan Daerah. `system_settings` tercantum dalam skema tetapi tidak diasumsikan sebagai fitur pengaturan aktif pada DFD ini.

## 3. Diagram relasi tabel (ERD)

Nama entitas mengikuti nama tabel fisik dari `@@map` Prisma. Kolom yang ditampilkan adalah kolom utama, bukan seluruh kolom. PK = primary key, FK = foreign key, UK = unique key. Notasi `||` berarti tepat satu, `o|` berarti nol atau satu, dan `o{` berarti nol atau banyak.

```mermaid
erDiagram
    users ||--o{ user_roles : memiliki
    roles ||--o{ user_roles : ditugaskan
    users ||--o{ refresh_tokens : memiliki
    users o|--o{ audit_logs : melakukan
    users o|--o{ paket_pembangunan : membuat
    users o|--o{ realisasi_bulanan : menginput
    users o|--o{ realisasi_bulanan : memverifikasi
    users o|--o{ bukti_fisik : mengunggah
    paket_pembangunan ||--o{ target_bulanan : memiliki
    paket_pembangunan ||--o{ realisasi_bulanan : memiliki
    realisasi_bulanan ||--o{ bukti_fisik : didukung

    users {
      string id PK
      string nip UK
      string email UK
      string nama_lengkap
      string role "opsional"
      string_array roles
      string status
      string opd_id "referensi eksternal, bukan FK"
      string sub_unit_id "referensi eksternal, bukan FK"
    }
    roles {
      string id PK
      string kode UK
      string nama
    }
    user_roles {
      string id PK
      string user_id FK
      string role_id FK
    }
    refresh_tokens {
      string id PK
      string user_id FK
      string token_hash
      boolean is_revoked
      datetime expires_at
    }
    audit_logs {
      string id PK
      string user_id FK "nullable"
      string action
      string resource
      string resource_id "bukan FK"
      json payload
    }
    paket_pembangunan {
      string id PK
      int tahun_anggaran
      string opd_id "referensi eksternal"
      string sub_unit_id "referensi eksternal"
      string kode_rup_kontrak
      string nama_paket
      decimal nilai_pagu
      decimal nilai_kontrak
      string created_by_id FK "nullable"
    }
    target_bulanan {
      string id PK
      string paket_id FK
      int bulan
      float target_fisik
    }
    realisasi_bulanan {
      string id PK
      string paket_id FK
      int bulan
      float realisasi_fisik
      decimal realisasi_keuangan
      string input_by_id FK "nullable"
      string status_verifikasi
      string catatan_verifikasi
      string verifikasi_oleh_id FK "nullable"
      datetime verifikasi_at
      datetime diajukan_at
    }
    bukti_fisik {
      string id PK
      string realisasi_id FK
      string nama_file
      string path_file
      string upload_oleh_id FK "nullable"
    }
    locking_periods {
      string id PK
      int tahun
      int bulan
      boolean is_locked
      datetime batas_input
      string updated_by_id "bukan FK"
    }
    system_settings {
      string id PK
      int tahun_anggaran
      float ambang_kuning
      float ambang_merah
      boolean egov_active
      boolean simpeg_active
      boolean sirup_active
    }
```

### Tabel relasi dan aturan penghapusan

| Tabel induk | Tabel anak | Foreign key pada anak | Kardinalitas induk → anak | Saat induk dihapus |
| --- | --- | --- | --- | --- |
| users | user_roles | user_id | 1 → 0..N | Cascade |
| roles | user_roles | role_id | 1 → 0..N | Cascade |
| users | refresh_tokens | user_id | 1 → 0..N | Cascade |
| users | audit_logs | user_id, nullable | 1 → 0..N | Set Null |
| users | paket_pembangunan | created_by_id, nullable | 1 → 0..N | Set Null |
| users | realisasi_bulanan | input_by_id, nullable | 1 → 0..N | Set Null |
| users | realisasi_bulanan | verifikasi_oleh_id, nullable | 1 → 0..N | Set Null |
| users | bukti_fisik | upload_oleh_id, nullable | 1 → 0..N | Set Null |
| paket_pembangunan | target_bulanan | paket_id | 1 → 0..N | Cascade |
| paket_pembangunan | realisasi_bulanan | paket_id | 1 → 0..N | Cascade |
| realisasi_bulanan | bukti_fisik | realisasi_id | 1 → 0..N | Cascade |

`Cascade` pada `bukti_fisik` berlaku untuk baris database; penghapusan berkas fisik merupakan tanggung jawab aplikasi.

### Batasan unik dan relasi logis

- `users.nip`, `users.email`, dan `roles.kode` masing-masing unik.
- `user_roles(user_id, role_id)` unik: pengguna tidak mendapat baris penugasan peran yang sama dua kali. Tabel ini menghubungkan users dan roles secara many-to-many.
- `target_bulanan(paket_id, bulan)` unik: satu target per paket per bulan.
- `realisasi_bulanan(paket_id, bulan)` unik: satu realisasi per paket per bulan. Fisik dan keuangan tersimpan pada baris yang sama.
- `locking_periods(tahun, bulan)` unik. Pencocokan dengan paket/realisasi dilakukan aplikasi berdasarkan tahun anggaran dan bulan, tanpa foreign key.
- `users.opd_id`, `users.sub_unit_id`, `paket_pembangunan.opd_id`, dan `paket_pembangunan.sub_unit_id` merupakan referensi organisasi eksternal, tanpa foreign key PostgreSQL ke E-Gov/SIMPEG. Tidak ada tabel OPD lokal pada skema ini.
- `locking_periods.updated_by_id` dan `audit_logs.resource_id` tidak dideklarasikan sebagai foreign key dalam Prisma.
- `system_settings` berdiri sendiri, tanpa relasi foreign key.
- `users.role` dan `users.roles` juga ada bersama tabel `user_roles`; keduanya ditampilkan sebagai atribut, bukan relasi tambahan yang tidak ada dalam skema.
- Status verifikasi yang tersedia: `DRAFT`, `DIAJUKAN`, `TERVERIFIKASI`, `DITOLAK`. Verifikasi/penolakan mensyaratkan status `DIAJUKAN`; hasil terverifikasi tidak dapat diedit oleh operator biasa.

## 4. Sumber implementasi

- [Skema Prisma](../../backend/prisma/schema.prisma): 11 tabel dan 11 foreign key.
- [Controller pembangunan](../../backend/src/modules/pembangunan/pembangunan.controller.ts): akses paket, target, periode, realisasi, bukti, laporan, dan verifikasi.
- [Service pembangunan](../../backend/src/modules/pembangunan/pembangunan.service.ts): cakupan OPD, perlindungan kolom, periode, dan status verifikasi.
- [Controller SiRUP](../../backend/src/modules/sirup/sirup.controller.ts) dan [service SiRUP](../../backend/src/modules/sirup/sirup.service.ts): akses dan integrasi INAPROC.
- [Controller pengguna](../../backend/src/modules/users/users.controller.ts) dan [controller autentikasi](../../backend/src/modules/auth/auth.controller.ts): akun, peran, dan sesi.

Diagram Mermaid dapat ditampilkan melalui preview Markdown yang mendukung Mermaid. Sumber UML use case juga tersedia dalam `usecase.puml` untuk dirender menggunakan PlantUML.
