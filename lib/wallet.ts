import { SupabaseClient } from "@supabase/supabase-js";

export interface WalletInfo {
  balance: number;
  plan: string;
  isPro: boolean;
}

export const INITIAL_FREE_BALANCE = 50000; // Rp 50.000 saldo gratis awal
export const DEFAULT_AI_COST = 1000; // Rp 1.000 per request AI

/**
 * Mengambil informasi saldo Rupiah dan status paket user.
 * Jika belum ada data atau user baru, set saldo awal Rp 50.000.
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

  return {
    balance: Number(balance) || 0,
    plan: isPro ? "EduCraft Pro" : "Starter",
    isPro,
  };
}

/**
 * Validasi dan potong saldo user secara aman (Rp 1.000 per request AI).
 * Mengembalikan error INSUFFICIENT_BALANCE jika saldo < nominal yang dibutuhkan.
 */
export async function deductUserBalance(
  supabase: SupabaseClient,
  userId: string,
  amount: number = DEFAULT_AI_COST
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

  return {
    success: true,
    newBalance,
    deducted: amount,
  };
}

/**
 * Tambah saldo user saat pembayaran/topup berhasil.
 * Akun otomatis di-upgrade ke EduCraft Pro!
 */
export async function creditUserBalance(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<{ success: boolean; newBalance: number; plan: string }> {
  const wallet = await getOrCreateUserWallet(supabase, userId);
  const newBalance = wallet.balance + amount;

  const { error } = await supabase
    .from("profiles")
    .update({
      tokens_left: newBalance,
      plan: "EduCraft Pro",
    })
    .eq("id", userId);

  if (error) {
    console.error("Gagal tambah saldo:", error);
    throw error;
  }

  return {
    success: true,
    newBalance,
    plan: "EduCraft Pro",
  };
}
