"use client";

/**
 * Ranking Siswa — Papan peringkat lintas sesi koreksi + lencana prestasi.
 *
 * Mengumpulkan seluruh `sesi_koreksi` milik user, menormalisasi nama siswa,
 * lalu menghitung rata-rata, ketuntasan, dan tren tiap siswa untuk menyusun
 * peringkat kelas. Tiga teratas ditampilkan sebagai podium; sisanya dalam
 * tabel peringkat. Tiap siswa memperoleh lencana otomatis (lihat RankingBadges).
 *
 * Hanya sesi berskala numerik (100 / 10) yang diikutkan; skala huruf mutu (A–E)
 * dikecualikan dari perhitungan peringkat numerik.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Users,
  Award,
  Search,
  ClipboardList,
  ArrowUpRight,
  Sparkles,
  Crown,
  FileSpreadsheet,
  Settings,
  Download,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { buatSupabaseClient } from "@/lib/supabase/client";
import {
  hitungBadge,
  BadgeChip,
  MedaliPodium,
  type Badge,
} from "@/app/components/RankingBadges";
import { ManageSesiKoreksiModal } from "@/app/components/ManageSesiKoreksiModal";

// ── Bentuk data dari kolom JSONB `hasil` ──
interface HasilSiswa {
  nama_siswa: string;
  nilai_akhir: number | string;
  status_kelulusan: "tuntas" | "belum_tuntas";
}

interface SesiRow {
  id: string;
  title: string;
  created_at: string;
  skala: string;
  kkm: number;
  hasil: { hasil: HasilSiswa[]; analitik_kelas?: string } | null;
}

interface SiswaRank {
  nama: string;
  rataRata: number;
  totalSesi: number;
  tuntasCount: number;
  nilaiList: number[];
  nilaiTertinggi: number;
  badges: Badge[];
}

function normalNama(n: string): string {
  return n.trim().toLowerCase().replace(/\s+/g, " ");
}

function toNum(v: number | string): number {
  return typeof v === "number" ? v : parseFloat(v);
}

export default function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [sesiList, setSesiList] = useState<SesiRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const supabase = buatSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Anda harus login untuk melihat ranking.");
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("sesi_koreksi")
          .select("id, title, created_at, skala, kkm, hasil")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        setSesiList((data as SesiRow[]) || []);
      } catch (err: any) {
        setError(err.message || "Gagal memuat data ranking.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { ranking, maxSkala, numericSesiCount } = useMemo(() => {
    const map = new Map<
      string,
      { nama: string; nilaiList: number[]; tuntasCount: number }
    >();
    let skalaMax = 100;
    let numericCount = 0;

    for (const sesi of sesiList) {
      if (sesi.skala === "huruf") continue;
      numericCount += 1;
      const kkm = sesi.kkm ?? 75;
      const skala = sesi.skala === "10" ? 10 : 100;
      skalaMax = Math.max(skalaMax, skala);
      const hasilArr = sesi.hasil?.hasil ?? [];

      for (const s of hasilArr) {
        const nilai = toNum(s.nilai_akhir);
        if (isNaN(nilai)) continue;
        const key = normalNama(s.nama_siswa || "");
        if (!key) continue;
        if (!map.has(key)) {
          map.set(key, { nama: s.nama_siswa.trim(), nilaiList: [], tuntasCount: 0 });
        }
        const entry = map.get(key)!;
        entry.nilaiList.push(Math.round(nilai * 10) / 10);
        if (nilai >= kkm) entry.tuntasCount += 1;
      }
    }

    const base = Array.from(map.values()).map((e) => {
      const totalSesi = e.nilaiList.length;
      const sum = e.nilaiList.reduce((a, c) => a + c, 0);
      const rataRata = totalSesi ? Math.round((sum / totalSesi) * 10) / 10 : 0;
      return {
        nama: e.nama,
        rataRata,
        totalSesi,
        tuntasCount: e.tuntasCount,
        nilaiList: e.nilaiList,
        nilaiTertinggi: totalSesi ? Math.max(...e.nilaiList) : 0,
      };
    });

    // Urutkan: rata-rata desc → jumlah tuntas desc → nama asc
    base.sort(
      (a, b) =>
        b.rataRata - a.rataRata ||
        b.tuntasCount - a.tuntasCount ||
        a.nama.localeCompare(b.nama)
    );

    const withBadges: SiswaRank[] = base.map((e, idx) => ({
      ...e,
      badges: hitungBadge({
        rataRata: e.rataRata,
        totalSesi: e.totalSesi,
        tuntasCount: e.tuntasCount,
        nilaiList: e.nilaiList,
        maxSkala: skalaMax,
        peringkat: idx + 1,
      }),
    }));

    return { ranking: withBadges, maxSkala: skalaMax, numericSesiCount: numericCount };
  }, [sesiList]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranking;
    return ranking.filter((s) => s.nama.toLowerCase().includes(q));
  }, [ranking, query]);

  const totalBadges = useMemo(
    () => ranking.reduce((a, c) => a + c.badges.length, 0),
    [ranking]
  );

  const podium = ranking.slice(0, 3);

  // ── Ekspor Excel ──
  const handleExportRankingExcel = () => {
    if (ranking.length === 0) {
      toast.error("Belum ada data ranking untuk diekspor.");
      return;
    }

    const rows: any[] = [];
    rows.push(["PAPAN PERINGKAT & KLASEMEN SISWA"]);
    rows.push(["TANGGAL EKSPOR", new Date().toLocaleDateString("id-ID")]);
    rows.push(["TOTAL SISWA", ranking.length]);
    rows.push(["JUMLAH SESI KOREKSI", numericSesiCount]);
    rows.push([]);

    rows.push([
      "Peringkat",
      "Nama Siswa",
      "Rata-Rata Nilai",
      "Total Sesi",
      "Sesi Tuntas",
      "Nilai Tertinggi",
      "Lencana Prestasi",
    ]);

    ranking.forEach((s, idx) => {
      const badgeTitles = s.badges.map((b) => b.label).join(", ");
      rows.push([
        idx + 1,
        s.nama,
        s.rataRata,
        s.totalSesi,
        s.tuntasCount,
        s.nilaiTertinggi,
        badgeTitles || "-",
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 40 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ranking_Kelas");
    XLSX.writeFile(
      workbook,
      `Ranking_Kelas_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success("Papan peringkat berhasil diunduh ke format Excel!");
    setIsDownloadModalOpen(false);
  };

  // ── Ekspor Word (.docx) ──
  const handleExportRankingDocx = async () => {
    if (ranking.length === 0) {
      toast.error("Belum ada data ranking untuk diekspor.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Menyiapkan dokumen Word Klasemen...");

    try {
      const payload = {
        header: {
          nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          mata_pelajaran: "Papan Peringkat & Klasemen Prestasi Siswa",
          kelas: "Semua Kelas",
          tanggal: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          total_sesi: numericSesiCount,
        },
        ranking_list: ranking.map((s, idx) => ({
          ...s,
          rank: idx + 1,
          rata_rata: s.rataRata,
          total_sesi: s.totalSesi,
          tuntas_count: s.tuntasCount,
        })),
        sesi_list: sesiList,
      };

      const res = await fetch("/api/export/ranking-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal mengunduh dokumen Word");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ranking_Kelas_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Dokumen Word Klasemen berhasil diunduh!", { id: toastId });
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengekspor dokumen Word", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Ekspor PDF (.pdf) ──
  const handleExportRankingPdf = async () => {
    if (ranking.length === 0) {
      toast.error("Belum ada data ranking untuk diekspor.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Menyiapkan dokumen PDF Klasemen...");

    try {
      const payload = {
        header: {
          nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          mata_pelajaran: "Papan Peringkat & Klasemen Prestasi Siswa",
          kelas: "Semua Kelas",
          tanggal: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          total_sesi: numericSesiCount,
        },
        ranking_list: ranking.map((s, idx) => ({
          ...s,
          rank: idx + 1,
          rata_rata: s.rataRata,
          total_sesi: s.totalSesi,
          tuntas_count: s.tuntasCount,
        })),
        sesi_list: sesiList,
      };

      const res = await fetch("/api/export/ranking-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal mengunduh dokumen PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ranking_Kelas_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Dokumen PDF Klasemen berhasil diunduh!", { id: toastId });
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengekspor dokumen PDF", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pb-24">
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
          <p className="font-bold uppercase tracking-wider text-xs text-gray-500 dark:text-gray-400">
            Menyusun Peringkat Siswa...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pb-24">
      {/* ── HEADER HALAMAN (KIBLAT BUAT SOAL) ── */}
      <div className="mb-4 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
          <Trophy size={12} /> Papan Peringkat &amp; Klasemen Siswa
        </div>
        <h1 className="text-xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
          Ranking Siswa
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Peringkat kelas akumulatif lintas sesi penilaian, lengkap dengan lencana capaian prestasi siswa.
        </p>
      </div>

      {/* ── KONTAINER NEOBRUTALISME UTAMA (KIBLAT BUAT SOAL) ── */}
      <div className="relative bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-3.5 sm:p-6 md:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.12)]">
        {/* Sudut Neobrutalisme Khas Buat Soal */}
        <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-black dark:border-white/20 -mt-0.5 -ml-0.5"></div>
        <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-black dark:border-white/20 -mt-0.5 -mr-0.5"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-black dark:border-white/20 -mb-0.5 -ml-0.5"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-black dark:border-white/20 -mb-0.5 -mr-0.5"></div>

        {/* ── TOOLBAR PENCARIAN & AKSI ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-5 border-b-2 border-black/10 dark:border-white/10 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama siswa di klasemen..."
              className="pl-10 pr-3.5 py-2.5 w-full border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium text-xs sm:text-sm transition-colors bg-gray-50/50 dark:bg-[#252525] dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ranking.length > 0 && (
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="px-3.5 sm:px-4 py-2.5 bg-white dark:bg-[#252525] border-2 border-black dark:border-white/30 text-black dark:text-white font-bold uppercase tracking-wider text-xs hover:bg-gray-100 dark:hover:bg-[#333] transition-all flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-y-0.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={14} /> <span>Unduh Klasemen</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="px-3.5 sm:px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black font-bold uppercase tracking-wider text-xs hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <Settings size={14} /> <span>Kelola Sesi ({sesiList.length})</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/20 p-3 sm:p-5 mb-6 shadow-[3px_3px_0px_0px_rgba(239,68,68,0.4)]">
            <p className="font-bold text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state: belum ada sesi */}
        {!error && sesiList.length === 0 && (
          <div className="border-2 border-dashed border-black/20 dark:border-white/15 bg-gray-50/50 dark:bg-[#252525]/30 p-8 sm:p-14 text-center">
            <ClipboardList size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <h2 className="text-lg sm:text-xl font-editorial font-bold text-black dark:text-white mb-1.5">
              Belum Ada Sesi Tersimpan
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
              Simpan minimal satu sesi koreksi bernilai numerik untuk mulai menyusun klasemen peringkat kelas.
            </p>
            <a
              href="/koreksi"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
            >
              Mulai Koreksi <ArrowUpRight size={14} />
            </a>
          </div>
        )}

        {/* Empty state: ada sesi tapi tak ada data numerik */}
        {!error && sesiList.length > 0 && ranking.length === 0 && (
          <div className="border-2 border-dashed border-black/20 dark:border-white/15 bg-gray-50/50 dark:bg-[#252525]/30 p-8 sm:p-12 text-center">
            <Award size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2.5" />
            <h2 className="text-base sm:text-lg font-editorial font-bold text-black dark:text-white mb-1.5">
              Peringkat Numerik Belum Tersedia
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Sesi tersimpan memakai skala huruf mutu (A–E) yang tidak dapat diperingkat secara angka. Simpan sesi skala 100 atau 10.
            </p>
          </div>
        )}

        {/* ── KONTEN UTAMA KLASEMEN ── */}
        {!error && ranking.length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {/* 3 StatCard Ringkas (Monokrom Murni) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <StatCard
                icon={<Users size={14} className="text-black dark:text-white" />}
                label="Siswa"
                value={String(ranking.length)}
                sub={`${numericSesiCount} sesi dinilai`}
              />
              <StatCard
                icon={<Crown size={14} className="text-black dark:text-white" />}
                label="Juara 1"
                value={podium[0]?.nama.split(" ")[0] ?? "-"}
                sub={podium[0] ? `Rata ${podium[0].rataRata.toFixed(1)}` : ""}
              />
              <StatCard
                icon={<Sparkles size={14} className="text-black dark:text-white" />}
                label="Prestasi"
                value={String(totalBadges)}
                sub="Lencana diraih"
              />
            </div>

            {/* Podium Juara Tiga Besar (Neobrutal Solid) */}
            {podium.length >= 1 && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <Trophy size={15} /> Podium Tiga Besar Kelas
                  </h2>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Akumulasi Skor Terbaik
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-end">
                  {[podium[1], podium[0], podium[2]].map((s, visualIdx) => {
                    if (!s) return <div key={`empty-${visualIdx}`} className="hidden sm:block" />;
                    const realPos = (ranking.indexOf(s) + 1) as 1 | 2 | 3;
                    const isChampion = realPos === 1;

                    return (
                      <div
                        key={s.nama}
                        className={`border-2 border-black dark:border-white/20 bg-white dark:bg-[#202020] p-4 text-center transition-all ${
                          isChampion
                            ? "sm:-translate-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)]"
                            : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)]"
                        }`}
                      >
                        <div className="flex justify-center mb-1.5">
                          <MedaliPodium posisi={realPos} />
                        </div>
                        <div className="text-2xl sm:text-4xl font-extrabold text-black dark:text-white mb-0.5 tracking-tight">
                          #{realPos}
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-black dark:text-white truncate">
                          {s.nama}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5">
                          {s.totalSesi} sesi · {s.tuntasCount} tuntas
                        </p>
                        <div className="inline-block px-3 py-1 bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-sm sm:text-base shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                          {s.rataRata.toFixed(1)}
                        </div>
                        {s.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center mt-3 pt-2.5 border-t border-black/10 dark:border-white/10">
                            {s.badges.map((b) => (
                              <BadgeChip key={b.id} badge={b} size="sm" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Klasemen Lengkap Peserta Didik */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5 border-t-2 border-black/10 dark:border-white/10 pt-5">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <Award size={15} /> Klasemen Lengkap Peserta Didik
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Menampilkan {filtered.length} peserta didik terdaftar
                  </p>
                </div>
              </div>

              <div className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#202020] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[580px]">
                  <thead>
                    <tr className="border-b-2 border-black dark:border-white/20 bg-gray-50 dark:bg-[#252525]">
                      <th className="px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-14 text-center">
                        #
                      </th>
                      <th className="px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Nama Peserta Didik &amp; Lencana
                      </th>
                      <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center w-20">
                        Sesi
                      </th>
                      <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center w-24">
                        Tuntas
                      </th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right w-28">
                        Rata-Rata
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10 dark:divide-white/10">
                    {filtered.map((s) => {
                      const pos = ranking.indexOf(s) + 1;
                      const isTop3 = pos <= 3;

                      return (
                        <tr
                          key={s.nama}
                          className="hover:bg-gray-50/80 dark:hover:bg-[#252525] transition-colors"
                        >
                          <td className="px-3.5 py-3 text-center">
                            <span
                              className={`w-7 h-7 mx-auto flex items-center justify-center font-bold text-xs border-2 border-black dark:border-white/30 ${
                                isTop3
                                  ? "bg-black text-white dark:bg-white dark:text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]"
                                  : "bg-white dark:bg-[#2a2a2a] text-black dark:text-white"
                              }`}
                            >
                              {pos}
                            </span>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-xs sm:text-sm text-black dark:text-white mb-1">
                              {s.nama}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {s.badges.length > 0 ? (
                                s.badges.map((b) => (
                                  <BadgeChip key={b.id} badge={b} size="sm" />
                                ))
                              ) : (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                                  Belum ada lencana
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-xs text-black dark:text-white">
                            {s.totalSesi}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-xs">
                            <span className="font-bold text-black dark:text-white">
                              {s.tuntasCount}
                            </span>
                            <span className="text-gray-400 text-[10px]">
                              /{s.totalSesi}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono font-bold text-sm sm:text-base text-black dark:text-white">
                              {s.rataRata.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-10 text-gray-400 dark:text-gray-500 font-medium text-xs sm:text-sm"
                        >
                          Tidak ada peserta didik yang cocok dengan &quot;{query}&quot;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <ManageSesiKoreksiModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        onSesiDeleted={(deletedId) => {
          setSesiList((prev) => prev.filter((s) => s.id !== deletedId));
        }}
      />

      {/* ── MODAL DOWNLOAD HUB TERPADU (PDF, WORD, EXCEL) ── */}
      <AnimatePresence>
        {isDownloadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDownloadModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] border-2 sm:border-3 border-black dark:border-white/20 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#252525]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-black dark:text-white">
                    <Download size={18} className="text-gray-500 dark:text-gray-400" /> Download Hub
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs mt-0.5">
                    Pilih format ekspor papan peringkat sesuai kebutuhan Anda.
                  </p>
                </div>
                <button
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white dark:bg-white dark:text-black text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                      01
                    </span>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Dokumen Cetak &amp; Arsip
                    </h4>
                  </div>

                  {/* Dokumen PDF */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportRankingPdf}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded flex items-center justify-center font-bold text-xs shrink-0 border border-red-300 dark:border-red-800">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white">
                          Dokumen PDF (.pdf)
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Papan peringkat resmi siap cetak
                        </div>
                      </div>
                    </div>
                    <Download size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>

                  {/* Microsoft Word */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportRankingDocx}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded flex items-center justify-center font-bold text-sm shrink-0 border border-blue-300 dark:border-blue-800">
                        W
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white">
                          Microsoft Word (.docx)
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Dokumen resmi dapat diedit di Word &amp; Docs
                        </div>
                      </div>
                    </div>
                    <Download size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>

                  {/* Microsoft Excel */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportRankingExcel}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-400 dark:border-emerald-800">
                        XLS
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white">
                          Microsoft Excel (.xlsx)
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Rekap nilai lengkap &amp; lencana prestasi
                        </div>
                      </div>
                    </div>
                    <Download size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Kartu statistik ringkas (Monokrom Murni, Font Sans-Serif Kokoh) ──
function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border-2 border-black dark:border-white/20 p-2.5 sm:p-4 bg-white dark:bg-[#202020] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] flex flex-col justify-between">
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] sm:text-xs tracking-normal">
        {icon} <span>{label}</span>
      </div>
      <div className="text-xl sm:text-3xl font-extrabold text-black dark:text-white my-0.5 tracking-tight truncate">
        {value}
      </div>
      {sub && (
        <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
          {sub}
        </p>
      )}
    </div>
  );
}
