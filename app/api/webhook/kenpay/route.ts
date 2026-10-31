import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { buatSupabaseServer } from "@/lib/supabase/server";
import { creditUserBalance } from "@/lib/wallet";

const KENPAY_INTERNAL_URL = process.env.KENPAY_INTERNAL_URL || "http://127.0.0.1:20190";
const KENPAY_PUBLIC_URL = process.env.KENPAY_PUBLIC_URL || "https://pay.saitech.uno";
const KENPAY_SECRET = process.env.KENPAY_SECRET || "sec_edu_9f81a7b32c45e6d1";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-kenpay-signature");

    // Validasi HMAC Signature jika disertakan oleh gateway
    if (signatureHeader && KENPAY_SECRET) {
      try {
        const expected = "sha256=" + crypto.createHmac("sha256", KENPAY_SECRET).update(rawBody).digest("hex");
        const a = Buffer.from(signatureHeader);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          console.warn("[KENPAY WEBHOOK] Signature HMAC mismatch:", signatureHeader);
          return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
        }
      } catch (sigErr) {
        console.warn("[KENPAY WEBHOOK] Gagal verifikasi signature:", sigErr);
      }
    }

    const body = JSON.parse(rawBody);
    console.log("[KENPAY WEBHOOK RECEIVED]", body);

    const orderId = body.orderId || body.id;
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // Double check status order ke engine gateway langsung untuk mencegah pemalsuan webhook
    let verifyRes = await fetch(`${KENPAY_INTERNAL_URL}/api/orders/${encodeURIComponent(orderId)}`).catch(() => null);
    if (!verifyRes || !verifyRes.ok) {
      verifyRes = await fetch(`${KENPAY_PUBLIC_URL}/api/orders/${encodeURIComponent(orderId)}`);
    }

    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Order verifikasi gagal di gateway" }, { status: 404 });
    }

    const verifyData = await verifyRes.json();
    const order = verifyData.data;

    const isPaid = order.status === "LUNAS" || order.status === "PAID";
    if (!isPaid) {
      return NextResponse.json({ message: "Order belum lunas, diabaikan" }, { status: 200 });
    }

    // Ambil userId dari metadata order
    let metadata = order.metadata;
    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {}
    }

    const userId = metadata?.user_id || body.metadata?.user_id;
    const topupNominal = order.base_amount || metadata?.topup_nominal || 10000;

    if (!userId) {
      console.warn("[KENPAY WEBHOOK] Tidak ada user_id di metadata order:", orderId);
      return NextResponse.json({ message: "No user_id found in order metadata" }, { status: 200 });
    }

    const supabase = await buatSupabaseServer();

    // Kreditkan saldo dan naikkan level akun menjadi EduCraft Pro
    await creditUserBalance(supabase, userId, topupNominal);

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan saldo Rp ${topupNominal.toLocaleString("id-ID")} untuk user ${userId}`,
    });
  } catch (error: any) {
    console.error("[KENPAY WEBHOOK ERROR]", error);
    return NextResponse.json(
      { error: "Webhook error: " + error.message },
      { status: 500 }
    );
  }
}
