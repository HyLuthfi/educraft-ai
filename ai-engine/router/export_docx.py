import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import io
import os
import sys
import datetime

from service.docx_builder import generate_exam_docx, generate_koreksi_report_docx, generate_rapor_report_docx, generate_ranking_report_docx

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
    sertakan_ljk: bool = Field(default=False)

class RequestExportKoreksiDocx(BaseModel):
    header: Optional[dict] = Field(default_factory=dict)
    koreksi: dict
    soal_text: Optional[str] = ""

@router.post("/export/docx")
async def export_docx(req: RequestExportDocx):
    try:
        header_dict = {
            "nama_sekolah": req.header.nama_sekolah or "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
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


@router.post("/export/koreksi-docx")
async def export_koreksi_docx(req: RequestExportKoreksiDocx):
    try:
        header_dict = req.header or {}
        header_dict.setdefault("nama_sekolah", "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL")
        header_dict.setdefault("mata_pelajaran", "Laporan Hasil Koreksi Ujian")
        header_dict.setdefault("kelas", "Semua Kelas")
        header_dict.setdefault("tanggal", "")
        header_dict.setdefault("kkm", 75)
        header_dict.setdefault("skala", "100")

        docx_stream = generate_koreksi_report_docx(
            header_data=header_dict,
            koreksi_data=req.koreksi,
            soal_text=req.soal_text or ""
        )

        filename = "Laporan_Hasil_Koreksi.docx"
        mapel = header_dict.get("mata_pelajaran")
        if mapel:
            sanitized = "".join(c for c in mapel if c.isalnum() or c in (" ", "-", "_")).strip()
            if sanitized:
                filename = f"Laporan_Koreksi_{sanitized.replace(' ', '_')}.docx"

        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export Koreksi DOCX gagal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen Word Laporan Koreksi: {str(e)}")


class RequestExportRaporDocx(BaseModel):
    header: Optional[dict] = Field(default_factory=dict)
    siswa_list: list = Field(default_factory=list)
    sesi_list: Optional[list] = Field(default_factory=list)


@router.post("/export/rapor-docx")
async def export_rapor_docx(req: RequestExportRaporDocx):
    try:
        header_dict = req.header or {}
        header_dict.setdefault("nama_sekolah", "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL")
        header_dict.setdefault("total_sesi", len(req.sesi_list or []))

        docx_stream = generate_rapor_report_docx(
            header_data=header_dict,
            siswa_list=req.siswa_list or [],
            sesi_list=req.sesi_list or []
        )

        filename = f"Rapor_Siswa_{datetime.datetime.now().strftime('%Y%m%d')}.docx"
        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export Rapor DOCX gagal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen Word Rapor Siswa: {str(e)}")


class RequestExportRankingDocx(BaseModel):
    header: Optional[dict] = Field(default_factory=dict)
    ranking_list: list = Field(default_factory=list)
    sesi_list: Optional[list] = Field(default_factory=list)


@router.post("/export/ranking-docx")
async def export_ranking_docx(req: RequestExportRankingDocx):
    try:
        header_dict = req.header or {}
        header_dict.setdefault("nama_sekolah", "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL")
        header_dict.setdefault("total_sesi", len(req.sesi_list or []))

        docx_stream = generate_ranking_report_docx(
            header_data=header_dict,
            ranking_list=req.ranking_list or [],
            sesi_list=req.sesi_list or []
        )

        filename = f"Ranking_Kelas_{datetime.datetime.now().strftime('%Y%m%d')}.docx"
        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Export Ranking DOCX gagal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gagal generate dokumen Word Ranking Siswa: {str(e)}")



