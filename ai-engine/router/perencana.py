import json
import logging
import shutil
import tempfile
import os
from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from typing import List
from service.ai_service import panggil_ai, panggil_ai_multimodal, ResponseRencana, DEFAULT_MODEL
from template.prompt_perencana import SYSTEM_PROMPT_PERENCANA, buat_user_prompt_perencana

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/lesson-plan")
async def buat_rencana(
    raw_materi: str = Form(""),
    config: str = Form("{}"),
    files: List[UploadFile] = File(default=[])
):
    try:
        config_dict = json.loads(config)
        jumlah_pertemuan = int(config_dict.get("jumlah_pertemuan", 4))
        durasi = int(config_dict.get("durasi", 90))
        jenjang = config_dict.get("jenjang", "")
        mata_pelajaran = config_dict.get("mata_pelajaran", "")
        gaya = config_dict.get("gaya", "")
        sertakan_kuis = bool(config_dict.get("sertakan_kuis", True))
        sertakan_game = bool(config_dict.get("sertakan_game", True))
        instruksi = config_dict.get("instruksi", "")

        sys_prompt = SYSTEM_PROMPT_PERENCANA.format(
            jumlah_pertemuan=jumlah_pertemuan,
            durasi=durasi,
            jenjang=jenjang or "-",
            mata_pelajaran=mata_pelajaran or "-",
            gaya=gaya or "-",
            sertakan_kuis="true" if sertakan_kuis else "false",
            sertakan_game="true" if sertakan_game else "false",
            instruksi=instruksi or "-",
        )

        user_prompt = buat_user_prompt_perencana(
            raw_materi, jumlah_pertemuan, durasi, jenjang,
            mata_pelajaran, gaya, sertakan_kuis, sertakan_game, instruksi
        )

        has_files = any(f.filename for f in files)

        if has_files:
            temp_dir = tempfile.mkdtemp()
            saved_file_paths = []

            try:
                for f in files:
                    if f.filename:
                        path = os.path.join(temp_dir, f"MATERI_{f.filename}")
                        with open(path, "wb") as buffer:
                            shutil.copyfileobj(f.file, buffer)
                        saved_file_paths.append(path)

                response_text = panggil_ai_multimodal(
                    sys_prompt, user_prompt, saved_file_paths,
                    model_name=DEFAULT_MODEL, response_schema=ResponseRencana
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
            if not raw_materi.strip():
                raise HTTPException(status_code=400, detail="Tidak ada materi. Masukkan teks materi atau lampirkan foto/file.")
            response_text = panggil_ai(
                sys_prompt, user_prompt,
                model_name=DEFAULT_MODEL, response_schema=ResponseRencana
            )

        clean_text = response_text.replace("```json", "").replace("```", "").strip()

        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError:
            logger.warning(f"AI mengembalikan respons yang bukan JSON valid: {clean_text[:200]}")
            return {
                "judul_rencana": "",
                "ringkasan": "",
                "total_pertemuan": 0,
                "daftar_pertemuan": [],
                "saran_asesmen": "",
                "catatan_ai": "AI tidak dapat menyusun rencana dari input Anda. Pastikan materi yang dimasukkan cukup jelas dan lengkap."
            }

        daftar = data.get("daftar_pertemuan", [])
        if not daftar or len(daftar) == 0:
            return {
                "judul_rencana": data.get("judul_rencana", ""),
                "ringkasan": "",
                "total_pertemuan": 0,
                "daftar_pertemuan": [],
                "saran_asesmen": "",
                "catatan_ai": "AI tidak dapat memecah materi menjadi pertemuan. Coba masukkan materi yang lebih lengkap."
            }

        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Perencana Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
