"""
Service builder untuk menghasilkan dokumen Microsoft Word (.docx) naskah soal ujian resmi.
Dibuat dengan teknik Programmatic Direct-Styling berbasis python-docx tanpa template kaku.
Mengutamakan kerapian tipografi standar kedinasan Indonesia, hanging indent, dan layout hemat kertas.
"""

import io
import re
import datetime
from typing import List, Dict, Any, Optional

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn


def clean_latex_math(text: str) -> str:
    """Membersihkan atau menormalisasi notasi LaTeX dasar agar terbaca natural di Word."""
    if not text:
        return ""
    
    t = str(text)
    # Ganti simbol matematika umum
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
    # Bersihkan sisa backslash berlebih
    t = t.replace(r"\_", "_").replace(r"\%", "%").replace(r"\&", "&")
    return t.strip()


def set_cell_background(cell, hex_color: str):
    """Memberi warna latar (shading) pada sel tabel."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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
    """Membuat Kop Surat Resmi Sekolah bergaris ganda (Double-Line) khas dinas pendidikan."""
    sekolah_clean = (nama_sekolah or "LEMBAGA PENDIDIKAN").strip().upper()
    if sekolah_clean == "EDUCRAFT AI":
        sekolah_clean = "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL"

    # Paragraf Kop Terpusat
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
    r2.font.size = Pt(14)
    r2.font.bold = True

    current_year = datetime.datetime.now().year
    r3 = p_kop.add_run(f"PENILAIAN AKHIR SEMESTER • TAHUN AJARAN {current_year}/{current_year + 1}\n")
    r3.font.name = "Times New Roman"
    r3.font.size = Pt(10)
    r3.font.bold = True

    r4 = p_kop.add_run("Jl. Pendidikan Karakter Bangsa No. 01 • Telp: (021) 789012 • Email: info@sekolah.sch.id")
    r4.font.name = "Times New Roman"
    r4.font.size = Pt(8.5)
    r4.font.italic = True
    r4.font.color.rgb = RGBColor(100, 100, 100)

    # Garis ganda resmi (Word XML Paragraph Border Double)
    pBdr = parse_xml(
        r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:bottom w:val="double" w:sz="12" w:space="4" w:color="000000"/>'
        r'</w:pBdr>'
    )
    p_kop._p.get_or_add_pPr().append(pBdr)


def add_exam_metadata_table(doc: Document, header_data: Dict[str, Any]):
    """Membuat tabel identitas ujian 2 kolom berdampingan dengan kotak nilai siswa."""
    t_meta = doc.add_table(rows=1, cols=3)
    t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders_none(t_meta)

    # Kolom 1 (Info Kiri)
    cell_kiri = t_meta.rows[0].cells[0]
    cell_kiri.width = Inches(2.9)
    p_kiri = cell_kiri.paragraphs[0]
    p_kiri.paragraph_format.line_spacing = 1.15
    p_kiri.paragraph_format.space_after = Pt(0)
    
    mapel = header_data.get("mata_pelajaran") or "Mata Pelajaran Umum"
    kelas = header_data.get("kelas") or "Semua Kelas"
    
    r_kiri = p_kiri.add_run(
        f"Mata Pelajaran\t: {mapel}\n"
        f"Kelas / Fase\t: {kelas}\n"
        f"Kurikulum\t: Kurikulum Merdeka"
    )
    r_kiri.font.name = "Times New Roman"
    r_kiri.font.size = Pt(9.5)
    r_kiri.font.bold = False

    # Kolom 2 (Info Kanan)
    cell_kanan = t_meta.rows[0].cells[1]
    cell_kanan.width = Inches(2.5)
    p_kanan = cell_kanan.paragraphs[0]
    p_kanan.paragraph_format.line_spacing = 1.15
    p_kanan.paragraph_format.space_after = Pt(0)

    tanggal = header_data.get("tanggal") or datetime.date.today().strftime("%d/%m/%Y")
    durasi = header_data.get("durasi") or "60 Menit"

    r_kanan = p_kanan.add_run(
        f"Hari / Tanggal\t: {tanggal}\n"
        f"Alokasi Waktu\t: {durasi}\n"
        f"Bentuk Soal\t: PG & Uraian"
    )
    r_kanan.font.name = "Times New Roman"
    r_kanan.font.size = Pt(9.5)

    # Kolom 3 (Kotak Identitas Siswa Mini)
    cell_box = t_meta.rows[0].cells[2]
    cell_box.width = Inches(1.3)
    set_cell_background(cell_box, "F9FAFB")
    set_cell_margins(cell_box, top=60, bottom=60, left=80, right=80)
    
    # Border tipis di kotak nilai
    tcPr = cell_box._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:color="000000"/>'
        f'<w:left w:val="single" w:sz="6" w:color="000000"/>'
        f'<w:bottom w:val="single" w:sz="6" w:color="000000"/>'
        f'<w:right w:val="single" w:sz="6" w:color="000000"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)

    p_box = cell_box.paragraphs[0]
    p_box.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_box = p_box.add_run("NILAI / PARAF\n\n\n")
    r_box.font.name = "Times New Roman"
    r_box.font.size = Pt(8)
    r_box.font.bold = True


def add_callout_instructions(doc: Document):
    """Membuat kotak petunjuk umum berbingkai tipis dan hemat ruang."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.rows[0].cells[0]
    cell.width = Inches(6.7)
    set_cell_background(cell, "F8F9FA")
    set_cell_margins(cell, top=80, bottom=80, left=140, right=140)

    tcPr = cell._tc.get_or_add_tcPr()
    tcBdr = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="4" w:color="D1D5DB"/>'
        f'<w:left w:val="single" w:sz="4" w:color="D1D5DB"/>'
        f'<w:bottom w:val="single" w:sz="4" w:color="D1D5DB"/>'
        f'<w:right w:val="single" w:sz="4" w:color="D1D5DB"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBdr)

    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)

    r_title = p.add_run("PETUNJUK UMUM PENGERJAAN SOAL:\n")
    r_title.font.name = "Times New Roman"
    r_title.font.size = Pt(8.5)
    r_title.font.bold = True

    r_body = p.add_run(
        "1. Berdoalah sebelum mulai mengerjakan soal.  "
        "2. Tuliskan nama dan nomor peserta pada lembar jawaban.  "
        "3. Dahulukan menjawab soal-soal yang Anda anggap mudah.  "
        "4. Periksa kembali seluruh pekerjaan Anda sebelum diserahkan kepada pengawas ujian."
    )
    r_body.font.name = "Times New Roman"
    r_body.font.size = Pt(8.5)
    r_body.font.italic = True


