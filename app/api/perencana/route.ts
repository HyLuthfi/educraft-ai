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
        "Perencana Pembelajaran AI",
        "Penyusunan modul ajar & silabus kurikulum"
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

    const backendUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000";

    const contentType = req.headers.get("content-type") || "";
    let fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "",
      },
    };

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      fetchOptions.body = formData;
    } else {
      const body = await req.json();
      fetchOptions.headers = {
        ...fetchOptions.headers,
        "Content-Type": "application/json",
      };
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(`${backendUrl}/api/lesson-plan`, fetchOptions);

    if (!res.ok) {
      if (user) {
        await creditUserBalance(
          supabase,
          user.id,
          DEFAULT_AI_COST,
          "Refund: Rencana Ajar Gagal",
          "Pengembalian saldo karena proses AI gagal"
        ).catch(() => {});
      }
      const errorText = await res.text();
      console.error("Backend Error:", errorText);
      return NextResponse.json(
        { error: `Backend Python Gagal: ${res.status} - ${errorText}` },
        { status: res.status }
      );
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
