import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io
import os

try:
    from docxtpl import DocxTemplate
except ImportError:
    pass

router = APIRouter()
logger = logging.getLogger(__name__)

class HeaderDocx(BaseModel):
    nama_sekolah: str = Field(default="")
    mata_pelajaran: str = Field(default="")
    kelas: str = Field(default="")
    tanggal: str = Field(default="")
    durasi: str = Field(default="")

class RequestExportDocx(BaseModel):
    soal: list = Field(min_length=1)
    header: HeaderDocx
    sertakan_jawaban: bool = Field(default=False)
    sertakan_pembahasan: bool = Field(default=False)

@router.post("/export/docx")
async def export_docx(req: RequestExportDocx):
    try:
        from docxtpl import DocxTemplate
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="docxtpl belum ter-install. Jalankan: pip install docxtpl",
        )
        
    try:
        template_path = os.path.join(os.path.dirname(__file__), "..", "template", "template_ujian.docx")
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template tidak ditemukan di {template_path}")
            
        doc = DocxTemplate(template_path)
        
        # Pisahkan soal berdasarkan tipe
        pg_list = []
        isian_list = []
        essay_list = []
        
        nomor_pg = 1
        nomor_isian = 1
        nomor_essay = 1
        
        for s in req.soal:
            tipe = s.get("tipe", s.get("type", "pg"))
            if tipe == "pg":
                pg_list.append({
                    "nomor": nomor_pg,
                    "teks": s.get("teks", s.get("teks_soal", s.get("text", ""))),
                    "opsi": s.get("opsi", s.get("options", [])),
                    "jawaban": s.get("jawaban_benar", s.get("jawaban", "")),
                    "pembahasan": s.get("pembahasan", s.get("explanation", ""))
                })
                nomor_pg += 1
            elif tipe == "isian":
                isian_list.append({
                    "nomor": nomor_isian,
                    "teks": s.get("teks", s.get("teks_soal", s.get("text", ""))),
                    "jawaban": s.get("jawaban_benar", s.get("jawaban", "")),
                    "pembahasan": s.get("pembahasan", s.get("explanation", ""))
                })
                nomor_isian += 1
            else:
                essay_list.append({
                    "nomor": nomor_essay,
                    "teks": s.get("teks", s.get("teks_soal", s.get("text", ""))),
                    "jawaban": s.get("jawaban_benar", s.get("jawaban", "")),
                    "pembahasan": s.get("pembahasan", s.get("explanation", ""))
                })
                nomor_essay += 1

        import datetime
        current_year = datetime.datetime.now().year

        # Siapkan context dictionary
        context = {
            "tittle": "UJIAN AKHIR SEMESTER",
            "instansi": req.header.nama_sekolah or "NAMA SEKOLAH ANDA",
            "tahun": str(current_year),
            "tahun2": str(current_year + 1),
            "nama_sekolah": req.header.nama_sekolah or "NAMA SEKOLAH ANDA",
            "mata_pelajaran": req.header.mata_pelajaran or "-",
            "kelas": req.header.kelas or "-",
            "tanggal": req.header.tanggal or "-",
            "durasi": req.header.durasi or "-",
            "pg_list": pg_list,
            "isian_list": isian_list,
            "essay_list": essay_list,
            "sertakan_jawaban": req.sertakan_jawaban,
            "sertakan_pembahasan": req.sertakan_pembahasan
        }
        
        doc.render(context)
        
        # Save to memory
        f = io.BytesIO()
        doc.save(f)
        f.seek(0)
        
        return StreamingResponse(
            f,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=soal-educraft.docx"},
        )
        
    except Exception as e:
        logger.error(f"Export DOCX gagal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
