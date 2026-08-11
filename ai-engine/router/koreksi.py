import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from service.gemini_service import panggil_gemini, ResponseKoreksi
from template.prompt_koreksi import SYSTEM_PROMPT_KOREKSI, buat_user_prompt_koreksi

logger = logging.getLogger(__name__)
router = APIRouter()

class StudentData(BaseModel):
    id: str
    name: str
    textContent: str

class ScoringConfig(BaseModel):
    bobotBenar: int = 1
    bobotSalah: int = 0
    skala: str = "100"
    kkm: int = 75

class RequestKoreksi(BaseModel):
    soalText: Optional[str] = ""
    students: List[StudentData]
    config: ScoringConfig

@router.post("/correct")
async def koreksi_jawaban(req: RequestKoreksi):
    try:
        # Konversi data siswa Pydantic ke dict
        daftar_siswa = [s.model_dump() for s in req.students]
        
        # Format System Prompt dengan konfigurasi penilaian
        sys_prompt = SYSTEM_PROMPT_KOREKSI.format(
            bobot_benar=req.config.bobotBenar,
            bobot_salah=req.config.bobotSalah,
            skala=req.config.skala,
            kkm=req.config.kkm
        )
        
        # Susun User Prompt
        user_prompt = buat_user_prompt_koreksi(req.soalText, daftar_siswa)
        
        # Panggil Gemini
        response_raw = panggil_gemini(
            sys_prompt, 
            user_prompt, 
            model_name="gemini-3.5-flash", 
            response_schema=ResponseKoreksi
        )
        
        # Bersihkan string response JSON
        clean_text = response_raw.replace("```json", "").replace("```", "").strip()
        
        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError:
            logger.error(f"Gagal parse JSON dari respons Gemini: {clean_text}")
            raise HTTPException(
                status_code=500, 
                detail="AI mengembalikan respons yang tidak valid. Silakan coba lagi."
            )
            
        return data
        
    except Exception as e:
        logger.error(f"Koreksi Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
