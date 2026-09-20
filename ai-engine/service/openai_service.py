import os
import re
import json
import time
import base64
import mimetypes
import itertools
import logging

from openai import OpenAI

logger = logging.getLogger(__name__)

IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}

BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip()

_keys_str = os.getenv("OPENAI_API_KEYS", "")
if not _keys_str:
    _keys_str = os.getenv("OPENAI_API_KEY", "")
api_keys = [k.strip() for k in _keys_str.split(",") if k.strip()]
key_cycler = itertools.cycle(api_keys) if api_keys else None

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "ag/gemini-3.8-flash-high")
MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "16000"))
# Total percobaan (bukan cuma per-key). Endpoint bisa 503 'chat_capacity' saat sibuk.
MAX_RETRY = int(os.getenv("OPENAI_MAX_RETRY", "5"))


def _err_bisa_diulang(e: Exception) -> bool:
    s = str(e)
    return any(k in s for k in ["503", "429", "chat_capacity", "Too many", "capacity", "overloaded", "timeout", "Timeout"])


def _jeda_dari_error(e: Exception, default: float) -> float:
    """Ambil 'reset after Ns' dari pesan error jika ada, else pakai default."""
    m = re.search(r"reset after (\d+)", str(e))
    if m:
        return float(m.group(1)) + 1.0
    return default


def _chat(messages, model_name, **kwargs) -> str:
    """Panggil chat.completions dengan retry+backoff untuk error kapasitas (503/429)."""
    if not key_cycler or not api_keys:
        raise RuntimeError("OPENAI_API_KEYS belum di-set di environment variables (.env)")
    if not BASE_URL:
        raise RuntimeError("OPENAI_BASE_URL belum di-set di environment variables (.env)")
    last_error = None
    for attempt in range(MAX_RETRY):
        current_key = next(key_cycler)
        client = OpenAI(api_key=current_key, base_url=BASE_URL, timeout=180.0)
        try:
            resp = client.chat.completions.create(model=model_name, messages=messages, **kwargs)
            return resp.choices[0].message.content or ""
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRY - 1 and _err_bisa_diulang(e):
                jeda = _jeda_dari_error(e, default=2.0 * (attempt + 1))
                logger.warning(f"OpenAI percobaan {attempt+1}/{MAX_RETRY} sibuk, tunggu {jeda:.0f}s: {str(e)[:120]}")
                time.sleep(jeda)
                continue
            logger.warning(f"OpenAI percobaan {attempt+1}/{MAX_RETRY} gagal: {str(e)[:200]}")
            if not _err_bisa_diulang(e):
                break
    raise RuntimeError(f"OpenAI gagal setelah {MAX_RETRY} percobaan. Error terakhir: {str(last_error)}")


def _instruksi_schema(response_schema) -> str:
    """Ubah pydantic model jadi instruksi JSON schema untuk endpoint tanpa native structured-output."""
    if response_schema is None:
        return ""
    try:
        schema = response_schema.model_json_schema()
    except Exception:
        return ""
    return (
        "\n\nWAJIB: balas HANYA satu objek JSON valid (tanpa markdown, tanpa ```), "
        "yang sesuai persis dengan JSON Schema berikut. Gunakan nama field PERSIS seperti schema:\n"
        + json.dumps(schema, ensure_ascii=False)
    )


def panggil_openai(system_prompt: str, user_prompt: str, model_name: str = DEFAULT_MODEL, response_schema=None) -> str:
    """
    Memanggil endpoint OpenAI-compatible dengan rotasi API key (round-robin).
    Mengembalikan string JSON (untuk kompatibilitas dengan pemanggil panggil_ai).
    """
    if not key_cycler or not api_keys:
        raise RuntimeError("OPENAI_API_KEYS belum di-set di environment variables (.env)")
    if not BASE_URL:
        raise RuntimeError("OPENAI_BASE_URL belum di-set di environment variables (.env)")

    system_full = (system_prompt or "") + _instruksi_schema(response_schema)
    isi = _chat(
        [
            {"role": "system", "content": system_full},
            {"role": "user", "content": user_prompt},
        ],
        model_name,
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=MAX_TOKENS,
    )
    return _bersihkan_json(isi)


