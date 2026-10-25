"""
Service builder untuk menghasilkan dokumen Microsoft Word (.docx) naskah soal ujian resmi.
Dibuat dengan teknik Programmatic Direct-Styling berbasis python-docx tanpa template kaku.
Mengutamakan kerapian tipografi standar kedinasan Indonesia, hanging indent, dan layout hemat kertas.
"""

import io
import re
import datetime
from typing import List, Dict, Any, Optional, Tuple

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn


def clean_subject_name(text: str) -> str:
    """Membersihkan prompt AI atau teks kotor agar menjadi nama mata pelajaran resmi."""
    if not text:
        return "Mata Pelajaran Umum"
    t = str(text).strip()
    # Hapus instruksi prompt AI umum
    t = re.sub(
        r"^(tolong\s+)?(buatkan|buat|bikin|generate|susunkan|susun|carikan)\s+(\d+\s+)?soal\s+(tentang\s+|mengenai\s+|untuk\s+|materi\s+)?",
        "",
        t,
        flags=re.I
    )
    t = re.sub(r"^(materi|topik|bab|pelajaran|soal)\s*[:=]\s*", "", t, flags=re.I)
    t = re.sub(r"\s+", " ", t).strip()
    if not t or len(t) < 2:
        return "Mata Pelajaran Umum"
    # Format Title Case rapi
    return t[:55].title()


