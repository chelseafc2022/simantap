import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_SECTION, WD_ORIENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_background(cell, hex_color):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_cell_border(cell, **kwargs):
    """
    kwargs: top, bottom, left, right
    values: dict(val='single', sz='4', color='000000', space='0')
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = f'w:{edge}'
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', '000000'))
            tcBorders.append(element)
    tcPr.append(tcBorders)

def add_styled_paragraph(doc, text, style='Normal', space_before=0, space_after=4, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.LEFT, bold=False, italic=False, size=11, font_name="Arial", color="000000"):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    run = p.add_run(text)
    run.font.name = font_name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color != "000000":
        r, g, b = int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)
        run.font.color.rgb = RGBColor(r, g, b)
    return p

def main():
    doc = docx.Document()
    
    # Base Section: Portrait A4
    sec1 = doc.sections[0]
    sec1.page_width = Inches(8.27)
    sec1.page_height = Inches(11.69)
    sec1.top_margin = Inches(0.8)
    sec1.bottom_margin = Inches(0.8)
    sec1.left_margin = Inches(0.8)
    sec1.right_margin = Inches(0.8)

    # =========================================================================
    # HALAMAN 1: COVER / SAMPUL DEPAN
    # =========================================================================
    p_logo = doc.add_paragraph()
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_logo.paragraph_format.space_before = Pt(20)
    p_logo.paragraph_format.space_after = Pt(20)
    logo_path = "/Users/simplephi/Documents/riswan/simantap/logo_konsel.png"
    if os.path.exists(logo_path):
        run_logo = p_logo.add_run()
        run_logo.add_picture(logo_path, width=Inches(1.8))

    add_styled_paragraph(doc, "STANDAR OPERASIONAL PROSEDUR", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=15, font_name="Arial", space_after=2)
    add_styled_paragraph(doc, "(S O P)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, font_name="Arial", space_after=10)
    add_styled_paragraph(doc, "PENGELOLAAN SISTEM INFORMASI MONITORING DAN EVALUASI LAPORAN REALISASI FISIK DAN KEUANGAN PEMBANGUNAN", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13, font_name="Arial", space_after=4)
    add_styled_paragraph(doc, "APLIKASI MONALISA KONSEL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=16, font_name="Arial", color="1B5E20", space_after=4)
    add_styled_paragraph(doc, "KABUPATEN KONAWE SELATAN", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, font_name="Arial", space_after=20)

    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_line = p_line.add_run("____________________________________________________________")
    run_line.bold = True
    p_line.paragraph_format.space_after = Pt(20)

    add_styled_paragraph(doc, "Ditetapkan dalam Rangka Peningkatan Tata Kelola Pemerintahan Berbasis Elektronik (SPBE), Pengendalian Pembangunan Terintegrasi, serta Penguatan Transparansi dan Akuntabilitas Pelaporan Realisasi Fisik dan Keuangan di Lingkungan Pemerintah Daerah Kabupaten Konawe Selatan", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=10, font_name="Arial", space_after=15)

    add_styled_paragraph(doc, "Alamat Portal Resmi: monalisa.konaweselatankab.go.id", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, font_name="Arial", color="0D47A1", space_after=60)

    add_styled_paragraph(doc, "BAGIAN ADMINISTRASI PEMBANGUNAN", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13, font_name="Arial", space_after=3)
    add_styled_paragraph(doc, "SEKRETARIAT DAERAH KABUPATEN KONAWE SELATAN", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13, font_name="Arial", space_after=3)
    add_styled_paragraph(doc, "TAHUN 2026", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, font_name="Arial", space_after=0)

    doc.add_page_break()

    # =========================================================================
    # HALAMAN 2: LEMBAR IDENTITAS SOP (STANDAR 6 KOTAK KONAWE SELATAN)
    # =========================================================================
    # Header Table
    t_head = doc.add_table(rows=5, cols=2)
    t_head.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_head.autofit = False

    t_head.columns[0].width = Inches(4.2)
    t_head.columns[1].width = Inches(2.8)

    # Left cell: Merged identity of agency
    cell_agency = t_head.cell(0, 0)
    # merge with rows 1 to 4
    for r_idx in range(1, 5):
        cell_agency.merge(t_head.cell(r_idx, 0))

    p_ag = cell_agency.paragraphs[0]
    p_ag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if os.path.exists(logo_path):
        p_ag.add_run().add_picture(logo_path, width=Inches(0.8))
    
    add_p = cell_agency.add_paragraph()
    add_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_ag = add_p.add_run("PEMERINTAH KABUPATEN KONAWE SELATAN\nSEKRETARIAT DAERAH\nBAGIAN ADMINISTRASI PEMBANGUNAN")
    r_ag.bold = True
    r_ag.font.size = Pt(9.5)
    r_ag.font.name = "Arial"
    cell_agency.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    meta_items = [
        ("Nomor SOP", "006 / SOP / ADPEM-MONALISA / SETDA / 2026"),
        ("Revisi Ke", "01 (Penyesuaian Integrasi E-Gov, PPK & Bendahara)"),
        ("Tanggal Revisi", "10 November 2026"),
        ("Tanggal Efektif", "15 November 2026"),
        ("Disahkan Oleh", "SEKRETARIS DAERAH KABUPATEN KONAWE SELATAN\n\n\n\nH. ICHSAN POROSI, ST., MTP\nPembina Utama Madya, Gol. IV/d\nNIP. 19690412 199703 1 004")
    ]

    for idx, (lbl, val) in enumerate(meta_items):
        c = t_head.cell(idx, 1)
        p = c.paragraphs[0]
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        p.paragraph_format.line_spacing = 1.05
        r_lbl = p.add_run(lbl + " :\n")
        r_lbl.bold = True
        r_lbl.font.size = Pt(8.5)
        r_lbl.font.name = "Arial"
        r_val = p.add_run(val)
        r_val.font.size = Pt(8.5)
        r_val.font.name = "Arial"
        if "H. ICHSAN POROSI" in val:
            r_val.bold = True

    for row in t_head.rows:
        for c in row.cells:
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            set_cell_border(c, top=dict(sz=4, color='000000'), bottom=dict(sz=4, color='000000'), left=dict(sz=4, color='000000'), right=dict(sz=4, color='000000'))

    # Judul SOP Box
    t_title = doc.add_table(rows=1, cols=1)
    t_title.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_title.columns[0].width = Inches(7.0)
    c_title = t_title.cell(0, 0)
    set_cell_background(c_title, "E8F5E9")
    set_cell_margins(c_title, top=70, bottom=70, left=80, right=80)
    set_cell_border(c_title, top=dict(sz=4, color='000000'), bottom=dict(sz=4, color='000000'), left=dict(sz=4, color='000000'), right=dict(sz=4, color='000000'))
    p_t = c_title.paragraphs[0]
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t1 = p_t.add_run("STANDAR OPERASIONAL PROSEDUR (SOP)\n")
    r_t1.bold = True
    r_t1.font.size = Pt(9.5)
    r_t1.font.name = "Arial"
    r_t2 = p_t.add_run("PENGELOLAAN SISTEM INFORMASI MONITORING DAN EVALUASI LAPORAN REALISASI FISIK DAN KEUANGAN PEMBANGUNAN (MONALISA KONSEL)")
    r_t2.bold = True
    r_t2.font.size = Pt(10)
    r_t2.font.name = "Arial"
    r_t2.font.color.rgb = RGBColor(27, 94, 32)

    # 6-BOX MATRIX TABLE
    t_matrix = doc.add_table(rows=3, cols=2)
    t_matrix.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_matrix.columns[0].width = Inches(3.5)
    t_matrix.columns[1].width = Inches(3.5)

    boxes = [
        # Row 0
        ("DASAR HUKUM:",
         "1. UU No. 23 Tahun 2014 tentang Pemerintahan Daerah (sebagaimana telah diubah terakhir dgn UU No. 9 Tahun 2015).\n"
         "2. UU No. 5 Tahun 2014 tentang Aparatur Sipil Negara.\n"
         "3. PP No. 8 Tahun 2006 tentang Pelaporan Keuangan dan Kinerja Instansi Pemerintah.\n"
         "4. PP No. 39 Tahun 2006 tentang Tata Cara Pengendalian dan Evaluasi Pelaksanaan Rencana Pembangunan.\n"
         "5. Perpres No. 95 Tahun 2018 tentang Sistem Pemerintahan Berbasis Elektronik (SPBE).\n"
         "6. Perpres No. 39 Tahun 2019 tentang Satu Data Indonesia.\n"
         "7. Permendagri No. 86 Tahun 2017 tentang Tata Cara Pengendalian dan Evaluasi Pembangunan Daerah.\n"
         "8. PermenPANRB No. 35 Tahun 2012 tentang Pedoman Penyusunan SOP Administrasi Pemerintahan.\n"
         "9. Perda Kab. Konawe Selatan No. 8 Tahun 2016 tentang Pembentukan dan Susunan Perangkat Daerah.\n"
         "10. Perbup Konawe Selatan tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi Serta Tata Kerja Sekretariat Daerah Kab. Konawe Selatan.",
         "KUALIFIKASI PELAKSANA:",
         "1. Pejabat Pembuat Komitmen (PPK) OPD: Memahami kontrak PBJ, pembagian sub-paket DPA, Kurva-S target mingguan/bulanan, dan penilaian progres fisik lapangan.\n"
         "2. Bendahara OPD: Menguasai administrasi keuangan kas daerah, bukti SP2D/kuitansi, nominal pencairan termin, dan pelampiran bukti dukung.\n"
         "3. Kepala OPD (PA): Memiliki kewenangan evaluasi dan persetujuan (approval) laporan fisik dan serapan anggaran perangkat daerah.\n"
         "4. Admin MONEV Setda: Memiliki kompetensi teknis web, verifikasi berjenjang, pemantauan locking period, dan rekonsiliasi data daerah.\n"
         "5. Pimpinan Daerah (Bupati/Wabup/Sekda): Pengambil kebijakan evaluasi TEPRA berdasarkan dashboard eksekutif."),
        # Row 1
        ("KETERKAITAN:",
         "1. SOP Pengadaan Barang dan Jasa Pemerintah (SiRUP LKPP / LPSE).\n"
         "2. SOP Penatausahaan Keuangan dan Penerbitan SP2D (BKAD / SIPD-RI).\n"
         "3. SOP Pelaksanaan Rapat Koordinasi Pengendalian Pembangunan (TEPRA Daerah).\n"
         "4. SOP Integrasi Layanan Sistem Pemerintahan Berbasis Elektronik (Dinas Kominfo & Persandian).",
         "PERALATAN / PERLENGKAPAN:",
         "1. Jaringan Internet & Perangkat Komputer / Laptop Pengguna.\n"
         "2. Aplikasi MONALISA KONSEL (monalisa.konaweselatankab.go.id) terintegrasi Direktori ASN E-Gov.\n"
         "3. Dokumen Pelaksanaan Anggaran (DPA-SKPD) & RUP SiRUP LKPP.\n"
         "4. Surat Perintah Kerja (SPK) / Kontrak, Time Schedule (Kurva-S).\n"
         "5. Dokumen SP2D, Kuitansi Pencairan, dan Berita Acara Progres Fisik Lapangan."),
        # Row 2
        ("PERINGATAN:",
         "1. Keterlambatan penginputan melampaui batas waktu bulanan (Locking Period) menyebabkan akses input terkunci secara otomatis oleh sistem.\n"
         "2. Setiap pencairan keuangan wajib melampirkan file dokumen bukti sah (SP2D/kuitansi) yang melekat langsung pada data pencairan.\n"
         "3. Ketidaksesuaian laporan target/realisasi fisik dan keuangan dapat menjadi temuan pengawasan APIP (Inspektorat Daerah).\n"
         "4. Pagu paket gelondongan terkunci sebagai plafon makro dan tidak boleh diduplikasi.",
         "PENCATATAN DAN PENDATAAN:",
         "1. Semua histori input, revisi, dan transaksi tersimpan aman dalam Audit Log sistem.\n"
         "2. Berkas bukti pencairan (PDF/gambar) diarsipkan secara digital pada server daerah.\n"
         "3. Rekap Laporan Realisasi Fisik dan Keuangan (RFK) 12 bulan dan grafik deviasi Kurva-S dikompilasi secara real-time untuk bahan rapat evaluasi TEPRA.")
    ]

    for row_idx, (t_left, b_left, t_right, b_right) in enumerate(boxes):
        # Left
        cl = t_matrix.cell(row_idx, 0)
        set_cell_margins(cl, top=50, bottom=50, left=60, right=60)
        set_cell_border(cl, top=dict(sz=4, color='000000'), bottom=dict(sz=4, color='000000'), left=dict(sz=4, color='000000'), right=dict(sz=4, color='000000'))
        pl = cl.paragraphs[0]
        pl.paragraph_format.space_before = Pt(0)
        pl.paragraph_format.space_after = Pt(2)
        pl.paragraph_format.line_spacing = 1.05
        rl_t = pl.add_run(t_left + "\n")
        rl_t.bold = True
        rl_t.font.size = Pt(8.5)
        rl_t.font.name = "Arial"
        rl_b = pl.add_run(b_left)
        rl_b.font.size = Pt(7.8)
        rl_b.font.name = "Arial"

        # Right
        cr = t_matrix.cell(row_idx, 1)
        set_cell_margins(cr, top=50, bottom=50, left=60, right=60)
        set_cell_border(cr, top=dict(sz=4, color='000000'), bottom=dict(sz=4, color='000000'), left=dict(sz=4, color='000000'), right=dict(sz=4, color='000000'))
        pr = cr.paragraphs[0]
        pr.paragraph_format.space_before = Pt(0)
        pr.paragraph_format.space_after = Pt(2)
        pr.paragraph_format.line_spacing = 1.05
        rr_t = pr.add_run(t_right + "\n")
        rr_t.bold = True
        rr_t.font.size = Pt(8.5)
        rr_t.font.name = "Arial"
        rr_b = pr.add_run(b_right)
        rr_b.font.size = Pt(7.8)
        rr_b.font.name = "Arial"

    # =========================================================================
    # SECTION 2: LANDSCAPE FOR FLOWCHART MATRIX (HALAMAN 3)
    # =========================================================================
    sec_landscape = doc.add_section(WD_SECTION.NEW_PAGE)
    sec_landscape.orientation = WD_ORIENT.LANDSCAPE
    sec_landscape.page_width = Inches(11.69)
    sec_landscape.page_height = Inches(8.27)
    sec_landscape.top_margin = Inches(0.6)
    sec_landscape.bottom_margin = Inches(0.6)
    sec_landscape.left_margin = Inches(0.6)
    sec_landscape.right_margin = Inches(0.6)

    add_styled_paragraph(doc, "BAGAN ALIR (FLOWCHART) STANDAR OPERASIONAL PROSEDUR PENGELOLAAN SISTEM INFORMASI MONALISA KONSEL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, font_name="Arial", space_after=10)

    flow_headers = [
        "No",
        "Aktivitas / Uraian Prosedur",
        "PPK OPD",
        "Bendahara OPD",
        "Kepala OPD",
        "Verifikator MONEV",
        "Pimpinan Daerah",
        "Kelengkapan / Dokumen",
        "Waktu",
        "Output",
        "Ket."
    ]

    col_widths = [
        Inches(0.4),  # No
        Inches(2.5),  # Aktivitas
        Inches(0.7),  # PPK
        Inches(0.7),  # Bendahara
        Inches(0.7),  # Kepala OPD
        Inches(0.7),  # Verifikator
        Inches(0.7),  # Pimpinan
        Inches(1.8),  # Kelengkapan
        Inches(0.7),  # Waktu
        Inches(1.3),  # Output
        Inches(0.6)   # Ket
    ]

    flow_data = [
        (
            "1.",
            "Penetapan Jadwal Periode Pelaporan (Locking Period) & Manajemen Hak Akses Pengguna (Integrasi E-Gov Single Sign-On).",
            "", "", "", "[ PROSES ]\nBuka / Kunci Periode", "",
            "Kalender kerja, SK Tim MONEV, Akun Super Admin MONALISA",
            "15 Menit",
            "Periode bulanan aktif & hak akses akun OPD terkonfigurasi",
            "Awal Bulan"
        ),
        (
            "2.",
            "Sinkronisasi Paket Pekerjaan dari SiRUP LKPP / Input Manual Paket & Pengaturan Pola Paket Gelondongan (Sub-Paket DPA).",
            "[ PROSES ]\nSinkron / Input Paket & Sub-Paket", "", "", "", "",
            "Akun PPK, ID RUP SiRUP, DPA-SKPD, Rincian Sub-Paket DPA",
            "30 Menit",
            "Data paket & rincian sub-paket terdaftar pada sistem",
            "Awal TA / Revisi"
        ),
        (
            "3.",
            "Penyusunan Rencana Target Fisik Kurva-S (Target Mingguan Sesuai Masa Pelaksanaan & Target Bulanan B01-B12).",
            "[ PROSES ]\nInput Kurva-S Target Mingguan/Bulanan", "", "", "", "",
            "Surat Perintah Kerja (SPK) / Kontrak, Time Schedule Rekanan",
            "30 Menit",
            "Grafik Kurva-S target terpetakan (kumulatif 100%)",
            "Setelah SPMK"
        ),
        (
            "4.",
            "Penginputan Realisasi Keuangan dan Pengunggahan Berkas Bukti Pencairan (SP2D / Kuitansi) yang Melekat Langsung.",
            "", "[ PROSES ]\nInput Nominal & Upload Bukti SP2D", "", "", "",
            "Akun Bendahara, Berkas SP2D, Kuitansi, Rincian Potongan Pajak",
            "15 Menit / Transaksi",
            "Data pencairan keuangan tercatat & bukti dukung terarsip digital",
            "Setiap Pencairan"
        ),
        (
            "5.",
            "Penginputan Realisasi Progres Fisik Bulanan/Mingguan (%) dan Pengunggahan Dokumentasi Foto Lapangan.",
            "[ PROSES ]\nInput Progres Fisik & Upload Foto", "", "", "", "",
            "Laporan mingguan konsultan pengawas, Berita Acara, Foto lapangan",
            "20 Menit / Paket",
            "Capaian fisik (%) terbarui & tersandingkan dengan Kurva-S",
            "Mingguan / Bulanan"
        ),
        (
            "6.",
            "Reviu Internal, Rekonsiliasi Fisik-Keuangan, dan Persetujuan (Approval) Laporan oleh Kepala OPD (Pengguna Anggaran).",
            "", "", "< KEPUTUSAN >\nValidasi & Setujui?", "", "",
            "Dashboard rekapitulasi internal OPD, data fisik & keuangan",
            "1 Jam",
            "Laporan kinerja OPD tervalidasi & siap diverifikasi Setda",
            "Maks. Tgl 5"
        ),
        (
            "7.",
            "Verifikasi Berjenjang, Validasi Kelengkapan Bukti Dukung, dan Penguncian Data oleh Verifikator MONEV Setda.",
            "", "", "", "< KEPUTUSAN >\nVerifikasi & Kunci?", "",
            "Modul Verifikasi MONEV, berkas bukti dukung SP2D, foto fisik",
            "1 - 2 Hari",
            "Status laporan TERVERIFIKASI & data terkunci resmi",
            "Tgl 6 - 8"
        ),
        (
            "8.",
            "Konsolidasi Data Pembangunan Daerah, Analisis Deviasi Kinerja, dan Penyusunan Bahan Rapat Evaluasi TEPRA.",
            "", "", "", "[ PROSES ]\nGenerate Laporan RFK & Materi TEPRA", "",
            "Modul Laporan RFK 12 Bulan, Matriks Deviasi, Chart Peringatan",
            "1 Hari",
            "Buku Laporan RFK Daerah & Slide Paparan Evaluasi TEPRA",
            "Tgl 9 - 10"
        ),
        (
            "9.",
            "Monitoring Eksekutif Real-Time, Pelaksanaan Rapat Koordinasi TEPRA, dan Penetapan Tindak Lanjut oleh Pimpinan Daerah.",
            "", "", "", "", "[ SELESAI ]\nPantau Dashboard & Pimpin TEPRA",
            "Dashboard Eksekutif MONALISA, Rekomendasi MONEV Pembangunan",
            "Berkala / Bulanan",
            "Instruksi percepatan pembangunan & tindak lanjut OPD deviasi",
            "Rapat TEPRA"
        )
    ]

    t_flow = doc.add_table(rows=len(flow_data) + 1, cols=len(flow_headers))
    t_flow.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_flow.autofit = False

    # Header Row
    hdr_row = t_flow.rows[0]
    for c_idx, title in enumerate(flow_headers):
        c = hdr_row.cells[c_idx]
        c.width = col_widths[c_idx]
        set_cell_background(c, "1B5E20")
        set_cell_margins(c, top=60, bottom=60, left=40, right=40)
        set_cell_border(c, top=dict(sz=6, color='000000'), bottom=dict(sz=6, color='000000'), left=dict(sz=4, color='000000'), right=dict(sz=4, color='000000'))
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.0
        r = p.add_run(title)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.name = "Arial"
        r.font.color.rgb = RGBColor(255, 255, 255)

    # Data Rows
    for r_idx, row_values in enumerate(flow_data):
        row = t_flow.rows[r_idx + 1]
        bg_col = "F9FBE7" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_values):
            c = row.cells[c_idx]
            c.width = col_widths[c_idx]
            set_cell_background(c, bg_col)
            set_cell_margins(c, top=50, bottom=50, left=40, right=40)
            set_cell_border(c, top=dict(sz=4, color='CCCCCC'), bottom=dict(sz=4, color='CCCCCC'), left=dict(sz=4, color='CCCCCC'), right=dict(sz=4, color='CCCCCC'))
            p = c.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.05
            
            # Text alignment
            if c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif 2 <= c_idx <= 6:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif c_idx in [8, 10]:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT

            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(7.5)
            if "[" in val or "<" in val:
                r.bold = True
                if "PROSES" in val:
                    r.font.color.rgb = RGBColor(13, 71, 161)
                elif "KEPUTUSAN" in val:
                    r.font.color.rgb = RGBColor(230, 81, 0)
                elif "SELESAI" in val:
                    r.font.color.rgb = RGBColor(27, 94, 32)

    # =========================================================================
    # SECTION 3: PORTRAIT FOR DETAILED OPERATIONAL MANUAL & PROCEDURES
    # =========================================================================
    sec_narrative = doc.add_section(WD_SECTION.NEW_PAGE)
    sec_narrative.orientation = WD_ORIENT.PORTRAIT
    sec_narrative.page_width = Inches(8.27)
    sec_narrative.page_height = Inches(11.69)
    sec_narrative.top_margin = Inches(0.8)
    sec_narrative.bottom_margin = Inches(0.8)
    sec_narrative.left_margin = Inches(0.8)
    sec_narrative.right_margin = Inches(0.8)

    add_styled_paragraph(doc, "URAIAN STANDAR OPERASIONAL PROSEDUR PENGELOLAAN SISTEM INFORMASI MONALISA KONSEL", bold=True, size=13, font_name="Arial", space_after=12)

    sections_content = [
        ("BAB I. KETENTUAN UMUM DAN TATA KELOLA AKSES PENGGUNA", [
            ("1.1. Definisi dan Tujuan Sistem",
             "Sistem Informasi MONALISA KONSEL (Monitoring Realisasi Anggaran dan Fisik Data Pembangunan Konawe Selatan) merupakan platform digital terpadu yang dibangun oleh Sekretariat Daerah Kabupaten Konawe Selatan melalui Bagian Administrasi Pembangunan untuk memantau, mengendalikan, dan mengevaluasi progres pelaksanaan program/kegiatan pembangunan daerah secara real-time, akurat, dan akuntabel."),
            ("1.2. Integrasi Data ASN & Single Sign-On (SSO)",
             "Hak akses pengguna MONALISA terintegrasi langsung dengan Direktori ASN E-Gov / SIMPEG Kabupaten Konawe Selatan. Setiap pengguna masuk menggunakan kredensial resmi kepegawaian (NIP / Username resmi). Penetapan role dilakukan berjenjang sesuai tugas pokok dan fungsinya."),
            ("1.3. Matriks Peran dan Batasan Kewenangan (Role Separation)",
             "a. ADMINISTRATOR (Bagian Administrasi Pembangunan): Berwenang penuh atas manajemen konfigurasi sistem, aktivasi/penguncian periode pelaporan (Locking Period), verifikasi data MONEV, dan konsolidasi laporan daerah.\n"
             "b. PEJABAT PEMBUAT KOMITMEN (ADMIN_PPK) OPD: Bertanggung jawab melakukan sinkronisasi/input paket pekerjaan fisik, menyusun kurva-S target mingguan/bulanan, menginput realisasi fisik lapangan (%), dan mengunggah foto dokumentasi visual.\n"
             "c. BENDAHARA OPD (ADMIN_BENDAHARA): Bertanggung jawab mencatat realisasi pencairan keuangan SP2D (nominal Rp, tanggal, nomor bukti) dan wajib mengunggah dokumen bukti dukung pencairan yang melekat langsung pada data pencairan.\n"
             "d. KEPALA PERANGKAT DAERAH (KEPALA_OPD): Pengguna Anggaran yang berwenang mereviu, memvalidasi, dan mengesahkan seluruh data fisik dan keuangan perangkat daerahnya.\n"
             "e. PIMPINAN DAERAH (Bupati, Wakil Bupati, Sekretaris Daerah): Memantau dashboard eksekutif secara real-time, grafik deviasi (Kurva-S), serta indikator early warning system (Aman, Perhatian, Kritis) sebagai dasar Rapat Evaluasi TEPRA.")
        ]),
        ("BAB II. PROSEDUR PENGELOLAAN PAKET PEMBANGUNAN & MEKANISME PAKET GELONDONGAN (SUB-PAKET)", [
            ("2.1. Sinkronisasi Data Paket dari SiRUP LKPP",
             "PPK OPD membuka menu 'Paket Pembangunan', kemudian memanfaatkan fitur 'Sinkronisasi SiRUP LKPP'. Sistem secara otomatis menarik atribut kode RUP, nama paket, pagu anggaran, metode pengadaan, dan lokasi dari server LKPP tanpa perlu pengetikan ulang manual."),
            ("2.2. Pola Penanganan Khusus Paket Gelondongan (Sub-Paket DPA)",
             "Dalam hal terdapat paket pengadaan yang pagu anggarannya pada Dokumen Pelaksanaan Anggaran (DPA) bersifat gelondongan (misalnya Pengadaan Obat dan BMHP Dinas Kesehatan dengan pagu induk Rp 3.500.000.000,- yang dipecah menjadi beberapa kontrak terpisah), maka diterapkan mekanisme teknis sebagai berikut:\n"
             "1. PPK mengaktifkan tombol 'Paket Gelondongan' di bawah nama paket pada formulir paket pembangunan.\n"
             "2. Nilai Pagu Induk secara otomatis terkunci sebagai batas plafon anggaran DPA (Rp 3.500.000.000,-). Hal ini menjamin bahwa dalam perhitungan agregat anggaran makro daerah, nilai pagu tidak akan pernah berulang atau terhitung ganda (no double counting).\n"
             "3. PPK membuka form 'Rincian Sub Paket' untuk menambahkan sub-paket pecahan, dengan menginput: (a) Nama Sub-Paket (misal: PENGADAAN OBAT dan BMHP Pkt 1 _ BHP PTM), (b) Nilai Pagu Sub-Paket, (c) Nomor Kontrak / SPK / Kode EP (misal: EP-01KHH4FHV2ZTMT2ZHHEDVTMW76), (d) Nilai Kontrak Terikat, (e) Masa Pelaksanaan (Mulai dan Selesai), (f) Nama Rekanan/Penyedia, dan (g) Sumber Dana.\n"
             "4. Sistem secara real-time menampilkan sisa alokasi pagu induk bebas untuk mencegah alokasi melebihi batas plafon.")
        ]),
        ("BAB III. PROSEDUR PENYUSUNAN TARGET FISIK KURVA-S & MASA KONTRAK", [
            ("3.1. Pengaturan Target Kurva-S Mingguan",
             "PPK OPD menetapkan tanggal mulai dan tanggal selesai kontrak. Sistem akan secara otomatis mengenerate jadwal minggu pelaksanaan kontrak. PPK mengisi rencana target fisik mingguan sesuai jadwal pelaksanaan (time schedule) kontrak hingga minggu terakhir mencapai 100%."),
            ("3.2. Rekonsiliasi Otomatis Target Bulanan",
             "Sistem MONALISA mengalkulasi secara otomatis akumulasi target mingguan menjadi target bulanan B01 sampai B12, sehingga grafik Kurva-S tersusun presisi sebagai pembanding realisasi fisik.")
        ]),
        ("BAB IV. PROSEDUR INPUT REALISASI KEUANGAN DAN LAMPIRAN BUKTI PENCAIRAN", [
            ("4.1. Pembukuan Pencairan Bertahap (Termin / UP / GU / TU / LS)",
             "Bendahara OPD mengakses menu 'Realisasi Keuangan'. Setiap pencairan dicatat per transaksi meliputi: bulan pelaporan, tanggal pencairan, nominal pencairan (Rp), nomor SP2D/kuitansi, dan uraian pembayaran termin."),
            ("4.2. Kewajiban Bukti Dukung Melekat (Integrated Attachment)",
             "Sesuai prinsip transparansi, setiap nominal pencairan wajib disertai unggahan berkas bukti dukung (PDF/scan JPG dokumen SP2D atau kuitansi pembayaran). Berkas bukti pencairan ini melekat langsung pada rincian riwayat transaksi dan dapat diverifikasi langsung oleh Admin Setda maupun auditor."),
            ("4.3. Monitoring Akumulasi dan Sisa Anggaran",
             "Sistem secara dinamis memperbarui total pencairan bulan berjalan, realisasi kumulatif tahun berjalan, persentase serapan anggaran, dan sisa pagu anggaran secara otomatis.")
        ]),
        ("BAB V. PROSEDUR INPUT REALISASI FISIK & DOKUMENTASI VISUAL LAPANGAN", [
            ("5.1. Pelaporan Progres Fisik (%)",
             "PPK OPD menginput capaian progres fisik kumulatif (%) setiap minggu atau setiap akhir bulan berdasarkan hasil opname lapangan dan Berita Acara Pemeriksaan Progres dari Konsultan Pengawas."),
            ("5.2. Dokumentasi Visual Progres Lapangan",
             "PPK mengunggah foto fisik pekerjaan (kondisi 0%, 50%, 100%) sebagai bukti faktual kesesuaian antara persentase yang dilaporkan dengan fakta di lapangan.")
        ]),
        ("BAB VI. PENGUNCIAN PERIODE (LOCKING PERIOD) & VERIFIKASI MONEV SETDA", [
            ("6.1. Jadwal Cut-Off Pelaporan Bulanan",
             "Batas waktu penginputan data bulanan oleh OPD ditetapkan paling lambat tanggal 10 bulan berikutnya. Setelah melewati batas waktu tersebut, sistem secara otomatis mengunci (locking) form input OPD."),
            ("6.2. Verifikasi Berjenjang & Validasi Bukti",
             "Verifikator Bagian Administrasi Pembangunan memeriksa kebenaran data, mencocokkan dokumen SP2D dengan serapan keuangan, dan menilai kewajaran deviasi fisik. Laporan yang valid diberikan status 'TERVERIFIKASI'."),
            ("6.3. Mekanisme Pembukaan Kunci (Unlock Request)",
             "Apabila OPD terlambat menginput karena kendala teknis atau rekonsiliasi yang sah, Kepala OPD wajib mengajukan Surat Permohonan Buka Kunci (Unlock) resmi yang ditujukan kepada Sekretaris Daerah cq. Kepala Bagian Administrasi Pembangunan.")
        ]),
        ("BAB VII. PENYAJIAN LAPORAN KONSOLIDASI DAERAH & RAPAT TEPRA", [
            ("7.1. Buku Laporan RFK 12 Bulan",
             "MONALISA mengompilasi Laporan Realisasi Fisik dan Keuangan (RFK) 12 bulan secara otomatis, mencakup seluruh OPD, program, kegiatan, dan sub-kegiatan di lingkungan Pemerintah Kabupaten Konawe Selatan."),
            ("7.2. Indikator Early Warning System TEPRA",
             "Sistem menetapkan status kinerja berdasarkan deviasi fisik (Realisasi Fisik minus Target Fisik):\n"
             "• Status AMAN (Hijau): Deviasi >= 0% (progres sesuai atau melebihi target).\n"
             "• Status PERHATIAN (Kuning): Deviasi antara -5% sampai -10% (terdapat keterlambatan ringan).\n"
             "• Status KRITIS (Merah): Deviasi < -10% (keterlambatan berat / potensi putus kontrak).\n"
             "Data ini disajikan pada Dashboard Pimpinan Daerah sebagai dasar utama perumusan intervensi kebijakan dalam Rapat Koordinasi TEPRA bulanan.")
        ])
    ]

    for title, items in sections_content:
        add_styled_paragraph(doc, title, bold=True, size=11, font_name="Arial", space_before=10, space_after=4, color="1B5E20")
        for sub_title, content in items:
            add_styled_paragraph(doc, sub_title, bold=True, size=10, font_name="Arial", space_before=4, space_after=2)
            p_c = doc.add_paragraph()
            p_c.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p_c.paragraph_format.space_before = Pt(0)
            p_c.paragraph_format.space_after = Pt(4)
            p_c.paragraph_format.line_spacing = 1.15
            r_c = p_c.add_run(content)
            r_c.font.name = "Arial"
            r_c.font.size = Pt(9.5)

    # =========================================================================
    # LEMBAR PENGESAHAN
    # =========================================================================
    add_styled_paragraph(doc, "", space_after=15)
    t_sign = doc.add_table(rows=1, cols=2)
    t_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sign.columns[0].width = Inches(3.5)
    t_sign.columns[1].width = Inches(3.5)

    c_left = t_sign.cell(0, 0)
    p_sl = c_left.paragraphs[0]
    p_sl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sl.paragraph_format.line_spacing = 1.15
    p_sl.add_run("Disusun Oleh:\nKEPALA BAGIAN ADMINISTRASI PEMBANGUNAN\nSEKRETARIAT DAERAH KAB. KONAWE SELATAN\n\n\n\n\n").font.size = Pt(9.5)
    r_aw = p_sl.add_run("ANDI WIRDAYANI, S.Sos., M.AP\n")
    r_aw.bold = True
    r_aw.font.size = Pt(10)
    p_sl.add_run("Pembina, Gol. IV/a\nNIP. 19800724 200012 2 001").font.size = Pt(9)

    c_right = t_sign.cell(0, 1)
    p_sr = c_right.paragraphs[0]
    p_sr.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sr.paragraph_format.line_spacing = 1.15
    p_sr.add_run("Ditetapkan dan Disahkan Oleh:\nSEKRETARIS DAERAH\nKABUPATEN KONAWE SELATAN\n\n\n\n\n").font.size = Pt(9.5)
    r_ip = p_sr.add_run("H. ICHSAN POROSI, ST., MTP\n")
    r_ip.bold = True
    r_ip.font.size = Pt(10)
    p_sr.add_run("Pembina Utama Madya, Gol. IV/d\nNIP. 19690412 199703 1 004").font.size = Pt(9)

    for row in t_sign.rows:
        for c in row.cells:
            set_cell_margins(c, top=60, bottom=60, left=60, right=60)
            set_cell_border(c, top=dict(val='none'), bottom=dict(val='none'), left=dict(val='none'), right=dict(val='none'))

    out_file = "/Users/simplephi/Documents/riswan/simantap/SOP_MONALISA_KONAWE_SELATAN_LENGKAP.docx"
    doc.save(out_file)
    print(f"File SOP generated successfully: {out_file}")

if __name__ == "__main__":
    main()
