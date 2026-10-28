"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { buatSupabaseClient } from "@/lib/supabase/client";
import {
  User,
  Crown,
  Mail,
  Calendar,
  Sparkles,
  FileText,
  BookOpen,
  ClipboardCheck,
  UserCheck,
  Clock,
  ArrowRight,
  Settings,
  ShieldCheck,
  Award,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Wallet,
  Plus,
} from "lucide-react";
import { TopUpModal } from "@/app/components/TopUpModal";

export default function ProfilPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    fullName: string;
    email: string;
    plan: string;
    initial: string;
    joinedDate: string;
    balance: number;
    isPro: boolean;
  }>({
    fullName: "Pendidik",
    email: "",
    plan: "Starter",
    initial: "P",
    joinedDate: "September 2026",
    balance: 50000,
    isPro: false,
  });

  const [stats, setStats] = useState({
    totalSoal: 0,
    totalMateri: 0,
    totalKoreksi: 0,
    totalAbsensi: 0,
  });

  const supabase = buatSupabaseClient();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
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

          let name = "Pendidik";
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

          let joined = "September 2026";
          if (user.created_at) {
            joined = new Date(user.created_at).toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            });
          }

          setProfileData({
            fullName: name,
            email: user.email || "",
            plan,
            initial: name.charAt(0).toUpperCase(),
            joinedDate: joined,
            balance,
            isPro,
          });

          // Fetch aggregate statistics
          const [soalRes, materiRes, koreksiRes, absensiRes] = await Promise.all([
            supabase.from("bank_soal").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("bank_materi").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("sesi_koreksi").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("sesi_absensi").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          ]);

          setStats({
            totalSoal: soalRes.count || 0,
            totalMateri: materiRes.count || 0,
            totalKoreksi: koreksiRes.count || 0,
            totalAbsensi: absensiRes.count || 0,
          });
        }
      } catch (err) {
        console.error("Gagal memuat profil:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  // Estimasi jam kerja administrasi yang berhasil dihemat (dalam jam)
  const totalWaktuDihematJam = Math.max(
    1,
    Math.round((stats.totalSoal * 1.5 + stats.totalMateri * 0.8 + stats.totalKoreksi * 2 + stats.totalAbsensi * 0.5) * 10) / 10
  );

  return (
    <div className="p-3.5 sm:p-6 md:p-8 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
            <User size={12} /> Profil Pendidik
          </div>
          <h1 className="text-2xl sm:text-4xl font-editorial font-bold text-black dark:text-white mb-1">
            Profil Saya
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Ringkasan identitas pengajar, status akun, dan pencapaian efisiensi mengajar Anda.
          </p>
        </div>

        <Link
          href="/settings"
          className="self-start sm:self-auto px-4 py-2.5 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-0.5 cursor-pointer"
        >
          <Settings size={14} /> Pengaturan Akun
        </Link>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-gray-500" size={32} />
          <p className="text-xs sm:text-sm font-bold text-gray-500">Memuat profil pendidik...</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* ── KARTU IDENTITAS GURU (TEACHER CARD) ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-5 sm:p-7 shadow-[4px_4px_0px_#000] relative"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar Initial Box Monokrom */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-editorial font-bold text-xl sm:text-2xl flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0">
                  {profileData.initial}
                </div>

                {/* Main Info */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-lg sm:text-2xl font-editorial font-bold text-black dark:text-white truncate">
                      {profileData.fullName}
                    </h2>
                    <span
                      className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border ${
                        profileData.isPro
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs"
                          : "bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white border-black/30 dark:border-white/30"
                      }`}
                    >
                      {profileData.isPro ? "★ EDUGRAFT PRO" : "PAKET STARTER"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-gray-400" />
                      <span>{profileData.email || "Email tidak terdaftar"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" />
                      <span>Bergabung {profileData.joinedDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saldo AI Pill Card */}
              <div className="w-full sm:w-auto p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000] flex sm:flex-col items-center sm:items-start justify-between gap-3">
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-gray-400 block leading-tight">
                    Saldo Aktif AI
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-black dark:text-white">
                    Rp {profileData.balance.toLocaleString("id-ID")}
                  </div>
                </div>
                <button
                  onClick={() => setIsTopUpOpen(true)}
                  className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-[10px] border border-black dark:border-white shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 cursor-pointer flex items-center gap-1"
                >
                  <Plus size={12} /> Isi Saldo
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── STATISTIK MENGAJAR LINTAS FITUR ── */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp size={16} /> Aktivitas &amp; Portofolio Digital
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
              {/* Soal */}
              <Link
                href="/library"
                className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                    Bank Soal
                  </span>
                  <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                    <FileText size={16} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
                  {stats.totalSoal}{" "}
                  <span className="text-xs font-normal text-gray-500">Paket</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 group-hover:text-black dark:group-hover:text-white font-medium">
                  Buka Bank Soal <ArrowRight size={10} />
                </p>
              </Link>

              {/* Materi */}
              <Link
                href="/bank-materi"
                className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                    Bank Materi
                  </span>
                  <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    <BookOpen size={16} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
                  {stats.totalMateri}{" "}
                  <span className="text-xs font-normal text-gray-500">Materi</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 group-hover:text-black dark:group-hover:text-white font-medium">
                  Buka Bank Materi <ArrowRight size={10} />
                </p>
              </Link>

              {/* Koreksi */}
              <Link
                href="/koreksi"
                className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                    Koreksi Otomatis
                  </span>
                  <div className="p-1.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
                    <ClipboardCheck size={16} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
                  {stats.totalKoreksi}{" "}
                  <span className="text-xs font-normal text-gray-500">Sesi</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 group-hover:text-black dark:group-hover:text-white font-medium">
                  Buka Modul Koreksi <ArrowRight size={10} />
                </p>
              </Link>

              {/* Absensi */}
              <Link
                href="/absensi"
                className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                    Absensi Kelas
                  </span>
                  <div className="p-1.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
                    <UserCheck size={16} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
                  {stats.totalAbsensi}{" "}
                  <span className="text-xs font-normal text-gray-500">Sesi</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 group-hover:text-black dark:group-hover:text-white font-medium">
                  Buka Presensi <ArrowRight size={10} />
                </p>
              </Link>
            </div>
          </div>

          {/* ── KALKULATOR EFISIENSI WAKTU GURU ── */}
          <div className="bg-black text-white dark:bg-[#252525] border-2 border-black dark:border-white/20 p-5 sm:p-8 shadow-[4px_4px_0px_0px_rgba(255,215,0,0.5)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award size={18} className="text-yellow-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                    Dampak Produktivitas Mengajar
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-editorial font-bold mb-2">
                  Estimasi Waktu Dihemat: ~{totalWaktuDihematJam} Jam
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 max-w-xl leading-relaxed">
                  Berdasarkan pemanfaatan AI dalam meracik soal, mengekstrak dokumen, dan mengoreksi
                  tugas murid secara otomatis. Anda memiliki lebih banyak waktu luang untuk fokus mendidik.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/create"
                  className="px-6 py-3 bg-yellow-400 text-black font-bold uppercase tracking-wider text-xs hover:bg-yellow-300 transition-colors shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] flex items-center gap-2"
                >
                  <Sparkles size={14} /> Racik Soal Baru
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TOP UP SALDO ── */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        currentBalance={profileData.balance}
        onSuccess={(newBal) => {
          setProfileData((p) => ({
            ...p,
            balance: newBal,
            isPro: true,
            plan: "EduCraft Pro",
          }));
        }}
      />
    </div>
  );
}
