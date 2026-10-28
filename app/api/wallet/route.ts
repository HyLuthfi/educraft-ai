import { NextResponse } from "next/server";
import { buatSupabaseServer } from "@/lib/supabase/server";
import { getOrCreateUserWallet, DEFAULT_AI_COST, INITIAL_FREE_BALANCE } from "@/lib/wallet";

export async function GET() {
  try {
    const supabase = await buatSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wallet = await getOrCreateUserWallet(supabase, user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...wallet,
        costPerRequest: DEFAULT_AI_COST,
        initialFreeBalance: INITIAL_FREE_BALANCE,
        formattedBalance: `Rp ${wallet.balance.toLocaleString("id-ID")}`,
        remainingGenerates: Math.floor(wallet.balance / DEFAULT_AI_COST),
      },
    });
  } catch (error: any) {
    console.error("Wallet API Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat informasi saldo: " + error.message },
      { status: 500 }
    );
  }
}