def contains_arabic(text: str) -> bool:
    """Mendeteksi apakah teks mengandung karakter Arab / Hijaiyah."""
    if not text:
        return False
    return bool(re.search(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]", str(text)))


def clean_latex_math(text: str) -> str:
    """Membersihkan atau menormalisasi notasi LaTeX dasar agar terbaca natural di Word."""
    if not text:
        return ""
    
    t = str(text)
    replacements = [
        (r"\\times", "×"),
        (r"\t+imes", "×"),
        (r"\btimes\b", "×"),
        (r"\\div", "÷"),
        (r"\\pm", "±"),
        (r"\\le\b|\\leq\b", "≤"),
        (r"\\ge\b|\\geq\b", "≥"),
        (r"\\ne\b|\\neq\b", "≠"),
        (r"\\approx", "≈"),
        (r"\\infty", "∞"),
        (r"\\degree|\\circ", "°"),
        (r"\\alpha", "α"),
        (r"\\beta", "β"),
        (r"\\gamma", "γ"),
        (r"\\theta", "θ"),
        (r"\\pi", "π"),
        (r"\\mu", "μ"),
        (r"\\Delta", "Δ"),
        (r"\\rightarrow|\\to", "→"),
        (r"\\leftarrow", "←"),
    ]
    for pattern, repl in replacements:
        t = re.sub(pattern, repl, t)

    # Ganti \frac{a}{b} -> (a/b)
    t = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", r"(\1/\2)", t)
    # Ganti \sqrt{a} -> √(a)
    t = re.sub(r"\\sqrt\{([^{}]+)\}", r"√(\1)", t)
    # Hapus delimiter math $$ atau $
    t = re.sub(r"\$\$([^$]+)\$\$", r"\1", t)
    t = re.sub(r"\$([^$]+)\$", r"\1", t)
    # Bersihkan sisa escape
    t = t.replace(r"\_", "_").replace(r"\%", "%").replace(r"\&", "&")
    # Bersihkan kurung sudut « » kembali ke tanda kutip biasa
    t = t.replace("«", '"').replace("»", '"')
    return t.strip()


def set_cell_background(cell, hex_color: str):
    """Memberi warna latar (shading) pada sel tabel."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    """Mengatur padding internal sel tabel (dalam dxa, 1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)


def set_table_borders_none(table):
    """Menghilangkan seluruh border tabel untuk layout grid transparan."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>'
        f'<w:insideH w:val="none"/><w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def set_table_borders_thin(table, color="CCCCCC", sz="4"):
    """Memberikan border garis tunggal tipis profesional pada tabel."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def add_official_kop(doc: Document, nama_sekolah: str):
    """Membuat Kop Surat Resmi Sekolah bergaris ganda (Double-Line) khas naskah dinas pendidikan."""
    sekolah_clean = (nama_sekolah or "LEMBAGA PENDIDIKAN").strip().upper()
    if sekolah_clean in ("EDUCRAFT AI", "LEMBAGA PENDIDIKAN"):
        sekolah_clean = "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL"

    p_kop = doc.add_paragraph()
    p_kop.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_kop.paragraph_format.space_before = Pt(0)
    p_kop.paragraph_format.space_after = Pt(2)
    p_kop.paragraph_format.line_spacing = 1.1

    r1 = p_kop.add_run("DINAS PENDIDIKAN DAN KEBUDAYAAN\n")
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(11)
    r1.font.bold = True

    r2 = p_kop.add_run(f"{sekolah_clean}\n")
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(13.5)
    r2.font.bold = True

    current_year = datetime.datetime.now().year
    r3 = p_kop.add_run(f"ASESMEN SUMATIF AKHIR SEMESTER • TAHUN AJARAN {current_year}/{current_year + 1}\n")
    r3.font.name = "Times New Roman"
    r3.font.size = Pt(10)
    r3.font.bold = True

    r4 = p_kop.add_run("Jl. Pendidikan Karakter Bangsa No. 01 • Telp: (021) 789012 • Website: saitech.co.id")
    r4.font.name = "Times New Roman"
    r4.font.size = Pt(8.5)
    r4.font.italic = True
    r4.font.color.rgb = RGBColor(90, 90, 90)

    # Garis ganda resmi (Word XML Paragraph Border Double)
    pBdr = parse_xml(
        r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:bottom w:val="double" w:sz="12" w:space="6" w:color="000000"/>'
        r'</w:pBdr>'
    )
    p_kop._p.get_or_add_pPr().append(pBdr)

    # Spacer pemisah antara Kop dan Tabel Metadata
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(6)
    p_sp.paragraph_format.space_after = Pt(2)


def add_exam_metadata_table(doc: Document, header_data: Dict[str, Any]):
    """
    Membuat tabel identitas ujian 4 kolom simetris berbingkai atas-bawah (Ruled Header Table).
    Menghilangkan kotak 'Nilai' yang timpang dan menggantinya dengan isian resmi ujian sekolah.
    """
    t_meta = doc.add_table(rows=3, cols=4)
    t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Border garis atas & bawah tebal (formal exam ruled table)
    tblPr = t_meta._tbl.tblPr
    bdr = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:color="000000"/>'
        f'<w:bottom w:val="single" w:sz="6" w:color="000000"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="single" w:sz="4" w:color="E5E7EB"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(bdr)

    raw_mapel = header_data.get("mata_pelajaran", "")
    mapel = clean_subject_name(raw_mapel)
    kelas = header_data.get("kelas") or "Semua Kelas"
    tanggal = header_data.get("tanggal") or datetime.date.today().strftime("%d %B %Y")
    durasi = header_data.get("durasi") or "60 Menit"

    meta_grid = [
        [("Mata Pelajaran", f": {mapel}"), ("Hari / Tanggal", f": {tanggal}")],
        [("Kelas / Fase", f": {kelas}"), ("Alokasi Waktu", f": {durasi}")],
        [("Nama Peserta", ":"), ("No. Peserta / Ruang", ":")],
    ]

    col_widths = [Inches(1.25), Inches(2.2), Inches(1.35), Inches(1.9)]

    for r_idx, row_pairs in enumerate(meta_grid):
        row = t_meta.rows[r_idx]
        
        # Kolom Kiri
        c0, c1 = row.cells[0], row.cells[1]
        set_cell_margins(c0, top=70, bottom=70, left=40, right=20)
        set_cell_margins(c1, top=70, bottom=70, left=20, right=40)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        p0.paragraph_format.line_spacing = 1.15
        r_lbl0 = p0.add_run(row_pairs[0][0])
        r_lbl0.font.name = "Times New Roman"
        r_lbl0.font.size = Pt(9.5)
        r_lbl0.font.bold = True

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        p1.paragraph_format.line_spacing = 1.15
        r_val0 = p1.add_run(row_pairs[0][1])
        r_val0.font.name = "Times New Roman"
        r_val0.font.size = Pt(9.5)
        if r_idx == 0:
            r_val0.font.bold = True

        # Kolom Kanan
        c2, c3 = row.cells[2], row.cells[3]
        set_cell_margins(c2, top=70, bottom=70, left=40, right=20)
        set_cell_margins(c3, top=70, bottom=70, left=20, right=40)

        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        p2.paragraph_format.line_spacing = 1.15
        r_lbl1 = p2.add_run(row_pairs[1][0])
        r_lbl1.font.name = "Times New Roman"
        r_lbl1.font.size = Pt(9.5)
        r_lbl1.font.bold = True

        p3 = c3.paragraphs[0]
        p3.paragraph_format.space_after = Pt(0)
        p3.paragraph_format.line_spacing = 1.15
        r_val1 = p3.add_run(row_pairs[1][1])
        r_val1.font.name = "Times New Roman"
        r_val1.font.size = Pt(9.5)

        for col_i, cell_i in enumerate(row.cells):
            cell_i.width = col_widths[col_i]


def add_compact_instructions(doc: Document):
    """
    Menampilkan Petunjuk Umum dalam format grid 2 kolom ringkas.
    Diberi jarak napas (spacing) yang lega dan nyaman dibaca.
    """
    p_hdr = doc.add_paragraph()
    p_hdr.paragraph_format.space_before = Pt(10)
    p_hdr.paragraph_format.space_after = Pt(3)
    r_hdr = p_hdr.add_run("PETUNJUK UMUM:")
    r_hdr.font.name = "Times New Roman"
    r_hdr.font.size = Pt(9)
    r_hdr.font.bold = True

    t_inst = doc.add_table(rows=2, cols=2)
    t_inst.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders_none(t_inst)

    instructions = [
        ("1. Berdoalah sebelum mulai mengerjakan soal.", "3. Dahulukan menjawab soal yang dianggap mudah."),
        ("2. Periksa dan bacalah lembar soal dengan teliti.", "4. Teliti kembali pekerjaan sebelum diserahkan.")
    ]

    for r_idx, (col1, col2) in enumerate(instructions):
        r = t_inst.rows[r_idx]
        for c_idx, text in enumerate([col1, col2]):
            c = r.cells[c_idx]
            c.width = Inches(3.35)
            set_cell_margins(c, top=25, bottom=25, left=30, right=30)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(text)
            run.font.name = "Times New Roman"
            run.font.size = Pt(8.5)
            run.font.color.rgb = RGBColor(70, 70, 70)

    # Garis pemisah tipis sebelum masuk ke butir soal
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(6)
    p_div.paragraph_format.space_after = Pt(6)
    pBdr = parse_xml(
        r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:bottom w:val="single" w:sz="4" w:space="3" w:color="CCCCCC"/>'
        r'</w:pBdr>'
    )
    p_div._p.get_or_add_pPr().append(pBdr)


def add_section_header(doc: Document, title: str, subtitle: str, has_top_divider: bool = False):
    """
    Membuat separator bagian soal (Bagian I / II / III) dengan bar rapi.
    Jika has_top_divider=True, diberi garis pemisah seksi elegan di atasnya untuk membatasi tipe soal sebelumnya.
    Dilengkapi keep_with_next=True agar judul bagian tidak pernah tertinggal sendirian di akhir halaman (orphan).
    """
    if has_top_divider:
        p_div = doc.add_paragraph()
        p_div.paragraph_format.space_before = Pt(14)
        p_div.paragraph_format.space_after = Pt(8)
        p_div.paragraph_format.keep_with_next = True
        pBdr = parse_xml(
            r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            r'<w:bottom w:val="single" w:sz="6" w:space="4" w:color="CCCCCC"/>'
            r'</w:pBdr>'
        )
        p_div._p.get_or_add_pPr().append(pBdr)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6) if has_top_divider else Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.keep_with_next = True

    r = p.add_run(title.upper())
    r.font.name = "Times New Roman"
    r.font.size = Pt(10.5)
    r.font.bold = True

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(6)
    p_sub.paragraph_format.line_spacing = 1.15
    p_sub.paragraph_format.keep_with_next = True
    r_sub = p_sub.add_run(subtitle)
    r_sub.font.name = "Times New Roman"
    r_sub.font.size = Pt(9)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(90, 90, 90)


