import { NextResponse } from "next/server";
import { buatSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.konten_materi || typeof body.konten_materi !== "string" || !body.konten_materi.trim()) {
      body.konten_materi = "Materi Pembelajaran Umum";
    }
    
    try {
      const supabase = await buatSupabaseServer();
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      
      if (user && body.konten_materi) {
        const { data: existing } = await supabase
          .from("bank_materi")
          .select("id")
          .eq("user_id", user.id)
          .eq("konten_mentah", body.konten_materi)
          .single();
          
        if (!existing) {
          let judul = body.konten_materi.substring(0, 50).trim();
          if (body.konten_materi.length > 50) judul += "...";
          
          await supabase.from("bank_materi").insert({
            user_id: user.id,
            judul: judul,
            jenis_sumber: "teks",
            konten_mentah: body.konten_materi
          });
        }
      }
    } catch (e: any) {
      console.warn("Peringatan Supabase bank_materi diabaikan:", e?.message || e);
    }

    
    const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";
    
    const res = await fetch(`${backendUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "", 
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend Error:", errorText);
      let pesanError = "Gagal menghasilkan soal dari AI";
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.detail && Array.isArray(parsed.detail)) {
          const firstErr = parsed.detail[0];
          if (firstErr.type === "string_too_short") {
            pesanError = `Materi pembelajaran terlalu pendek (minimal ${firstErr.ctx?.min_length || 5} karakter). Silakan tambahkan materi lebih lengkap.`;
          } else {
            pesanError = firstErr.msg || pesanError;
          }
        } else if (typeof parsed.detail === "string") {
          pesanError = parsed.detail;
        }
      } catch {
        if (errorText.includes("<html") || errorText.includes("<!DOCTYPE") || errorText.includes("524") || errorText.includes("Cloudflare")) {
          pesanError = "Waktu pemrosesan melebihi batas (Cloudflare Timeout 524). Sistem telah diperbarui ke mode paralel, silakan coba kembali.";
        } else {
          pesanError = errorText || pesanError;
        }
      }
      return NextResponse.json(
        { error: pesanError },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Set image_url langsung ke URL Pollinations (tanpa download+upload blocking).
    // Server balas instan; client render gambar secara lazy.
    if (data.soal && Array.isArray(data.soal)) {
      const typeRank = (item: any) => {
        const s = (item?.tipe || "").toLowerCase().trim();
        const opsi = item?.opsi || [];
        let isBS = s.includes("benar") || s.includes("salah") || s === "bs" || s.includes("true_false") || s.includes("tf");
        if (!isBS && Array.isArray(opsi) && opsi.length === 2) {
          const texts = opsi.map((o: any) => (o?.teks || "").toLowerCase().trim());
          if (texts.includes("benar") && texts.includes("salah")) {
            isBS = true;
          }
        }
        if (isBS) return 3;
        if (s === "pg" || s.includes("pilihan")) return 1;
        if (s.includes("isian")) return 2;
        if (s.includes("essay") || s.includes("uraian")) return 4;
        return 5;
      };
      data.soal.sort((a: any, b: any) => typeRank(a) - typeRank(b));

      for (const soalItem of data.soal) {
        if (soalItem.image_prompt && soalItem.image_prompt.trim() !== "") {
          const promptEncoded = encodeURIComponent(soalItem.image_prompt);
          soalItem.image_url = `https://image.pollinations.ai/prompt/${promptEncoded}?width=800&height=400&nologo=true&seed=42`;
        }
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Next.js Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
