import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from service.gemini_service import panggil_gemini
from template.prompt_generate import SYSTEM_PROMPT_SEARCH

router = APIRouter()
logger = logging.getLogger(__name__)


class RequestAISearch(BaseModel):
    topik: str = Field(min_length=3)
    jenjang: str = Field(default="SMA")
    mata_pelajaran: str = Field(default="")
    kedalaman: str = Field(default="medium")


@router.post("/ai-search")
async def ai_search(req: RequestAISearch):
    user_prompt = f"""Topik: {req.topik}
Jenjang Pendidikan: {req.jenjang}
Mata Pelajaran: {req.mata_pelajaran}
Kedalaman: {req.kedalaman} (brief = ringkas 300 kata, medium = 500-800 kata, deep = 1000+ kata)

Buatkan materi pembelajaran yang terstruktur untuk topik di atas."""

    try:
        hasil_mentah = panggil_gemini(SYSTEM_PROMPT_SEARCH, user_prompt)
        hasil = json.loads(hasil_mentah)
        return {
            "materi_terstruktur": hasil.get("materi", ""),
            "judul": hasil.get("judul", req.topik),
            "poin_utama": hasil.get("poin_utama", []),
            "sumber_referensi": hasil.get("sumber_referensi", []),
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI gagal menghasilkan format yang valid")
    except Exception as e:
        logger.error(f"AI search gagal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
