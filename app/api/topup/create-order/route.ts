import { NextResponse } from "next/server";
import { buatSupabaseServer } from "@/lib/supabase/server";

const KENPAY_INTERNAL_URL = process.env.KENPAY_INTERNAL_URL || "http://127.0.0.1:20190";
const KENPAY_PUBLIC_URL = process.env.KENPAY_PUBLIC_URL || "https://pay.saitech.uno";

export async function POST(req: Request) {
  try {
    const supabase = await buatSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sesi login berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const amount = parseInt(body.amount, 10);

    const ALLOWED_NOMINALS = [10000, 20000, 50000, 100000, 250000];
    if (!amount || !ALLOWED_NOMINALS.includes(amount)) {
      return NextResponse.json(
        { error: "Nominal topup tidak valid. Pilih antara Rp 10.000, Rp 20.000, Rp 50.000, atau Rp 100.000." },
        { status: 400 }
      );
    }

    const payload = {
      amount: amount,
      description: `Top Up Saldo EduCraft AI (Rp ${amount.toLocaleString("id-ID")})`,
      callback_url: "https://educraft.saitech.co.id/api/webhook/kenpay",
      return_url: "https://educraft.saitech.co.id/settings",
      app_id: "educraft",
      metadata: {
        user_id: user.id,
        email: user.email || "",
        topup_nominal: amount,
      },
    };

    let res = await fetch(`${KENPAY_INTERNAL_URL}/api/orders/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    // Fallback ke public URL jika internal port bermasalah
    if (!res || !res.ok) {
      res = await fetch(`${KENPAY_PUBLIC_URL}/api/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("KenPay Error:", errText);
      return NextResponse.json(
        { error: "Gagal membuat invoice pembayaran via gateway KenPay" },
        { status: 502 }
      );
    }

    const result = await res.json();
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Gagal inisialisasi order pembayaran" },
        { status: 500 }
      );
    }

    const orderData = result.data;

    return NextResponse.json({
      success: true,
      data: {
        orderId: orderData.orderId || orderData.id,
        description: orderData.description,
        baseAmount: orderData.baseAmount || orderData.base_amount,
        uniqueCode: orderData.uniqueCode || orderData.unique_code,
        totalAmount: orderData.totalAmount || orderData.total_amount,
        expiresAt: orderData.expiresAt || orderData.expires_at,
        paymentUrl: `${KENPAY_PUBLIC_URL}/pay/${orderData.orderId || orderData.id}`,
      },
    });
  } catch (error: any) {
    console.error("TopUp Create Order Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat membuat order: " + error.message },
      { status: 500 }
    );
  }
}
