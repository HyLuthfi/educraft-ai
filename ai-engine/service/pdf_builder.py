import io
import re
import datetime
from typing import Dict, Any, List, Tuple, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)

# Helpers from docx_builder
def clean_subject_name(text: str) -> str:
    if not text:
        return "Mata Pelajaran Umum"
    t = str(text).strip()
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
    res = t[:55].title()
    for abbr in ["IPA", "IPS", "PPKN", "TIK", "BK", "PJOK", "PAI", "SBK", "PMR", "SMP", "SMA", "SMK", "SD", "MI", "MTS", "MA"]:
        res = re.sub(rf"\b{abbr}\b", abbr, res, flags=re.I)
    return res

def clean_latex_math(text: str) -> str:
    if not text:
        return ""
    t = str(text)
    replacements = [
        (r"\\times", "×"), (r"\\div", "÷"), (r"\\pm", "±"),
        (r"\\le(q)?", "≤"), (r"\\ge(q)?", "≥"), (r"\\neq", "≠"),
        (r"\\approx", "≈"), (r"\\degree", "°"), (r"\\circ", "°"),
        (r"\\alpha", "α"), (r"\\beta", "β"), (r"\\pi", "π"),
        (r"\\theta", "θ"), (r"\\Delta", "Δ"), (r"\\lambda", "λ"),
        (r"\\mu", "μ"), (r"\\sigma", "σ"), (r"\\infty", "∞"),
        (r"\\rightarrow", "→"), (r"\\leftarrow", "←"),
    ]
    for pattern, repl in replacements:
        t = re.sub(pattern, repl, t)
    t = re.sub(r"\$([^\$]+)\$", r"\1", t)
    t = re.sub(r"\\\((.+?)\\\)", r"\1", t)
    t = re.sub(r"\\\[(.+?)\\\]", r"\1", t)
    return t.strip()

def is_redundant_catatan(catatan: str, kunci: str = "", jawaban_siswa: str = "") -> bool:
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

        m_head = re.match(r"^[\*#\s]*(\d+)[\.\)]\s*([^\*#\n\r]+)[\*#\s]*$", l_str)
        if m_head:
            if current_cat and current_items:
                categories.append((current_cat, current_items))
                current_items = []
            raw_title = m_head.group(2).strip()
            raw_title = re.sub(r"^[\*#\s]+|[\\*#\\s]+$", "", raw_title).strip()
            current_cat = raw_title
            continue

        m_sub = re.match(r"^\*+([^\*\n\r:]+)[:\*]+$", l_str)
        if m_sub and len(l_str) < 50:
            if current_cat and current_items:
                categories.append((current_cat, current_items))
                current_items = []
            current_cat = m_sub.group(1).strip()
            continue

        clean_item = re.sub(r"^[-*•]\s*", "", l_str).strip()
        clean_item = re.sub(r"^\*+|\*+$", "", clean_item).strip()
        if clean_item:
            current_items.append(clean_item)

    if current_cat and current_items:
        categories.append((current_cat, current_items))
    elif current_items:
        categories.append(("Catatan Evaluasi Pembelajaran", current_items))

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


