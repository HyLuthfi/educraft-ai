import { NextResponse } from "next/server";
import { buatSupabaseServer } from "@/lib/supabase/server";
import { getOrCreateUserWallet, creditUserBalance, DEFAULT_AI_COST, INITIAL_FREE_BALANCE } from "@/lib/wallet";

const KENPAY_INTERNAL_URL = process.env.KENPAY_INTERNAL_URL || "http://127.0.0.1:20190";
const KENPAY_PUBLIC_URL = process.env.KENPAY_PUBLIC_URL || "https://pay.saitech.uno";

export async function GET() {
  try {
    const supabase = await buatSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Sinkronisasi Otomatis Pesanan Pending dari Gateway KenPay ──
    const pendingOrders = (user.user_metadata?.pending_topup_orders as string[]) || [];
    const creditedOrders = (user.user_metadata?.credited_orders as string[]) || [];

    if (pendingOrders.length > 0) {
      let metadataChanged = false;
      const remainingPending: string[] = [];
      const updatedCredited: string[] = [...creditedOrders];

      for (const orderId of pendingOrders) {
        try {
          let res = await fetch(`${KENPAY_INTERNAL_URL}/api/orders/${encodeURIComponent(orderId)}`).catch(() => null);
          if (!res || !res.ok) {
            res = await fetch(`${KENPAY_PUBLIC_URL}/api/orders/${encodeURIComponent(orderId)}`);
          }

          if (res && res.ok) {
            const json = await res.json();
            const order = json.data;

            if (order.status === "PAID" || order.status === "LUNAS") {
              if (!updatedCredited.includes(orderId)) {
                const nominal = order.base_amount || 10000;
                await creditUserBalance(
                  supabase,
                  user.id,
                  nominal,
                  `Top Up QRIS (${orderId})`,
                  "Pembayaran terkonfirmasi via gateway KenPay"
                );
                updatedCredited.push(orderId);
              }
              metadataChanged = true;
              continue; // Order lunas dikeluarkan dari pending
            } else if (order.status === "EXPIRED" || order.status === "CANCELLED") {
              metadataChanged = true;
              continue; // Order expired dikeluarkan dari pending
            }
          }
          remainingPending.push(orderId);
        } catch (e) {
          remainingPending.push(orderId);
        }
      }

      if (metadataChanged) {
        await supabase.auth.updateUser({
          data: {
            pending_topup_orders: remainingPending,
            credited_orders: updatedCredited,
          },
        }).catch(() => {});
      }
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