def should_break_page_for_new_section(
    accumulated_height: float,
    new_section_type: str,
    new_items_count: int
) -> bool:
    """
    Menghitung sisa ruang vertikal di halaman saat ini.
    Jika ruang tersisa 'nanggung' (hanya muat judul atau < 2 soal),
    maka otomatis dialihkan ke lembar baru (doc.add_page_break()).
    Jika masih lega (cukup muat minimal 2-3 soal bersama judulnya),
    maka digabung di lembar yang sama dengan garis pemisah seksi yang rapi.
    """
    PAGE_1_CAPACITY = 7.5      # Kapasitas sisa Halaman 1 setelah Kop (inci)
    OTHER_PAGE_CAPACITY = 10.0 # Kapasitas halaman 2 dst (inci)

    if accumulated_height <= PAGE_1_CAPACITY:
        rem_space = PAGE_1_CAPACITY - accumulated_height
    else:
        rem_space = OTHER_PAGE_CAPACITY - ((accumulated_height - PAGE_1_CAPACITY) % OTHER_PAGE_CAPACITY)

    # Kebutuhan tinggi minimal agar tidak nanggung:
    # Header seksi + minimal 2 soal
    # Jika soal essay: header (0.8 in) + 2 butir essay (2 x 1.7 in = 3.4 in) = 4.2 in
    # Jika soal isian: header (0.8 in) + 2 butir isian (2 x 0.7 in = 1.4 in) = 2.2 in
    if new_section_type == "essay":
        needed_threshold = 4.0 if new_items_count >= 2 else 2.5
    elif new_section_type == "isian":
        needed_threshold = 2.4 if new_items_count >= 2 else 1.8
    else:
        needed_threshold = 2.2

    return rem_space < needed_threshold


