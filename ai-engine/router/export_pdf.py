import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import io
import datetime
from service.pdf_builder import generate_koreksi_report_pdf, generate_rapor_report_pdf, generate_ranking_report_pdf

try:
    from fpdf import FPDF
except ImportError:
    pass

router = APIRouter()
logger = logging.getLogger(__name__)

class HeaderPdf(BaseModel):
    nama_sekolah: str = Field(default="")
    mata_pelajaran: str = Field(default="")
    kelas: str = Field(default="")
    tanggal: str = Field(default="")
    durasi: str = Field(default="")

class RequestExportPdf(BaseModel):
    soal: list = Field(min_length=1)
    header: HeaderPdf
    sertakan_jawaban: bool = Field(default=False)
    sertakan_pembahasan: bool = Field(default=False)

class PDF(FPDF):
    def __init__(self, header_data: HeaderPdf):
        super().__init__()
        self.header_data = header_data

    def header(self):
        # Hanya jalankan header di halaman pertama
        if self.page_no() != 1:
            return

        # Sekolah Name
        self.set_font('helvetica', 'B', 16)
        self.set_text_color(0, 100, 0) # Greenish like the image
        sekolah = self.header_data.nama_sekolah or 'LEMBAGA PENDIDIKAN'
        self.cell(0, 8, sekolah.upper(), align='C', new_x="LMARGIN", new_y="NEXT")
        
        # Sub-header (Tahun Ajaran / Info)
        self.set_font('helvetica', 'B', 10)
        self.set_text_color(0, 0, 0)
        self.cell(0, 5, 'TAHUN AJARAN 2026/2027', align='C', new_x="LMARGIN", new_y="NEXT")
        
        # Line separator
        self.ln(2)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.line(self.l_margin, y+1, self.w - self.r_margin, y+1)
        self.ln(5)

        # Title Lembar Soal
        self.set_font('helvetica', 'B', 12)
        self.cell(0, 8, 'LEMBAR SOAL', align='C', new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

        # Metadata (Mata Pelajaran, Kelas, Hari, Waktu)
        self.set_font('helvetica', 'B', 11)
        
        meta_items = [
            ("Mata Pelajaran", self.header_data.mata_pelajaran or "-"),
            ("Kelas", self.header_data.kelas or "-"),
            ("Hari/Tanggal", self.header_data.tanggal or "-"),
            ("Waktu", self.header_data.durasi or "-")
        ]
        
        # We indent a bit for metadata
        self.set_x(self.l_margin + 40)
        start_x = self.get_x()
        for label, val in meta_items:
            self.set_x(start_x)
            self.cell(35, 6, label)
            self.cell(5, 6, ":")
            self.cell(0, 6, val, new_x="LMARGIN", new_y="NEXT")
            
        self.ln(2)
        # Separator line before instructions
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(3)

        # Petunjuk Umum
        self.set_font('helvetica', 'B', 11)
        self.cell(0, 6, 'PETUNJUK UMUM', new_x="LMARGIN", new_y="NEXT")
        
        self.set_font('helvetica', 'I', 10)
        instructions = [
            "1. Bacalah Basmalah sebelum memulai mengerjakan soal.",
            "2. Tulislah nama dan nomor peserta pada lembar jawaban yang disediakan.",
            "3. Periksa dan bacalah soal-soal dengan teliti sebelum menjawab.",
            "4. Dahulukan menjawab soal-soal yang dianggap mudah.",
            "5. Periksa kembali pekerjaan Anda sebelum diserahkan kepada pengawas."
        ]
        for inst in instructions:
            self.multi_cell(0, 5, inst, new_x="LMARGIN", new_y="NEXT")
            
        self.ln(2)
        # Final Separator Line
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(5)

@router.post("/export/pdf")
async def export_pdf(req: RequestExportPdf):
    try:
        from fpdf import FPDF
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="fpdf2 belum ter-install. Jalankan: pip install fpdf2",
        )

    try:
        pdf = PDF(req.header)
        pdf.add_page()
        
        # Group questions by type
        pg_list = []
        isian_list = []
        essay_list = []
        
        for s in req.soal:
            tipe = s.get("tipe", s.get("type", "pg"))
            if tipe == "pg":
                pg_list.append(s)
            elif tipe == "isian":
                isian_list.append(s)
            else:
                essay_list.append(s)
                
        # Render Section I: Pilihan Ganda
        if pg_list:
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 8, 'I. PILIHLAH SALAH SATU JAWABAN YANG PALING TEPAT!', new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)
            
            pdf.set_font("helvetica", size=11)
            for i, s in enumerate(pg_list, 1):
                teks = s.get("teks", s.get("teks_soal", s.get("text", "")))
                pdf.multi_cell(0, 6, f"{i}. {teks}", new_x="LMARGIN", new_y="NEXT")
                
                opsi_list = s.get("opsi", s.get("options", []))
                for opsi in opsi_list:
                    label = opsi.get("label", opsi.get("label_opsi", ""))
                    teks_opsi = opsi.get("teks", opsi.get("teks_opsi", opsi.get("text", "")))
                    pdf.set_x(pdf.l_margin + 6)
                    pdf.multi_cell(0, 6, f"{label}. {teks_opsi}", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(4)
                
        # Render Section II: Isian
        if isian_list:
            if pg_list:
                pdf.ln(4)
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 8, 'II. ISILAH TITIK-TITIK DI BAWAH INI DENGAN TEPAT!', new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)
            
            pdf.set_font("helvetica", size=11)
            for i, s in enumerate(isian_list, 1):
                teks = s.get("teks", s.get("teks_soal", s.get("text", "")))
                pdf.multi_cell(0, 6, f"{i}. {teks}", new_x="LMARGIN", new_y="NEXT")
                pdf.set_x(pdf.l_margin + 6)
                pdf.multi_cell(0, 6, "Jawaban: ............................................................", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(4)
                
        # Render Section III: Essay
        if essay_list:
            if pg_list or isian_list:
                pdf.ln(4)
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 8, 'III. JAWABLAH PERTANYAAN-PERTANYAAN DI BAWAH INI DENGAN BENAR!', new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)
            
            pdf.set_font("helvetica", size=11)
            for i, s in enumerate(essay_list, 1):
                teks = s.get("teks", s.get("teks_soal", s.get("text", "")))
                pdf.multi_cell(0, 6, f"{i}. {teks}", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(15) # More space for essay answers

        # Answer Keys and Explanations
        if req.sertakan_jawaban or req.sertakan_pembahasan:
            pdf.add_page()
            
        if req.sertakan_jawaban:
            pdf.set_font("helvetica", "B", 14)
            pdf.cell(0, 10, "Kunci Jawaban", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", size=11)
            for i, s in enumerate(req.soal, 1):
                kunci = s.get("kunci_jawaban", s.get("answer_key", "-"))
                pdf.multi_cell(0, 6, f"{i}. {kunci}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)

        if req.sertakan_pembahasan:
            pdf.set_font("helvetica", "B", 14)
            pdf.cell(0, 10, "Pembahasan", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", size=11)
            for i, s in enumerate(req.soal, 1):
                pembahasan = s.get("pembahasan", s.get("explanation", "-"))
                pdf.multi_cell(0, 6, f"{i}. {pembahasan}", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(3)

        # Output PDF to bytes
        pdf_bytes = pdf.output(dest='S')
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=soal-educraft.pdf"},
        )

    except Exception as e:
        logger.error(f"Export PDF gagal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class RequestExportKoreksiPdf(BaseModel):
    header: Optional[Dict[str, Any]] = None
    koreksi: Dict[str, Any]
    soal_text: Optional[str] = ""


@router.post("/export/koreksi-pdf")
async def export_koreksi_pdf(req: RequestExportKoreksiPdf):
    try:
        header_dict = req.header or {}
        header_dict.setdefault("nama_sekolah", "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL")
        header_dict.setdefault("mata_pelajaran", "Laporan Hasil Koreksi Ujian")
        header_dict.setdefault("kelas", "Semua Kelas")
        header_dict.setdefault("tanggal", "")
        header_dict.setdefault("kkm", 75)
        header_dict.setdefault("skala", "100")

        pdf_stream = generate_koreksi_report_pdf(
            header_data=header_dict,
            koreksi_data=req.koreksi,
            soal_text=req.soal_text or ""
        )

        filename = "Laporan_Hasil_Koreksi.pdf"
        mapel = header_dict.get("mata_pelajaran")
        if mapel:
            sanitized = "".join(c for c in mapel if c.isalnum() or c in (" ", "-", "_")).strip()
            if sanitized:
                filename = f"Laporan_Koreksi_{sanitized.replace(' ', '_')}.pdf"

        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export Koreksi PDF gagal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen PDF: {str(e)}")


class RequestExportRaporPdf(BaseModel):
    header: Optional[Dict[str, Any]] = None
    siswa_list: list = Field(default_factory=list)
    sesi_list: Optional[list] = Field(default_factory=list)


@router.post("/export/rapor-pdf")
async def export_rapor_pdf(req: RequestExportRaporPdf):
    try:
        header_dict = req.header or {}
        header_dict.setdefault("nama_sekolah", "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL")
        header_dict.setdefault("total_sesi", len(req.sesi_list or []))

        pdf_stream = generate_rapor_report_pdf(
            header_data=header_dict,
            siswa_list=req.siswa_list or [],
            sesi_list=req.sesi_list or []
        )

        filename = f"Rapor_Siswa_{datetime.datetime.now().strftime('%Y%m%d')}.pdf"
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export Rapor PDF gagal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen PDF Rapor Siswa: {str(e)}")


class RequestExportRankingPdf(BaseModel):
    header: Optional[Dict[str, Any]] = None
    ranking_list: list = Field(default_factory=list)
    sesi_list: Optional[list] = Field(default_factory=list)


@router.post("/export/ranking-pdf")
async def export_ranking_pdf(req: RequestExportRankingPdf):
    try:
        header_dict = req.header or {}
        header_dict.setdefault("nama_sekolah", "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL")
        header_dict.setdefault("total_sesi", len(req.sesi_list or []))

        pdf_stream = generate_ranking_report_pdf(
            header_data=header_dict,
            ranking_list=req.ranking_list or [],
            sesi_list=req.sesi_list or []
        )

        filename = f"Ranking_Kelas_{datetime.datetime.now().strftime('%Y%m%d')}.pdf"
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export Ranking PDF gagal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen PDF Ranking Siswa: {str(e)}")



