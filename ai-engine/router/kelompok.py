import json
import logging
import shutil
import tempfile
import os
from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from typing import List
from service.ai_service import panggil_ai, panggil_ai_multimodal, ResponseKelompok, DEFAULT_MODEL
from template.prompt_kelompok import SYSTEM_PROMPT_KELOMPOK, buat_user_prompt_kelompok

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/group")
async def buat_kelompok(
    raw_students: str = Form(""),
    config: str = Form("{}"),
    files: List[UploadFile] = File(default=[])
):
    try:
        config_dict = json.loads(config)
        strategi = config_dict.get("strategi", "acak")
        mode = config_dict.get("mode", "jumlah_kelompok")
        jumlah = int(config_dict.get("jumlah", 2))
        opsi = config_dict.get("opsi", "")

        sys_prompt = SYSTEM_PROMPT_KELOMPOK.format(
            strategi=strategi,
            mode=mode,
            jumlah=jumlah,
            opsi=opsi or "-"
        )

        user_prompt = buat_user_prompt_kelompok(raw_students, strategi, mode, jumlah, opsi)

        has_files = any(f.filename for f in files)

        if has_files:
            temp_dir = tempfile.mkdtemp()
            saved_file_paths = []

            try:
                for f in files:
                    if f.filename:
                        path = os.path.join(temp_dir, f"SISWA_{f.filename}")
                        with open(path, "wb") as buffer:
                            shutil.copyfileobj(f.file, buffer)
                        saved_file_paths.append(path)

                response_text = panggil_ai_multimodal(
                    sys_prompt, user_prompt, saved_file_paths,
                    model_name=DEFAULT_MODEL, response_schema=ResponseKelompok
                )

            finally:
                for p in saved_file_paths:
                    if os.path.exists(p):
                        try:
                            os.remove(p)
                        except: pass
                if os.path.exists(temp_dir):
                    try:
                        os.rmdir(temp_dir)
                    except: pass
        else:
            if not raw_students.strip():
                raise HTTPException(status_code=400, detail="Tidak ada data siswa. Masukkan teks daftar siswa atau lampirkan foto/file.")
            response_text = panggil_ai(
                sys_prompt, user_prompt,
                model_name=DEFAULT_MODEL, response_schema=ResponseKelompok
            )

        clean_text = response_text.replace("```json", "").replace("```", "").strip()

        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError:
            logger.warning(f"AI mengembalikan respons yang bukan JSON valid: {clean_text[:200]}")
            return {
                "daftar_kelompok": [],
                "ringkasan_strategi": "",
                "catatan_ai": "AI tidak dapat mengenali daftar siswa dari input Anda. Pastikan input berisi nama-nama siswa yang jelas."
            }

        daftar = data.get("daftar_kelompok", [])
        if not daftar or len(daftar) == 0:
            return {
                "daftar_kelompok": [],
                "ringkasan_strategi": "",
                "catatan_ai": "AI tidak menemukan siswa yang cukup untuk dibentuk kelompok. Coba masukkan daftar siswa yang lebih lengkap."
            }

        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kelompok Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