def render_question_text_with_runs(paragraph, text: str):
    """
    Menambahkan teks soal ke paragraf dengan ukuran font Latin KONSISTEN 10.5pt.
    Jika di dalam kalimat terdapat kata/frasa Arab, hanya glif Arab tersebut yang
    diberi skala proporsional 12pt agar tanda harakatnya terbaca jelas, sementara
    seluruh teks Latin (termasuk kata pengantar, tanda kurung, tanda baca) tetap
    konsisten 10.5pt.
    """
    cleaned = clean_latex_math(text)
    pattern = r'([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)'
    tokens = re.split(pattern, cleaned)

    for token in tokens:
        if not token:
            continue
        run = paragraph.add_run(token)
        run.font.name = "Times New Roman"
        if bool(re.search(r'[\u0600-\u06FF]', token)):
            run.font.size = Pt(12)
        else:
            run.font.size = Pt(10.5)


def render_multiple_choice_questions(
    doc: Document,
    pg_list: List[Dict[str, Any]],
    start_num: int = 1,
    has_top_divider: bool = False
) -> float:
    """
    Merender butir-butir soal Pilihan Ganda dengan hanging indent dan 3-Mode Opsi Adaptif:
    1. Mode 4 Kolom: Jika semua opsi pendek (<= 16 karakter, 1 kata), disusun 1 baris penuh!
    2. Mode 2 Kolom: Jika opsi sedang (<= 42 karakter), disusun 2x2.
    3. Mode 1 Kolom: Jika opsi kalimat panjang (> 42 karakter), disusun vertikal.
    Mengembalikan estimasi tinggi vertikal (dalam inci) untuk kalkulasi pagination.
    """
    add_section_header(
        doc,
        "I. PILIHAN GANDA",
        "Petunjuk: Pilihlah salah satu jawaban yang paling tepat dengan menyilang (X) huruf A, B, C, atau D!",
        has_top_divider=has_top_divider
    )
    accum_h = 0.8  # Header section

    for i, q in enumerate(pg_list, start=start_num):
        raw_teks = q.get("teks", q.get("teks_soal", q.get("text", "")))
        is_q_arabic = contains_arabic(raw_teks)

        # Paragraf Soal dengan Hanging Indent Presisi & Jarak Antar Soal Lega
        p_q = doc.add_paragraph()
        p_q.paragraph_format.left_indent = Inches(0.28)
        p_q.paragraph_format.first_line_indent = Inches(-0.28)
        p_q.paragraph_format.space_before = Pt(4 if i == start_num else 12)
        p_q.paragraph_format.space_after = Pt(3)
        p_q.paragraph_format.line_spacing = 1.15
        p_q.paragraph_format.keep_with_next = True  # Kunci agar soal tidak menggantung di akhir halaman tanpa opsi!

        r_num = p_q.add_run(f"{i}.\t")
        r_num.font.name = "Times New Roman"
        r_num.font.size = Pt(10.5)
        r_num.font.bold = True

        render_question_text_with_runs(p_q, raw_teks)

        # Opsi Jawaban
        opsi_list = q.get("opsi", q.get("options", []))
        if not opsi_list:
            accum_h += 0.35
            continue

        normalized_options = []
        for o in opsi_list:
            label = str(o.get("label", o.get("label_opsi", ""))).strip()
            text_o = clean_latex_math(o.get("teks", o.get("teks_opsi", o.get("text", ""))))
            normalized_options.append((label, text_o, contains_arabic(text_o)))

        max_len = max([len(t) for _, t, _ in normalized_options]) if normalized_options else 0
        has_any_arabic = any([is_ar for _, _, is_ar in normalized_options])

        # ── MODE 1: OPSI SANGAT PENDEK / 1 KATA (SEJAJAR 4 KOLOM, INDENT KE KANAN) ──
        if len(normalized_options) == 4 and max_len <= 18:
            accum_h += 0.55
            t_opt = doc.add_table(rows=1, cols=4)
            t_opt.alignment = WD_TABLE_ALIGNMENT.LEFT
            set_table_borders_none(t_opt)
            
            # Indent tabel opsi ke kanan sejajar di bawah teks soal
            tblPr = t_opt._tbl.tblPr
            tblInd = parse_xml(f'<w:tblInd {nsdecls("w")} w:w="560" w:type="dxa"/>')
            tblPr.append(tblInd)
            col_w = Inches(1.55)

            for row in t_opt.rows:
                trPr = row._tr.get_or_add_trPr()
                trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

            for col_i, (lbl, txt, is_ar) in enumerate(normalized_options):
                cell = t_opt.rows[0].cells[col_i]
                cell.width = col_w
                set_cell_margins(cell, top=20, bottom=20, left=25, right=25)
                p = cell.paragraphs[0]
                p.paragraph_format.line_spacing = 1.1
                p.paragraph_format.space_after = Pt(0)
                
                r_lbl = p.add_run(f"{lbl}. ")
                r_lbl.font.name = "Times New Roman"
                r_lbl.font.size = Pt(10)
                r_lbl.font.bold = True

                r_val = p.add_run(txt)
                r_val.font.name = "Times New Roman"
                r_val.font.size = Pt(12 if is_ar else 10)

        # ── MODE 2: OPSI SEDANG (GRID 2 KOLOM 2 BARIS, INDENT KE KANAN) ──
        elif len(normalized_options) == 4 and max_len <= 45:
            accum_h += 0.75
            t_opt = doc.add_table(rows=2, cols=2)
            t_opt.alignment = WD_TABLE_ALIGNMENT.LEFT
            set_table_borders_none(t_opt)

            # Indent tabel opsi ke kanan sejajar di bawah teks soal
            tblPr = t_opt._tbl.tblPr
            tblInd = parse_xml(f'<w:tblInd {nsdecls("w")} w:w="560" w:type="dxa"/>')
            tblPr.append(tblInd)
            col_w = Inches(3.1)

            for row in t_opt.rows:
                trPr = row._tr.get_or_add_trPr()
                trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

            # Baris 1: A dan B
            for col_i, opt_i in enumerate([0, 1]):
                cell = t_opt.rows[0].cells[col_i]
                cell.width = col_w
                set_cell_margins(cell, top=20, bottom=20, left=30, right=30)
                p = cell.paragraphs[0]
                p.paragraph_format.line_spacing = 1.1
                p.paragraph_format.space_after = Pt(0)
                lbl, txt, is_ar = normalized_options[opt_i]

                r_lbl = p.add_run(f"{lbl}. ")
                r_lbl.font.name = "Times New Roman"
                r_lbl.font.size = Pt(10)
                r_lbl.font.bold = True

                r_val = p.add_run(txt)
                r_val.font.name = "Times New Roman"
                r_val.font.size = Pt(12 if is_ar else 10)

            # Baris 2: C dan D
            for col_i, opt_i in enumerate([2, 3]):
                cell = t_opt.rows[1].cells[col_i]
                cell.width = col_w
                set_cell_margins(cell, top=20, bottom=20, left=30, right=30)
                p = cell.paragraphs[0]
                p.paragraph_format.line_spacing = 1.1
                p.paragraph_format.space_after = Pt(0)
                lbl, txt, is_ar = normalized_options[opt_i]

                r_lbl = p.add_run(f"{lbl}. ")
                r_lbl.font.name = "Times New Roman"
                r_lbl.font.size = Pt(10)
                r_lbl.font.bold = True

                r_val = p.add_run(txt)
                r_val.font.name = "Times New Roman"
                r_val.font.size = Pt(12 if is_ar else 10)

        # ── MODE 3: OPSI PANJANG (1 KOLOM VERTIKAL, INDENT KE KANAN) ──
        else:
            accum_h += 0.35 + (len(normalized_options) * 0.22)
            for idx_o, (lbl, txt, is_ar) in enumerate(normalized_options):
                p_o = doc.add_paragraph()
                p_o.paragraph_format.left_indent = Inches(0.55)
                p_o.paragraph_format.first_line_indent = Inches(-0.25)
                p_o.paragraph_format.space_before = Pt(1.5)
                p_o.paragraph_format.space_after = Pt(1.5)
                p_o.paragraph_format.line_spacing = 1.15
                if idx_o < len(normalized_options) - 1:
                    p_o.paragraph_format.keep_with_next = True

                r_lbl = p_o.add_run(f"{lbl}.\t")
                r_lbl.font.name = "Times New Roman"
                r_lbl.font.size = Pt(10)
                r_lbl.font.bold = True

                r_val = p_o.add_run(txt)
                r_val.font.name = "Times New Roman"
                r_val.font.size = Pt(12 if is_ar else 10)

    return accum_h


