import axios from "axios"
import type { HasilGenerateAI, ConfigGenerate } from "@/lib/tipe"

const apiAI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000",
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.AI_ENGINE_API_KEY || "",
  },
})

export async function generateSoal(
  konten_materi: string,
  config: ConfigGenerate
): Promise<HasilGenerateAI> {
  const { data } = await apiAI.post("/api/generate", {
    konten_materi,
    config,
  })
  return data
}

export async function parseFile(file: File): Promise<{ teks_hasil: string; jumlah_halaman: number }> {
  const formData = new FormData()
  formData.append("file", file)

  const { data } = await apiAI.post("/api/parse-file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function aiSearch(
  topik: string,
  jenjang: string,
  mata_pelajaran: string
): Promise<{ materi_terstruktur: string; sumber_referensi: string[] }> {
  const { data } = await apiAI.post("/api/ai-search", {
    topik,
    jenjang,
    mata_pelajaran,
    kedalaman: "medium",
  })
  return data
}

export async function regenerateSoal(
  soal_lama: string,
  konten_materi: string,
  config: Partial<ConfigGenerate>
): Promise<HasilGenerateAI> {
  const { data } = await apiAI.post("/api/regenerate", {
    soal_lama,
    konten_materi,
    config,
  })
  return data
}

export async function exportPdf(
  soal: unknown[],
  header: Record<string, string>,
  sertakan_jawaban: boolean
): Promise<Blob> {
  const { data } = await apiAI.post(
    "/api/export/pdf",
    { soal, header, sertakan_jawaban },
    { responseType: "blob" }
  )
  return data
}
