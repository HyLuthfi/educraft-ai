import { SupabaseClient } from "@supabase/supabase-js";

export interface WalletLogItem {
  id: string;
  type: "IN" | "OUT";
  amount: number;
  title: string;
  description?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface WalletInfo {
  balance: number;
  plan: string;
  isPro: boolean;
  logs: WalletLogItem[];
}

export const INITIAL_FREE_BALANCE = 50000; // Rp 50.000 saldo gratis awal
export const DEFAULT_AI_COST = 1000; // Rp 1.000 per request AI

/**
 * Mengambil informasi saldo Rupiah, status paket, dan riwayat mutasi user.
 * Jika belum ada data atau user baru, beri saldo awal Rp 50.000 beserta log bonus sambutan.
 */
export async function getOrCreateUserWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<WalletInfo> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tokens_left, plan")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error getOrCreateUserWallet:", error);
  }

  let balance = profile?.tokens_left;
  let plan = profile?.plan || "Starter";

  // Jika baru mendaftar atau saldo belum diinisialisasi, berikan jatah saldo gratis Rp 50.000
  if (balance === null || balance === undefined) {
    balance = INITIAL_FREE_BALANCE;
    try {
      await supabase
        .from("profiles")
        .update({ tokens_left: balance, plan: plan || "Starter" })
        .eq("id", userId);
    } catch (e) {
      console.warn("Gagal inisialisasi saldo default:", e);
    }
  }

  const isPro =
    plan === "EduCraft Pro" ||
    plan === "Pro" ||
    plan === "PRO" ||
    plan === "Pro Plan";

  // Ambil log transaksi dari user_metadata Supabase
  let logs: WalletLogItem[] = [];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.wallet_logs && Array.isArray(user.user_metadata.wallet_logs)) {
      logs = user.user_metadata.wallet_logs;
    } else {
      // Buat log sambutan default
      logs = [
        {
          id: "tx_initial_" + userId,
          type: "IN",
          amount: INITIAL_FREE_BALANCE,
          title: "Saldo Awal Pengguna Baru",
          description: "Bonus saldo selamat datang EduCraft AI (50x Sesi)",
          balanceAfter: INITIAL_FREE_BALANCE,
          createdAt: user?.created_at || new Date().toISOString(),
        },
      ];
    }
  } catch (err) {
    console.warn("Gagal mengambil log dari user_metadata:", err);
  }

  return {
    balance: Number(balance) || 0,
    plan: isPro ? "EduCraft Pro" : "Starter",
    isPro,
    logs,
  };
}

/**
 * Validasi dan potong saldo user secara aman (Rp 1.000 per request AI)
 * serta mencatat mutasi pengeluaran ke log transaksi.
 */
export async function deductUserBalance(
  supabase: SupabaseClient,
  userId: string,
  amount: number = DEFAULT_AI_COST,
  title: string = "Penggunaan Layanan AI",
  description: string = "Biaya komputasi 1x request AI"
): Promise<
  | { success: true; newBalance: number; deducted: number }
  | { success: false; error: string; message: string; currentBalance: number; required: number }
> {
  const wallet = await getOrCreateUserWallet(supabase, userId);

  if (wallet.balance < amount) {
    return {
      success: false,
      error: "INSUFFICIENT_BALANCE",
      message: `Saldo EduCraft Anda tidak mencukupi (sisa Rp ${wallet.balance.toLocaleString("id-ID")}). Biaya layanan adalah Rp ${amount.toLocaleString("id-ID")}. Silakan isi ulang saldo akun Anda.`,
      currentBalance: wallet.balance,
      required: amount,
    };
  }

  const newBalance = wallet.balance - amount;
  const { error } = await supabase
    .from("profiles")
    .update({ tokens_left: newBalance })
    .eq("id", userId);

  if (error) {
    console.error("Gagal potong saldo:", error);
    return {
      success: false,
      error: "WALLET_UPDATE_FAILED",
      message: "Gagal memperbarui saldo di database: " + error.message,
      currentBalance: wallet.balance,
      required: amount,
    };
  }

  // Catat log mutasi pengeluaran (OUT)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const existingLogs: WalletLogItem[] = Array.isArray(user.user_metadata?.wallet_logs)
        ? user.user_metadata.wallet_logs
        : wallet.logs;

      const newLog: WalletLogItem = {
        id: "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        type: "OUT",
        amount,
        title,
        description,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString(),
      };

      const updatedLogs = [newLog, ...existingLogs].slice(0, 100);
      await supabase.auth.updateUser({
        data: { wallet_logs: updatedLogs },
      });
    }
  } catch (logErr) {
    console.warn("Gagal menyimpan log mutasi:", logErr);
  }

  return {
    success: true,
    newBalance,
    deducted: amount,
  };
}

/**
 * Tambah saldo user saat pembayaran/topup berhasil atau saat refund,
 * serta mencatat mutasi pemasukan ke log transaksi.
 */
export async function creditUserBalance(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  title: string = "Isi Ulang Saldo QRIS",
  description: string = "Pembayaran via gateway KenPay berhasil"
): Promise<{ success: boolean; newBalance: number; plan: string }> {
  const wallet = await getOrCreateUserWallet(supabase, userId);
  const newBalance = wallet.balance + amount;

  const isRefund = title.toLowerCase().includes("refund");
  const updatePayload: any = { tokens_left: newBalance };
  if (!isRefund) {
    updatePayload.plan = "EduCraft Pro";
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  if (error) {
    console.error("Gagal tambah saldo:", error);
    throw error;
  }

  // Catat log mutasi pemasukan (IN)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const existingLogs: WalletLogItem[] = Array.isArray(user.user_metadata?.wallet_logs)
        ? user.user_metadata.wallet_logs
        : wallet.logs;

      const newLog: WalletLogItem = {
        id: "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        type: "IN",
        amount,
        title,
        description,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString(),
      };

      const updatedLogs = [newLog, ...existingLogs].slice(0, 100);
      await supabase.auth.updateUser({
        data: { wallet_logs: updatedLogs },
      });
    }
  } catch (logErr) {
    console.warn("Gagal menyimpan log credit:", logErr);
  }

  return {
    success: true,
    newBalance,
    plan: isRefund ? wallet.plan : "EduCraft Pro",
  };
}