def render_short_answer_questions(
    doc: Document,
    isian_list: List[Dict[str, Any]],
    start_num: int = 1,
    has_top_divider: bool = False
) -> float:
    """Merender butir-butir soal Isian Singkat. Mengembalikan estimasi tinggi vertikal."""
    add_section_header(
        doc,
        "II. ISIAN SINGKAT",
        "Petunjuk: Isilah titik-titik di bawah ini dengan jawaban yang singkat, tepat, dan benar!",
        has_top_divider=has_top_divider
    )
    accum_h = 0.8

    for i, q in enumerate(isian_list, start=start_num):
        accum_h += 0.65
        raw_teks = q.get("teks", q.get("teks_soal", q.get("text", "")))
        is_ar = contains_arabic(raw_teks)

        # Short Answer
        p_q = doc.add_paragraph()
        p_q.paragraph_format.left_indent = Inches(0.28)
        p_q.paragraph_format.first_line_indent = Inches(-0.28)
        p_q.paragraph_format.space_before = Pt(4 if i == start_num else 12)
        p_q.paragraph_format.space_after = Pt(2)
        p_q.paragraph_format.line_spacing = 1.15
        p_q.paragraph_format.keep_with_next = True  # Kunci agar soal tidak menggantung tanpa baris jawaban

        r_num = p_q.add_run(f"{i}.\t")
        r_num.font.name = "Times New Roman"
        r_num.font.size = Pt(10.5)
        r_num.font.bold = True

        render_question_text_with_runs(p_q, raw_teks)

        p_ans = doc.add_paragraph()
        p_ans.paragraph_format.left_indent = Inches(0.48)
        p_ans.paragraph_format.space_before = Pt(2)
        p_ans.paragraph_format.space_after = Pt(6)
        r_dot = p_ans.add_run("Jawaban: " + "." * 55)
        r_dot.font.name = "Times New Roman"
        r_dot.font.size = Pt(9.5)
        r_dot.font.color.rgb = RGBColor(120, 120, 120)

    return accum_h