def add_section_header(doc: Document, title: str, subtitle: str):
    """Membuat separator bagian soal (Bagian I / II / III) dengan bar rapi."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15

    r = p.add_run(title.upper())
    r.font.name = "Times New Roman"
    r.font.size = Pt(10.5)
    r.font.bold = True

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(6)
    p_sub.paragraph_format.line_spacing = 1.1
    r_sub = p_sub.add_run(subtitle)
    r_sub.font.name = "Times New Roman"
    r_sub.font.size = Pt(9.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(90, 90, 90)


def render_multiple_choice_questions(doc: Document, pg_list: List[Dict[str, Any]], start_num: int = 1):
    """Merender butir-butir soal Pilihan Ganda dengan hanging indent dan opsi hemat kertas."""
    add_section_header(
        doc,
        "I. PILIHAN GANDA",
        "Petunjuk: Pilihlah salah satu jawaban yang paling tepat dengan menyilang (X) huruf A, B, C, atau D!"
    )

    for i, q in enumerate(pg_list, start=start_num):
        teks_soal = clean_latex_math(q.get("teks", q.get("teks_soal", q.get("text", ""))))
        
        # Paragraf Soal dengan Hanging Indent
        p_q = doc.add_paragraph()
        p_q.paragraph_format.left_indent = Inches(0.28)
        p_q.paragraph_format.first_line_indent = Inches(-0.28)
        p_q.paragraph_format.space_before = Pt(4)
        p_q.paragraph_format.space_after = Pt(2)
        p_q.paragraph_format.line_spacing = 1.15

        r_num = p_q.add_run(f"{i}.\t")
        r_num.font.name = "Times New Roman"
        r_num.font.size = Pt(10.5)
        r_num.font.bold = True

        r_text = p_q.add_run(teks_soal)
        r_text.font.name = "Times New Roman"
        r_text.font.size = Pt(10.5)

        # Opsi Jawaban
        opsi_list = q.get("opsi", q.get("options", []))
        if not opsi_list:
            continue

        # Normalisasi opsi
        normalized_options = []
        for o in opsi_list:
            label = str(o.get("label", o.get("label_opsi", ""))).strip()
            text_o = clean_latex_math(o.get("teks", o.get("teks_opsi", o.get("text", ""))))
            normalized_options.append((label, text_o))

        # Cek apakah opsi sangat pendek (bisa 2 kolom untuk hemat kertas)
        max_opt_len = max([len(t) for _, t in normalized_options]) if normalized_options else 0
        
        if len(normalized_options) == 4 and max_opt_len <= 38:
            # Layout Hemat Kertas: Tabel 2x2 Tanpa Border
            t_opt = doc.add_table(rows=2, cols=2)
            t_opt.alignment = WD_TABLE_ALIGNMENT.CENTER
            set_table_borders_none(t_opt)
            
            # Baris 1: A dan B
            for col_idx, opt_idx in enumerate([0, 1]):
                cell = t_opt.rows[0].cells[col_idx]
                cell.width = Inches(3.2)
                set_cell_margins(cell, top=20, bottom=20, left=40, right=40)
                p = cell.paragraphs[0]
                p.paragraph_format.line_spacing = 1.1
                p.paragraph_format.space_after = Pt(0)
                lbl, txt = normalized_options[opt_idx]
                r_lbl = p.add_run(f"{lbl}. ")
                r_lbl.font.name = "Times New Roman"
                r_lbl.font.size = Pt(10)
                r_lbl.font.bold = True
                r_val = p.add_run(txt)
                r_val.font.name = "Times New Roman"
                r_val.font.size = Pt(10)

            # Baris 2: C dan D
            for col_idx, opt_idx in enumerate([2, 3]):
                cell = t_opt.rows[1].cells[col_idx]
                cell.width = Inches(3.2)
                set_cell_margins(cell, top=20, bottom=20, left=40, right=40)
                p = cell.paragraphs[0]
                p.paragraph_format.line_spacing = 1.1
                p.paragraph_format.space_after = Pt(0)
                lbl, txt = normalized_options[opt_idx]
                r_lbl = p.add_run(f"{lbl}. ")
                r_lbl.font.name = "Times New Roman"
                r_lbl.font.size = Pt(10)
                r_lbl.font.bold = True
                r_val = p.add_run(txt)
                r_val.font.name = "Times New Roman"
                r_val.font.size = Pt(10)
        else:
            # Layout 1 Kolom (Opsi Panjang)
            for lbl, txt in normalized_options:
                p_o = doc.add_paragraph()
                p_o.paragraph_format.left_indent = Inches(0.48)
                p_o.paragraph_format.first_line_indent = Inches(-0.2)
                p_o.paragraph_format.space_before = Pt(1)
                p_o.paragraph_format.space_after = Pt(1)
                p_o.paragraph_format.line_spacing = 1.1

                r_lbl = p_o.add_run(f"{lbl}.\t")
                r_lbl.font.name = "Times New Roman"
                r_lbl.font.size = Pt(10)
                r_lbl.font.bold = True

                r_val = p_o.add_run(txt)
                r_val.font.name = "Times New Roman"
                r_val.font.size = Pt(10)


def render_short_answer_questions(doc: Document, isian_list: List[Dict[str, Any]], start_num: int = 1):
    """Merender butir-butir soal Isian Singkat."""
    add_section_header(
        doc,
        "II. ISIAN SINGKAT",
        "Petunjuk: Isilah titik-titik di bawah ini dengan jawaban yang singkat, tepat, dan benar!"
    )

    for i, q in enumerate(isian_list, start=start_num):
        teks_soal = clean_latex_math(q.get("teks", q.get("teks_soal", q.get("text", ""))))

        p_q = doc.add_paragraph()
        p_q.paragraph_format.left_indent = Inches(0.28)
        p_q.paragraph_format.first_line_indent = Inches(-0.28)
        p_q.paragraph_format.space_before = Pt(4)
        p_q.paragraph_format.space_after = Pt(2)
        p_q.paragraph_format.line_spacing = 1.15

        r_num = p_q.add_run(f"{i}.\t")
        r_num.font.name = "Times New Roman"
        r_num.font.size = Pt(10.5)
        r_num.font.bold = True

        r_text = p_q.add_run(teks_soal)
        r_text.font.name = "Times New Roman"
        r_text.font.size = Pt(10.5)

        # Ruang Jawaban Isian
        p_ans = doc.add_paragraph()
        p_ans.paragraph_format.left_indent = Inches(0.28)
        p_ans.paragraph_format.space_before = Pt(1)
        p_ans.paragraph_format.space_after = Pt(4)
        r_dot = p_ans.add_run("Jawaban: " + "." * 60)
        r_dot.font.name = "Times New Roman"
        r_dot.font.size = Pt(9.5)
        r_dot.font.color.rgb = RGBColor(120, 120, 120)


def render_essay_questions(doc: Document, essay_list: List[Dict[str, Any]], start_num: int = 1):
    """Merender butir-butir soal Essay / Uraian dengan garis berjarak untuk jawaban siswa."""
    add_section_header(
        doc,
        "III. ESSAY / URAIAN",
        "Petunjuk: Jawablah pertanyaan-pertanyaan berikut secara komprehensif, runtut, dan jelas!"
    )

    for i, q in enumerate(essay_list, start=start_num):
        teks_soal = clean_latex_math(q.get("teks", q.get("teks_soal", q.get("text", ""))))

        p_q = doc.add_paragraph()
        p_q.paragraph_format.left_indent = Inches(0.28)
        p_q.paragraph_format.first_line_indent = Inches(-0.28)
        p_q.paragraph_format.space_before = Pt(6)
        p_q.paragraph_format.space_after = Pt(3)
        p_q.paragraph_format.line_spacing = 1.15

        r_num = p_q.add_run(f"{i}.\t")
        r_num.font.name = "Times New Roman"
        r_num.font.size = Pt(10.5)
        r_num.font.bold = True

        r_text = p_q.add_run(teks_soal + " ")
        r_text.font.name = "Times New Roman"
        r_text.font.size = Pt(10.5)

        # Indikator skor
        r_score = p_q.add_run("[Skor Maks: 10]")
        r_score.font.name = "Times New Roman"
        r_score.font.size = Pt(9)
        r_score.font.italic = True
        r_score.font.bold = True
        r_score.font.color.rgb = RGBColor(70, 70, 70)

        # Ruang Tulis Siswa (Kotak Garis Tipis atau Garis-Garis Rapi)
        tbl_space = doc.add_table(rows=3, cols=1)
        tbl_space.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders_thin(tbl_space, color="E5E7EB", sz="2")
        for r_idx in range(3):
            c = tbl_space.rows[r_idx].cells[0]
            c.width = Inches(6.5)
            set_cell_margins(c, top=80, bottom=80, left=80, right=80)
            p_s = c.paragraphs[0]
            p_s.paragraph_format.space_before = Pt(0)
            p_s.paragraph_format.space_after = Pt(0)
            r_sp = p_s.add_run()
            r_sp.font.size = Pt(8)


def render_teacher_master_key(
    doc: Document,
    header_data: Dict[str, Any],
    all_questions: List[Dict[str, Any]],
    sertakan_pembahasan: bool = True
):
    """Membuat halaman kunci jawaban dan pembahasan khusus pegangan guru (terpisah via Page Break)."""
    doc.add_page_break()

    # Header Lembar Guru
    p_top = doc.add_paragraph()
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_top.paragraph_format.space_before = Pt(4)
    p_top.paragraph_format.space_after = Pt(2)
    
    r_k1 = p_top.add_run("LEMBAR KUNCI JAWABAN & PEMBAHASAN\n")
    r_k1.font.name = "Times New Roman"
    r_k1.font.size = Pt(13)
    r_k1.font.bold = True

    r_k2 = p_top.add_run("(DOKUMEN KHUSUS PEGANGAN GURU / TIM PENGUJI)\n")
    r_k2.font.name = "Times New Roman"
    r_k2.font.size = Pt(9.5)
    r_k2.font.bold = True
    r_k2.font.italic = True
    r_k2.font.color.rgb = RGBColor(180, 50, 50)

    mapel = header_data.get("mata_pelajaran") or "Mata Pelajaran Umum"
    kelas = header_data.get("kelas") or "Semua Kelas"
    r_k3 = p_top.add_run(f"Mata Pelajaran: {mapel} • Kelas: {kelas}")
    r_k3.font.name = "Times New Roman"
    r_k3.font.size = Pt(9.5)

    # Garis pemisah
    pBdr = parse_xml(
        r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:bottom w:val="single" w:sz="8" w:space="3" w:color="000000"/>'
        r'</w:pBdr>'
    )
    p_top._p.get_or_add_pPr().append(pBdr)

    # 1. Matriks Kunci Cepat Pilihan Ganda (Quick Key Grid)
    pg_items = [q for q in all_questions if q.get("tipe", q.get("type", "pg")) == "pg"]
    if pg_items:
        p_m = doc.add_paragraph()
        p_m.paragraph_format.space_before = Pt(10)
        p_m.paragraph_format.space_after = Pt(4)
        r_m = p_m.add_run("A. TABEL KUNCI CEPAT PILIHAN GANDA (KOREKSI CEPAT)")
        r_m.font.name = "Times New Roman"
        r_m.font.size = Pt(10)
        r_m.font.bold = True

        # Susun tabel 5 kolom per baris
        num_cols = min(5, len(pg_items))
        num_rows = (len(pg_items) + num_cols - 1) // num_cols
        
        t_key = doc.add_table(rows=num_rows, cols=num_cols)
        t_key.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders_thin(t_key, color="B0B0B0", sz="4")

        for idx, q in enumerate(pg_items):
            row_i = idx // num_cols
            col_i = idx % num_cols
            cell = t_key.rows[row_i].cells[col_i]
            cell.width = Inches(1.3)
            set_cell_background(cell, "F3F4F6" if (row_i + col_i) % 2 == 0 else "FFFFFF")
            set_cell_margins(cell, top=60, bottom=60, left=80, right=80)

            kunci = str(q.get("kunci_jawaban", q.get("jawaban", "-"))).strip()
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(0)
            
            r_num = p.add_run(f"No. {idx + 1}: ")
            r_num.font.name = "Times New Roman"
            r_num.font.size = Pt(9.5)
            r_num.font.bold = False

            r_key = p.add_run(f"[{kunci}]")
            r_key.font.name = "Times New Roman"
            r_key.font.size = Pt(10)
            r_key.font.bold = True
            r_key.font.color.rgb = RGBColor(16, 120, 60)

    # 2. Pembahasan Lengkap & Taksonomi Bloom
    if sertakan_pembahasan:
        p_d = doc.add_paragraph()
        p_d.paragraph_format.space_before = Pt(14)
        p_d.paragraph_format.space_after = Pt(4)
        r_d = p_d.add_run("B. PEMBAHASAN DETAIL & KUNCI JAWABAN LENGKAP")
        r_d.font.name = "Times New Roman"
        r_d.font.size = Pt(10)
        r_d.font.bold = True

        for i, q in enumerate(all_questions, start=1):
            tipe = q.get("tipe", q.get("type", "pg"))
            kunci = q.get("kunci_jawaban", q.get("jawaban", "-"))
            pembahasan = clean_latex_math(q.get("pembahasan", q.get("explanation", "-")))
            bloom = q.get("level_bloom", "")
            diff = q.get("kesulitan", "")

            # Kotak pembahasan per nomor
            t_box = doc.add_table(rows=1, cols=1)
            t_box.alignment = WD_TABLE_ALIGNMENT.CENTER
            cell = t_box.rows[0].cells[0]
            cell.width = Inches(6.7)
            set_cell_background(cell, "FAFAFA")
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            set_table_borders_thin(t_box, color="E2E8F0", sz="4")

            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_after = Pt(0)

            # Header nomor & badge
            r_n = p.add_run(f"Soal Nomor {i} ({tipe.upper()})\n")
            r_n.font.name = "Times New Roman"
            r_n.font.size = Pt(9.5)
            r_n.font.bold = True

            meta_str = []
            if bloom:
                meta_str.append(f"Level: {bloom}")
            if diff:
                meta_str.append(f"Kesulitan: {diff.capitalize()}")
            if meta_str:
                r_meta = p.add_run(f"[{' • '.join(meta_str)}]\n")
                r_meta.font.name = "Times New Roman"
                r_meta.font.size = Pt(8.5)
                r_meta.font.italic = True
                r_meta.font.color.rgb = RGBColor(100, 100, 100)

            # Kunci
            r_klabel = p.add_run("Kunci Jawaban: ")
            r_klabel.font.name = "Times New Roman"
            r_klabel.font.size = Pt(9.5)
            r_klabel.font.bold = True
            
            r_kval = p.add_run(f"{kunci}\n")
            r_kval.font.name = "Times New Roman"
            r_kval.font.size = Pt(9.5)
            r_kval.font.bold = True
            r_kval.font.color.rgb = RGBColor(16, 120, 60)

            # Pembahasan
            r_plabel = p.add_run("Pembahasan: ")
            r_plabel.font.name = "Times New Roman"
            r_plabel.font.size = Pt(9.5)
            r_plabel.font.bold = True

            r_pval = p.add_run(f"{pembahasan}")
            r_pval.font.name = "Times New Roman"
            r_pval.font.size = Pt(9.5)

            # Jeda antar kotak
            p_gap = doc.add_paragraph()
            p_gap.paragraph_format.space_before = Pt(0)
            p_gap.paragraph_format.space_after = Pt(2)


def render_student_answer_sheet(doc: Document, header_data: Dict[str, Any], pg_count: int):
    """Menghadirkan Lembar Jawaban Siswa (LJK Manual Mini) siap fotokopi di akhir dokumen."""
    doc.add_page_break()

    p_top = doc.add_paragraph()
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_top.paragraph_format.space_before = Pt(4)
    p_top.paragraph_format.space_after = Pt(2)

    r1 = p_top.add_run("LEMBAR JAWABAN SISWA (LJK MANUAL)\n")
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(12)
    r1.font.bold = True

    sekolah = header_data.get("nama_sekolah") or "SATUAN PENDIDIKAN"
    mapel = header_data.get("mata_pelajaran") or "-"
    r2 = p_top.add_run(f"{sekolah.upper()} • MATA PELAJARAN: {mapel.upper()}")
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(9.5)
    r2.font.bold = True

    # Garis pemisah
    pBdr = parse_xml(
        r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:bottom w:val="single" w:sz="6" w:space="3" w:color="000000"/>'
        r'</w:pBdr>'
    )
    p_top._p.get_or_add_pPr().append(pBdr)

    # Identitas Siswa Form Isian
    t_id = doc.add_table(rows=2, cols=2)
    t_id.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders_thin(t_id, color="CCCCCC", sz="4")

    fields = [
        ("Nama Lengkap Siswa", "...................................................."),
        ("Nomor Peserta / Absen", "...................................................."),
        ("Kelas / Ruang", "...................................................."),
        ("Tanda Tangan Siswa", "...................................................."),
    ]
    for idx, (label, val) in enumerate(fields):
        r_i = idx // 2
        c_i = idx % 2
        cell = t_id.rows[r_i].cells[c_i]
        cell.width = Inches(3.3)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(f"{label}: {val}")
        r.font.name = "Times New Roman"
        r.font.size = Pt(9)

    # Tabel Lembar Silang A B C D (maksimal 50 nomor)
    limit_soal = min(max(pg_count, 10), 50)
    p_ljk = doc.add_paragraph()
    p_ljk.paragraph_format.space_before = Pt(8)
    p_ljk.paragraph_format.space_after = Pt(4)
    r_pet = p_ljk.add_run("Berilah tanda silang (X) pada huruf jawaban yang Anda pilih:")
    r_pet.font.name = "Times New Roman"
    r_pet.font.size = Pt(8.5)
    r_pet.font.italic = True

    # 2 Kolom grup nomor (1-25 dan 26-50)
    cols_per_row = 2
    per_col = (limit_soal + 1) // 2
    
    t_grid = doc.add_table(rows=per_col, cols=2)
    t_grid.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders_thin(t_grid, color="D1D5DB", sz="2")

    for n in range(1, limit_soal + 1):
        if n <= per_col:
            r_idx = n - 1
            c_idx = 0
        else:
            r_idx = n - 1 - per_col
            c_idx = 1
        
        cell = t_grid.rows[r_idx].cells[c_idx]
        cell.width = Inches(3.3)
        set_cell_margins(cell, top=30, bottom=30, left=60, right=60)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r_row = p.add_run(f"No. {n:02d}\t[ A ]   [ B ]   [ C ]   [ D ]")
        r_row.font.name = "Times New Roman"
        r_row.font.size = Pt(8.5)


def generate_exam_docx(
    header_data: Dict[str, Any],
    soal_list: List[Dict[str, Any]],
    sertakan_jawaban: bool = False,
    sertakan_pembahasan: bool = False,
    sertakan_ljk: bool = True
) -> io.BytesIO:
    """Fungsi utama untuk membangun dokumen .docx siap cetak secara murni."""
    doc = Document()

    # Setup Kertas A4 & Margin Standar Ujian (2 cm = 0.75 in)
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

    # 2. Tabel Identitas Ujian & Siswa
    add_exam_metadata_table(doc, header_data)

    # 3. Callout Box Petunjuk Umum
    add_callout_instructions(doc)

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

    # 5. Render Butir Soal Berurutan
    running_number = 1
    if pg_list:
        render_multiple_choice_questions(doc, pg_list, start_num=running_number)
        running_number += len(pg_list)

    if isian_list:
        render_short_answer_questions(doc, isian_list, start_num=running_number)
        running_number += len(isian_list)

    if essay_list:
        render_essay_questions(doc, essay_list, start_num=running_number)
        running_number += len(essay_list)

    # 6. Kunci Jawaban & Pembahasan Pegangan Guru (Jika diminta)
    if sertakan_jawaban or sertakan_pembahasan:
        render_teacher_master_key(
            doc,
            header_data,
            soal_list,
            sertakan_pembahasan=sertakan_pembahasan
        )

    # 7. Lembar Jawaban Siswa Siap Cetak / Fotokopi (LJK Manual)
    if sertakan_ljk and pg_list:
        render_student_answer_sheet(doc, header_data, len(pg_list))

    # Simpan ke stream BytesIO
    output_stream = io.BytesIO()
    doc.save(output_stream)
    output_stream.seek(0)
    return output_stream
