import { NextResponse } from "next/server";
import { buatSupabaseServer } from "@/lib/supabase/server";
import { deductUserBalance, creditUserBalance, DEFAULT_AI_COST } from "@/lib/wallet";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.konten_materi || typeof body.konten_materi !== "string" || !body.konten_materi.trim()) {
      body.konten_materi = "Materi Pembelajaran Umum";
    }

    const supabase = await buatSupabaseServer();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    // ── Cek dan Potong Saldo Akun (Rp 1.000 / request) ──
    if (user) {
      const deductCheck = await deductUserBalance(
        supabase,
        user.id,
        DEFAULT_AI_COST,
        "Buat Paket Soal AI",
        "Perumusan butir naskah soal ujian"
      );
      if (!deductCheck.success) {
        return NextResponse.json(
          {
            error: deductCheck.error,
            message: deductCheck.message,
            code: "INSUFFICIENT_BALANCE",
            currentBalance: deductCheck.currentBalance,
            required: deductCheck.required,
          },
          { status: 402 }
        );
      }
    }
    
    try {
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
      // Refund saldo jika AI backend gagal memproses
      if (user) {
        await creditUserBalance(
          supabase,
          user.id,
          DEFAULT_AI_COST,
          "Refund: Buat Soal Gagal",
          "Pengembalian saldo karena proses AI gagal"
        ).catch(() => {});
      }
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
          pesanError = "Waktu pemrosesan melebihi batas (Cloudflare Timeout 524). Silakan coba lagi.";
        } else {
          pesanError = errorText || pesanError;
        }
      }
      return NextResponse.json(
        { error: pesanError },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      return new Response(res.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Next.js Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