def render_essay_questions(
    doc: Document,
    essay_list: List[Dict[str, Any]],
    start_num: int = 1,
    has_top_divider: bool = False
) -> float:
    """Merender butir-butir soal Essay / Uraian dengan garis berjarak rapi untuk jawaban siswa."""
    add_section_header(
        doc,
        "III. ESSAY / URAIAN",
        "Petunjuk: Jawablah pertanyaan-pertanyaan berikut secara komprehensif, runtut, dan jelas!",
        has_top_divider=has_top_divider
    )
    accum_h = 0.8

    for i, q in enumerate(essay_list, start=start_num):
        accum_h += 1.7
        raw_teks = q.get("teks", q.get("teks_soal", q.get("text", "")))
        is_ar = contains_arabic(raw_teks)

        # Essay Question
        p_q = doc.add_paragraph()
        p_q.paragraph_format.left_indent = Inches(0.28)
        p_q.paragraph_format.first_line_indent = Inches(-0.28)
        p_q.paragraph_format.space_before = Pt(6 if i == start_num else 14)
        p_q.paragraph_format.space_after = Pt(4)
        p_q.paragraph_format.line_spacing = 1.15
        p_q.paragraph_format.keep_with_next = True  # Kunci agar soal tidak menggantung tanpa 5 baris jawaban

        r_num = p_q.add_run(f"{i}.\t")
        r_num.font.name = "Times New Roman"
        r_num.font.size = Pt(10.5)
        r_num.font.bold = True

        render_question_text_with_runs(p_q, raw_teks)

        r_score = p_q.add_run("  [Skor Maks: 10]")
        r_score.font.name = "Times New Roman"
        r_score.font.size = Pt(8.5)
        r_score.font.italic = True
        r_score.font.bold = True
        r_score.font.color.rgb = RGBColor(90, 90, 90)

        # 5 Garis Horizontal Rapi untuk Jawaban Siswa (Seperti buku tulis bergaris, tanpa kotak samping)
        tbl_lines = doc.add_table(rows=5, cols=1)
        tbl_lines.alignment = WD_TABLE_ALIGNMENT.LEFT
        tblPr = tbl_lines._tbl.tblPr
        tblInd = parse_xml(f'<w:tblInd {nsdecls("w")} w:w="560" w:type="dxa"/>')
        tblPr.append(tblInd)

        tblBorders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="none"/>'
            f'<w:left w:val="none"/>'
            f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>'
            f'<w:right w:val="none"/>'
            f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>'
            f'<w:insideV w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(tblBorders)

        for r_idx in range(5):
            row = tbl_lines.rows[r_idx]
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            c = row.cells[0]
            c.width = Inches(6.2)
            p_cell = c.paragraphs[0]
            p_cell.paragraph_format.space_before = Pt(6)
            p_cell.paragraph_format.space_after = Pt(6)
            p_cell.paragraph_format.line_spacing = 1.0

    return accum_h


