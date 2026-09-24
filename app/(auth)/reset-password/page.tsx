"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import AuthVisual from "../components/AuthVisual";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sedangProses, setSedangProses] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key"
  );

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok. Harap periksa kembali.");
      return;
    }

    setSedangProses(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setIsSuccess(true);
        toast.success("Kata sandi berhasil diperbarui!");
        setTimeout(() => {
          router.push("/create");
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui kata sandi.");
    } finally {
      setSedangProses(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#121212] flex transition-colors">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24 py-12 max-w-xl mx-auto w-full">
        {/* Brand Header */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <img
            src="/logo-light.png"
            alt="EduCraft Logo"
            className="h-9 w-auto object-contain dark:hidden"
          />
          <img
            src="/logo-dark.png"
            alt="EduCraft Logo"
            className="h-9 w-auto object-contain hidden dark:block"
          />
          <span className="font-editorial font-bold text-xl text-black dark:text-white">
            EduCraft AI
          </span>
        </Link>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1e1e1e] border-3 border-black dark:border-white shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] p-6 sm:p-8 space-y-4"
          >
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 border-2 border-black dark:border-white flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>

            <h2 className="text-xl font-editorial font-bold text-black dark:text-white">
              Kata Sandi Berhasil Diperbarui!
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              Kata sandi akun Anda telah diperbarui dengan aman. Anda akan otomatis dialihkan ke dasbor kerja...
            </p>

            <div className="pt-2">
              <Link
                href="/create"
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              >
                <span>Buka Dasbor Sekarang</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
                Buat Kata Sandi Baru
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed">
                Tentukan kata sandi baru untuk akun pendidik Anda. Gunakan minimal 6 karakter.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-100 dark:bg-red-950/40 border-2 border-red-500 text-red-800 dark:text-red-300 text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0px_0px_#EF4444]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-11 pr-11 py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/20 focus:shadow-[3px_3px_0px_0px_#000] dark:focus:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] outline-none text-xs sm:text-sm font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/20 focus:shadow-[3px_3px_0px_0px_#000] dark:focus:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] outline-none text-xs sm:text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sedangProses}
                className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black font-black uppercase text-xs tracking-wider border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {sedangProses ? (
                  <span>Menyimpan Sandi...</span>
                ) : (
                  <>
                    <span>Simpan Kata Sandi Baru</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <AuthVisual />
    </div>
  );
}
