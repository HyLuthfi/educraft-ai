import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io
import os
import sys

from service.docx_builder import generate_exam_docx

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
    sertakan_ljk: bool = Field(default=True)

@router.post("/export/docx")
async def export_docx(req: RequestExportDocx):
    try:
        header_dict = {
            "nama_sekolah": req.header.nama_sekolah or "LEMBAGA PENDIDIKAN",
            "mata_pelajaran": req.header.mata_pelajaran or "Mata Pelajaran Umum",
            "kelas": req.header.kelas or "Semua Kelas",
            "tanggal": req.header.tanggal or "",
            "durasi": req.header.durasi or "60 Menit",
        }

        # Generate dokumen Word dengan Programmatic Direct-Styling builder
        docx_stream = generate_exam_docx(
            header_data=header_dict,
            soal_list=req.soal,
            sertakan_jawaban=req.sertakan_jawaban,
            sertakan_pembahasan=req.sertakan_pembahasan,
            sertakan_ljk=req.sertakan_ljk
        )

        filename = "naskah-soal-educraft.docx"
        if req.header.mata_pelajaran:
            sanitized = "".join(c for c in req.header.mata_pelajaran if c.isalnum() or c in (" ", "-", "_")).strip()
            if sanitized:
                filename = f"Soal_{sanitized.replace(' ', '_')}.docx"

        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except Exception as e:
        logger.error(f"Export DOCX gagal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen Word: {str(e)}")
