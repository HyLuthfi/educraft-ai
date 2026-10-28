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
      const deductCheck = await deductUserBalance(supabase, user.id, DEFAULT_AI_COST);
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
    const body = await req.json();

    const res = await fetch(`${backendUrl}/api/correct`, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.AI_ENGINE_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      // Refund saldo jika backend gagal
      if (user) {
        await creditUserBalance(supabase, user.id, DEFAULT_AI_COST).catch(() => {});
      }
      const errorText = await res.text();
      console.error("Backend Error:", errorText);
      return NextResponse.json(
        { error: `Backend Python Gagal: ${res.status} - ${errorText}` },
        { status: res.status || 500 }
      );
    }

    // Teruskan stream SSE apa adanya ke client (tanpa buffering).
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Next.js Proxy Error:", error.message);
    return NextResponse.json(
      { error: "Gagal menyambung ke server AI Engine" },
      { status: 500 }
    );
  }
}
