import json
import logging
import shutil
import tempfile
import os
from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from typing import List
from service.ai_service import (
    panggil_ai,
    panggil_ai_multimodal,
    ResponseAbsensi,
    ResponseStatusAbsensi,
    DEFAULT_MODEL,
)
from template.prompt_absensi import (
    SYSTEM_PROMPT_ABSENSI,
    buat_user_prompt_absensi,
    SYSTEM_PROMPT_STATUS,
    buat_user_prompt_status,
)

logger = logging.getLogger(__name__)

router = APIRouter()

STATUS_VALID = {"hadir", "izin", "sakit", "alpa", "terlambat"}

# Pemetaan singkatan umum daftar hadir -> status baku
STATUS_ALIAS = {
    "h": "hadir", "hadir": "hadir",
    "i": "izin", "izin": "izin", "ijin": "izin",
    "s": "sakit", "sakit": "sakit",
    "a": "alpa", "alpa": "alpa", "alpha": "alpa", "alfa": "alpa", "tanpa keterangan": "alpa",
    "t": "terlambat", "telat": "terlambat", "terlambat": "terlambat",
}


def _normalisasi_status(raw: str) -> str:
    key = (raw or "").strip().lower()
    if key in STATUS_VALID:
        return key
    return STATUS_ALIAS.get(key, "hadir")


def _simpan_files_sementara(files: List[UploadFile]):
    """Simpan upload ke temp dir. Return (temp_dir, paths). Caller wajib bersihkan."""
    temp_dir = tempfile.mkdtemp()
    saved = []
    for f in files:
        if f.filename:
            path = os.path.join(temp_dir, f"ABSEN_{f.filename}")
            with open(path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            saved.append(path)
    return temp_dir, saved


def _bersihkan(temp_dir, paths):
    for p in paths:
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass
    if temp_dir and os.path.exists(temp_dir):
        try:
            os.rmdir(temp_dir)
        except Exception:
            pass


@router.post("/attendance/extract")
async def ekstrak_absensi(
    raw_murid: str = Form(""),
    konteks: str = Form(""),
    files: List[UploadFile] = File(default=[])
):
    """Tahap 1: ekstrak NAMA + nomor absen saja (tanpa status)."""
    try:
        user_prompt = buat_user_prompt_absensi(raw_murid, konteks)
        has_files = any(f.filename for f in files)

        if has_files:
            temp_dir, saved = _simpan_files_sementara(files)
            try:
                response_text = panggil_ai_multimodal(
                    SYSTEM_PROMPT_ABSENSI, user_prompt, saved,
                    model_name=DEFAULT_MODEL, response_schema=ResponseAbsensi
                )
            finally:
                _bersihkan(temp_dir, saved)
        else:
            if not raw_murid.strip():
                raise HTTPException(status_code=400, detail="Tidak ada data murid. Masukkan teks daftar murid atau lampirkan foto/file.")
            response_text = panggil_ai(
                SYSTEM_PROMPT_ABSENSI, user_prompt,
                model_name=DEFAULT_MODEL, response_schema=ResponseAbsensi
            )

        clean_text = response_text.replace("```json", "").replace("```", "").strip()

        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError:
            logger.warning(f"AI mengembalikan respons yang bukan JSON valid: {clean_text[:200]}")
            return {
                "daftar_murid": [],
                "catatan_ai": "AI tidak dapat mengenali daftar murid dari input Anda. Pastikan input berisi nama-nama murid yang jelas."
            }

        daftar = data.get("daftar_murid", [])
        if not daftar:
            return {
                "daftar_murid": [],
                "catatan_ai": "AI tidak menemukan nama murid. Coba masukkan daftar murid yang lebih jelas."
            }

        # Bersihkan: hanya nama & nomor_absen yang relevan di tahap ini
        bersih = [
            {"nama": (m.get("nama") or "").strip(), "nomor_absen": (m.get("nomor_absen") or "").strip()}
            for m in daftar if (m.get("nama") or "").strip()
        ]
        return {"daftar_murid": bersih, "catatan_ai": data.get("catatan_ai", "")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Absensi Extract Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attendance/fill-status")
async def isi_status_absensi(
    roster: str = Form(...),
    konteks: str = Form(""),
    files: List[UploadFile] = File(default=[])
):
    """Tahap 2: baca kertas absensi (foto/file), balikkan status URUT sesuai roster.

    `roster` = JSON string: [{ "nama": str, "nomor_absen": str }, ...]
    """
    try:
        try:
            roster_list = json.loads(roster)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Roster tidak valid (bukan JSON).")

        if not isinstance(roster_list, list) or len(roster_list) == 0:
            raise HTTPException(status_code=400, detail="Roster kosong.")

        has_files = any(f.filename for f in files)
        if not has_files:
            raise HTTPException(status_code=400, detail="Lampirkan foto/file absensi untuk diisi otomatis.")

        user_prompt = buat_user_prompt_status(roster_list, konteks)

        temp_dir, saved = _simpan_files_sementara(files)
        try:
            response_text = panggil_ai_multimodal(
                SYSTEM_PROMPT_STATUS, user_prompt, saved,
                model_name=DEFAULT_MODEL, response_schema=ResponseStatusAbsensi
            )
        finally:
            _bersihkan(temp_dir, saved)

        clean_text = response_text.replace("```json", "").replace("```", "").strip()

        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError:
            logger.warning(f"AI status bukan JSON valid: {clean_text[:200]}")
            raise HTTPException(status_code=502, detail="AI tidak mengembalikan data status yang valid. Coba foto yang lebih jelas.")

        status_list = data.get("status_murid", [])
        n = len(roster_list)

        # Selaraskan panjang dengan roster: pad/truncate agar 1:1 dengan urutan roster.
        hasil = []
        for i in range(n):
            item = status_list[i] if i < len(status_list) else {}
            hasil.append({
                "status": _normalisasi_status(item.get("status", "hadir")),
                "keterangan": (item.get("keterangan") or "").strip(),
            })

        catatan = data.get("catatan_ai", "")
        if len(status_list) != n:
            catatan = (catatan + " ").strip() + f" (AI mengembalikan {len(status_list)} status untuk {n} murid; sisanya di-default 'hadir'. Mohon periksa.)"

        return {"status_murid": hasil, "catatan_ai": catatan.strip()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Absensi Fill-Status Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
