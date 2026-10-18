import os
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def shade_cell(cell, fill_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    el = tc_pr.find(qn('w:shd'))
    if el is None:
        el = OxmlElement('w:shd')
        tc_pr.append(el)
    el.set(qn('w:fill'), fill_hex)

def set_cell_margins(cell, top=100, bottom=100, start=120, end=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, val in (("top", top), ("bottom", bottom), ("start", start), ("end", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")

def set_table_borders(table, color="D3D3D3"):
    tbl_pr = table._tbl.tblPr
    group = tbl_pr.first_child_found_in("w:tblBorders")
    if group is None:
        group = OxmlElement("w:tblBorders")
        tbl_pr.append(group)
    for name in ("top", "left", "bottom", "right", "insideH"):
        border = OxmlElement(f"w:{name}")
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), "4")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), color)
        group.append(border)
    v_border = OxmlElement("w:insideV")
    v_border.set(qn("w:val"), "none")
    group.append(v_border)

def add_header_styled(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.space_before = Pt(14)
    h.paragraph_format.space_after = Pt(6)
    for run in h.runs:
        run.font.name = "Calibri"
        if level == 1:
            run.font.size = Pt(15)
            run.font.color.rgb = RGBColor(23, 54, 93) # Navy
        elif level == 2:
            run.font.size = Pt(13)
            run.font.color.rgb = RGBColor(31, 78, 121)
        elif level == 3:
            run.font.size = Pt(11.5)
            run.font.color.rgb = RGBColor(40, 40, 40)
    return h

def main():
    doc = Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Document Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("RENCANA & CEKLIS PERBAIKAN KEAMANAN")
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(18)
    r_title.font.color.rgb = RGBColor(23, 54, 93)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(18)
    r_sub = p_sub.add_run("Sistem Informasi MONALISA KONSEL (SIMANTAP) — Pemerintah Kabupaten Konawe Selatan\nDokumen Acuan Remediasi Temuan Audit Keamanan (F01 – F13)")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = RGBColor(80, 80, 80)

    # Section 1: Summary Table
    add_header_styled(doc, "1. Ringkasan Status & Prioritas Perbaikan", level=1)
    
    table_sum = doc.add_table(rows=6, cols=6)
    table_sum.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table_sum)

    headers = ["Prioritas", "Tingkat Risiko", "Cakupan Temuan", "Selesai", "Sedang Proses", "Belum Dimulai"]
    col_widths = [Inches(1.0), Inches(1.3), Inches(1.4), Inches(0.9), Inches(1.0), Inches(1.0)]

    hdr_cells = table_sum.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        shade_cell(hdr_cells[i], "17365D")
        set_cell_margins(hdr_cells[i], top=120, bottom=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.bold = True
            r.font.name = "Calibri"
            r.font.size = Pt(10)
            r.font.color.rgb = RGBColor(255, 255, 255)

    sum_data = [
        ("P0", "CRITICAL / HIGH", "F01, F02, F03, F04, F05", "1 (F03)", "0", "4"),
        ("P1", "HIGH / MEDIUM", "F06, F07, F08, F09", "0", "0", "4"),
        ("P2", "MEDIUM", "F10, F11", "0", "0", "2"),
        ("P3", "LOW", "F12, F13", "0", "0", "2"),
        ("TOTAL", "KESELURUHAN", "13 Temuan Audit", "1 (8%)", "0", "12 (92%)"),
    ]

    for row_idx, row_values in enumerate(sum_data, start=1):
        row_cells = table_sum.rows[row_idx].cells
        for col_idx, val in enumerate(row_values):
            row_cells[col_idx].text = val
            set_cell_margins(row_cells[col_idx])
            p = row_cells[col_idx].paragraphs[0]
            if col_idx in (0, 3, 4, 5):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = "Calibri"
                r.font.size = Pt(9.5)
                if row_idx == 5:
                    r.bold = True
            if row_idx % 2 == 1 and row_idx != 5:
                shade_cell(row_cells[col_idx], "F7F9FA")
            elif row_idx == 5:
                shade_cell(row_cells[col_idx], "EAEFF5")

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Section 2: Action Item Checklist
    phases = [
        {
            "num": "2",
            "title": "Fase 1: Mitigasi Kritis Kredensial & Autentikasi (Prioritas P0)",
            "items": [
                {
                    "id": "F03",
                    "title": "Pembersihan Kredensial Database Eksternal Tertanam (CWE-798, CWE-522)",
                    "status": "SELESAI",
                    "tasks": [
                        ("[x]", "Hapus fallback username dan password hardcode di backend/src/config/egov.config.ts."),
                        ("[x]", "Hapus fallback credentials di backend/src/core/egov/egov.service.ts dan tambahkan fail-safe guard bila env tidak tersedia."),
                        ("[x]", "Hapus fallback password hardcode di script seed backend/prisma/seed-sidapem.ts."),
                        ("[x]", "Hapus fallback dummy key di backend/src/config/jwt.config.ts."),
                        ("[x]", "Tambahkan validasi schema Joi untuk EGOV_MYSQL_* di backend/src/config/validation.schema.ts."),
                        ("[x]", "Perbarui backend/.env.example dengan placeholder tanpa membocorkan kredensial riil."),
                        ("[ ]", "Rotasi kata sandi akun MySQL diskominfosandi di server pusat eksternal dan sesuaikan file .env server."),
                        ("[ ]", "Bersihkan commit history Git yang pernah mencatat kredensial sebelum repo dipublikasikan."),
                    ]
                },
                {
                    "id": "F01",
                    "title": "Penghentian Kata Sandi Default & Jalur Masuk Lokal Akun EGOV (CWE-521, CWE-798)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Hentikan pengisian kata sandi default statis saat penugasan role pegawai di backend/src/modules/users/users.service.ts."),
                        ("[ ]", "Hapus akun administrator default dengan password standar di backend/prisma/seed.ts; gunakan first-run wizard."),
                        ("[ ]", "Tambahkan kolom authSource (EGOV | LOCAL) di tabel User; akun EGOV dilarang memiliki hash password lokal."),
                        ("[ ]", "Reset seluruh password akun testing lama dan cabut seluruh refresh token aktif."),
                    ]
                },
                {
                    "id": "F02",
                    "title": "Penghentian Penyimpanan Hash Sandi eGov di Database Lokal (CWE-287)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Hapus logic penyimpanan hash kata sandi eGov ke PostgreSQL lokal di backend/src/modules/auth/auth.service.ts."),
                        ("[ ]", "Pastikan akun EGOV selalu diverifikasi langsung secara realtime ke database/API E-Gov/SIMPEG."),
                        ("[ ]", "Jalankan migrasi data untuk mengosongkan kolom password lokal bagi seluruh pengguna EGOV."),
                    ]
                },
                {
                    "id": "F04",
                    "title": "Sanitasi Paket Deploy & Proteksi Arsip Environment (CWE-312, CWE-200)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Hapus arsip deploy monalisa-backend.zip lama dari server yang memuat file .env."),
                        ("[ ]", "Terapkan packaging script allowlist yang mengecualikan .env, log, dan backup."),
                        ("[ ]", "Rotasi JWT Secret dan kredensial database di .env produksi."),
                        ("[ ]", "Konfigurasi web server agar memblokir (403) akses HTTP ke file .env, .zip, .git, dan .bak."),
                    ]
                },
                {
                    "id": "F05",
                    "title": "Remediasi Dependency Vulnerability Kritis & Tinggi (CWE-1104)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Update 14 dependency backend yang dilaporkan npm audit (handlebars, nodemailer, js-yaml, dll.)."),
                        ("[ ]", "Perbarui Next.js dan dependency frontend yang memiliki advisory critical/high."),
                        ("[ ]", "Evaluasi penggantian library xlsx atau batasi pemrosesan file Excel dalam sandbox terisolasi."),
                        ("[ ]", "Jalankan regression testing menyeluruh pasca update library."),
                    ]
                },
            ]
        },
        {
            "num": "3",
            "title": "Fase 2: Penguatan Sesi, Upload & Rate Limiting (Prioritas P1)",
            "items": [
                {
                    "id": "F06",
                    "title": "Migrasi Sesi Token ke HttpOnly Secure Cookie (CWE-922, CWE-1004)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Kirim Refresh Token via Set-Cookie dengan flag HttpOnly, Secure, SameSite=Strict."),
                        ("[ ]", "Hapus penyimpanan token dari localStorage di frontend/src/lib/token-storage.ts."),
                        ("[ ]", "Simpan Access Token hanya di memori JavaScript (in-memory state)."),
                        ("[ ]", "Terapkan proteksi CSRF untuk request mutasi (POST, PUT, DELETE, PATCH)."),
                    ]
                },
                {
                    "id": "F07",
                    "title": "Hardening File Upload & Proteksi Akses Bukti Fisik (CWE-434, CWE-862)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Validasi Magic Bytes dan MIME asli file di backend/src/modules/pembangunan/pembangunan.controller.ts."),
                        ("[ ]", "Hapus static asset publik /uploads dan pindahkan bukti ke storage privat."),
                        ("[ ]", "Buat endpoint download terautentikasi dengan pemeriksaan role dan scope OPD."),
                        ("[ ]", "Gunakan penamaan file berbasis UUID v4 kriptografis."),
                    ]
                },
                {
                    "id": "F08",
                    "title": "Pembatasan Request & Rate Limiter Autentikasi (CWE-307)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Pasang @nestjs/throttler dengan storage Redis pada endpoint auth/login dan auth/refresh."),
                        ("[ ]", "Terapkan limit percobaan login (maksimal 5 request per menit per IP dan per NIP)."),
                        ("[ ]", "Seragamkan waktu respons gagal login untuk mencegah user enumeration timing attack."),
                    ]
                },
                {
                    "id": "F09",
                    "title": "Penerapan Security Headers & Enforce HTTPS Penuh (CWE-693, CWE-319)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Aktifkan middleware helmet() di backend/src/main.ts (HSTS, CSP, nosniff, frame protection)."),
                        ("[ ]", "Perketat allowlist CORS pada mode production tanpa localhost atau wildcard."),
                        ("[ ]", "Tambahkan security headers dan redirect 301 HTTP ke HTTPS di frontend/public/.htaccess."),
                    ]
                },
            ]
        },
        {
            "num": "4",
            "title": "Fase 3: Manajemen Dokumentasi API & Monitoring (Prioritas P2)",
            "items": [
                {
                    "id": "F10",
                    "title": "Pembatasan Akses Dokumentasi Swagger / OpenAPI (CWE-200)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Nonaktifkan rute /docs di production atau proteksi dengan Basic Auth / IP internal."),
                        ("[ ]", "Matikan opsi persistAuthorization agar bearer token tidak tersimpan di browser."),
                        ("[ ]", "Sanitasi seluruh contoh nilai di schema Swagger dari data riil."),
                    ]
                },
                {
                    "id": "F11",
                    "title": "Monitoring, Audit Log & Pencegahan Kebocoran Log (CWE-778)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Catat event login gagal, token reuse, dan akses unauthorized ke auditLog."),
                        ("[ ]", "Sanitasi data pribadi (NIP, nama) dari log teks bebas di egov.service.ts."),
                        ("[ ]", "Tambahkan Correlation ID unik pada setiap request HTTP di logging.interceptor.ts."),
                        ("[ ]", "Atur trust proxy pada NestJS agar pencatatan IP klien akurat."),
                    ]
                },
            ]
        },
        {
            "num": "5",
            "title": "Fase 4: Validasi Input & Hardening Informasi Operasional (Prioritas P3)",
            "items": [
                {
                    "id": "F12",
                    "title": "Penutupan Informasi Operasional Berlebih (CWE-200)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Sederhanakan response endpoint /health agar tidak mengekspos heap memory dan detail DB."),
                        ("[ ]", "Proteksi endpoint daftar subunit OPD di pembangunan controller jika bukan data publik."),
                    ]
                },
                {
                    "id": "F13",
                    "title": "Pengetatan Validasi DTO & Role Matrix (CWE-20)",
                    "status": "PENDING",
                    "tasks": [
                        ("[ ]", "Tambahkan @IsEnum(RoleEnum, { each: true }) dan batas array pada set-role.dto.ts."),
                        ("[ ]", "Buat DTO tervalidasi ketat untuk menu role matrix menggantikan tipe any[]."),
                        ("[ ]", "Tambahkan batas panjang karakter (@MaxLength) pada seluruh string DTO pembangunan."),
                    ]
                },
            ]
        }
    ]

    for phase in phases:
        add_header_styled(doc, f"{phase['num']}. {phase['title']}", level=1)
        for item in phase["items"]:
            h_item = doc.add_paragraph()
            h_item.paragraph_format.space_before = Pt(8)
            h_item.paragraph_format.space_after = Pt(3)
            
            status_color = RGBColor(46, 125, 50) if item["status"] == "SELESAI" else RGBColor(180, 80, 20)
            r_badge = h_item.add_run(f"[{item['status']}] ")
            r_badge.bold = True
            r_badge.font.name = "Calibri"
            r_badge.font.size = Pt(11)
            r_badge.font.color.rgb = status_color

            r_title = h_item.add_run(f"{item['id']} — {item['title']}")
            r_title.bold = True
            r_title.font.name = "Calibri"
            r_title.font.size = Pt(11)
            r_title.font.color.rgb = RGBColor(30, 30, 30)

            for mark, task_text in item["tasks"]:
                p_task = doc.add_paragraph()
                p_task.paragraph_format.left_indent = Inches(0.25)
                p_task.paragraph_format.space_before = Pt(1)
                p_task.paragraph_format.space_after = Pt(2)
                
                r_mark = p_task.add_run(f"{mark} ")
                r_mark.bold = True
                r_mark.font.name = "Consolas"
                r_mark.font.size = Pt(10)
                if mark == "[x]":
                    r_mark.font.color.rgb = RGBColor(46, 125, 50)
                else:
                    r_mark.font.color.rgb = RGBColor(120, 120, 120)

                r_task = p_task.add_run(task_text)
                r_task.font.name = "Calibri"
                r_task.font.size = Pt(10)
                if mark == "[x]":
                    r_task.font.color.rgb = RGBColor(50, 50, 50)

    # Section 6: Standard Operating Rules
    add_header_styled(doc, "6. Aturan Operasional & Batasan Mutlak", level=1)
    rules = [
        "Database Eksternal E-Gov dan SIMPEG (mysql.konaweselatankab.go.id) adalah READ-ONLY / SELECT ONLY. Dilarang keras melakukan aksi manipulasi data apapun (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE).",
        "Kerahasiaan File Lingkungan (.env): File .env mutlak diabaikan oleh Git (.gitignore) dan tidak boleh diikutsertakan ke dalam file ZIP atau paket rilis apapun.",
        "Pelaksanaan Build & Deploy: Dilarang melakukan git push atau npm run build tanpa instruksi eksplisit dari pemilik sistem.",
    ]
    for r in rules:
        p_r = doc.add_paragraph()
        p_r.paragraph_format.left_indent = Inches(0.25)
        p_r.paragraph_format.space_before = Pt(2)
        p_r.paragraph_format.space_after = Pt(3)
        r_bullet = p_r.add_run("• ")
        r_bullet.bold = True
        r_text = p_r.add_run(r)
        r_text.font.name = "Calibri"
        r_text.font.size = Pt(10)

    output_path = Path("/Users/simplephi/Documents/riswan/simantap/docs/Rencana_Ceklis_Perbaikan_Keamanan_SIMANTAP.docx")
    doc.save(output_path)
    print(f"✅ Dokumen berhasil dibuat: {output_path}")

if __name__ == "__main__":
    main()
