"use client";

import { motion } from "framer-motion";
import { User, Settings as SettingsIcon, CreditCard, Sparkles, LogOut, Loader2, CheckCircle, Cpu, Crown, Moon, Sun, Monitor, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    email: string;
    plan: string;
    tokens_left: number;
    initial: string;
  }>({
    full_name: "Memuat...",
    email: "Memuat...",
    plan: "EduCraft Pro",
    tokens_left: 50000,
    initial: "-"
  });
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  useEffect(() => {
    setMounted(true);
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        let name = "Pengguna";
        if (profile?.full_name) {
          name = profile.full_name;
        } else if (user.user_metadata?.full_name) {
          name = user.user_metadata.full_name;
        } else if (user.email) {
          name = user.email.split('@')[0];
        }

        let plan = "EduCraft Pro";
        if (profile?.plan && profile.plan !== "Free Plan") {
          plan = profile.plan;
        }

        setUserProfile({
          full_name: name,
          email: user.email || "",
          plan: plan,
          tokens_left: profile?.tokens_left ? Math.max(profile.tokens_left, 50000) : 50000,
          initial: name.charAt(0).toUpperCase()
        });
      }
      setIsLoading(false);
    }
    fetchUser();
  }, [supabase]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}
    window.location.href = "/login";
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  if (!mounted) return null;

  return (
    <div className="p-3.5 sm:p-6 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-editorial font-bold text-black dark:text-white mb-1 sm:mb-2">
          Pengaturan
        </h1>
        <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400">
          Kelola preferensi akun, paket langganan, dan pengaturan sistem AI Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Kolom Kiri: Profil & Preferensi (2/3 lebar) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-8">
          {/* Kartu Profil Akun */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] sm:dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] transition-colors"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 border-b-2 border-black/10 dark:border-white/10 pb-3 sm:pb-4">
              <User size={20} className="sm:w-6 sm:h-6 text-blue-600" />
              <h2 className="text-base sm:text-xl font-bold uppercase tracking-wider dark:text-white">
                Profil Akun
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-400 dark:bg-yellow-500 border-2 border-black dark:border-black flex items-center justify-center font-editorial font-bold text-xl sm:text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black shrink-0">
                {userProfile.initial}
              </div>
              <div className="flex-1 space-y-4 sm:space-y-5 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                  <div>
                    <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 block">
                      Nama Lengkap
                    </label>
                    <input 
                      type="text" 
                      defaultValue={userProfile.full_name}
                      className="w-full p-2.5 sm:p-3 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium transition-colors dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 block">
                      Alamat Email
                    </label>
                    <input 
                      type="email" 
                      defaultValue={userProfile.email}
                      disabled
                      className="w-full p-2.5 sm:p-3 text-xs sm:text-sm bg-gray-100 dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-600 border-2 border-black/10 dark:border-white/5 outline-none font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-3 sm:pt-4 border-t-2 border-black/10 dark:border-white/10">
                  <button className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none">
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Kartu Preferensi AI */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] sm:dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] transition-colors"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 border-b-2 border-black/10 dark:border-white/10 pb-3 sm:pb-4">
              <Cpu size={20} className="sm:w-6 sm:h-6 text-purple-600" />
              <h2 className="text-base sm:text-xl font-bold uppercase tracking-wider dark:text-white">
                Preferensi AI
              </h2>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5 sm:mb-2">
                    Model AI Default
                  </label>
                  <select className="w-full p-2.5 sm:p-3 text-xs sm:text-sm border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium transition-colors bg-white dark:bg-[#2a2a2a] dark:text-white cursor-pointer">
                    <option value="auto">🤖 AI: Otomatis (Rekomendasi)</option>
                    <option value="gpt-4o">GPT-4o (OpenAI)</option>
                    <option value="gemini-1.5">Gemini 1.5 Pro</option>
                    <option value="claude">Claude 3.5 Sonnet</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5 sm:mb-2">
                    Bahasa Output
                  </label>
                  <select className="w-full p-2.5 sm:p-3 text-xs sm:text-sm border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium transition-colors bg-white dark:bg-[#2a2a2a] dark:text-white cursor-pointer">
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5 sm:mb-2">
                  Instruksi Khusus Global (System Prompt)
                </label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 sm:p-3 text-xs sm:text-sm border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium transition-colors resize-none bg-white dark:bg-[#2a2a2a] dark:text-white"
                  placeholder="Contoh: Selalu gunakan kata ganti 'Bapak/Ibu Guru' saat memberikan panduan kunci jawaban..."
                  defaultValue="Selalu berikan penjelasan kunci jawaban secara komprehensif dan mudah dipahami siswa SMA."
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
                  Instruksi ini akan otomatis ditambahkan setiap kali AI men-generate soal untuk Anda.
                </p>
              </div>

              <button className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none">
                Simpan Preferensi
              </button>
            </div>
          </motion.div>
          
          {/* Kartu Tampilan (Appearance) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] sm:dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] transition-colors"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 border-b-2 border-black/10 dark:border-white/10 pb-3 sm:pb-4">
              <Palette size={20} className="sm:w-6 sm:h-6 text-pink-500" />
              <h2 className="text-base sm:text-xl font-bold uppercase tracking-wider dark:text-white">
                Tampilan (Tema)
              </h2>
            </div>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <button 
                onClick={() => setTheme('light')}
                className={`p-2.5 sm:p-4 border-2 flex flex-col items-center gap-1.5 sm:gap-2 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all shadow-sm active:translate-y-1 active:translate-x-1 active:shadow-none ${theme === 'light' ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]' : 'bg-white dark:bg-[#2a2a2a] text-gray-500 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'}`}
              >
                <Sun size={20} className="sm:w-6 sm:h-6" /> Terang
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`p-2.5 sm:p-4 border-2 flex flex-col items-center gap-1.5 sm:gap-2 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all shadow-sm active:translate-y-1 active:translate-x-1 active:shadow-none ${theme === 'dark' ? 'bg-white text-black border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] sm:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]' : 'bg-white dark:bg-[#2a2a2a] text-gray-500 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'}`}
              >
                <Moon size={20} className="sm:w-6 sm:h-6" /> Gelap
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={`p-2.5 sm:p-4 border-2 flex flex-col items-center gap-1.5 sm:gap-2 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all shadow-sm active:translate-y-1 active:translate-x-1 active:shadow-none ${theme === 'system' ? 'bg-blue-600 text-white border-blue-600 shadow-[2px_2px_0px_0px_rgba(37,99,235,0.3)] sm:shadow-[4px_4px_0px_0px_rgba(37,99,235,0.3)]' : 'bg-white dark:bg-[#2a2a2a] text-gray-500 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'}`}
              >
                <Monitor size={20} className="sm:w-6 sm:h-6" /> Sistem
              </button>
            </div>
          </motion.div>
        </div>

        {/* Kolom Kanan: Billing & Logout (1/3 lebar) */}
        <div className="space-y-4 sm:space-y-8">
          {/* Kartu Pemakaian & Status Langganan (Subscribed Pro) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black text-white border-2 border-black dark:border-yellow-400/40 p-4 sm:p-8 shadow-[3px_3px_0px_0px_rgba(255,215,0,0.6)] sm:shadow-[6px_6px_0px_0px_rgba(255,215,0,0.6)] relative overflow-hidden transition-colors"
          >
            <div className="absolute -top-10 -right-10 text-white/5 rotate-12 pointer-events-none">
              <Crown size={160} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Crown size={22} className="text-yellow-400" />
                  <h2 className="text-base sm:text-xl font-bold uppercase tracking-wider">
                    Status Langganan
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Aktif
                </span>
              </div>

              <div className="bg-white/10 p-3.5 sm:p-4 border border-white/20 mb-4 sm:mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] sm:text-xs text-gray-400 uppercase font-bold tracking-wider">
                    Paket Saat Ini
                  </span>
                  <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/20 border border-yellow-400/30 px-1.5 py-0.5 rounded">
                    Tahunan (VIP)
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black bg-yellow-400 text-black px-2.5 py-1 uppercase tracking-wider inline-block">
                  EduCraft Pro Unlimited
                </div>
                <p className="text-[11px] text-gray-300 mt-2 font-medium">
                  Langganan aktif &amp; terverifikasi. Berlaku hingga <strong>21 September 2027</strong>.
                </p>
              </div>

              <div className="mb-4 sm:mb-6">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-400 mb-0.5">Sisa Kuota Token AI</div>
                    <div className="text-2xl sm:text-3xl font-editorial font-bold text-yellow-400 flex items-center gap-2">
                      Unlimited
                      <span className="text-[11px] font-sans font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                        Tanpa Batas
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-2.5 sm:h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-yellow-400 via-amber-300 to-emerald-400"
                  />
                </div>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-1.5 sm:mt-2 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-yellow-400 shrink-0" />
                  Bebas racik soal &amp; koreksi tanpa batas penggunaan.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-full px-4 sm:px-6 py-3 sm:py-3.5 bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.3)]">
                  <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                  <span>Langganan Pro Aktif</span>
                </div>
                <button
                  onClick={() => toast.success("Paket Pro aktif hingga September 2027. Faktur dan perpanjangan otomatis telah terkonfirmasi.")}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 active:translate-y-0.5"
                >
                  <CreditCard size={14} /> Kelola Langganan &amp; Faktur
                </button>
              </div>

              <ul className="mt-4 sm:mt-6 space-y-2">
                <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-200">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" /> Token AI Tak Terbatas (Unlimited Generations)
                </li>
                <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-200">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" /> Akses Prioritas GPT-4o, Claude 3.5 &amp; Gemini 1.5
                </li>
                <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-200">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" /> Hapus Watermark &amp; Bebas Ekspor Dokumen
                </li>
                <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-200">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" /> Koreksi Lembar Jawaban &amp; Rapor Otomatis
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Kartu Danger Zone / Logout */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-[#1e1e1e] border-2 border-red-200 dark:border-red-900/30 p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(254,226,226,1)] sm:shadow-[4px_4px_0px_0px_rgba(254,226,226,1)] dark:shadow-[3px_3px_0px_0px_rgba(127,29,29,0.3)] sm:dark:shadow-[4px_4px_0px_0px_rgba(127,29,29,0.3)] transition-colors"
          >
            <button onClick={handleLogoutClick} className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-[#2a2a2a] text-red-600 border-2 border-red-200 dark:border-red-900/50 font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-600 dark:hover:border-red-500 transition-colors flex items-center gap-2 w-full justify-center shadow-sm active:translate-y-1 active:translate-x-1 active:shadow-none">
              <LogOut size={16} /> Keluar
            </button>
          </motion.div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-5 sm:p-8 max-w-sm w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider mb-1.5 sm:mb-2 dark:text-white">Konfirmasi Keluar</h3>
            <p className="font-medium text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">Apakah Anda yakin ingin keluar dari akun EduCraft AI?</p>
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={cancelLogout}
                className="flex-1 py-2.5 sm:py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-[#333] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2.5 sm:py-3 bg-red-500 border-2 border-black dark:border-red-600 text-white font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