def render_teacher_master_key(
    doc: Document,
    header_data: Dict[str, Any],
    all_questions: List[Dict[str, Any]],
    sertakan_pembahasan: bool = True
):
    """
    Membuat halaman Kunci Jawaban & Rubrik Pembahasan Pegangan Guru terstandar kedinasan.
    Menggunakan format matriks kompak dan tabel rubrik terpadu (anti-card clutter).
    """
    doc.add_page_break()

    # Header Lembar Kunci
    p_top = doc.add_paragraph()
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_top.paragraph_format.space_before = Pt(4)
    p_top.paragraph_format.space_after = Pt(2)
    
    r_k1 = p_top.add_run("LEMBAR KUNCI JAWABAN & PEMBAHASAN\n")
    r_k1.font.name = "Times New Roman"
    r_k1.font.size = Pt(12)
    r_k1.font.bold = True

    mapel = clean_subject_name(header_data.get("mata_pelajaran", ""))
    kelas = header_data.get("kelas") or "Semua Kelas"
    r_k2 = p_top.add_run(f"Pegangan Guru / Penilai • Mata Pelajaran: {mapel} • Kelas: {kelas}")
    r_k2.font.name = "Times New Roman"
    r_k2.font.size = Pt(9)
    r_k2.font.italic = True
    r_k2.font.color.rgb = RGBColor(90, 90, 90)

    pBdr = parse_xml(
        r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:bottom w:val="double" w:sz="10" w:space="4" w:color="000000"/>'
        r'</w:pBdr>'
    )
    p_top._p.get_or_add_pPr().append(pBdr)

    # 1. Matriks Kunci Cepat Pilihan Ganda (Pita Ringkas 5 Kolom, Tanpa Garis Kisi Kaku)
    pg_items = [q for q in all_questions if str(q.get("tipe", q.get("type", "pg"))).strip().lower() in ("pg", "pilihan ganda", "pilihan_ganda", "benar/salah", "benar_salah")]
    if pg_items:
        p_m = doc.add_paragraph()
        p_m.paragraph_format.space_before = Pt(10)
        p_m.paragraph_format.space_after = Pt(4)
        p_m.paragraph_format.keep_with_next = True
        r_m = p_m.add_run("A. KUNCI JAWABAN CEPAT (PILIHAN GANDA)")
        r_m.font.name = "Times New Roman"
        r_m.font.size = Pt(9.5)
        r_m.font.bold = True

        num_cols = min(5, len(pg_items))
        num_rows = (len(pg_items) + num_cols - 1) // num_cols

        t_ribbon = doc.add_table(rows=1, cols=num_cols)
        t_ribbon.alignment = WD_TABLE_ALIGNMENT.CENTER
        tblPr = t_ribbon._tbl.tblPr
        tblBorders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
            f'<w:left w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
            f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
            f'<w:right w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
            f'<w:insideH w:val="none"/>'
            f'<w:insideV w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(tblBorders)

        col_w = Inches(6.7 / num_cols)
        for c_i in range(num_cols):
            cell = t_ribbon.rows[0].cells[c_i]
            cell.width = col_w
            tcPr = cell._tc.get_or_add_tcPr()
            tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>'))
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(5)
            p.paragraph_format.space_after = Pt(5)
            p.paragraph_format.line_spacing = 1.25

            for r_i in range(num_rows):
                idx = c_i * num_rows + r_i
                if idx >= len(pg_items):
                    continue
                q = pg_items[idx]
                kunci = str(q.get("kunci_jawaban", q.get("jawaban", "-"))).strip().upper()
                r_n = p.add_run(f"{idx + 1:2d}. ")
                r_n.font.name = "Times New Roman"
                r_n.font.size = Pt(9.5)
                r_n.font.color.rgb = RGBColor(90, 90, 90)
                
                is_last_in_col = (r_i == num_rows - 1) or (idx + 1 == len(pg_items))
                r_k = p.add_run(f"{kunci}" if is_last_in_col else f"{kunci}\n")
                r_k.font.name = "Times New Roman"
                r_k.font.size = Pt(9.5)
                r_k.font.bold = True

    # 2. Pembahasan Soal & Pedoman Penskoran (Format Editorial Mengalir, Bebas dari Tabel Kisi!)
    if sertakan_pembahasan:
        p_d = doc.add_paragraph()
        p_d.paragraph_format.space_before = Pt(14)
        p_d.paragraph_format.space_after = Pt(6)
        p_d.paragraph_format.keep_with_next = True
        r_d = p_d.add_run("B. PEMBAHASAN SOAL & PEDOMAN PENSKORAN")
        r_d.font.name = "Times New Roman"
        r_d.font.size = Pt(9.5)
        r_d.font.bold = True

        for i, q in enumerate(all_questions, start=1):
            tipe = str(q.get("tipe", q.get("type", "pg"))).strip().lower()
            kunci = str(q.get("kunci_jawaban", q.get("jawaban", "-"))).strip()
            pembahasan = clean_latex_math(q.get("pembahasan", q.get("explanation", "-")))
            bloom = q.get("level_bloom", "")
            diff = q.get("kesulitan", "")

            # Baris Header Soal: Nomor + Kunci + Aspek Kognitif
            p_item = doc.add_paragraph()
            p_item.paragraph_format.left_indent = Inches(0.28)
            p_item.paragraph_format.first_line_indent = Inches(-0.28)
            p_item.paragraph_format.space_before = Pt(7)
            p_item.paragraph_format.space_after = Pt(1)
            p_item.paragraph_format.keep_with_next = True

            r_num = p_item.add_run(f"{i}.\t")
            r_num.font.name = "Times New Roman"
            r_num.font.size = Pt(10)
            r_num.font.bold = True

            kunci_display = kunci.upper() if len(kunci) <= 3 else "Uraian"
            r_ans = p_item.add_run(f"Kunci: {kunci_display}")
            r_ans.font.name = "Times New Roman"
            r_ans.font.size = Pt(10)
            r_ans.font.bold = True

            # Baris Isi Pembahasan (Bebas bernapas, teks Arab proporsional, line-height 1.25)
            p_body = doc.add_paragraph()
            p_body.paragraph_format.left_indent = Inches(0.28)
            p_body.paragraph_format.space_before = Pt(0)
            p_body.paragraph_format.space_after = Pt(5)
            p_body.paragraph_format.line_spacing = 1.25

            pattern = r'([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)'
            tokens = re.split(pattern, pembahasan)
            for token in tokens:
                if not token:
                    continue
                r_tok = p_body.add_run(token)
                r_tok.font.name = "Times New Roman"
                if bool(re.search(r'[\u0600-\u06FF]', token)):
                    r_tok.font.size = Pt(12)
                else:
                    r_tok.font.size = Pt(9.5)


