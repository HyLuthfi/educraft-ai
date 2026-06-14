import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io

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
        self.set_font('helvetica', 'B', 16)
        self.cell(0, 10, self.header_data.nama_sekolah or 'Soal Ujian', align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font('helvetica', '', 10)
        self.set_text_color(80, 80, 80)
        self.cell(0, 6, f"{self.header_data.mata_pelajaran} | Kelas {self.header_data.kelas}", align='C', new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, f"Tanggal: {self.header_data.tanggal} | Waktu: {self.header_data.durasi}", align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)
        self.ln(10)

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
        pdf.set_font("helvetica", size=12)

        nomor = 1
        for s in req.soal:
            tipe = s.get("tipe", s.get("type", "pg"))
            teks = s.get("teks", s.get("teks_soal", s.get("text", "")))

            pdf.multi_cell(0, 8, f"{nomor}. {teks}")

            if tipe == "pg":
                opsi_list = s.get("opsi", s.get("options", []))
                for opsi in opsi_list:
                    label = opsi.get("label", opsi.get("label_opsi", ""))
                    teks_opsi = opsi.get("teks", opsi.get("teks_opsi", opsi.get("text", "")))
                    pdf.set_x(pdf.l_margin + 10)
                    pdf.multi_cell(0, 6, f"{label}. {teks_opsi}")
            
            elif tipe == "essay":
                pdf.ln(20) # empty space for essay

            elif tipe == "isian":
                pdf.set_x(pdf.l_margin + 10)
                pdf.cell(0, 8, "Jawaban: ____________________", new_x="LMARGIN", new_y="NEXT")

            pdf.ln(5)
            nomor += 1

        if req.sertakan_jawaban:
            pdf.add_page()
            pdf.set_font("helvetica", "B", 14)
            pdf.cell(0, 10, "Kunci Jawaban", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", size=12)
            for i, s in enumerate(req.soal, 1):
                kunci = s.get("kunci_jawaban", s.get("answer_key", "-"))
                pdf.multi_cell(0, 8, f"{i}. {kunci}")

        if req.sertakan_pembahasan:
            pdf.add_page()
            pdf.set_font("helvetica", "B", 14)
            pdf.cell(0, 10, "Pembahasan", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", size=12)
            for i, s in enumerate(req.soal, 1):
                pembahasan = s.get("pembahasan", s.get("explanation", "-"))
                pdf.multi_cell(0, 8, f"{i}. {pembahasan}")
                pdf.ln(2)

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