def generate_koreksi_report_pdf(
    header_data: Dict[str, Any],
    koreksi_data: Dict[str, Any],
    soal_text: str = ""
) -> io.BytesIO:
    """Membangun dokumen PDF resmi Laporan Hasil Koreksi Ujian Siswa 100% identik dengan versi Word."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch
    )

    styles = getSampleStyleSheet()

    # Custom styles matching Times New Roman hierarchy
    style_kop_instansi = ParagraphStyle(
        "KopInstansi",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=11,
        leading=13,
        alignment=1, # Center
        textColor=colors.black
    )
    style_kop_sekolah = ParagraphStyle(
        "KopSekolah",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=13,
        leading=16,
        alignment=1,
        textColor=colors.black
    )
    style_kop_judul = ParagraphStyle(
        "KopJudul",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=10,
        leading=12,
        alignment=1,
        textColor=colors.black
    )
    style_kop_footer = ParagraphStyle(
        "KopFooter",
        parent=styles["Normal"],
        fontName="Times-Italic",
        fontSize=9,
        leading=11,
        alignment=1,
        textColor=colors.HexColor("#555555")
    )

    style_sec_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.black,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    style_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=9,
        leading=11.5,
        textColor=colors.black
    )
    style_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=9,
        leading=11.5,
        textColor=colors.black
    )
    style_cell_center = ParagraphStyle(
        "TableCellCenter",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=9,
        leading=11.5,
        alignment=1,
        textColor=colors.black
    )
    style_cell_center_bold = ParagraphStyle(
        "TableCellCenterBold",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=9,
        leading=11.5,
        alignment=1,
        textColor=colors.black
    )
    style_cell_right_bold = ParagraphStyle(
        "TableCellRightBold",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=9,
        leading=11.5,
        alignment=2,
        textColor=colors.black
    )
    style_student_title = ParagraphStyle(
        "StudentTitle",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=11,
        leading=13,
        alignment=1,
        textColor=colors.black
    )
    style_student_sub = ParagraphStyle(
        "StudentSub",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=9,
        leading=11,
        alignment=1,
        textColor=colors.HexColor("#555555"),
        spaceAfter=4
    )

    story = []

    # 1. KOP SURAT
    sekolah_clean = (header_data.get("nama_sekolah") or "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL").strip().upper()
    if sekolah_clean in ("EDUCRAFT AI", "LEMBAGA PENDIDIKAN", "SAI TECH", "PT SOLUSI AGEN INDONESIA"):
        sekolah_clean = "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL"

    current_year = datetime.datetime.now().year
    story.append(Paragraph("DINAS PENDIDIKAN DAN KEBUDAYAAN", style_kop_instansi))
    story.append(Spacer(1, 2))
    story.append(Paragraph(sekolah_clean, style_kop_sekolah))
    story.append(Spacer(1, 2))
    story.append(Paragraph(f"LAPORAN REKAPITULASI HASIL KOREKSI UJIAN • TAHUN AJARAN {current_year}/{current_year + 1}", style_kop_judul))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Saitech AI Solutions • Website: saitech.co.id", style_kop_footer))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.black, spaceBefore=0, spaceAfter=1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black, spaceBefore=0, spaceAfter=8))

    # Data Calculation
    hasil_list = koreksi_data.get("hasil", [])
    total_siswa = len(hasil_list)
    kkm = header_data.get("kkm", 75)
    skala = str(header_data.get("skala", "100")).upper()
    tanggal = header_data.get("tanggal") or datetime.datetime.now().strftime("%d %B %Y")
    mapel = clean_subject_name(header_data.get("mata_pelajaran", "Hasil Evaluasi Pembelajaran"))
    kelas = header_data.get("kelas", "Semua Kelas")

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

    # 2. TABEL METADATA KELAS (4 Kolom, Ruled Borders)
    meta_table_data = [
        [
            Paragraph("<b>Mata Pelajaran</b>", style_cell), Paragraph(f":  {mapel}", style_cell),
            Paragraph("<b>Tanggal Koreksi</b>", style_cell), Paragraph(f":  {tanggal}", style_cell)
        ],
        [
            Paragraph("<b>Kelas / Fase</b>", style_cell), Paragraph(f":  {kelas}", style_cell),
            Paragraph("<b>Standar KKM</b>", style_cell), Paragraph(f":  {kkm}", style_cell)
        ],
        [
            Paragraph("<b>Rata-rata Kelas</b>", style_cell), Paragraph(f":  <b>{avg_str}</b>", style_cell),
            Paragraph("<b>Ketuntasan KKM</b>", style_cell), Paragraph(f":  <b>{pct_tuntas} ({tuntas_count}/{total_siswa} Siswa)</b>", style_cell)
        ],
    ]
    t_meta = Table(meta_table_data, colWidths=[1.4 * inch, 2.2 * inch, 1.4 * inch, 1.97 * inch])
    t_meta.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, 0), 1.0, colors.black),
        ("LINEBELOW", (0, -1), (-1, -1), 1.0, colors.black),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#E5E7EB")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t_meta)

    # 3. BAGIAN I: BUKU NILAI & REKAPITULASI KELAS
    story.append(Paragraph("I. BUKU NILAI & REKAPITULASI KELAS", style_sec_title))

    rekap_data = [[
        Paragraph("<b>No</b>", style_cell_center),
        Paragraph("<b>Nama Siswa</b>", style_cell),
        Paragraph("<b>Nilai Akhir</b>", style_cell_center),
        Paragraph("<b>Status KKM</b>", style_cell_center),
        Paragraph("<b>Catatan & Rekomendasi Guru</b>", style_cell)
    ]]

    for s_i, s in enumerate(hasil_list, 1):
        is_tuntas = str(s.get("status_kelulusan", "")).lower() == "tuntas"
        status_color = "#166534" if is_tuntas else "#B91C1C"
        status_txt = "TUNTAS" if is_tuntas else "REMEDIAL"
        catatan_singkat = s.get("rekomendasi") or s.get("catatan") or "-"

        rekap_data.append([
            Paragraph(str(s_i), style_cell_center_bold),
            Paragraph(s.get("nama_siswa", f"Siswa {s_i}"), style_cell),
            Paragraph(f"<b>{s.get('nilai_akhir', '-')}</b>", style_cell_center),
            Paragraph(f"<font color='{status_color}'><b>{status_txt}</b></font>", style_cell_center),
            Paragraph(catatan_singkat, style_cell)
        ])

    t_rekap = Table(rekap_data, colWidths=[0.4 * inch, 2.2 * inch, 0.95 * inch, 1.15 * inch, 2.27 * inch])
    t_rekap_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    for r_idx in range(1, len(rekap_data)):
        if r_idx % 2 == 0:
            t_rekap_style.append(("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#F8FAFC")))
    t_rekap.setStyle(TableStyle(t_rekap_style))
    story.append(t_rekap)

    # 4. BAGIAN II: EVALUASI PEMBELAJARAN & TINDAK LANJUT KELAS (Tabel Matriks 2 Kolom)
    analitik = koreksi_data.get("analitik_kelas", "")
    if analitik:
        story.append(Paragraph("II. EVALUASI PEMBELAJARAN & TINDAK LANJUT KELAS", style_sec_title))
        categories = parse_analitik_into_matrix_rows(analitik)

        sec2_data = [[
            Paragraph("<b>Aspek Analisis Evaluasi</b>", style_cell_center),
            Paragraph("<b>Uraian Diagnostik & Rencana Tindak Lanjut Guru</b>", style_cell)
        ]]

        for cat_name, items in categories:
            items_paragraphs = []
            for item_str in items:
                if item_str.endswith(":") and len(item_str) < 40:
                    items_paragraphs.append(Paragraph(f"<b>{item_str}</b>", style_cell))
                    continue
                colon_m = re.match(r"^([^:]{2,35}):\s*(.*)$", item_str)
                if colon_m:
                    k_pt = colon_m.group(1).strip()
                    v_pt = colon_m.group(2).strip()
                    items_paragraphs.append(Paragraph(f"•  <b>{k_pt}:</b> {v_pt}", style_cell))
                else:
                    items_paragraphs.append(Paragraph(f"•  {item_str}", style_cell))

            sec2_data.append([
                Paragraph(f"<b>{cat_name}</b>", style_cell),
                items_paragraphs
            ])

        t_sec2 = Table(sec2_data, colWidths=[1.6 * inch, 5.37 * inch])
        t_sec2_style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#F8FAFC")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
            ("VALIGN", (0, 1), (0, -1), "MIDDLE"),
            ("VALIGN", (1, 1), (1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]
        t_sec2.setStyle(TableStyle(t_sec2_style))
        story.append(t_sec2)

    # 5. LEMBAR PENGESAHAN KELAS
    sig_data = [[
        Paragraph(
            "Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/>( ................................................................ )<br/>NIP. ...........................................................",
            style_cell
        ),
        Paragraph(
            f"{tanggal}<br/>Guru Mata Pelajaran<br/><br/><br/><br/>( ................................................................ )<br/>NIP. ...........................................................",
            style_cell
        )
    ]]
    t_sig = Table(sig_data, colWidths=[3.48 * inch, 3.48 * inch])
    t_sig.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t_sig)

    # ─────────────────────────────────────────────────────────────────
    # 6. LEMBAR PER SISWA (Halaman 2+)
    # ─────────────────────────────────────────────────────────────────
    for s_idx, s in enumerate(hasil_list, 1):
        story.append(PageBreak())

        # Judul Lembar
        story.append(Paragraph("LEMBAR HASIL EVALUASI ASESMEN SISWA", style_student_title))
        story.append(Paragraph(f"TAHUN AJARAN {current_year}/{current_year + 1}", style_student_sub))

        is_tuntas = str(s.get("status_kelulusan", "")).lower() == "tuntas"
        status_label = "TUNTAS KKM" if is_tuntas else "REMEDIAL (Belum Tuntas)"
        status_color = "#166534" if is_tuntas else "#B91C1C"

        nilai_raw = str(s.get("nilai_akhir", "-")).strip()
        if str(skala).lower() in ("huruf", "predikat"):
            nilai_display = f"{nilai_raw} (Predikat Huruf)"
        else:
            nilai_display = f"{nilai_raw} / {skala}"

        # Tabel Metadata Siswa
        stu_meta_data = [
            [
                Paragraph("<b>Nama Siswa</b>", style_cell), Paragraph(f":  <b>{s.get('nama_siswa', 'Siswa')}</b>", style_cell),
                Paragraph("<b>Mata Pelajaran</b>", style_cell), Paragraph(f":  {mapel}", style_cell)
            ],
            [
                Paragraph("<b>No. Urut / ID</b>", style_cell), Paragraph(f":  Siswa #{s_idx:02d}", style_cell),
                Paragraph("<b>Kelas / Fase</b>", style_cell), Paragraph(f":  {kelas}", style_cell)
            ],
            [
                Paragraph("<b>Status KKM</b>", style_cell), Paragraph(f":  <font color='{status_color}'><b>{status_label}</b></font>", style_cell),
                Paragraph("<b>Nilai Akhir</b>", style_cell), Paragraph(f":  <font color='{status_color}'><b>{nilai_display}</b></font>", style_cell)
            ],
        ]
        t_stu_meta = Table(stu_meta_data, colWidths=[1.3 * inch, 2.3 * inch, 1.35 * inch, 2.02 * inch])
        t_stu_meta.setStyle(TableStyle([
            ("LINEABOVE", (0, 0), (-1, 0), 1.0, colors.black),
            ("LINEBELOW", (0, -1), (-1, -1), 1.0, colors.black),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_stu_meta)

        # Sub-header Tabel Evaluasi
        story.append(Paragraph("TABEL EVALUASI & ANALISIS BUTIR ASESMEN:", style_sec_title))

        detail_items = s.get("detail_koreksi", [])
        total_skor_diperoleh = 0.0

        eval_data = [[
            Paragraph("<b>No</b>", style_cell_center),
            Paragraph("<b>Butir Pertanyaan</b>", style_cell),
            Paragraph("<b>Jawaban Siswa</b>", style_cell),
            Paragraph("<b>Kunci Acuan</b>", style_cell),
            Paragraph("<b>Skor / Status</b>", style_cell_center),
            Paragraph("<b>Catatan Evaluasi</b>", style_cell)
        ]]

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

            if status == "benar":
                st_badge = f"<b>{nilai:g}</b><br/><font color='#166534'><b>[✓ Benar]</b></font>"
            elif status == "setengah":
                st_badge = f"<b>{nilai:g}</b><br/><font color='#B45309'><b>[Sebagian]</b></font>"
            else:
                st_badge = f"<b>{nilai:g}</b><br/><font color='#B91C1C'><b>[✗ Salah]</b></font>"

            if not catatan or is_redundant_catatan(catatan, kunci, jawaban_siswa):
                catatan_clean = "-"
            else:
                catatan_clean = catatan

            jwb_color = "#B91C1C" if status == "salah" else "#000000"

            eval_data.append([
                Paragraph(f"<b>{nomor}</b>", style_cell_center),
                Paragraph(pertanyaan, style_cell),
                Paragraph(f"<font color='{jwb_color}'>{jawaban_siswa or '(Kosong)'}</font>", style_cell),
                Paragraph(kunci, style_cell),
                Paragraph(st_badge, style_cell_center),
                Paragraph(catatan_clean, style_cell)
            ])

        # Summary Row (Total Skor)
        if detail_items:
            score_total_str = f"<b>{total_skor_diperoleh:g} / {len(detail_items):g}</b>"
            st_class_str = f"<font color='{status_color}'><b>{status_label.split()[0]} KKM</b></font>"
            eval_data.append([
                Paragraph("<b>TOTAL PEROLEHAN SKOR / STATUS KELULUSAN</b>", style_cell_right_bold),
                "", "", "",
                Paragraph(score_total_str, style_cell_center),
                Paragraph(st_class_str, style_cell)
            ])

        # Catatan Guru Row (Integrated)
        catatan_guru = s.get("rekomendasi") or s.get("catatan")
        if catatan_guru and not is_redundant_catatan(catatan_guru):
            eval_data.append([
                Paragraph(f"<b>Catatan & Rekomendasi Guru:</b> <i>{catatan_guru}</i>", style_cell),
                "", "", "", "", ""
            ])

        t_eval = Table(eval_data, colWidths=[0.35 * inch, 2.32 * inch, 1.25 * inch, 1.25 * inch, 0.80 * inch, 1.00 * inch])
        t_eval_style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]

        if detail_items:
            # Span for summary row
            sum_idx = len(detail_items) + 1
            t_eval_style.extend([
                ("SPAN", (0, sum_idx), (3, sum_idx)),
                ("BACKGROUND", (0, sum_idx), (-1, sum_idx), colors.HexColor("#F8FAFC")),
                ("VALIGN", (0, sum_idx), (-1, sum_idx), "MIDDLE"),
            ])

        if catatan_guru and not is_redundant_catatan(catatan_guru):
            note_idx = len(eval_data) - 1
            t_eval_style.extend([
                ("SPAN", (0, note_idx), (5, note_idx)),
                ("BACKGROUND", (0, note_idx), (-1, note_idx), colors.HexColor("#F8FAFC")),
                ("VALIGN", (0, note_idx), (-1, note_idx), "MIDDLE"),
            ])

        t_eval.setStyle(TableStyle(t_eval_style))
        story.append(t_eval)

        # Tanda Tangan Siswa
        sig_stu_data = [[
            Paragraph(
                "Mengetahui,<br/>Orang Tua / Wali Siswa<br/><br/><br/><br/>( ................................................................ )",
                style_cell
            ),
            Paragraph(
                f"{tanggal}<br/>Guru Pemeriksa<br/><br/><br/><br/>( ................................................................ )",
                style_cell
            )
        ]]
        t_stu_sig = Table(sig_stu_data, colWidths=[3.48 * inch, 3.48 * inch])
        t_stu_sig.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_stu_sig)

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_rapor_report_pdf(
    header_data: Dict[str, Any],
    siswa_list: List[Dict[str, Any]],
    sesi_list: Optional[List[Dict[str, Any]]] = None
) -> io.BytesIO:
    """Membangun dokumen PDF resmi Rapor Capaian & Tren Nilai Siswa 100% identik dengan versi Word."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch
    )

    styles = getSampleStyleSheet()

    style_kop_instansi = ParagraphStyle(
        "KopInstansiRapor",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=11,
        leading=13,
        alignment=1, # Center
        textColor=colors.black
    )
    style_kop_sekolah = ParagraphStyle(
        "KopSekolahRapor",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=13,
        leading=16,
        alignment=1,
        textColor=colors.black
    )
    style_kop_judul = ParagraphStyle(
        "KopJudulRapor",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=10,
        leading=12,
        alignment=1,
        textColor=colors.black
    )
    style_kop_footer = ParagraphStyle(
        "KopFooterRapor",
        parent=styles["Normal"],
        fontName="Times-Italic",
        fontSize=9,
        leading=11,
        alignment=1,
        textColor=colors.HexColor("#555555")
    )
    style_sec_title = ParagraphStyle(
        "SectionTitleRapor",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.black,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    style_cell = ParagraphStyle(
        "TableCellRapor",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=9,
        leading=11.5,
        textColor=colors.black
    )
    style_cell_bold = ParagraphStyle(
        "TableCellBoldRapor",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=9,
        leading=11.5,
        textColor=colors.black
    )
    style_cell_center = ParagraphStyle(
        "TableCellCenterRapor",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=9,
        leading=11.5,
        alignment=1,
        textColor=colors.black
    )
    style_cell_center_bold = ParagraphStyle(
        "TableCellCenterBoldRapor",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=9,
        leading=11.5,
        alignment=1,
        textColor=colors.black
    )

    story = []

    # 1. KOP SURAT
    sekolah_clean = (header_data.get("nama_sekolah") or "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL").strip().upper()
    if sekolah_clean in ("EDUCRAFT AI", "LEMBAGA PENDIDIKAN", "SAI TECH", "PT SOLUSI AGEN INDONESIA"):
        sekolah_clean = "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL"

    current_year = datetime.datetime.now().year
    story.append(Paragraph("DINAS PENDIDIKAN DAN KEBUDAYAAN", style_kop_instansi))
    story.append(Spacer(1, 2))
    story.append(Paragraph(sekolah_clean, style_kop_sekolah))
    story.append(Spacer(1, 2))
    story.append(Paragraph(f"RAPOR CAPAIAN & TREN ASESMEN SISWA • TAHUN AJARAN {current_year}/{current_year + 1}", style_kop_judul))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Saitech AI Solutions • Website: saitech.co.id", style_kop_footer))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.black, spaceBefore=0, spaceAfter=1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black, spaceBefore=0, spaceAfter=8))

    # Data Calculation
    tanggal = header_data.get("tanggal") or datetime.datetime.now().strftime("%d %B %Y")
    total_siswa = len(siswa_list)
    total_sesi = header_data.get("total_sesi", 0)
    valid_scores = [float(s.get("rata_rata", 0)) for s in siswa_list if s.get("rata_rata") is not None]
    rata_kelas = f"{sum(valid_scores)/len(valid_scores):.1f}" if valid_scores else "0.0"
    top_score = f"{max(valid_scores):.1f}" if valid_scores else "-"
    top_student = siswa_list[0].get("nama", "-") if siswa_list else "-"

    # 2. Metadata Table
    meta_data = [
        [
            Paragraph("<b>Laporan Evaluasi</b>", style_cell_bold),
            Paragraph(": Rapor Tren Capaian Asesmen", style_cell),
            Paragraph("<b>Tanggal Rekapitulasi</b>", style_cell_bold),
            Paragraph(f": {tanggal}", style_cell),
        ],
        [
            Paragraph("<b>Total Siswa</b>", style_cell_bold),
            Paragraph(f": {total_siswa} Siswa Terdaftar", style_cell),
            Paragraph("<b>Jumlah Sesi Dinilai</b>", style_cell_bold),
            Paragraph(f": {total_sesi} Sesi Asesmen", style_cell),
        ],
        [
            Paragraph("<b>Rata-Rata Kelas</b>", style_cell_bold),
            Paragraph(f": {rata_kelas} (Skala 100)", style_cell),
            Paragraph("<b>Nilai Tertinggi</b>", style_cell_bold),
            Paragraph(f": {top_score} ({top_student})", style_cell),
        ],
    ]
    meta_table = Table(
        meta_data,
        colWidths=[1.4 * inch, 2.2 * inch, 1.4 * inch, 1.97 * inch]
    )
    meta_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 0.75, colors.black),
        ('LINEBELOW', (0, -1), (-1, -1), 0.75, colors.black),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#E5E7EB")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # 3. Bagian I: Buku Nilai & Peringkat Kelas
    story.append(Paragraph("I. BUKU NILAI & PERINGKAT KELAS", style_sec_title))
    rekap_data = [
        [
            Paragraph("Rank", style_cell_center_bold),
            Paragraph("Nama Siswa", style_cell_bold),
            Paragraph("Total Sesi", style_cell_center_bold),
            Paragraph("Sesi Tuntas", style_cell_center_bold),
            Paragraph("Rata-Rata", style_cell_center_bold),
            Paragraph("Predikat Mutu", style_cell_bold),
        ]
    ]

    tuntas_total = 0
    for idx, s in enumerate(siswa_list):
        nama_s = s.get("nama", f"Siswa #{idx+1}")
        tot_sesi = s.get("total_sesi", 0)
        tunt_sesi = s.get("tuntas_count", 0)
        avg_val = float(s.get("rata_rata", 0))
        if tunt_sesi > 0:
            tuntas_total += 1

        if avg_val >= 90:
            predikat = "A (Sangat Baik)"
        elif avg_val >= 80:
            predikat = "B (Baik)"
        elif avg_val >= 70:
            predikat = "C (Cukup)"
        elif avg_val >= 60:
            predikat = "D (Kurang)"
        else:
            predikat = "E (Bimbingan)"

        rekap_data.append([
            Paragraph(str(idx + 1), style_cell_center_bold),
            Paragraph(nama_s, style_cell),
            Paragraph(str(tot_sesi), style_cell_center),
            Paragraph(str(tunt_sesi), style_cell_center),
            Paragraph(f"{avg_val:.1f}", style_cell_center_bold),
            Paragraph(predikat, style_cell),
        ])

    # Footer row
    rekap_data.append([
        Paragraph(f"<b>Rata-Rata Nilai Kelas:</b> {rata_kelas}  •  <b>Tingkat Ketuntasan Siswa:</b> {tuntas_total}/{total_siswa} Siswa", style_cell_bold),
        "", "", "", "", ""
    ])

    rekap_table = Table(
        rekap_data,
        colWidths=[0.55 * inch, 2.25 * inch, 0.83 * inch, 0.83 * inch, 1.11 * inch, 1.40 * inch]
    )
    rekap_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor("#D1D5DB")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('SPAN', (0, -1), (-1, -1)),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#F9FAFB")),
        ('LINEABOVE', (0, -1), (-1, -1), 0.75, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    rekap_table.setStyle(TableStyle(rekap_style))
    story.append(rekap_table)
    story.append(Spacer(1, 10))

    # 4. Bagian II: Rekapitulasi Riwayat Tren
    story.append(Paragraph("II. REKAPITULASI RIWAYAT TREN ASESMEN SISWA LINTAS SESI", style_sec_title))
    tren_data = [
        [
            Paragraph("No", style_cell_center_bold),
            Paragraph("Nama Siswa", style_cell_bold),
            Paragraph("Riwayat Nilai Sesi Asesmen", style_cell_bold),
            Paragraph("Rentang Nilai", style_cell_center_bold),
            Paragraph("Status Tren", style_cell_center_bold),
        ]
    ]

    for idx, s in enumerate(siswa_list):
        nama_s = s.get("nama", f"Siswa #{idx+1}")
        data_pts = s.get("data", []) or s.get("history", [])
        if data_pts:
            hist_str = " → ".join(f"{pt.get('label')}: {pt.get('nilai')}" for pt in data_pts)
            vals = [float(pt.get("nilai", 0)) for pt in data_pts]
            rentang = f"{min(vals):.0f} - {max(vals):.0f}"
            if len(vals) >= 2:
                diff = vals[-1] - vals[0]
                if diff > 0.5:
                    tren_status = f"Naik (+{diff:.1f})"
                elif diff < -0.5:
                    tren_status = f"Turun ({diff:.1f})"
                else:
                    tren_status = "Stabil"
            else:
                tren_status = "Sesi Perdana"
        else:
            hist_str = "-"
            rentang = "-"
            tren_status = "-"

        tren_data.append([
            Paragraph(str(idx + 1), style_cell_center_bold),
            Paragraph(nama_s, style_cell),
            Paragraph(hist_str, style_cell),
            Paragraph(rentang, style_cell_center),
            Paragraph(tren_status, style_cell_center),
        ])

    tren_table = Table(
        tren_data,
        colWidths=[0.42 * inch, 1.83 * inch, 2.78 * inch, 0.97 * inch, 0.97 * inch]
    )
    tren_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(tren_table)
    story.append(Spacer(1, 14))

    # 5. Lembar Pengesahan Tanda Tangan
    sig_data = [
        [
            Paragraph("Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/>( ................................................................ )<br/>NIP. ........................................................", style_cell),
            Paragraph(f"{tanggal}<br/>Guru Pengampu / Wali Kelas<br/><br/><br/><br/>( ................................................................ )<br/>NIP. ........................................................", style_cell)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[3.48 * inch, 3.48 * inch])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sig_table)

    # ══════════════════════════════════════════════════════════════════════════
    # LEMBAR RAPOR HASIL CAPAIAN ASESMEN INDIVIDUAL PER SISWA (UNTUK DIBAGIKAN)
    # ══════════════════════════════════════════════════════════════════════════
    kelas = header_data.get("kelas", "Semua Kelas")
    for idx_s, s in enumerate(siswa_list):
        story.append(PageBreak())
        nama_siswa = s.get("nama", f"Siswa #{idx_s + 1}")
        data_pts = s.get("data", []) or s.get("history", [])

        tot_sesi = int(s.get("total_sesi") if s.get("total_sesi") is not None else s.get("totalSesi", 0))
        tunt_sesi = int(s.get("tuntas_count") if s.get("tuntas_count") is not None else s.get("tuntasCount", 0))
        raw_avg = s.get("rata_rata") if s.get("rata_rata") is not None else s.get("rataRata")

        if (raw_avg is None or float(raw_avg) == 0.0) and data_pts:
            pts_vals = [float(pt.get("nilai", 0)) for pt in data_pts if pt.get("nilai") is not None]
            avg_score = sum(pts_vals) / len(pts_vals) if pts_vals else 0.0
        else:
            avg_score = float(raw_avg or 0.0)

        if not tot_sesi and data_pts:
            tot_sesi = len(data_pts)
        if not tunt_sesi and data_pts:
            tunt_sesi = sum(1 for pt in data_pts if float(pt.get("nilai", 0)) >= float(pt.get("kkm", 75)))

        rank_num = s.get("rank") or (idx_s + 1)

        if avg_score >= 90:
            predikat_huruf = "A"
            predikat_label = "A (Sangat Baik / Istimewa)"
            catatan_wali = (
                "Ananda menunjukkan prestasi yang sangat membanggakan dengan penguasaan kompetensi yang istimewa. "
                "Pertahankan semangat belajar, ketekunan, dan teruslah menjadi teladan positif bagi rekan-rekan di kelas."
            )
        elif avg_score >= 80:
            predikat_huruf = "B"
            predikat_label = "B (Baik / Terampil)"
            catatan_wali = (
                "Ananda telah mencapai ketuntasan belajar dengan hasil yang sangat baik. "
                "Tingkatkan terus keaktifan dan ketelitian belajar untuk meraih prestasi yang lebih tinggi pada materi-materi mendatang."
            )
        elif avg_score >= 70:
            predikat_huruf = "C"
            predikat_label = "C (Cukup / Memenuhi KKM)"
            catatan_wali = (
                "Ananda telah berhasil memenuhi standar ketuntasan minimal (KKM). "
                "Disarankan untuk lebih fokus dan memperbanyak latihan mandiri di rumah pada materi yang masih memerlukan penguatan."
            )
        elif avg_score >= 60:
            predikat_huruf = "D"
            predikat_label = "D (Kurang / Bimbingan Dasar)"
            catatan_wali = (
                "Ananda perlu lebih disiplin dalam mengatur waktu belajar serta proaktif bertanya kepada guru. "
                "Dengan ketekunan dan bimbingan belajar tambahan, Ananda pasti mampu meningkatkan capaian kompetensi."
            )
        else:
            predikat_huruf = "E"
            predikat_label = "E (Perlu Pendampingan Khusus)"
            catatan_wali = (
                "Ananda memerlukan bimbingan belajar dan pendampingan yang lebih intensif pada konsep-konsep dasar. "
                "Perlu adanya perhatian serta kerja sama yang baik antara pihak sekolah dan orang tua di rumah."
            )

        status_kkm_badge = "Tuntas Memenuhi Standar KKM" if avg_score >= 75 else "Perlu Bimbingan Tambahan"

        # 1. Kop Lembaga Mandiri Siswa (Formal Kedinasan)
        story.append(Paragraph("DINAS PENDIDIKAN DAN KEBUDAYAAN", style_kop_instansi))
        story.append(Spacer(1, 2))
        story.append(Paragraph(sekolah_clean, style_kop_sekolah))
        story.append(Spacer(1, 2))
        story.append(Paragraph("LAPORAN HASIL CAPAIAN KOMPETENSI PESERTA DIDIK", style_kop_judul))
        story.append(Spacer(1, 2))
        story.append(Paragraph(f"TAHUN AJARAN {current_year}/{current_year + 1}", style_kop_judul))
        story.append(Spacer(1, 4))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.black, spaceBefore=0, spaceAfter=1))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black, spaceBefore=0, spaceAfter=8))

        # 2. Tabel Identitas Peserta Didik (3 baris x 4 kolom simetris)
        prof_data = [
            [
                Paragraph("<b>Nama Peserta Didik</b>", style_cell_bold),
                Paragraph(f": <b>{nama_siswa}</b>", style_cell),
                Paragraph("<b>Kelas / Fase</b>", style_cell_bold),
                Paragraph(f": {kelas}", style_cell),
            ],
            [
                Paragraph("<b>Nomor Urut / Peringkat</b>", style_cell_bold),
                Paragraph(f": Peringkat {rank_num} dari {total_siswa} Siswa", style_cell),
                Paragraph("<b>Semester / Tahun</b>", style_cell_bold),
                Paragraph(f": Ganjil / {current_year}/{current_year + 1}", style_cell),
            ],
            [
                Paragraph("<b>Nilai Rata-Rata Rapor</b>", style_cell_bold),
                Paragraph(f": <b>{avg_score:.1f}</b> (Predikat {predikat_huruf})", style_cell),
                Paragraph("<b>Status Capaian Belajar</b>", style_cell_bold),
                Paragraph(f": <b>{status_kkm_badge}</b>", style_cell),
            ],
        ]
        t_prof = Table(prof_data, colWidths=[1.35 * inch, 2.25 * inch, 1.35 * inch, 2.02 * inch])
        t_prof.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 0.75, colors.black),
            ('LINEBELOW', (0, -1), (-1, -1), 0.75, colors.black),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#E5E7EB")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_prof)
        story.append(Spacer(1, 8))

        # 3. Judul Rincian
        story.append(Paragraph("CAPAIAN KOMPETENSI ASESMEN PEMBELAJARAN", style_sec_title))

        # 4. Tabel Matriks Capaian Asesmen Siswa (6 Kolom Formal Rapor)
        sesi_table_data = [
            [
                Paragraph("No", style_cell_center_bold),
                Paragraph("Materi / Sesi Asesmen", style_cell_bold),
                Paragraph("Standar KKM", style_cell_center_bold),
                Paragraph("Nilai Angka", style_cell_center_bold),
                Paragraph("Predikat", style_cell_center_bold),
                Paragraph("Keterangan Capaian Kompetensi", style_cell_bold),
            ]
        ]

        if data_pts:
            for s_idx, pt in enumerate(data_pts):
                sesi_name = pt.get("sesi_title") or pt.get("label") or f"Asesmen #{s_idx + 1}"
                kkm_val = pt.get("kkm", 75)
                score_val = float(pt.get("nilai", 0))

                if score_val >= 90:
                    pred_sesi = "A"
                    capaian_desc = "Menunjukkan penguasaan kompetensi yang sangat istimewa dan pemahaman mendalam."
                elif score_val >= 80:
                    pred_sesi = "B"
                    capaian_desc = "Menunjukkan penguasaan kompetensi yang baik dan telah mencapai ketuntasan materi."
                elif score_val >= 70:
                    pred_sesi = "C"
                    capaian_desc = "Telah memenuhi standar kriteria ketuntasan minimal (KKM) dengan cukup baik."
                elif score_val >= 60:
                    pred_sesi = "D"
                    capaian_desc = "Perlu penguatan konsep dan latihan mandiri untuk meningkatkan ketuntasan materi."
                else:
                    pred_sesi = "E"
                    capaian_desc = "Perlu bimbingan remedial dan pendampingan konsep dasar secara terarah."

                sesi_table_data.append([
                    Paragraph(str(s_idx + 1), style_cell_center_bold),
                    Paragraph(sesi_name, style_cell),
                    Paragraph(str(kkm_val), style_cell_center),
                    Paragraph(f"<b>{score_val:.1f}</b>", style_cell_center),
                    Paragraph(f"<b>{pred_sesi}</b>", style_cell_center),
                    Paragraph(capaian_desc, style_cell),
                ])
        else:
            sesi_table_data.append([
                Paragraph("<i>Belum ada rincian riwayat sesi asesmen yang tercatat.</i>", style_cell_center),
                "", "", "", "", ""
            ])

        # Baris Rangkuman (Merged 6 Kolom)
        sesi_table_data.append([
            Paragraph(f"<b>Rata-Rata Nilai Akhir:</b> {avg_score:.1f}  •  <b>Predikat Akhir:</b> {predikat_label}  •  <b>Ketuntasan:</b> {tunt_sesi}/{tot_sesi} Sesi Tuntas", style_cell_bold),
            "", "", "", "", ""
        ])

        # Baris Catatan Wali Kelas (Merged 6 Kolom)
        sesi_table_data.append([
            Paragraph(f"<b>Catatan Wali Kelas / Perkembangan Peserta Didik:</b><br/><i>{catatan_wali}</i>", style_cell),
            "", "", "", "", ""
        ])

        t_sesi = Table(
            sesi_table_data,
            colWidths=[0.35 * inch, 2.22 * inch, 0.69 * inch, 0.69 * inch, 0.63 * inch, 2.39 * inch]
        )
        t_sesi_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ('GRID', (0, 0), (-1, -3 if data_pts else -3), 0.5, colors.HexColor("#D1D5DB")),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
            ('SPAN', (0, -2), (-1, -2)),
            ('SPAN', (0, -1), (-1, -1)),
            ('BACKGROUND', (0, -2), (-1, -2), colors.HexColor("#F9FAFB")),
            ('LINEABOVE', (0, -2), (-1, -2), 0.75, colors.black),
            ('LINEABOVE', (0, -1), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]
        if not data_pts:
            t_sesi_style.append(('SPAN', (0, 1), (-1, 1)))

        t_sesi.setStyle(TableStyle(t_sesi_style))
        story.append(t_sesi)
        story.append(Spacer(1, 14))

        # 5. Tanda Tangan Orang Tua & Wali Kelas
        sig_stu_data = [
            [
                Paragraph("Mengetahui,<br/>Orang Tua / Wali Siswa<br/><br/><br/><br/>( ................................................................ )", style_cell),
                Paragraph(f"{tanggal}<br/>Wali Kelas<br/><br/><br/><br/>( ................................................................ )<br/>NIP. ........................................................", style_cell)
            ]
        ]
        t_stu_sig = Table(sig_stu_data, colWidths=[3.48 * inch, 3.48 * inch])
        t_stu_sig.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t_stu_sig)

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_ranking_report_pdf(
    header_data: Dict[str, Any],
    ranking_list: List[Dict[str, Any]],
    sesi_list: Optional[List[Dict[str, Any]]] = None
) -> io.BytesIO:
    """Membangun dokumen PDF resmi Papan Peringkat & Klasemen Siswa 100% identik dengan versi Word."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch
    )

    styles = getSampleStyleSheet()

    style_kop_instansi = ParagraphStyle(
        "KopInstansiRank",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=11,
        leading=13,
        alignment=1, # Center
        textColor=colors.black
    )
    style_kop_sekolah = ParagraphStyle(
        "KopSekolahRank",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=13,
        leading=16,
        alignment=1,
        textColor=colors.black
    )
    style_kop_judul = ParagraphStyle(
        "KopJudulRank",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=10,
        leading=12,
        alignment=1,
        textColor=colors.black
    )
    style_kop_footer = ParagraphStyle(
        "KopFooterRank",
        parent=styles["Normal"],
        fontName="Times-Italic",
        fontSize=9,
        leading=11,
        alignment=1,
        textColor=colors.HexColor("#555555")
    )
    style_sec_title = ParagraphStyle(
        "SectionTitleRank",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.black,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    style_cell = ParagraphStyle(
        "TableCellRank",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=9,
        leading=11.5,
        textColor=colors.black
    )
    style_cell_bold = ParagraphStyle(
        "TableCellBoldRank",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=9,
        leading=11.5,
        textColor=colors.black
    )
    style_cell_center = ParagraphStyle(
        "TableCellCenterRank",
        parent=styles["Normal"],
        fontName="Times-Roman",
        fontSize=9,
        leading=11.5,
        alignment=1,
        textColor=colors.black
    )
    style_cell_center_bold = ParagraphStyle(
        "TableCellCenterBoldRank",
        parent=styles["Normal"],
        fontName="Times-Bold",
        fontSize=9,
        leading=11.5,
        alignment=1,
        textColor=colors.black
    )

    story = []

    # 1. KOP SURAT
    sekolah_clean = (header_data.get("nama_sekolah") or "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL").strip().upper()
    if sekolah_clean in ("EDUCRAFT AI", "LEMBAGA PENDIDIKAN", "SAI TECH", "PT SOLUSI AGEN INDONESIA"):
        sekolah_clean = "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL"

    current_year = datetime.datetime.now().year
    story.append(Paragraph("DINAS PENDIDIKAN DAN KEBUDAYAAN", style_kop_instansi))
    story.append(Spacer(1, 2))
    story.append(Paragraph(sekolah_clean, style_kop_sekolah))
    story.append(Spacer(1, 2))
    story.append(Paragraph(f"LAPORAN PAPAN PERINGKAT & KLASEMEN PRESTASI SISWA • TAHUN AJARAN {current_year}/{current_year + 1}", style_kop_judul))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Saitech AI Solutions • Website: saitech.co.id", style_kop_footer))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.black, spaceBefore=0, spaceAfter=1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black, spaceBefore=0, spaceAfter=8))

    # Data Calculation
    tanggal = header_data.get("tanggal") or datetime.datetime.now().strftime("%d %B %Y")
    total_siswa = len(ranking_list)
    total_sesi = header_data.get("total_sesi", 0)
    
    valid_scores = []
    for s in ranking_list:
        v = s.get("rata_rata") if s.get("rata_rata") is not None else s.get("rataRata")
        if v is not None:
            try:
                valid_scores.append(float(v))
            except (ValueError, TypeError):
                pass

    rata_kelas = f"{sum(valid_scores)/len(valid_scores):.1f}" if valid_scores else "0.0"
    top_score = f"{max(valid_scores):.1f}" if valid_scores else "-"
    top_student = ranking_list[0].get("nama", "-") if ranking_list else "-"

    # 2. Metadata Table
    meta_data = [
        [
            Paragraph("<b>Dokumen Klasemen</b>", style_cell_bold),
            Paragraph(": Papan Peringkat Prestasi Siswa", style_cell),
            Paragraph("<b>Tanggal Penetapan</b>", style_cell_bold),
            Paragraph(f": {tanggal}", style_cell),
        ],
        [
            Paragraph("<b>Total Siswa</b>", style_cell_bold),
            Paragraph(f": {total_siswa} Siswa Terdaftar", style_cell),
            Paragraph("<b>Sesi Evaluasi Diikuti</b>", style_cell_bold),
            Paragraph(f": {total_sesi} Sesi Penilaian", style_cell),
        ],
        [
            Paragraph("<b>Rata-Rata Kelas</b>", style_cell_bold),
            Paragraph(f": {rata_kelas} (Skala 100)", style_cell),
            Paragraph("<b>Juara Kelas (#1)</b>", style_cell_bold),
            Paragraph(f": {top_student} ({top_score})", style_cell),
        ],
    ]
    meta_table = Table(
        meta_data,
        colWidths=[1.4 * inch, 2.2 * inch, 1.4 * inch, 1.97 * inch]
    )
    meta_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 0.75, colors.black),
        ('LINEBELOW', (0, -1), (-1, -1), 0.75, colors.black),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#E5E7EB")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # 3. Bagian I: PODIUM JUARA TIGA BESAR KELAS
    story.append(Paragraph("I. PODIUM JUARA TIGA BESAR KELAS", style_sec_title))
    podium_list = ranking_list[:3]
    podium_data = [
        [
            Paragraph("Podium", style_cell_center_bold),
            Paragraph("Nama Peserta Didik", style_cell_bold),
            Paragraph("Rata-Rata", style_cell_center_bold),
            Paragraph("Sesi Diikuti / Tuntas", style_cell_center_bold),
            Paragraph("Lencana Prestasi", style_cell_bold),
        ]
    ]

    medali_labels = ["Juara 1 (Emas)", "Juara 2 (Perak)", "Juara 3 (Perunggu)"]
    for idx, s in enumerate(podium_list):
        nama_s = s.get("nama", f"Siswa #{idx+1}")
        tot_sesi = s.get("total_sesi") if s.get("total_sesi") is not None else s.get("totalSesi", 0)
        tunt_sesi = s.get("tuntas_count") if s.get("tuntas_count") is not None else s.get("tuntasCount", 0)
        raw_avg = s.get("rata_rata") if s.get("rata_rata") is not None else s.get("rataRata", 0)
        avg_val = float(raw_avg)
        badges = s.get("badges", [])
        badge_str = ", ".join(b.get("label", "") for b in badges) if badges else "-"

        podium_data.append([
            Paragraph(f"<b>{medali_labels[idx] if idx < len(medali_labels) else f'Juara #{idx+1}'}</b>", style_cell_center_bold),
            Paragraph(f"<b>{nama_s}</b>", style_cell),
            Paragraph(f"<b>{avg_val:.1f}</b>", style_cell_center_bold),
            Paragraph(f"{tot_sesi} Sesi ({tunt_sesi} Tuntas)", style_cell_center),
            Paragraph(badge_str, style_cell),
        ])

    t_pod = Table(
        podium_data,
        colWidths=[1.10 * inch, 2.20 * inch, 1.00 * inch, 1.20 * inch, 1.47 * inch]
    )
    t_pod.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_pod)
    story.append(Spacer(1, 10))

    # 4. Bagian II: KLASEMEN LENGKAP PRESTASI SELURUH PESERTA DIDIK
    story.append(Paragraph("II. KLASEMEN LENGKAP PRESTASI SELURUH PESERTA DIDIK", style_sec_title))
    all_data = [
        [
            Paragraph("Rank", style_cell_center_bold),
            Paragraph("Nama Peserta Didik", style_cell_bold),
            Paragraph("Total Sesi", style_cell_center_bold),
            Paragraph("Sesi Tuntas", style_cell_center_bold),
            Paragraph("Rata-Rata", style_cell_center_bold),
            Paragraph("Lencana & Prestasi", style_cell_bold),
        ]
    ]

    for idx, s in enumerate(ranking_list):
        nama_s = s.get("nama", f"Siswa #{idx+1}")
        tot_sesi = s.get("total_sesi") if s.get("total_sesi") is not None else s.get("totalSesi", 0)
        tunt_sesi = s.get("tuntas_count") if s.get("tuntas_count") is not None else s.get("tuntasCount", 0)
        raw_avg = s.get("rata_rata") if s.get("rata_rata") is not None else s.get("rataRata", 0)
        avg_val = float(raw_avg)
        badges = s.get("badges", [])
        badge_str = ", ".join(b.get("label", "") for b in badges) if badges else "-"

        all_data.append([
            Paragraph(str(idx + 1), style_cell_center_bold),
            Paragraph(nama_s, style_cell),
            Paragraph(str(tot_sesi), style_cell_center),
            Paragraph(str(tunt_sesi), style_cell_center),
            Paragraph(f"<b>{avg_val:.1f}</b>", style_cell_center),
            Paragraph(badge_str, style_cell),
        ])

    t_all = Table(
        all_data,
        colWidths=[0.55 * inch, 2.25 * inch, 0.83 * inch, 0.83 * inch, 0.97 * inch, 1.54 * inch]
    )
    t_all.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_all)
    story.append(Spacer(1, 14))

    # 5. Lembar Pengesahan Tanda Tangan
    sig_data = [
        [
            Paragraph("Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/>( ................................................................ )<br/>NIP. ........................................................", style_cell),
            Paragraph(f"{tanggal}<br/>Guru Pengampu / Wali Kelas<br/><br/><br/><br/>( ................................................................ )<br/>NIP. ........................................................", style_cell)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[3.48 * inch, 3.48 * inch])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sig_table)

    doc.build(story)
    buffer.seek(0)
    return buffer