def generate_exam_docx(
    header_data: Dict[str, Any],
    soal_list: List[Dict[str, Any]],
    sertakan_jawaban: bool = False,
    sertakan_pembahasan: bool = False,
    **kwargs
) -> io.BytesIO:
    """Fungsi utama untuk membangun dokumen .docx siap cetak secara murni."""
    doc = Document()

    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.75)
    section.right_margin = Inches(0.75)

    # 1. Kop Resmi Kedinasan
    nama_sekolah = header_data.get("nama_sekolah", "")
    add_official_kop(doc, nama_sekolah)

    # 2. Tabel Identitas Ujian & Siswa (Symmetric 4-col ruled table)
    add_exam_metadata_table(doc, header_data)

    # 3. Petunjuk Pengerjaan Ringkas 2 Kolom
    add_compact_instructions(doc)

    # 4. Filter Soal Berdasarkan Tipe
    pg_list = []
    isian_list = []
    essay_list = []

    for s in soal_list:
        tipe = str(s.get("tipe", s.get("type", "pg"))).strip().lower()
        if tipe in ("pg", "pilihan ganda", "pilihan_ganda", "benar/salah", "benar_salah"):
            pg_list.append(s)
        elif tipe in ("isian", "isian singkat", "isian_singkat"):
            isian_list.append(s)
        else:
            essay_list.append(s)

    # 5. Render Butir Soal Berurutan dengan Aliran Alami & Garis Pembatas Seksi
    running_number = 1
    rendered_sections_count = 0

    if pg_list:
        render_multiple_choice_questions(doc, pg_list, start_num=running_number, has_top_divider=False)
        running_number += len(pg_list)
        rendered_sections_count += 1

    if isian_list:
        has_prev = rendered_sections_count > 0
        render_short_answer_questions(doc, isian_list, start_num=running_number, has_top_divider=has_prev)
        running_number += len(isian_list)
        rendered_sections_count += 1

    if essay_list:
        has_prev = rendered_sections_count > 0
        render_essay_questions(doc, essay_list, start_num=running_number, has_top_divider=has_prev)
        running_number += len(essay_list)
        rendered_sections_count += 1

    # Gabungkan seluruh soal berurutan: PG dulu, lalu Isian, lalu Essay
    ordered_all_questions = pg_list + isian_list + essay_list

    # 6. Kunci Jawaban & Pembahasan Pegangan Guru (Jika diminta)
    if sertakan_jawaban or sertakan_pembahasan:
        render_teacher_master_key(
            doc,
            header_data,
            ordered_all_questions,
            sertakan_pembahasan=sertakan_pembahasan
        )

    output_stream = io.BytesIO()
    doc.save(output_stream)
    output_stream.seek(0)
    return output_stream
