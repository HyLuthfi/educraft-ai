import { NextResponse } from "next/server";
import { buatSupabaseServer } from "@/lib/supabase/server";
import { deductUserBalance, creditUserBalance, DEFAULT_AI_COST } from "@/lib/wallet";

export async function POST(req: Request) {
  try {
    const supabase = await buatSupabaseServer();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    // ── Cek dan Potong Saldo Akun (Rp 1.000 / request) ──
    if (user) {
      const deductCheck = await deductUserBalance(
        supabase,
        user.id,
        DEFAULT_AI_COST,
        "Ekstrak Dokumen Absensi AI",
        "Digitalisasi dan pemindaian berkas presensi fisik"
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

    const formData = await req.formData();

    const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";

    const res = await fetch(`${backendUrl}/api/attendance/extract`, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "",
      },
      body: formData,
    });

    if (!res.ok) {
      if (user) {
        await creditUserBalance(
          supabase,
          user.id,
          DEFAULT_AI_COST,
          "Refund: Ekstrak Absensi Gagal",
          "Pengembalian saldo karena proses AI gagal"
        ).catch(() => {});
      }
      const errorText = await res.text();
      console.error("Backend Absensi Error:", errorText);
      return NextResponse.json(
        { error: `Gagal memproses absensi: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Next.js Proxy Absensi Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
