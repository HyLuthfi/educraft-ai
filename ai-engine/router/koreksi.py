import json
import base64
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

from service.ai_service import (
    panggil_ai,
    ResponseKoreksiSatu,
    DEFAULT_MODEL,
)
from service.ai_service import baca_gambar_ai
from template.prompt_koreksi import (
    SYSTEM_PROMPT_KOREKSI,
    SYSTEM_PROMPT_ANALITIK,
    buat_user_prompt_koreksi_satu,
    buat_prompt_analitik,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Batas maksimal siswa yang diproses bersamaan (hindari rate limit AI).
MAKS_PARALEL = 3


class StudentData(BaseModel):
    id: str
    name: str
    textContent: str = ""
    imageBase64: Optional[str] = None   # data mentah base64 (tanpa prefix data:)
    imageMime: Optional[str] = None


class ScoringConfig(BaseModel):
    bobotBenar: int = 1
    bobotSalah: int = 0
    skala: str = "100"
    kkm: int = 75


class RequestKoreksi(BaseModel):
    soalText: Optional[str] = ""
    students: List[StudentData]
    config: ScoringConfig


def _sse(payload: dict) -> str:
    """Format satu event SSE."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _koreksi_satu_siswa(sys_prompt: str, soal_text: str, siswa: dict) -> dict:
    """OCR (jika perlu) + koreksi 1 siswa. Sync — dijalankan di thread executor."""
    text_content = siswa.get("textContent") or ""

    # OCR lazy: kalau ada gambar & belum ada teks, baca gambar dulu.
    if siswa.get("imageBase64") and not text_content.strip():
        img_bytes = base64.b64decode(siswa["imageBase64"])
        text_content = baca_gambar_ai(img_bytes, siswa.get("imageMime") or "image/jpeg")

    siswa_utk_prompt = {"name": siswa.get("name"), "textContent": text_content}
    user_prompt = buat_user_prompt_koreksi_satu(soal_text, siswa_utk_prompt)

    raw = panggil_ai(sys_prompt, user_prompt, model_name=DEFAULT_MODEL, response_schema=ResponseKoreksiSatu)
    clean = raw.replace("```json", "").replace("```", "").strip()
    data = json.loads(clean)
    # Schema single-student membungkus hasil di key "hasil".
    hasil = data.get("hasil", data)
    if isinstance(hasil, list) and len(hasil) > 0:
        hasil = hasil[0]
    return hasil


@router.post("/correct")
async def koreksi_jawaban(req: RequestKoreksi):
    sys_prompt = SYSTEM_PROMPT_KOREKSI.format(
        bobot_benar=req.config.bobotBenar,
        bobot_salah=req.config.bobotSalah,
        skala=req.config.skala,
        kkm=req.config.kkm,
    )
    soal_text = req.soalText or ""
    siswa_list = [s.model_dump() for s in req.students]

    async def event_stream():
        loop = asyncio.get_event_loop()
        sem = asyncio.Semaphore(MAKS_PARALEL)
        hasil_terkumpul: list[dict] = []
        queue: asyncio.Queue = asyncio.Queue()

        # status awal: semua menunggu
        for s in siswa_list:
            await queue.put(_sse({"type": "status", "id": s["id"], "phase": "menunggu"}))

        async def proses(s: dict):
            async with sem:
                punya_gambar = bool(s.get("imageBase64")) and not (s.get("textContent") or "").strip()
                await queue.put(_sse({"type": "status", "id": s["id"], "phase": "ocr" if punya_gambar else "koreksi"}))
                if punya_gambar:
                    # fase koreksi diumumkan setelah OCR selesai (di dalam thread), jadi kirim penanda koreksi lebih dulu supaya UI mengalir
                    pass
                try:
                    hasil = await loop.run_in_executor(None, _koreksi_satu_siswa, sys_prompt, soal_text, s)
                    hasil_terkumpul.append(hasil)
                    await queue.put(_sse({"type": "hasil", "id": s["id"], "data": hasil}))
                    await queue.put(_sse({"type": "status", "id": s["id"], "phase": "selesai"}))
                except Exception as e:
                    logger.error(f"Koreksi siswa {s.get('name')} gagal: {e}")
                    await queue.put(_sse({"type": "status", "id": s["id"], "phase": "gagal", "error": str(e)}))

        async def runner():
            await asyncio.gather(*(proses(s) for s in siswa_list))
            # ringkasan analitik kelas (1 call) setelah semua selesai
            analitik = ""
            if hasil_terkumpul:
                try:
                    analitik = await loop.run_in_executor(
                        None,
                        panggil_ai,
                        SYSTEM_PROMPT_ANALITIK,
                        buat_prompt_analitik(hasil_terkumpul),
                        DEFAULT_MODEL,
                        None,
                    )
                    analitik = analitik.strip()
                except Exception as e:
                    logger.error(f"Analitik gagal: {e}")
                    analitik = "Analitik kelas tidak dapat dibuat otomatis."
            await queue.put(_sse({"type": "analitik", "data": analitik}))
            await queue.put(_sse({"type": "done"}))
            await queue.put(None)  # sentinel

        task = asyncio.create_task(runner())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield item
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
