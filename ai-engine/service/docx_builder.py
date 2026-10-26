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
    res = t[:55].title()
    for abbr in ["IPA", "IPS", "PPKN", "TIK", "BK", "PJOK", "PAI", "SBK", "PMR", "SMP", "SMA", "SMK", "SD", "MI", "MTS", "MA"]:
        res = re.sub(rf"\b{abbr}\b", abbr, res, flags=re.I)
    return res


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


def set_table_width_and_grid(table, col_dxa: List[int]):
    """Mengunci lebar total tabel dan grid kolom secara presisi pada level XML OpenXML."""
    tblPr = table._tbl.tblPr
    total_w = sum(col_dxa)
    tblW = tblPr.find(qn('w:tblW'))
    if tblW is not None:
        tblW.set(qn('w:w'), str(total_w))
        tblW.set(qn('w:type'), 'dxa')
    else:
        tblPr.append(parse_xml(f'<w:tblW {nsdecls("w")} w:w="{total_w}" w:type="dxa"/>'))

    tblGrid = table._tbl.tblGrid
    tblGrid.clear()
    for d in col_dxa:
        tblGrid.append(parse_xml(f'<w:gridCol {nsdecls("w")} w:w="{d}"/>'))


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
    sekolah_clean = (nama_sekolah or "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL").strip().upper()
    if sekolah_clean in ("EDUCRAFT AI", "LEMBAGA PENDIDIKAN", "SAI TECH", "PT SOLUSI AGEN INDONESIA"):
        sekolah_clean = "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL"

    p_kop = doc.add_paragraph()
    p_kop.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_kop.paragraph_format.space_before = Pt(0)
    p_kop.paragraph_format.space_after = Pt(6)
    p_kop.paragraph_format.line_spacing = 1.15

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

    r4 = p_kop.add_run("Saitech AI Solutions • Website: saitech.co.id")
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
    has_top_divider: bool = False,
    title: str = "I. PILIHAN GANDA",
    subtitle: str = "Petunjuk: Pilihlah salah satu jawaban yang paling tepat dengan menyilang (X) huruf A, B, C, atau D!"
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
        title,
        subtitle,
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
    has_top_divider: bool = False,
    title: str = "II. ISIAN SINGKAT",
    subtitle: str = "Petunjuk: Isilah titik-titik di bawah ini dengan jawaban yang singkat, tepat, dan benar!"
) -> float:
    """Merender butir-butir soal Isian Singkat. Mengembalikan estimasi tinggi vertikal."""
    add_section_header(
        doc,
        title,
        subtitle,
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


def render_true_false_matrix(
    doc: Document,
    bs_list: List[Dict[str, Any]],
    start_num: int = 1,
    has_top_divider: bool = False,
    title: str = "III. BENAR / SALAH",
    subtitle: str = "Petunjuk: Berilah tanda centang (✓) atau silang (X) pada kolom Benar atau Salah sesuai dengan pernyataan!"
) -> float:
    """
    Merender butir-butir soal Benar/Salah dalam format Tabel Matriks Checklist (Standar AKM / Asesmen Nasional).
    Kolom: No. | Pernyataan | Benar | Salah
    """
    add_section_header(
        doc,
        title,
        subtitle,
        has_top_divider=has_top_divider
    )
    accum_h = 0.8

    table = doc.add_table(rows=len(bs_list) + 1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Setup header row
    hdr = table.rows[0]
    trPr = hdr._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

    cols_cfg = [
        ("No.", Inches(0.45), WD_ALIGN_PARAGRAPH.CENTER),
        ("Pernyataan", Inches(4.8), WD_ALIGN_PARAGRAPH.LEFT),
        ("Benar", Inches(0.75), WD_ALIGN_PARAGRAPH.CENTER),
        ("Salah", Inches(0.75), WD_ALIGN_PARAGRAPH.CENTER),
    ]

    for idx, (lbl, w, align) in enumerate(cols_cfg):
        c = hdr.cells[idx]
        c.width = w
        set_cell_background(c, "F3F4F6")
        set_cell_margins(c, top=40, bottom=40, left=30, right=30)
        p = c.paragraphs[0]
        p.alignment = align
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(lbl)
        run.font.name = "Times New Roman"
        run.font.size = Pt(9)
        run.font.bold = True

    for i, q in enumerate(bs_list, start=start_num):
        accum_h += 0.45
        row = table.rows[i - start_num + 1]
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

        raw_teks = q.get("teks", q.get("teks_soal", q.get("text", "")))

        # Col 0: No
        c0 = row.cells[0]
        c0.width = Inches(0.45)
        set_cell_margins(c0, top=45, bottom=45, left=20, right=20)
        p0 = c0.paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p0.paragraph_format.space_before = Pt(3)
        p0.paragraph_format.space_after = Pt(3)
        r0 = p0.add_run(f"{i}.")
        r0.font.name = "Times New Roman"
        r0.font.size = Pt(9.5)
        r0.font.bold = True

        # Col 1: Pernyataan
        c1 = row.cells[1]
        c1.width = Inches(4.8)
        set_cell_margins(c1, top=45, bottom=45, left=40, right=40)
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p1.paragraph_format.space_before = Pt(3)
        p1.paragraph_format.space_after = Pt(3)
        p1.paragraph_format.line_spacing = 1.15
        render_question_text_with_runs(p1, raw_teks)

        # Col 2: Benar [   ]
        c2 = row.cells[2]
        c2.width = Inches(0.75)
        set_cell_margins(c2, top=45, bottom=45, left=15, right=15)
        p2 = c2.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.paragraph_format.space_before = Pt(3)
        p2.paragraph_format.space_after = Pt(3)
        r2 = p2.add_run("[   ]")
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(9)
        r2.font.color.rgb = RGBColor(140, 140, 140)

        # Col 3: Salah [   ]
        c3 = row.cells[3]
        c3.width = Inches(0.75)
        set_cell_margins(c3, top=45, bottom=45, left=15, right=15)
        p3 = c3.paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3.paragraph_format.space_before = Pt(3)
        p3.paragraph_format.space_after = Pt(3)
        r3 = p3.add_run("[   ]")
        r3.font.name = "Times New Roman"
        r3.font.size = Pt(9)
        r3.font.color.rgb = RGBColor(140, 140, 140)

    # Borders
    set_table_borders_thin(table, color="D1D5DB", sz="4")

    # Space after table
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(4)

    return accum_h


def render_essay_questions(
    doc: Document,
    essay_list: List[Dict[str, Any]],
    start_num: int = 1,
    has_top_divider: bool = False,
    title: str = "III. ESSAY / URAIAN",
    subtitle: str = "Petunjuk: Jawablah pertanyaan-pertanyaan berikut secara komprehensif, runtut, dan jelas!"
) -> float:
    """Merender butir-butir soal Essay / Uraian dengan garis berjarak rapi untuk jawaban siswa."""
    add_section_header(
        doc,
        title,
        subtitle,
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

    # 1. Matriks Kunci Cepat (Pita Ringkas 5 Kolom, Tanpa Garis Kisi Kaku)
    quick_items = []
    for q in all_questions:
        t = str(q.get("tipe", q.get("type", "pg"))).strip().lower()
        is_bs = t in ("benar/salah", "benar salah", "benar_salah", "bs", "true_false", "tf")
        if not is_bs and len(q.get("opsi") or []) == 2:
            texts = [str(o.get("teks", "")).strip().lower() for o in (q.get("opsi") or [])]
            if "benar" in texts and "salah" in texts:
                is_bs = True
        if is_bs or t in ("pg", "pilihan ganda", "pilihan_ganda", "pilihan"):
            quick_items.append((q, is_bs))

    if quick_items:
        p_m = doc.add_paragraph()
        p_m.paragraph_format.space_before = Pt(10)
        p_m.paragraph_format.space_after = Pt(4)
        p_m.paragraph_format.keep_with_next = True
        r_m = p_m.add_run("A. KUNCI JAWABAN CEPAT (PILIHAN GANDA & BENAR/SALAH)")
        r_m.font.name = "Times New Roman"
        r_m.font.size = Pt(9.5)
        r_m.font.bold = True

        num_cols = min(5, len(quick_items))
        num_rows = (len(quick_items) + num_cols - 1) // num_cols

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
                if idx >= len(quick_items):
                    continue
                q, is_bs = quick_items[idx]
                kunci_raw = str(q.get("kunci_jawaban", q.get("jawaban", "-"))).strip()
                if is_bs:
                    if "benar" in kunci_raw.lower() or kunci_raw.upper() == "A":
                        kunci = "B (Benar)"
                    elif "salah" in kunci_raw.lower() or kunci_raw.upper() == "B":
                        kunci = "S (Salah)"
                    else:
                        kunci = kunci_raw.upper()
                else:
                    kunci = kunci_raw.upper()

                r_n = p.add_run(f"{idx + 1:2d}. ")
                r_n.font.name = "Times New Roman"
                r_n.font.size = Pt(9.5)
                r_n.font.color.rgb = RGBColor(90, 90, 90)
                
                is_last_in_col = (r_i == num_rows - 1) or (idx + 1 == len(quick_items))
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

            is_bs = tipe in ("benar/salah", "benar salah", "benar_salah", "bs", "true_false", "tf")
            if not is_bs and len(q.get("opsi") or []) == 2:
                texts = [str(o.get("teks", "")).strip().lower() for o in (q.get("opsi") or [])]
                if "benar" in texts and "salah" in texts:
                    is_bs = True

            is_essay = tipe in ("essay", "uraian")
            is_isian = tipe in ("isian", "short_answer", "isian_singkat")
            is_pg = tipe in ("pg", "pilihan_ganda", "multiple_choice")

            label_prefix = "Kunci"
            if is_bs:
                if "benar" in kunci.lower() or kunci.upper() == "A":
                    kunci_display = "Benar"
                elif "salah" in kunci.lower() or kunci.upper() == "B":
                    kunci_display = "Salah"
                else:
                    kunci_display = kunci
            elif is_pg:
                kunci_display = kunci.upper() if len(kunci) <= 3 else kunci
            elif is_isian:
                # Isian singkat: WAJIB menampilkan teks kunci asli (misal: "BGE-M3", "Redis", dsb), bukan "Uraian"!
                kunci_display = kunci
            elif is_essay:
                if kunci and kunci.lower() not in ("-", "uraian", "essay", ""):
                    if len(kunci) <= 80:
                        kunci_display = kunci
                        label_prefix = "Pedoman Kunci"
                    else:
                        kunci_display = "Lihat Pembahasan / Rubrik di Bawah"
                        label_prefix = "Pedoman Jawaban"
                        if not pembahasan or pembahasan.strip() in ("-", ""):
                            pembahasan = kunci
                else:
                    kunci_display = "Lihat Pembahasan / Rubrik di Bawah"
                    label_prefix = "Pedoman Jawaban"
            else:
                kunci_display = kunci

            r_ans = p_item.add_run(f"{label_prefix}: {kunci_display}")
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

    # 4. Filter Soal Berdasarkan Tipe Sesuai Hierarki Standar (PG -> Isian -> Benar/Salah -> Essay)
    pg_list = []
    isian_list = []
    bs_list = []
    essay_list = []

    for s in soal_list:
        tipe = str(s.get("tipe", s.get("type", "pg"))).strip().lower()
        is_bs = tipe in ("benar/salah", "benar salah", "benar_salah", "bs", "true_false", "tf")
        if not is_bs:
            opsi = s.get("opsi") or []
            if len(opsi) == 2:
                teks_opsi = [str(o.get("teks", "")).strip().lower() for o in opsi]
                if "benar" in teks_opsi and "salah" in teks_opsi:
                    is_bs = True

        if is_bs:
            bs_list.append(s)
        elif tipe in ("pg", "pilihan ganda", "pilihan_ganda", "pilihan"):
            pg_list.append(s)
        elif tipe in ("isian", "isian singkat", "isian_singkat"):
            isian_list.append(s)
        else:
            essay_list.append(s)

    # 5. Render Butir Soal Berurutan dengan Aliran Alami & Garis Pembatas Seksi
    ROMAN_NUMS = ["I", "II", "III", "IV", "V", "VI"]
    running_number = 1
    rendered_sections_count = 0

    # 1. Pilihan Ganda
    if pg_list:
        roman = ROMAN_NUMS[rendered_sections_count]
        render_multiple_choice_questions(
            doc, pg_list, start_num=running_number,
            title=f"{roman}. PILIHAN GANDA",
            subtitle="Petunjuk: Pilihlah salah satu jawaban yang paling tepat dengan menyilang (X) huruf A, B, C, atau D!",
            has_top_divider=False
        )
        running_number += len(pg_list)
        rendered_sections_count += 1

    # 2. Isian Singkat
    if isian_list:
        has_prev = rendered_sections_count > 0
        roman = ROMAN_NUMS[rendered_sections_count]
        render_short_answer_questions(
            doc, isian_list, start_num=running_number,
            title=f"{roman}. ISIAN SINGKAT",
            subtitle="Petunjuk: Isilah titik-titik di bawah ini dengan jawaban yang singkat, tepat, dan benar!",
            has_top_divider=has_prev
        )
        running_number += len(isian_list)
        rendered_sections_count += 1

    # 3. Benar / Salah (Format Tabel Matriks Checklist AKM)
    if bs_list:
        has_prev = rendered_sections_count > 0
        roman = ROMAN_NUMS[rendered_sections_count]
        render_true_false_matrix(
            doc, bs_list, start_num=running_number,
            title=f"{roman}. BENAR / SALAH",
            subtitle="Petunjuk: Berilah tanda centang (✓) atau silang (X) pada kolom Benar atau Salah sesuai dengan pernyataan!",
            has_top_divider=has_prev
        )
        running_number += len(bs_list)
        rendered_sections_count += 1

    # 4. Essay / Uraian
    if essay_list:
        has_prev = rendered_sections_count > 0
        roman = ROMAN_NUMS[rendered_sections_count]
        render_essay_questions(
            doc, essay_list, start_num=running_number,
            title=f"{roman}. ESSAY / URAIAN",
            subtitle="Petunjuk: Jawablah pertanyaan-pertanyaan berikut secara komprehensif, runtut, dan jelas!",
            has_top_divider=has_prev
        )
        running_number += len(essay_list)
        rendered_sections_count += 1

    # Gabungkan seluruh soal berurutan: PG -> Isian -> Benar/Salah -> Essay
    ordered_all_questions = pg_list + isian_list + bs_list + essay_list

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


def add_koreksi_kop(doc: Document, nama_sekolah: str = ""):
    """Kop Surat Resmi Kedinasan untuk Laporan Hasil Koreksi Ujian."""
    sekolah_clean = (nama_sekolah or "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL").strip().upper()
    if sekolah_clean in ("EDUCRAFT AI", "LEMBAGA PENDIDIKAN", "SAI TECH", "PT SOLUSI AGEN INDONESIA"):
        sekolah_clean = "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL"

    p_kop = doc.add_paragraph()
    p_kop.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_kop.paragraph_format.space_before = Pt(0)
    p_kop.paragraph_format.space_after = Pt(6)
    p_kop.paragraph_format.line_spacing = 1.15

    r1 = p_kop.add_run("DINAS PENDIDIKAN DAN KEBUDAYAAN\n")
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(11)
    r1.font.bold = True

    r2 = p_kop.add_run(f"{sekolah_clean}\n")
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(13)
    r2.font.bold = True

    current_year = datetime.datetime.now().year
    r3 = p_kop.add_run(f"LAPORAN REKAPITULASI HASIL KOREKSI UJIAN • TAHUN AJARAN {current_year}/{current_year + 1}\n")
    r3.font.name = "Times New Roman"
    r3.font.size = Pt(10)
    r3.font.bold = True

    r4 = p_kop.add_run("Saitech AI Solutions • Website: saitech.co.id")
    r4.font.name = "Times New Roman"
    r4.font.size = Pt(9)
    r4.font.italic = True
    r4.font.color.rgb = RGBColor(90, 90, 90)

    pBdr = parse_xml(
        r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:bottom w:val="double" w:sz="12" w:space="8" w:color="000000"/>'
        r'</w:pBdr>'
    )
    p_kop._p.get_or_add_pPr().append(pBdr)


def is_redundant_catatan(catatan: str, kunci: str = "", jawaban_siswa: str = "") -> bool:
    """Mendeteksi apakah catatan guru/AI hanya pengulangan mekanis dari status/kunci jawaban."""
    if not catatan:
        return True
    c_lower = catatan.lower().strip()
    redundant_patterns = [
        r"^jawaban (benar|tepat|sesuai).*$",
        r"^jawaban (salah|keliru)\.?\s*(kunci (jawaban )?(adalah )?.*|pernyataan tersebut adalah.*)?$",
        r"^tepat\.?$",
        r"^benar\.?$",
        r"^salah\.?$",
        r"^sesuai kunci.*$",
    ]
    for pat in redundant_patterns:
        if re.match(pat, c_lower):
            return True
    return False


def parse_analitik_into_matrix_rows(text: str) -> List[Tuple[str, List[str]]]:
    """Menguraikan teks analitik kelas AI menjadi baris matriks terstruktur berstandar kedinasan."""
    if not text:
        return []
    lines = text.strip().splitlines()
    categories = []
    current_cat = None
    current_items = []

    for l in lines:
        l_str = l.strip()
        if not l_str:
            continue
        if re.match(r"^berikut (adalah|analisis|ini).*", l_str, re.I):
            continue

        # Header bernomor: *1. ...**, **1. ...**, 1. ...
        m_head = re.match(r"^[\*#\s]*(\d+)[\.\)]\s*([^\*#\n\r]+)[\*#\s]*$", l_str)
        if m_head:
            if current_cat and current_items:
                categories.append((current_cat, current_items))
                current_items = []
            raw_title = m_head.group(2).strip()
            raw_title = re.sub(r"^[\*#\s]+|[\*#\s]+$", "", raw_title).strip()
            current_cat = raw_title
            continue

        # Sub-header tanpa nomor (e.g. **Materi Terlemah:**)
        m_sub = re.match(r"^\*+([^\*\n\r:]+)[:\*]+$", l_str)
        if m_sub and len(l_str) < 50:
            if current_cat and current_items:
                categories.append((current_cat, current_items))
                current_items = []
            current_cat = m_sub.group(1).strip()
            continue

        # Baris item reguler
        clean_item = re.sub(r"^[-*•]\s*", "", l_str).strip()
        clean_item = re.sub(r"^\*+|\*+$", "", clean_item).strip()
        if clean_item:
            current_items.append(clean_item)

    if current_cat and current_items:
        categories.append((current_cat, current_items))
    elif current_items:
        categories.append(("Catatan Evaluasi Pembelajaran", current_items))

    # Normalisasi judul kategori ke istilah formal kedinasan
    normalized_rows = []
    for cat_name, items in categories:
        c_lower = cat_name.lower()
        if any(w in c_lower for w in ["rata-rata", "kelulusan", "ketuntasan", "capaian"]):
            norm_title = "Capaian & Ketuntasan Kelas"
        elif any(w in c_lower for w in ["materi", "kompetensi", "terlemah", "rawan", "kesalahan"]):
            norm_title = "Kompetensi Rawan Salah / Terlemah"
        elif any(w in c_lower for w in ["saran", "tindak lanjut", "pengajaran", "rekomendasi", "pedagogis"]):
            norm_title = "Rencana Tindak Lanjut Pedagogis"
        else:
            norm_title = cat_name.title()
        normalized_rows.append((norm_title, items))

    return normalized_rows


def extract_options_from_soal_text(soal_text: str, nomor: int) -> List[Dict[str, str]]:
    """Mengekstrak opsi pilihan ganda A, B, C, D dari teks naskah soal jika tidak ada dalam payload."""
    if not soal_text:
        return []
    # 1. Cari blok nomor
    pattern = rf"(?:^|\n)\s*{nomor}[\.\)]\s*([\s\S]*?)(?=(?:\n\s*\d+[\.\)]|$))"
    m = re.search(pattern, soal_text, re.IGNORECASE)
    block = m.group(1) if m else soal_text

    options = []
    lines = block.split("\n")
    for line in lines:
        line_clean = line.strip()
        opt_m = re.match(r"^([A-D])[\.\)]\s*(.*)", line_clean, re.IGNORECASE)
        if opt_m:
            lbl = opt_m.group(1).upper()
            teks = opt_m.group(2).strip()
            teks = re.sub(r"^(jawaban|kunci)\s*[:=].*$", "", teks, flags=re.I).strip()
            if teks and not any(o["label"] == lbl for o in options):
                options.append({"label": lbl, "teks": teks})

    if len(options) < 2:
        matches = re.findall(r"(?:^|[\s\n])([A-D])[\.\)]\s*([^\n\rA-D\.\)]+)", block)
        for lbl, txt in matches:
            lbl = lbl.upper()
            txt = txt.strip()
            if txt and not any(o["label"] == lbl for o in options):
                options.append({"label": lbl, "teks": txt})

    if len(options) >= 2:
        options.sort(key=lambda x: x["label"])
        return options
    return []


def generate_koreksi_report_docx(
    header_data: Dict[str, Any],
    koreksi_data: Dict[str, Any],
    soal_text: str = ""
) -> io.BytesIO:
    """
    Membangun dokumen Word (.docx) resmi Laporan Hasil Koreksi Ujian Siswa
    dengan Tipografi & Sistem Spacing Standar Kedinasan yang Rapi, Konsisten, dan Elegan.
    """
    doc = Document()
    sec = doc.sections[0]
    sec.page_width = Inches(8.27)
    sec.page_height = Inches(11.69)
    sec.top_margin = Inches(0.65)
    sec.bottom_margin = Inches(0.65)
    sec.left_margin = Inches(0.65)
    sec.right_margin = Inches(0.65)

    # 1. Kop Kedinasan Resmi
    add_koreksi_kop(doc, header_data.get("nama_sekolah", ""))

    # Hitung metrik kelas
    hasil_list = koreksi_data.get("hasil", [])
    total_siswa = len(hasil_list)
    kkm = header_data.get("kkm", 75)
    skala = str(header_data.get("skala", "100")).upper()
    tanggal = header_data.get("tanggal") or datetime.datetime.now().strftime("%d %B %Y")
    mapel = clean_subject_name(header_data.get("mata_pelajaran", "Hasil Evaluasi Pembelajaran"))
    kelas = header_data.get("kelas", "Semua Kelas")
    current_year = datetime.datetime.now().year

    valid_scores = []
    for s in hasil_list:
        v = s.get("nilai_akhir")
        try:
            valid_scores.append(float(v))
        except (ValueError, TypeError):
            pass

    avg_str = f"{sum(valid_scores)/len(valid_scores):.1f}" if valid_scores else "-"
    tuntas_count = sum(1 for s in hasil_list if str(s.get("status_kelulusan", "")).lower() == "tuntas")
    pct_tuntas = f"{(tuntas_count / total_siswa * 100):.0f}%" if total_siswa > 0 else "-"

    # 2. Tabel Metadata Ujian Kelas (3 baris x 4 kolom simetris - Ruled Header Table)
    t_meta = doc.add_table(rows=3, cols=4)
    t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_meta.autofit = False
    tblPr = t_meta._tbl.tblPr
    bdr = parse_xml(
        r'''<w:tblBorders xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
            <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
            <w:left w:val="none"/><w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>'''
    )
    tblPr.append(bdr)

    col_meta_dxa = [2016, 3168, 2016, 2837]
    set_table_width_and_grid(t_meta, col_meta_dxa)

    meta_rows = [
        ("Mata Pelajaran", f":  {mapel}", "Tanggal Koreksi", f":  {tanggal}"),
        ("Kelas / Fase", f":  {kelas}", "Standar KKM", f":  {kkm}"),
        ("Rata-rata Kelas", f":  {avg_str}", "Ketuntasan KKM", f":  {pct_tuntas} ({tuntas_count}/{total_siswa} Siswa)"),
    ]

    col_meta_w = [Inches(1.4), Inches(2.2), Inches(1.4), Inches(1.97)]
    for r_idx, (k1, v1, k2, v2) in enumerate(meta_rows):
        row = t_meta.rows[r_idx]
        row._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
        for c_idx, width in enumerate(col_meta_w):
            cell = row.cells[c_idx]
            cell.width = width
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

        # K1
        p0 = row.cells[0].paragraphs[0]
        p0.paragraph_format.line_spacing = 1.15
        p0.paragraph_format.space_after = Pt(0)
        r = p0.add_run(k1)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.bold = True

        # V1
        p1 = row.cells[1].paragraphs[0]
        p1.paragraph_format.line_spacing = 1.15
        p1.paragraph_format.space_after = Pt(0)
        r = p1.add_run(v1)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        if r_idx == 2:
            r.font.bold = True

        # K2
        p2 = row.cells[2].paragraphs[0]
        p2.paragraph_format.line_spacing = 1.15
        p2.paragraph_format.space_after = Pt(0)
        r = p2.add_run(k2)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.bold = True

        # V2
        p3 = row.cells[3].paragraphs[0]
        p3.paragraph_format.line_spacing = 1.15
        p3.paragraph_format.space_after = Pt(0)
        r = p3.add_run(v2)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        if r_idx == 2:
            r.font.bold = True

    # 3. Bagian I: BUKU NILAI & REKAPITULASI KELAS
    p_sec1 = doc.add_paragraph()
    p_sec1.paragraph_format.space_before = Pt(12)
    p_sec1.paragraph_format.space_after = Pt(4)
    p_sec1.paragraph_format.keep_with_next = True
    r_s1 = p_sec1.add_run("I. BUKU NILAI & REKAPITULASI KELAS")
    r_s1.font.name = "Times New Roman"
    r_s1.font.size = Pt(10.5)
    r_s1.font.bold = True

    # Tabel Rekap Siswa
    t_siswa = doc.add_table(rows=len(hasil_list) + 1, cols=5)
    t_siswa.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_siswa.autofit = False
    set_table_borders_thin(t_siswa, color="CBD5E1", sz="4")

    col_siswa_dxa = [576, 3168, 1368, 1656, 3269]
    set_table_width_and_grid(t_siswa, col_siswa_dxa)

    headers_siswa = ["No", "Nama Siswa", "Nilai Akhir", "Status KKM", "Catatan & Rekomendasi Guru"]
    widths_siswa = [Inches(0.4), Inches(2.2), Inches(0.95), Inches(1.15), Inches(2.27)]

    # Header Row
    hdr_row = t_siswa.rows[0]
    hdr_row._tr.get_or_add_trPr().append(parse_xml(r'''<w:tblHeader xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
    hdr_row._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
    for c_i, h_text in enumerate(headers_siswa):
        cell = hdr_row.cells[c_i]
        cell.width = widths_siswa[c_i]
        set_cell_background(cell, "F1F5F9")
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_i in (0, 2, 3) else WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(h_text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.bold = True

    # Data Rows
    for s_i, s in enumerate(hasil_list, 1):
        row = t_siswa.rows[s_i]
        row._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
        bg_col = "FFFFFF" if s_i % 2 == 1 else "F8FAFC"

        is_tuntas = str(s.get("status_kelulusan", "")).lower() == "tuntas"
        status_txt = "TUNTAS" if is_tuntas else "REMEDIAL"
        catatan_singkat = s.get("rekomendasi") or s.get("catatan") or "-"

        vals = [
            str(s_i),
            s.get("nama_siswa", f"Siswa {s_i}"),
            str(s.get("nilai_akhir", "-")),
            status_txt,
            catatan_singkat
        ]

        for c_i, val in enumerate(vals):
            cell = row.cells[c_i]
            cell.width = widths_siswa[c_i]
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_i in (0, 2, 3) else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15

            r = p.add_run(val)
            r.font.name = "Times New Roman"
            r.font.size = Pt(9.5)

            if c_i == 2:
                r.font.bold = True
            elif c_i == 3:
                r.font.bold = True
                r.font.color.rgb = RGBColor(22, 101, 52) if is_tuntas else RGBColor(185, 28, 28)

    # 4. Bagian II: EVALUASI PEMBELAJARAN & TINDAK LANJUT KELAS (Tabel Matriks Berkolom Resmi)
    analitik = koreksi_data.get("analitik_kelas", "")
    if analitik:
        p_sec2 = doc.add_paragraph()
        p_sec2.paragraph_format.space_before = Pt(12)
        p_sec2.paragraph_format.space_after = Pt(4)
        p_sec2.paragraph_format.keep_with_next = True
        r_s2 = p_sec2.add_run("II. EVALUASI PEMBELAJARAN & TINDAK LANJUT KELAS")
        r_s2.font.name = "Times New Roman"
        r_s2.font.size = Pt(10.5)
        r_s2.font.bold = True

        categories = parse_analitik_into_matrix_rows(analitik)

        col_an_dxa = [2300, 7737]
        col_an_w = [Inches(1.6), Inches(5.37)]

        t_sec2 = doc.add_table(rows=1, cols=2)
        t_sec2.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_sec2.autofit = False
        set_table_borders_thin(t_sec2, color="CBD5E1", sz="4")
        set_table_width_and_grid(t_sec2, col_an_dxa)

        hdr_an = t_sec2.rows[0]
        hdr_an._tr.get_or_add_trPr().append(parse_xml(r'''<w:tblHeader xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
        hdr_an._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))

        for c_i, h in enumerate(["Aspek Analisis Evaluasi", "Uraian Diagnostik & Rencana Tindak Lanjut Guru"]):
            c = hdr_an.cells[c_i]
            c.width = col_an_w[c_i]
            set_cell_background(c, "F1F5F9")
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_i == 0 else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(h)
            r.font.name = "Times New Roman"
            r.font.size = Pt(9.5)
            r.font.bold = True

        for cat_name, items in categories:
            row_an = t_sec2.add_row()
            row_an._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))

            c_lbl = row_an.cells[0]
            c_lbl.width = col_an_w[0]
            set_cell_background(c_lbl, "F8FAFC")
            set_cell_margins(c_lbl, top=70, bottom=70, left=100, right=100)
            c_lbl.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p_l = c_lbl.paragraphs[0]
            p_l.paragraph_format.space_after = Pt(0)
            p_l.paragraph_format.line_spacing = 1.15
            p_l.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r_l = p_l.add_run(cat_name)
            r_l.font.name = "Times New Roman"
            r_l.font.size = Pt(9.5)
            r_l.font.bold = True

            c_val = row_an.cells[1]
            c_val.width = col_an_w[1]
            set_cell_margins(c_val, top=70, bottom=70, left=100, right=100)
            c_val.vertical_alignment = WD_ALIGN_VERTICAL.TOP

            for it_idx, item_str in enumerate(items):
                p_v = c_val.paragraphs[0] if it_idx == 0 else c_val.add_paragraph()
                p_v.paragraph_format.space_after = Pt(2 if it_idx < len(items) - 1 else 0)
                p_v.paragraph_format.line_spacing = 1.15

                if item_str.endswith(":") and len(item_str) < 40:
                    p_v.paragraph_format.space_before = Pt(3)
                    r_sh = p_v.add_run(item_str)
                    r_sh.font.name = "Times New Roman"
                    r_sh.font.size = Pt(9.5)
                    r_sh.font.bold = True
                    continue

                colon_match = re.match(r"^([^:]{2,35}):\s*(.*)$", item_str)
                if colon_match:
                    key_part = colon_match.group(1).strip()
                    val_part = colon_match.group(2).strip()

                    r_bullet = p_v.add_run("•  ")
                    r_bullet.font.name = "Times New Roman"
                    r_bullet.font.size = Pt(9.5)
                    r_bullet.font.bold = True

                    r_key = p_v.add_run(f"{key_part}: ")
                    r_key.font.name = "Times New Roman"
                    r_key.font.size = Pt(9.5)
                    r_key.font.bold = True

                    r_val = p_v.add_run(val_part)
                    r_val.font.name = "Times New Roman"
                    r_val.font.size = Pt(9.5)
                else:
                    r_bullet = p_v.add_run("•  ")
                    r_bullet.font.name = "Times New Roman"
                    r_bullet.font.size = Pt(9.5)
                    r_bullet.font.bold = True

                    r_val = p_v.add_run(item_str)
                    r_val.font.name = "Times New Roman"
                    r_val.font.size = Pt(9.5)

    # 5. Lembar Pengesahan Kelas (Tanda Tangan Guru & Kepala Sekolah di akhir Rekap Kelas)
    t_sig = doc.add_table(rows=1, cols=2)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig.autofit = False
    set_table_borders_none(t_sig)
    row_sig = t_sig.rows[0]
    row_sig._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))

    col_sig_dxa = [5018, 5019]
    set_table_width_and_grid(t_sig, col_sig_dxa)

    cell_kiri = row_sig.cells[0]
    cell_kanan = row_sig.cells[1]
    cell_kiri.width = Inches(3.48)
    cell_kanan.width = Inches(3.48)
    set_cell_margins(cell_kiri, top=140, bottom=70, left=100, right=100)
    set_cell_margins(cell_kanan, top=140, bottom=70, left=100, right=100)

    p_kiri = cell_kiri.paragraphs[0]
    p_kiri.paragraph_format.line_spacing = 1.15
    p_kiri.paragraph_format.space_after = Pt(0)
    p_kiri.add_run(
        "Mengetahui,\n"
        "Kepala Sekolah\n\n\n\n"
        "( ................................................................ )\n"
        "NIP. ..........................................................."
    )
    for r in p_kiri.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)

    p_kanan = cell_kanan.paragraphs[0]
    p_kanan.paragraph_format.line_spacing = 1.15
    p_kanan.paragraph_format.space_after = Pt(0)
    p_kanan.add_run(
        f"{tanggal}\n"
        "Guru Mata Pelajaran\n\n\n\n"
        "( ................................................................ )\n"
        "NIP. ..........................................................."
    )
    for r in p_kanan.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)

    # ─────────────────────────────────────────────────────────────────
    # 6. PER SISWA: LEMBAR EVALUASI INDIVIDUAL (SETIAP SISWA HALAMAN SENDIRI)
    # ─────────────────────────────────────────────────────────────────
    for s_idx, s in enumerate(hasil_list, 1):
        # Setiap siswa baru dimulai di HALAMAN BARU!
        doc.add_page_break()

        # 1. Judul Lembar Evaluasi (Center, Formal & Berwibawa)
        p_tit = doc.add_paragraph()
        p_tit.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_tit.paragraph_format.space_before = Pt(0)
        p_tit.paragraph_format.space_after = Pt(4)
        p_tit.paragraph_format.keep_with_next = True

        r_t1 = p_tit.add_run("LEMBAR HASIL EVALUASI ASESMEN SISWA\n")
        r_t1.font.name = "Times New Roman"
        r_t1.font.size = Pt(11)
        r_t1.font.bold = True

        r_t2 = p_tit.add_run(f"TAHUN AJARAN {current_year}/{current_year + 1}")
        r_t2.font.name = "Times New Roman"
        r_t2.font.size = Pt(9)
        r_t2.font.bold = True
        r_t2.font.color.rgb = RGBColor(100, 100, 100)

        # 2. Tabel Metadata Identitas Siswa (4 Kolom Simetris persis Buat Soal)
        t_stu_meta = doc.add_table(rows=3, cols=4)
        t_stu_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_stu_meta.autofit = False
        tblPr_sm = t_stu_meta._tbl.tblPr
        bdr_sm = parse_xml(
            r'''<w:tblBorders xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
                <w:left w:val="none"/><w:right w:val="none"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>'''
        )
        tblPr_sm.append(bdr_sm)

        col_stu_meta_dxa = [1872, 3312, 1944, 2909]
        set_table_width_and_grid(t_stu_meta, col_stu_meta_dxa)

        is_tuntas = str(s.get("status_kelulusan", "")).lower() == "tuntas"
        status_label = "TUNTAS KKM" if is_tuntas else "REMEDIAL (Belum Tuntas)"

        nilai_raw = str(s.get("nilai_akhir", "-")).strip()
        if str(skala).lower() in ("huruf", "predikat"):
            nilai_display = f"{nilai_raw} (Predikat Huruf)"
        else:
            nilai_display = f"{nilai_raw} / {skala}"

        stu_meta_rows = [
            [("Nama Siswa", f":  {s.get('nama_siswa', 'Siswa')}"), ("Mata Pelajaran", f":  {mapel}")],
            [("No. Urut / ID", f":  Siswa #{s_idx:02d}"), ("Kelas / Fase", f":  {kelas}")],
            [("Status KKM", f":  {status_label}"), ("Nilai Akhir", f":  {nilai_display}")],
        ]

        col_stu_meta_w = [Inches(1.3), Inches(2.3), Inches(1.35), Inches(2.02)]
        for r_i, row_pairs in enumerate(stu_meta_rows):
            row = t_stu_meta.rows[r_i]
            row._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
            for c_i, w in enumerate(col_stu_meta_w):
                c = row.cells[c_i]
                c.width = w
                set_cell_margins(c, top=70, bottom=70, left=100, right=100)
                c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

            # Left pair
            p0 = row.cells[0].paragraphs[0]
            p0.paragraph_format.space_after = Pt(0)
            p0.paragraph_format.line_spacing = 1.15
            r0 = p0.add_run(row_pairs[0][0])
            r0.font.name = "Times New Roman"
            r0.font.size = Pt(9.5)
            r0.font.bold = True

            p1 = row.cells[1].paragraphs[0]
            p1.paragraph_format.space_after = Pt(0)
            p1.paragraph_format.line_spacing = 1.15
            r1 = p1.add_run(row_pairs[0][1])
            r1.font.name = "Times New Roman"
            r1.font.size = Pt(9.5)
            if r_i == 0:
                r1.font.bold = True
            elif r_i == 2:
                r1.font.bold = True
                r1.font.color.rgb = RGBColor(22, 101, 52) if is_tuntas else RGBColor(185, 28, 28)

            # Right pair
            p2 = row.cells[2].paragraphs[0]
            p2.paragraph_format.space_after = Pt(0)
            p2.paragraph_format.line_spacing = 1.15
            r2 = p2.add_run(row_pairs[1][0])
            r2.font.name = "Times New Roman"
            r2.font.size = Pt(9.5)
            r2.font.bold = True

            p3 = row.cells[3].paragraphs[0]
            p3.paragraph_format.space_after = Pt(0)
            p3.paragraph_format.line_spacing = 1.15
            r3 = p3.add_run(row_pairs[1][1])
            r3.font.name = "Times New Roman"
            r3.font.size = Pt(9.5)
            if r_i == 2:
                r3.font.bold = True
                r3.font.color.rgb = RGBColor(22, 101, 52) if is_tuntas else RGBColor(185, 28, 28)

        # 3. Sub-header & Tabel Evaluasi Butir Asesmen (Matriks Berkolom Resmi)
        p_tbl_title = doc.add_paragraph()
        p_tbl_title.paragraph_format.space_before = Pt(12)
        p_tbl_title.paragraph_format.space_after = Pt(4)
        p_tbl_title.paragraph_format.keep_with_next = True
        r_tt = p_tbl_title.add_run("TABEL EVALUASI & ANALISIS BUTIR ASESMEN:")
        r_tt.font.name = "Times New Roman"
        r_tt.font.size = Pt(10.5)
        r_tt.font.bold = True

        col_eval_dxa = [504, 3341, 1800, 1800, 1152, 1440]
        col_eval_w = [Inches(0.35), Inches(2.32), Inches(1.25), Inches(1.25), Inches(0.80), Inches(1.00)]
        eval_headers = ["No", "Butir Pertanyaan", "Jawaban Siswa", "Kunci Acuan", "Skor / Status", "Catatan Evaluasi"]

        t_eval = doc.add_table(rows=1, cols=6)
        t_eval.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_eval.autofit = False
        set_table_borders_thin(t_eval, color="CBD5E1", sz="4")
        set_table_width_and_grid(t_eval, col_eval_dxa)

        hdr = t_eval.rows[0]
        hdr._tr.get_or_add_trPr().append(parse_xml(r'''<w:tblHeader xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
        hdr._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))

        for c_i, h in enumerate(eval_headers):
            c = hdr.cells[c_i]
            c.width = col_eval_w[c_i]
            set_cell_background(c, "F1F5F9")
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
            c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_i in (0, 4) else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(h)
            r.font.name = "Times New Roman"
            r.font.size = Pt(9.5)
            r.font.bold = True

        detail_items = s.get("detail_koreksi", [])
        total_skor_diperoleh = 0.0

        for item in detail_items:
            nomor = item.get("nomor", 1)
            pertanyaan = clean_latex_math(item.get("pertanyaan", ""))
            status = str(item.get("status", "benar")).lower()
            try:
                nilai = float(item.get("nilai", 0))
            except (ValueError, TypeError):
                nilai = 0.0
            kunci = str(item.get("kunci_jawaban", "")).strip()
            jawaban_siswa = str(item.get("jawaban_siswa", "")).strip()
            catatan = item.get("catatan", "")

            total_skor_diperoleh += nilai

            # Format status badge
            if status == "benar":
                status_badge = f"{nilai:g}\n[✓ Benar]"
            elif status == "setengah":
                status_badge = f"{nilai:g}\n[Sebagian]"
            else:
                status_badge = f"{nilai:g}\n[✗ Salah]"

            # Filter catatan robotik
            if not catatan or is_redundant_catatan(catatan, kunci, jawaban_siswa):
                catatan_clean = "-"
            else:
                catatan_clean = catatan

            r_row = t_eval.add_row()
            r_row._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))

            row_vals = [
                str(nomor),
                pertanyaan,
                jawaban_siswa or "(Kosong)",
                kunci,
                status_badge,
                catatan_clean
            ]

            for c_i, val in enumerate(row_vals):
                c = r_row.cells[c_i]
                c.width = col_eval_w[c_i]
                set_cell_margins(c, top=70, bottom=70, left=100, right=100)
                c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER if c_i in (0, 4) else WD_ALIGN_VERTICAL.TOP
                p = c.paragraphs[0]
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.15
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_i in (0, 4) else WD_ALIGN_PARAGRAPH.LEFT
                run = p.add_run(val)
                run.font.name = "Times New Roman"
                run.font.size = Pt(9.5)

                if c_i == 0:
                    run.font.bold = True
                elif c_i == 4:
                    run.font.bold = True
                    if status == "benar":
                        run.font.color.rgb = RGBColor(22, 101, 52)
                    elif status == "setengah":
                        run.font.color.rgb = RGBColor(180, 83, 9)
                    else:
                        run.font.color.rgb = RGBColor(185, 28, 28)
                elif c_i == 2 and status == "salah":
                    run.font.color.rgb = RGBColor(185, 28, 28)

        # Baris Ringkasan Total Skor & Ketuntasan
        if detail_items:
            r_sum = t_eval.add_row()
            r_sum._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
            c_sum_lbl = r_sum.cells[0]
            c_sum_lbl.merge(r_sum.cells[1])
            c_sum_lbl.merge(r_sum.cells[2])
            c_sum_lbl.merge(r_sum.cells[3])
            set_cell_background(c_sum_lbl, "F8FAFC")
            set_cell_margins(c_sum_lbl, top=70, bottom=70, left=100, right=100)
            p_sl = c_sum_lbl.paragraphs[0]
            p_sl.paragraph_format.space_after = Pt(0)
            p_sl.paragraph_format.line_spacing = 1.15
            p_sl.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r_sl = p_sl.add_run("TOTAL PEROLEHAN SKOR / STATUS KELULUSAN")
            r_sl.font.name = "Times New Roman"
            r_sl.font.size = Pt(9.5)
            r_sl.font.bold = True

            c_sum_val = r_sum.cells[4]
            set_cell_background(c_sum_val, "F8FAFC")
            set_cell_margins(c_sum_val, top=70, bottom=70, left=100, right=100)
            p_sv = c_sum_val.paragraphs[0]
            p_sv.paragraph_format.space_after = Pt(0)
            p_sv.paragraph_format.line_spacing = 1.15
            p_sv.alignment = WD_ALIGN_PARAGRAPH.CENTER
            score_display_total = f"{total_skor_diperoleh:g} / {len(detail_items):g}"
            r_sv = p_sv.add_run(score_display_total)
            r_sv.font.name = "Times New Roman"
            r_sv.font.size = Pt(9.5)
            r_sv.font.bold = True

            c_sum_st = r_sum.cells[5]
            set_cell_background(c_sum_st, "F8FAFC")
            set_cell_margins(c_sum_st, top=70, bottom=70, left=100, right=100)
            p_st = c_sum_st.paragraphs[0]
            p_st.paragraph_format.space_after = Pt(0)
            p_st.paragraph_format.line_spacing = 1.15
            p_st.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r_st = p_st.add_run("TUNTAS KKM" if is_tuntas else "REMEDIAL")
            r_st.font.name = "Times New Roman"
            r_st.font.size = Pt(9.5)
            r_st.font.bold = True
            r_st.font.color.rgb = RGBColor(22, 101, 52) if is_tuntas else RGBColor(185, 28, 28)

        # 4. Baris Terintegrasi Catatan & Rekomendasi Guru (Satu Kesatuan Tabel, Pasti Rata Sempurna!)
        catatan_guru = s.get("rekomendasi") or s.get("catatan")
        if catatan_guru and not is_redundant_catatan(catatan_guru):
            r_note = t_eval.add_row()
            r_note._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))
            c_note = r_note.cells[0]
            for c_idx in range(1, 6):
                c_note.merge(r_note.cells[c_idx])
            set_cell_background(c_note, "F8FAFC")
            set_cell_margins(c_note, top=80, bottom=80, left=100, right=100)
            c_note.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

            p_n = c_note.paragraphs[0]
            p_n.paragraph_format.space_after = Pt(0)
            p_n.paragraph_format.line_spacing = 1.15
            r_nh = p_n.add_run("Catatan & Rekomendasi Guru: ")
            r_nh.font.name = "Times New Roman"
            r_nh.font.size = Pt(9.5)
            r_nh.font.bold = True

            r_nt = p_n.add_run(catatan_guru)
            r_nt.font.name = "Times New Roman"
            r_nt.font.size = Pt(9.5)
            r_nt.font.italic = True
            r_nt.font.color.rgb = RGBColor(55, 65, 81)

        # 5. Lembar Tanda Tangan Orang Tua & Guru di Akhir Lembar Siswa
        t_stu_sig = doc.add_table(rows=1, cols=2)
        t_stu_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_stu_sig.autofit = False
        set_table_borders_none(t_stu_sig)
        row_stu_sig = t_stu_sig.rows[0]
        row_stu_sig._tr.get_or_add_trPr().append(parse_xml(r'''<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'''))

        col_stu_sig_dxa = [5018, 5019]
        set_table_width_and_grid(t_stu_sig, col_stu_sig_dxa)

        c_ot = row_stu_sig.cells[0]
        c_gr = row_stu_sig.cells[1]
        c_ot.width = Inches(3.48)
        c_gr.width = Inches(3.48)
        set_cell_margins(c_ot, top=140, bottom=70, left=100, right=100)
        set_cell_margins(c_gr, top=140, bottom=70, left=100, right=100)

        p_ot = c_ot.paragraphs[0]
        p_ot.paragraph_format.line_spacing = 1.15
        p_ot.paragraph_format.space_after = Pt(0)
        p_ot.add_run(
            "Mengetahui,\n"
            "Orang Tua / Wali Siswa\n\n\n\n"
            "( ................................................................ )"
        )
        for r in p_ot.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(9.5)

        p_gr = c_gr.paragraphs[0]
        p_gr.paragraph_format.line_spacing = 1.15
        p_gr.paragraph_format.space_after = Pt(0)
        p_gr.add_run(
            f"{tanggal}\n"
            "Guru Pemeriksa\n\n\n\n"
            "( ................................................................ )"
        )
        for r in p_gr.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(9.5)

    output_stream = io.BytesIO()
    doc.save(output_stream)
    output_stream.seek(0)
    return output_stream

