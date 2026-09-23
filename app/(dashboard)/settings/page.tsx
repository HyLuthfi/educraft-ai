"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Settings as SettingsIcon,
  CreditCard,
  Sparkles,
  LogOut,
  Loader2,
  CheckCircle,
  Cpu,
  Crown,
  Moon,
  Sun,
  Monitor,
  Palette,
  Save,
  ShieldCheck,
  Check,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";

type SettingsTab = "profile" | "ai" | "billing";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [aiModel, setAiModel] = useState("auto");
  const [outputLanguage, setOutputLanguage] = useState("id");
  const [systemPrompt, setSystemPrompt] = useState(
    "Selalu berikan penjelasan kunci jawaban secara komprehensif dan mudah dipahami siswa SMA."
  );

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

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
    initial: "-",
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  useEffect(() => {
    setMounted(true);

    // Load cached preferences from localStorage if any
    try {
      const savedPrefs = localStorage.getItem("educraft_user_preferences");
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.ai_model) setAiModel(parsed.ai_model);
        if (parsed.output_language) setOutputLanguage(parsed.output_language);
        if (parsed.system_prompt) setSystemPrompt(parsed.system_prompt);
      }
    } catch (e) {}

    async function fetchUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          let name = "Pengguna";
          if (profile?.full_name) {
            name = profile.full_name;
          } else if (user.user_metadata?.full_name) {
            name = user.user_metadata.full_name;
          } else if (user.email) {
            name = user.email.split("@")[0];
          }

          let plan = "EduCraft Pro";
          if (profile?.plan && profile.plan !== "Free Plan") {
            plan = profile.plan;
          }

          setFullName(name);
          setEmail(user.email || "");

          if (user.user_metadata?.ai_model) {
            setAiModel(user.user_metadata.ai_model);
          }
          if (user.user_metadata?.output_language) {
            setOutputLanguage(user.user_metadata.output_language);
          }
          if (user.user_metadata?.system_prompt) {
            setSystemPrompt(user.user_metadata.system_prompt);
          }

          setUserProfile({
            full_name: name,
            email: user.email || "",
            plan: plan,
            tokens_left: profile?.tokens_left ? Math.max(profile.tokens_left, 50000) : 50000,
            initial: name.charAt(0).toUpperCase(),
          });
        }
      } catch (err) {
        console.error("Gagal mengambil profil user:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [supabase]);

  // Handler: Simpan Perubahan Profil (Nama)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Nama lengkap tidak boleh kosong.");
      return;
    }

    setIsSavingProfile(true);
    const toastId = toast.loading("Menyimpan nama profil...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Sesi login berakhir. Silakan login kembali.");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      setUserProfile((prev) => ({
        ...prev,
        full_name: fullName.trim(),
        initial: fullName.trim().charAt(0).toUpperCase(),
      }));

      toast.success("Profil guru berhasil diperbarui!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memperbarui profil: " + (err.message || "Error server"), {
        id: toastId,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handler: Simpan Preferensi AI
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    const toastId = toast.loading("Menyimpan preferensi AI...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const prefsPayload = {
        ai_model: aiModel,
        output_language: outputLanguage,
        system_prompt: systemPrompt.trim(),
      };

      if (user) {
        await supabase.auth.updateUser({
          data: prefsPayload,
        });
      }

      localStorage.setItem("educraft_user_preferences", JSON.stringify(prefsPayload));
      toast.success("Preferensi sistem AI berhasil disimpan!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menyimpan preferensi: " + (err.message || "Error"), { id: toastId });
    } finally {
      setIsSavingPrefs(false);
    }
  };

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

  const tabsConfig: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "profile", label: "Profil Akun", icon: User },
    { id: "ai", label: "Preferensi AI", icon: Cpu },
    { id: "billing", label: "Paket & Tema", icon: Crown },
  ];

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
          <SettingsIcon size={12} /> Pengaturan Sistem
        </div>
        <h1 className="text-xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
          Pengaturan
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Atur data diri pendidik, perilaku kecerdasan buatan, dan tampilan antarmuka.
        </p>
      </div>

      {/* ── SEGMENTED TAB SWITCHER (MOBILE-FIRST) ── */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#202020] border-2 border-black/15 dark:border-white/15 mb-5 sm:mb-8 overflow-x-auto">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]"
                  : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <Icon size={14} className={isActive ? "text-yellow-400 dark:text-black" : "opacity-70"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <AnimatePresence mode="wait">
        {/* TAB 1: PROFIL AKUN */}
        {activeTab === "profile" && (
          <motion.div
            key="tab-profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/20 p-4 sm:p-7 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              {/* Header inside card */}
              <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-black/10 dark:border-white/10 mb-4 sm:mb-6">
                <div className="w-12 h-12 bg-yellow-400 text-black border-2 border-black font-editorial font-bold text-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                  {userProfile.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-xl font-bold dark:text-white truncate">
                    {userProfile.full_name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userProfile.email || "Email akun pengajar"}
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-yellow-400 text-black border border-black rounded shadow-xs">
                  {userProfile.plan}
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block mb-1.5">
                    Nama Lengkap Anda
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso, S.Pd."
                    className="w-full p-3 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-bold transition-colors dark:text-white"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Nama ini ditampilkan pada kop soal ujian, lembar jawaban, dan rapor siswa.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block mb-1.5">
                    Alamat Email (Akun Utama)
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full p-3 text-xs sm:text-sm bg-gray-100 dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-500 border-2 border-black/10 dark:border-white/5 outline-none font-medium cursor-not-allowed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full sm:w-auto px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:translate-y-0.5 active:translate-x-0.5 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save size={16} /> Simpan Perubahan Profil
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* TAB 2: PREFERENSI AI */}
        {activeTab === "ai" && (
          <motion.div
            key="tab-ai"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/20 p-4 sm:p-7 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-2.5 pb-3 sm:pb-4 border-b border-black/10 dark:border-white/10 mb-4 sm:mb-6">
                <Cpu size={20} className="text-purple-600" />
                <div>
                  <h2 className="text-base sm:text-xl font-bold dark:text-white leading-tight">
                    Preferensi Sistem AI
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Kustomisasi model kecerdasan buatan dan gaya respons soal Anda.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePreferences} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                      Model AI Pembuat Soal
                    </label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full p-3 text-xs sm:text-sm border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-bold transition-colors bg-white dark:bg-[#2a2a2a] dark:text-white cursor-pointer"
                    >
                      <option value="auto">🤖 Gemini 3.8 Flash (Direkomendasikan)</option>
                      <option value="gpt-4o">GPT-4o (Komprehensif)</option>
                      <option value="claude">Claude 3.5 Sonnet (Analitis)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                      Bahasa Output
                    </label>
                    <select
                      value={outputLanguage}
                      onChange={(e) => setOutputLanguage(e.target.value)}
                      className="w-full p-3 text-xs sm:text-sm border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-bold transition-colors bg-white dark:bg-[#2a2a2a] dark:text-white cursor-pointer"
                    >
                      <option value="id">Bahasa Indonesia (Standar)</option>
                      <option value="en">English (Bilingual / Asing)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Instruksi Khusus Global (System Prompt)
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-sans transition-colors resize-y bg-gray-50 dark:bg-[#2a2a2a] dark:text-white leading-relaxed"
                    placeholder="Contoh: Selalu sertakan alasan kenapa opsi pengecoh salah pada bagian pembahasan..."
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    Instruksi ini akan otomatis disisipkan saat AI meracik soal, mengoreksi tugas, atau menyusun rencana pembelajaran.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPrefs}
                    className="w-full sm:w-auto px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:translate-y-0.5 active:translate-x-0.5 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingPrefs ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save size={16} /> Simpan Preferensi AI
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* TAB 3: PAKET & TEMA */}
        {activeTab === "billing" && (
          <motion.div
            key="tab-billing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Status Langganan Box */}
            <div className="bg-black text-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-7 shadow-[4px_4px_0px_0px_rgba(255,215,0,0.4)] relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <Crown size={20} className="text-yellow-400" />
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider">
                    Status Akun EduCraft
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Aktif VIP
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="bg-white/10 p-3.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Paket Keanggotaan
                  </span>
                  <div className="font-black text-yellow-400 text-base">
                    EduCraft Pro Unlimited
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Aktif hingga 21 September 2027
                  </p>
                </div>

                <div className="bg-white/10 p-3.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Kuota Komputasi AI
                  </span>
                  <div className="font-black text-emerald-400 text-base flex items-center gap-1.5">
                    <Sparkles size={16} /> Tanpa Batas (Unlimited)
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Bebas racik soal, koreksi, &amp; ekspor kapan saja
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 text-xs text-gray-300 mb-4 pt-2 border-t border-white/10">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" /> Akses model AI mutakhir tanpa antre
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" /> Bebas ekspor dokumen Word (.docx) &amp; PDF siap cetak
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400 shrink-0" /> Riwayat Bank Materi dan Bank Soal tersimpan aman
                </li>
              </ul>
            </div>

            {/* Tema Tampilan Box */}
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/20 p-4 sm:p-7 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-black/10 dark:border-white/10">
                <Palette size={20} className="text-pink-500" />
                <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider dark:text-white">
                  Tema Tampilan
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: "light", label: "Terang", icon: Sun },
                  { id: "dark", label: "Gelap", icon: Moon },
                  { id: "system", label: "Sistem", icon: Monitor },
                ].map((t) => {
                  const Icon = t.icon;
                  const isCurrent = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`p-3 border-2 flex flex-col items-center justify-center gap-1.5 font-bold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                          : "bg-gray-50 dark:bg-[#2a2a2a] text-gray-500 border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logout Box */}
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-red-200 dark:border-red-900/30 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-red-600 dark:text-red-400 uppercase tracking-wider">
                    Sesi Akun
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Keluar dari sesi peramban ini jika menggunakan komputer bersama.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <LogOut size={14} /> Keluar dari Akun
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-5 sm:p-8 max-w-sm w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider mb-1.5 sm:mb-2 dark:text-white">
              Konfirmasi Keluar
            </h3>
            <p className="font-medium text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              Apakah Anda yakin ingin keluar dari akun EduCraft AI?
            </p>
            <div className="flex gap-3 sm:gap-4">
              <button
                type="button"
                onClick={cancelLogout}
                className="flex-1 py-2.5 sm:py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-[#333] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-2.5 sm:py-3 bg-red-500 border-2 border-black dark:border-red-600 text-white font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 cursor-pointer"
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
