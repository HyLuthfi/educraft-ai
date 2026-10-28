"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Settings as SettingsIcon,
  Sparkles,
  LogOut,
  Loader2,
  Cpu,
  Crown,
  Moon,
  Sun,
  Monitor,
  Palette,
  Save,
  Check,
  X,
  ShieldCheck,
  Wallet,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { TopUpModal } from "@/app/components/TopUpModal";

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
    "Selalu berikan penjelasan kunci jawaban secara komprehensif dan mudah dipahami siswa."
  );

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    email: string;
    plan: string;
    tokens_left: number;
    initial: string;
    isPro: boolean;
  }>({
    full_name: "Memuat...",
    email: "Memuat...",
    plan: "Starter",
    tokens_left: 50000,
    initial: "-",
    isPro: false,
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

          const isPro =
            profile?.plan === "EduCraft Pro" ||
            profile?.plan === "Pro" ||
            profile?.plan === "PRO" ||
            profile?.plan === "Pro Plan";
          const plan = isPro ? "EduCraft Pro" : "Starter";
          const balance =
            profile?.tokens_left !== null && profile?.tokens_left !== undefined
              ? profile.tokens_left
              : 50000;

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
            tokens_left: balance,
            initial: name.charAt(0).toUpperCase(),
            isPro,
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
      localStorage.clear();
      sessionStorage.clear();
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
    { id: "billing", label: "Saldo & Tema", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#121212] p-3 sm:p-6 md:p-10 pb-24 font-sans text-black dark:text-white">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Title & Breadcrumb (1:1 Kiblat Buat Soal) */}
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] uppercase font-bold tracking-widest w-fit shadow-[2px_2px_0px_#000]">
            <SettingsIcon size={12} /> Modul Konfigurasi Sistem
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-editorial tracking-tight text-black dark:text-white mt-1">
            Pengaturan
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-sans max-w-xl">
            Atur data diri pendidik, preferensi kecerdasan buatan, dan tampilan antarmuka sistem Anda.
          </p>
        </div>

        {/* ── Kontainer Neobrutalisme Utama (Unified Master Container) ── */}
        <div className="relative border-2 border-black dark:border-white/30 bg-white dark:bg-[#1e1e1e] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] p-4 sm:p-6 md:p-8 space-y-6">
          {/* 4 Corner Ornaments */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

          {/* ── TAB SWITCHER NEOBRUTALISME (GRID 3 KOLOM: FIT 100% DI HP & DESKTOP TANPA PERLU SCROLL) ── */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-1.5 bg-neutral-100 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[3px_3px_0px_#000]">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 sm:py-2.5 px-1 sm:px-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer border-2 ${
                    isActive
                      ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000] -translate-y-0.5"
                      : "bg-transparent text-gray-600 dark:text-gray-400 border-transparent hover:border-black/30 dark:hover:border-white/30 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <Icon size={13} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
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
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 p-4 sm:p-6 shadow-[4px_4px_0px_#000]">
                  {/* Header inside card */}
                  <div className="flex items-center gap-3.5 pb-4 border-b border-black/10 dark:border-white/10 mb-6">
                    <div className="w-12 h-12 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-editorial font-bold text-xl flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0">
                      {userProfile.initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-xl font-black font-editorial text-black dark:text-white truncate">
                        {userProfile.full_name}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {userProfile.email || "Email akun pengajar"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white border border-black dark:border-white/30 shadow-xs">
                      {userProfile.plan}
                    </span>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block mb-1.5">
                        Nama Lengkap Anda *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Budi Santoso, S.Pd."
                        className="w-full p-3 text-xs sm:text-sm bg-white dark:bg-[#1a1a1a] border-2 border-black dark:border-white/30 font-bold focus:outline-none dark:text-white shadow-inner"
                      />
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                        Nama ini dicantumkan pada kop dinas soal ujian, lembar jawaban, perencana ajar, dan rapor siswa.
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block mb-1.5">
                        Alamat Email (Akun Terikat)
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full p-3 text-xs sm:text-sm bg-neutral-200 dark:bg-[#1f1f1f] text-gray-600 dark:text-gray-400 border-2 border-black/20 dark:border-white/10 outline-none font-bold cursor-not-allowed"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-wider border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save size={14} /> Simpan Profil
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
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 p-4 sm:p-6 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-black/10 dark:border-white/10 mb-6">
                    <div className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white flex items-center justify-center">
                      <Cpu size={16} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold font-editorial text-black dark:text-white leading-tight">
                        Preferensi Model & Gaya AI
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Atur model penalaran AI dan instruksi sistem global saat meracik bahan ajar.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSavePreferences} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                          Model AI Pembuat Soal
                        </label>
                        <select
                          value="auto"
                          onChange={() => setAiModel("auto")}
                          className="w-full p-2.5 text-xs sm:text-sm border-2 border-black dark:border-white/30 bg-white dark:bg-[#1a1a1a] dark:text-white font-bold outline-none cursor-pointer shadow-[2px_2px_0px_#000]"
                        >
                          <option value="auto">SAITECH AI Engine</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                          Bahasa Output Standar
                        </label>
                        <select
                          value="id"
                          onChange={() => setOutputLanguage("id")}
                          className="w-full p-2.5 text-xs sm:text-sm border-2 border-black dark:border-white/30 bg-white dark:bg-[#1a1a1a] dark:text-white font-bold outline-none cursor-pointer shadow-[2px_2px_0px_#000]"
                        >
                          <option value="id">Bahasa Indonesia (Standar Kurikulum)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                        Instruksi Khusus Global (System Prompt)
                      </label>
                      <textarea
                        rows={4}
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="w-full p-3 text-xs sm:text-sm border-2 border-black dark:border-white/30 bg-white dark:bg-[#1a1a1a] dark:text-white font-sans outline-none leading-relaxed shadow-inner"
                        placeholder="Contoh: Selalu sertakan alasan kenapa opsi pengecoh salah pada bagian pembahasan..."
                      />
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                        Instruksi ini akan otomatis diprioritaskan saat AI meracik butir soal, mengoreksi tugas, atau menyusun rencana pembelajaran.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingPrefs}
                        className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-wider border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSavingPrefs ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save size={14} /> Simpan Preferensi AI
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB 3: SALDO & TEMA */}
            {activeTab === "billing" && (
              <motion.div
                key="tab-billing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Status Saldo & Akun Box Neobrutalisme Monokrom */}
                <div className="bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 p-4 sm:p-6 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white flex items-center justify-center">
                        <Wallet size={16} />
                      </div>
                      <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider font-editorial text-black dark:text-white">
                        Dompet AI &amp; Status Akun
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                        userProfile.isPro
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                          : "bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white border-black/30 dark:border-white/30"
                      }`}
                    >
                      {userProfile.isPro ? "★ EDUGRAFT PRO" : "PAKET STARTER"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="bg-white dark:bg-[#1a1a1a] p-3.5 border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-1">
                          Sisa Saldo AI
                        </span>
                        <div className="font-black text-black dark:text-white text-xl sm:text-2xl font-mono">
                          Rp {userProfile.tokens_left.toLocaleString("id-ID")}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Cukup untuk ~{Math.floor(userProfile.tokens_left / 1000)}x Sesi Generate AI
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#1a1a1a] p-3.5 border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-1">
                          Isi Ulang Saldo (Pay-As-You-Go)
                        </span>
                        <div className="font-bold text-black dark:text-white text-xs sm:text-sm">
                          Tarif Flat Rp 1.000 / Request
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTopUpOpen(true)}
                        className="mt-2 w-full py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs border border-black dark:border-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} /> Isi Saldo via QRIS
                      </button>
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-black/10 dark:border-white/10 font-medium">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-black dark:text-white shrink-0" />{" "}
                      <strong>Rp 1.000 / request:</strong> Buat Soal, Koreksi Jawaban, &amp; Perencana Pembelajaran.
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-black dark:text-white shrink-0" />{" "}
                      <strong>Rp 0 (100% Gratis):</strong> Regenerate Soal, Ekspor Word/PDF/Excel, &amp; Roda Undian.
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-black dark:text-white shrink-0" /> Saldo tanpa masa kedaluwarsa &amp; langsung upgrade ke status PRO setelah top up pertama.
                    </li>
                  </ul>
                </div>

                {/* Tema Tampilan Box */}
                <div className="bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 p-4 sm:p-6 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-black/10 dark:border-white/10">
                    <div className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white flex items-center justify-center">
                      <Palette size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider font-editorial text-black dark:text-white">
                        Tema Tampilan Antarmuka
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Pilih mode kontras tampilan layar yang nyaman untuk mata Anda.
                      </p>
                    </div>
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
                              ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000] -translate-y-0.5"
                              : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white"
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-[11px]">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sesi Akun / Logout Box */}
                <div className="bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 p-4 sm:p-5 shadow-[4px_4px_0px_#000]">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-black dark:text-white uppercase tracking-wider">
                        Sesi Akun Pendidik
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Keluar dari sesi peramban ini jika sedang menggunakan komputer bersama di sekolah.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <LogOut size={14} /> Keluar dari Akun
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── LOGOUT CONFIRMATION MODAL (Monokrom Neobrutal 4 Siku) ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-[#1a1a1a] border-2 sm:border-4 border-black dark:border-white p-5 sm:p-6 max-w-sm w-full shadow-[8px_8px_0px_#000] space-y-4"
            >
              {/* 4 Corner Ornaments */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white/20">
                <h3 className="text-base font-black uppercase tracking-wider text-black dark:text-white font-editorial">
                  Konfirmasi Keluar
                </h3>
                <button
                  onClick={cancelLogout}
                  className="p-1 border border-black dark:border-white/30 text-black dark:text-white hover:bg-black hover:text-white transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="font-medium text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Apakah Anda yakin ingin keluar dari akun EduCraft AI? Anda harus login kembali untuk mengakses data.
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={cancelLogout}
                  className="flex-1 py-2 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase tracking-wider text-xs shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="flex-1 py-2 bg-red-600 border-2 border-black text-white font-bold uppercase tracking-wider text-xs shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer hover:bg-red-700"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL TOP UP SALDO ── */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        currentBalance={userProfile.tokens_left}
        onSuccess={(newBal) => {
          setUserProfile((p) => ({
            ...p,
            tokens_left: newBal,
            isPro: true,
            plan: "EduCraft Pro",
          }));
        }}
      />
    </div>
  );
}
