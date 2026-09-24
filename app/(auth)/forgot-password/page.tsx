"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import AuthVisual from "../components/AuthVisual";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sedangProses, setSedangProses] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSedangProses(true);
    setErrorMsg("");

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setSedangProses(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#121212] flex transition-colors">
      {/* Kolom Kiri: Form Lupa Password */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24 py-12 max-w-xl mx-auto w-full">
        {/* Brand Link */}
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
              Tautan Pemulihan Terkirim!
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              Kami telah mengirimkan instruksi dan tautan pemulihan kata sandi ke{" "}
              <strong className="text-black dark:text-white font-mono">{email}</strong>.
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Silakan periksa kotak masuk atau folder spam email Anda. Klik tautan tersebut untuk membuat kata sandi baru.
            </p>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-black dark:bg-white text-white dark:text-black font-bold uppercase text-xs tracking-wider border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Halaman Masuk</span>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
                Pemulihan Kata Sandi
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed">
                Masukkan alamat email yang terdaftar pada akun EduCraft AI Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-100 dark:bg-red-950/40 border-2 border-red-500 text-red-800 dark:text-red-300 text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0px_0px_#EF4444]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email-reset"
                  className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2"
                >
                  Alamat Email Pendidik
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="email-reset"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guru@sekolah.sch.id"
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
                  <span>Mengirimkan Tautan...</span>
                ) : (
                  <>
                    <span>Kirim Tautan Pemulihan</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white underline transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Ingat kata sandi? Masuk di sini</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Kolom Kanan: Visual Banner */}
      <AuthVisual />
    </div>
  );
}