def _bersihkan_json(teks: str) -> str:
    """Buang pagar markdown ```json ... ``` jika model tetap membungkusnya."""
    t = teks.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[-1] if "\n" in t else t
        if t.endswith("```"):
            t = t[: -3]
        t = t.replace("```json", "").replace("```", "").strip()
    return t


def _mime_of(path: str) -> str:
    mime, _ = mimetypes.guess_type(path)
    return mime or "application/octet-stream"


def _ekstrak_teks_dokumen(path: str, mime: str) -> str:
    """Ekstrak teks dari PDF/DOCX/PPTX (endpoint OpenAI-compat tidak menerima file PDF)."""
    from router.parse_file import ekstrak_pdf, ekstrak_docx, ekstrak_pptx, bersihkan_teks

    with open(path, "rb") as f:
        konten = f.read()
    if mime == "application/pdf" or path.lower().endswith(".pdf"):
        teks, _ = ekstrak_pdf(konten)
    elif path.lower().endswith(".docx"):
        teks, _ = ekstrak_docx(konten)
    elif path.lower().endswith(".pptx"):
        teks, _ = ekstrak_pptx(konten)
    else:
        try:
            teks = konten.decode("utf-8", errors="ignore")
        except Exception:
            teks = ""
    return bersihkan_teks(teks)


def _bangun_konten_multimodal(user_prompt: str, file_paths: list[str]) -> list:
    """Susun list content OpenAI: teks + image_url (gambar) + teks hasil ekstrak (dokumen)."""
    konten = [{"type": "text", "text": user_prompt}]
    for path in file_paths:
        mime = _mime_of(path)
        nama = os.path.basename(path)
        if mime in IMAGE_MIME:
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("ascii")
            konten.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{b64}"},
            })
        else:
            teks = _ekstrak_teks_dokumen(path, mime)
            konten.append({
                "type": "text",
                "text": f"\n\n--- Isi file '{nama}' ---\n{teks}\n--- akhir file ---",
            })
    return konten


def panggil_openai_multimodal(system_prompt: str, user_prompt: str, file_paths: list[str],
                              model_name: str = DEFAULT_MODEL, response_schema=None) -> str:
    """
    Versi multimodal untuk endpoint OpenAI-compatible.
    Gambar dikirim sebagai image_url (vision). Dokumen (PDF/DOCX/PPTX) diekstrak teksnya
    secara lokal lalu diselipkan ke prompt karena endpoint tidak menerima file PDF.
    """
    if not key_cycler or not api_keys:
        raise RuntimeError("OPENAI_API_KEYS belum di-set di environment variables (.env)")
    if not BASE_URL:
        raise RuntimeError("OPENAI_BASE_URL belum di-set di environment variables (.env)")

    system_full = (system_prompt or "") + _instruksi_schema(response_schema)
    konten_user = _bangun_konten_multimodal(user_prompt, file_paths)
    isi = _chat(
        [
            {"role": "system", "content": system_full},
            {"role": "user", "content": konten_user},
        ],
        model_name,
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=MAX_TOKENS,
    )
    return _bersihkan_json(isi)


def baca_gambar_openai(image_bytes: bytes, mime_type: str) -> str:
    """OCR gambar via vision endpoint OpenAI-compatible. Mengembalikan teks mentah."""
    if not key_cycler or not api_keys:
        raise RuntimeError("OPENAI_API_KEYS belum di-set di environment variables (.env)")
    if not BASE_URL:
        raise RuntimeError("OPENAI_BASE_URL belum di-set di environment variables (.env)")

    prompt = ("Ekstrak seluruh teks yang ada di gambar ini secara presisi. Perbaiki typo ringan jika ada. "
              "Pertahankan format jika itu rumus atau tabel. Jangan tambahkan komentar apa pun selain teks di gambar.")
    b64 = base64.b64encode(image_bytes).decode("ascii")
    konten = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
    ]
    return _chat(
        [{"role": "user", "content": konten}],
        DEFAULT_MODEL,
        temperature=0.2,
        max_tokens=MAX_TOKENS,
    )
