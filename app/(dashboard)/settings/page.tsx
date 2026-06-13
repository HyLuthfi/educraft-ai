"use client";

import { motion } from "framer-motion";
import { User, Settings as SettingsIcon, CreditCard, Sparkles, LogOut, Loader2, CheckCircle, Cpu, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
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
    plan: "Free Plan",
    tokens_left: 5000,
    initial: "-"
  });
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  useEffect(() => {
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

        setUserProfile({
          full_name: name,
          email: user.email || "",
          plan: profile?.plan || "Free Plan",
          tokens_left: profile?.tokens_left ?? 5000,
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
    await supabase.auth.signOut();
    router.push("/login");
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-editorial font-bold text-black mb-2">
          Pengaturan
        </h1>
        <p className="text-gray-500">
          Kelola preferensi akun, paket langganan, dan pengaturan sistem AI
          Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Profil & Preferensi (2/3 lebar) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Kartu Profil Akun */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center gap-3 mb-6 border-b-2 border-black/10 pb-4">
              <User size={24} className="text-blue-600" />
              <h2 className="text-xl font-bold uppercase tracking-wider">
                Profil Akun
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-16 h-16 bg-yellow-400 border-2 border-black flex items-center justify-center font-editorial font-bold text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {userProfile.initial}
              </div>
              <div className="flex-1 space-y-5 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                      Nama Lengkap
                    </label>
                    <input 
                      type="text" 
                      defaultValue={userProfile.full_name}
                      className="w-full p-3 bg-gray-50 border-2 border-black/20 focus:border-black outline-none font-medium transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                      Alamat Email
                    </label>
                    <input 
                      type="email" 
                      defaultValue={userProfile.email}
                      disabled
                      className="w-full p-3 bg-gray-100 text-gray-500 border-2 border-black/10 outline-none font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4 border-t-2 border-black/10">
                  <button className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:translate-x-1 active:shadow-none">
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
            className="bg-white border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center gap-3 mb-6 border-b-2 border-black/10 pb-4">
              <Cpu size={24} className="text-purple-600" />
              <h2 className="text-xl font-bold uppercase tracking-wider">
                Preferensi AI
              </h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Model AI Default
                  </label>
                  <select className="w-full p-3 border-2 border-black/20 focus:border-black outline-none font-medium transition-colors bg-white cursor-pointer">
                    <option value="auto">🤖 AI: Otomatis (Rekomendasi)</option>
                    <option value="gpt-4o">GPT-4o (OpenAI)</option>
                    <option value="gemini-1.5">Gemini 1.5 Pro</option>
                    <option value="claude">Claude 3.5 Sonnet</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Bahasa Output
                  </label>
                  <select className="w-full p-3 border-2 border-black/20 focus:border-black outline-none font-medium transition-colors bg-white cursor-pointer">
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Instruksi Khusus Global (System Prompt)
                </label>
                <textarea
                  rows={4}
                  className="w-full p-3 border-2 border-black/20 focus:border-black outline-none font-medium transition-colors resize-none"
                  placeholder="Contoh: Selalu gunakan kata ganti 'Bapak/Ibu Guru' saat memberikan panduan kunci jawaban..."
                  defaultValue="Selalu berikan penjelasan kunci jawaban secara komprehensif dan mudah dipahami siswa SMA."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Instruksi ini akan otomatis ditambahkan setiap kali AI
                  men-generate soal untuk Anda.
                </p>
              </div>

              <button className="px-6 py-3 bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:translate-x-1 active:shadow-none">
                Simpan Preferensi
              </button>
            </div>
          </motion.div>
        </div>

        {/* Kolom Kanan: Billing & Logout (1/3 lebar) */}
        <div className="space-y-8">
          {/* Kartu Pemakaian (Usage & Billing) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black text-white border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(255,215,0,0.5)] relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 text-white/5 rotate-12">
              <Crown size={180} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard size={24} className="text-yellow-400" />
                <h2 className="text-xl font-bold uppercase tracking-wider">
                  Pemakaian Token
                </h2>
              </div>

              <div className="bg-white/10 p-4 border border-white/20 mb-6">
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                  Paket Saat Ini
                </div>
                <div className="text-sm font-bold bg-white text-black px-3 py-1 uppercase tracking-wider">
                  {userProfile.plan}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <div className="text-sm font-medium text-gray-400 mb-1">Sisa Kuota Token AI</div>
                    <div className="text-3xl font-editorial font-bold">{userProfile.tokens_left.toLocaleString()} <span className="text-sm font-medium text-gray-500">/ 50,000</span></div>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(userProfile.tokens_left / 50000) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-yellow-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Direset pada 1 Juli 2026
                </p>
              </div>

              <button className="w-full px-6 py-4 bg-yellow-400 text-black font-bold text-sm uppercase tracking-wider hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] active:translate-y-1 active:translate-x-1 active:shadow-none group">
                <Crown size={18} className="group-hover:animate-bounce" />{" "}
                Upgrade ke Pro
              </button>

              <ul className="mt-6 space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle size={14} className="text-green-400" /> Token AI
                  Tak Terbatas
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle size={14} className="text-green-400" /> Akses
                  GPT-4o Prioritas
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle size={14} className="text-green-400" /> Hapus
                  Watermark PDF
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Kartu Danger Zone / Logout */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border-2 border-red-200 p-6 shadow-[4px_4px_0px_0px_rgba(254,226,226,1)]"
          >
            <button onClick={handleLogoutClick} className="px-6 py-3 bg-white text-red-600 border-2 border-red-200 font-bold uppercase tracking-wider hover:bg-red-50 hover:border-red-600 transition-colors flex items-center gap-2">
              <LogOut size={18} /> Keluar
            </button>
          </motion.div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border-4 border-black p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black uppercase tracking-wider mb-2">Konfirmasi Keluar</h3>
            <p className="font-medium text-gray-600 mb-6">Apakah Anda yakin ingin keluar dari akun EduCraft AI?</p>
            <div className="flex gap-4">
              <button
                onClick={cancelLogout}
                className="flex-1 py-3 bg-white border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-500 border-2 border-black text-white font-bold uppercase tracking-wider hover:bg-red-600 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
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
