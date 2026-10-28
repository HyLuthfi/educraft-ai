import { NextResponse } from "next/server";
import { buatSupabaseServer } from "@/lib/supabase/server";
import { creditUserBalance, getOrCreateUserWallet } from "@/lib/wallet";

const KENPAY_INTERNAL_URL = process.env.KENPAY_INTERNAL_URL || "http://127.0.0.1:20190";
const KENPAY_PUBLIC_URL = process.env.KENPAY_PUBLIC_URL || "https://pay.saitech.uno";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json({ error: "Parameter order_id wajib diisi" }, { status: 400 });
    }

    const supabase = await buatSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Cek status order langsung ke engine gateway KenPay
    let res = await fetch(`${KENPAY_INTERNAL_URL}/api/orders/${encodeURIComponent(orderId)}`).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(`${KENPAY_PUBLIC_URL}/api/orders/${encodeURIComponent(orderId)}`);
    }

    if (!res.ok) {
      return NextResponse.json({ error: "Order tidak ditemukan di gateway" }, { status: 404 });
    }

    const json = await res.json();
    const order = json.data;

    const isPaid = order.status === "LUNAS" || order.status === "PAID";

    if (!isPaid) {
      return NextResponse.json({
        success: true,
        settled: false,
        status: order.status,
      });
    }

    // 2. Jika LUNAS, periksa apakah sudah dikreditkan agar tidak double-credit (Idempotensi)
    const creditedOrders = (user.user_metadata?.credited_orders as string[]) || [];

    if (!creditedOrders.includes(orderId)) {
      const topupNominal = order.base_amount || 10000;
      const creditRes = await creditUserBalance(supabase, user.id, topupNominal);

      // Simpan riwayat order yang sudah lunas di user_metadata
      const updatedCredited = [...creditedOrders, orderId];
      await supabase.auth.updateUser({
        data: { credited_orders: updatedCredited },
      });

      return NextResponse.json({
        success: true,
        settled: true,
        justCredited: true,
        nominal: topupNominal,
        newBalance: creditRes.newBalance,
        plan: creditRes.plan,
      });
    }

    // Sudah pernah dikreditkan sebelumnya
    const currentWallet = await getOrCreateUserWallet(supabase, user.id);
    return NextResponse.json({
      success: true,
      settled: true,
      justCredited: false,
      newBalance: currentWallet.balance,
      plan: currentWallet.plan,
    });
  } catch (error: any) {
    console.error("Topup Status Check Error:", error);
    return NextResponse.json(
      { error: "Gagal memeriksa status order: " + error.message },
      { status: 500 }
    );
  }
}
