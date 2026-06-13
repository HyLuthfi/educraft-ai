import os
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL_DEFAULT = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def panggil_groq(system_prompt: str, user_prompt: str, model: str = MODEL_DEFAULT) -> str:
    if not client:
        raise RuntimeError("GROQ_API_KEY belum di-set")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=8000,
        response_format={"type": "json_object"},
    )

    return response.choices[0].message.content or ""


def hitung_token(teks: str) -> int:
    return len(teks.split()) * 1.3.__int__()
