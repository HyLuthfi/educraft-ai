"use client";

/**
 * Rapor Siswa — Tren nilai lintas sesi koreksi.
 *
 * Mengumpulkan seluruh `sesi_koreksi` milik user, menormalisasi nama siswa,
 * lalu membangun deret nilai per siswa untuk memvisualisasikan tren
 * (line chart), performa kelas, dan peringkat rata-rata.
 *
 * Hanya sesi dengan skala numerik (100 / 10) yang dihitung ke tren nilai;
 * skala huruf mutu (A–E) dikecualikan dari agregasi numerik.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  GraduationCap,
  Award,
  Search,
  ClipboardList,
  Trophy,
  ArrowUpRight,
  FileSpreadsheet,
  Settings,
  Loader2,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { buatSupabaseClient } from "@/lib/supabase/client";
import { TrenLineChart, TrenBadge, RataRataBar, type TitikTren } from "@/app/components/RaporCharts";
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

// ── Agregasi per siswa ──
interface SiswaTren {
  nama: string; // nama tampil (versi pertama yang muncul)
  data: TitikTren[]; // deret nilai lintas sesi (kronologis)
  rataRata: number;
  totalSesi: number;
  tuntasCount: number;
}

function normalNama(n: string): string {
  return n.trim().toLowerCase().replace(/\s+/g, " ");
}

function toNum(v: number | string): number {
  return typeof v === "number" ? v : parseFloat(v);
}

function labelTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default function RaporPage() {
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
          setError("Anda harus login untuk melihat rapor.");
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
        setError(err.message || "Gagal memuat data rapor.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Bangun tren per siswa (hanya sesi skala numerik) ──
  const { siswaTrenList, maxNilai, totalSiswa, rataKelas } = useMemo(() => {
    const map = new Map<string, SiswaTren>();
    let globalMax = 100;

    for (const sesi of sesiList) {
      if (sesi.skala === "huruf") continue; // skip skala huruf dari tren numerik
      const label = labelTanggal(sesi.created_at);
      const kkm = sesi.kkm ?? 75;
      const hasilArr = sesi.hasil?.hasil ?? [];
      globalMax = Math.max(globalMax, sesi.skala === "10" ? 10 : 100);

      for (const s of hasilArr) {
        const nilai = toNum(s.nilai_akhir);
        if (isNaN(nilai)) continue;
        const key = normalNama(s.nama_siswa || "");
        if (!key) continue;

        if (!map.has(key)) {
          map.set(key, { nama: s.nama_siswa.trim(), data: [], rataRata: 0, totalSesi: 0, tuntasCount: 0 });
        }
        const entry = map.get(key)!;
        entry.data.push({
          label,
          nilai: Math.round(nilai * 10) / 10,
          sesi_title: sesi.title || "Asesmen Pembelajaran",
          tanggal: new Date(sesi.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          kkm: kkm,
          status: nilai >= kkm ? "tuntas" : "remedial",
          rekomendasi: (s as any).rekomendasi || "",
        });
        if (nilai >= kkm) entry.tuntasCount += 1;
      }
    }

    const list = Array.from(map.values()).map((e) => {
      const sum = e.data.reduce((a, c) => a + c.nilai, 0);
      e.totalSesi = e.data.length;
      e.rataRata = e.data.length ? Math.round((sum / e.data.length) * 10) / 10 : 0;
      return e;
    });

    list.sort((a, b) => b.rataRata - a.rataRata);
    const rata =
      list.length > 0 ? Math.round((list.reduce((a, c) => a + c.rataRata, 0) / list.length) * 10) / 10 : 0;

    return { siswaTrenList: list, maxNilai: globalMax, totalSiswa: list.length, rataKelas: rata };
  }, [sesiList]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return siswaTrenList;
    return siswaTrenList.filter((s) => s.nama.toLowerCase().includes(q));
  }, [siswaTrenList, query]);

  const numericSesiCount = sesiList.filter((s) => s.skala !== "huruf").length;

  const handleExportRaporExcel = () => {
    if (siswaTrenList.length === 0) {
      toast.error("Belum ada data rapor untuk diekspor.");
      return;
    }

    const rows: any[] = [];
    rows.push(["RAPOR & TREN NILAI SISWA"]);
    rows.push(["TANGGAL EKSPOR", new Date().toLocaleDateString("id-ID")]);
    rows.push(["TOTAL SISWA", totalSiswa]);
    rows.push(["RATA-RATA KELAS", rataKelas]);
    rows.push([]);

    rows.push(["Peringkat", "Nama Siswa", "Rata-Rata Nilai", "Total Sesi Diikuti", "Sesi Tuntas", "Riwayat Nilai"]);

    siswaTrenList.forEach((s, idx) => {
      const historyStr = s.data.map((d) => `${d.label}: ${d.nilai}`).join(", ");
      rows.push([
        idx + 1,
        s.nama,
        s.rataRata,
        s.totalSesi,
        s.tuntasCount,
        historyStr,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 45 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor_Siswa");
    XLSX.writeFile(workbook, `Rapor_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Rapor siswa berhasil diunduh ke format Excel!");
  };

  const handleExportRaporDocx = async () => {
    if (siswaTrenList.length === 0) {
      toast.error("Belum ada data rapor untuk diekspor.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Menyiapkan dokumen Word Rapor Siswa...");

    try {
      const payload = {
        header: {
          nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          mata_pelajaran: "Rapor Capaian & Tren Asesmen Siswa",
          kelas: "Semua Kelas",
          tanggal: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          total_sesi: numericSesiCount,
        },
        siswa_list: siswaTrenList.map((s, idx) => ({
          ...s,
          rank: idx + 1,
          rata_rata: s.rataRata,
          total_sesi: s.totalSesi,
          tuntas_count: s.tuntasCount,
        })),
        sesi_list: sesiList,
      };

      const res = await fetch("/api/export/rapor-docx", {
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
      a.download = `Rapor_Siswa_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Dokumen Word Rapor Siswa berhasil diunduh!", { id: toastId });
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengekspor dokumen Word", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRaporPdf = async () => {
    if (siswaTrenList.length === 0) {
      toast.error("Belum ada data rapor untuk diekspor.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Menyiapkan dokumen PDF Rapor Siswa...");

    try {
      const payload = {
        header: {
          nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          mata_pelajaran: "Rapor Capaian & Tren Asesmen Siswa",
          kelas: "Semua Kelas",
          tanggal: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          total_sesi: numericSesiCount,
        },
        siswa_list: siswaTrenList.map((s, idx) => ({
          ...s,
          rank: idx + 1,
          rata_rata: s.rataRata,
          total_sesi: s.totalSesi,
          tuntas_count: s.tuntasCount,
        })),
        sesi_list: sesiList,
      };

      const res = await fetch("/api/export/rapor-pdf", {
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
      a.download = `Rapor_Siswa_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Dokumen PDF Rapor Siswa berhasil diunduh!", { id: toastId });
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengekspor dokumen PDF", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pb-24">
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
          <p className="font-bold uppercase tracking-wider text-xs text-gray-500 dark:text-gray-400">
            Memuat Rapor Siswa...
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
          <TrendingUp size={12} /> Analitik &amp; Tren Longitudinal
        </div>
        <h1 className="text-xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
          Rapor Siswa
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pantau tren nilai tiap siswa lintas sesi asesmen. Data ditarik otomatis dari riwayat koreksi tersimpan.
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
              placeholder="Cari nama siswa di rapor..."
              className="pl-10 pr-3.5 py-2.5 w-full border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium text-xs sm:text-sm transition-colors bg-gray-50/50 dark:bg-[#252525] dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {siswaTrenList.length > 0 && (
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="px-3.5 sm:px-4 py-2.5 bg-white dark:bg-[#252525] border-2 border-black dark:border-white/30 text-black dark:text-white font-bold uppercase tracking-wider text-xs hover:bg-gray-100 dark:hover:bg-[#333] transition-all flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-y-0.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={14} /> <span>Unduh Rapor</span>
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

        {/* Empty state: Belum ada sesi tersimpan */}
        {!error && sesiList.length === 0 && (
          <div className="border-2 border-dashed border-black/20 dark:border-white/15 bg-gray-50/50 dark:bg-[#252525]/30 p-8 sm:p-14 text-center">
            <ClipboardList size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <h2 className="text-lg sm:text-xl font-editorial font-bold text-black dark:text-white mb-1.5">
              Belum Ada Sesi Tersimpan
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
              Simpan minimal satu sesi koreksi untuk mulai membangun rapor tren siswa. Semakin
              banyak sesi, semakin akurat tren perkembangannya.
            </p>
            <a
              href="/koreksi"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
            >
              Mulai Koreksi <ArrowUpRight size={14} />
            </a>
          </div>
        )}

        {/* Empty numeric (ada sesi tapi semua skala huruf) */}
        {!error && sesiList.length > 0 && siswaTrenList.length === 0 && (
          <div className="border-2 border-dashed border-black/20 dark:border-white/15 bg-gray-50/50 dark:bg-[#252525]/30 p-8 sm:p-12 text-center">
            <Award size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2.5" />
            <h2 className="text-base sm:text-lg font-editorial font-bold text-black dark:text-white mb-1.5">
              Tren Numerik Belum Tersedia
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Sesi tersimpan menggunakan skala huruf mutu (A–E) yang tidak dapat diagregasi
              menjadi tren angka. Simpan sesi dengan skala 100 atau 10 untuk melihat grafik tren.
            </p>
          </div>
        )}

        {/* ── KONTEN UTAMA RAPOR ── */}
        {!error && siswaTrenList.length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {/* 3 StatCard Ringkas (Monokrom Murni, Tanpa Truncate Canggung) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <StatCard
                icon={<Users size={14} className="text-black dark:text-white" />}
                label="Siswa"
                value={String(totalSiswa)}
                sub={`${numericSesiCount} sesi dinilai`}
              />
              <StatCard
                icon={<GraduationCap size={14} className="text-black dark:text-white" />}
                label="Rata Kelas"
                value={rataKelas.toFixed(1)}
                sub="Skala 100"
              />
              <StatCard
                icon={<Trophy size={14} className="text-black dark:text-white" />}
                label="Tertinggi"
                value={filtered.length ? `${siswaTrenList[0].rataRata.toFixed(1)}` : "-"}
                sub={siswaTrenList.length ? `${siswaTrenList[0].nama.split(" ")[0]}` : ""}
              />
            </div>

            {/* Peringkat Rata-Rata (Leaderboard Neobrutalisme) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                  <Award size={15} /> Peringkat Rata-Rata Kelas
                </h2>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {siswaTrenList.length} Siswa Terdaftar
                </span>
              </div>

              <div className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#202020] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] divide-y-2 divide-black/10 dark:divide-white/10 max-h-72 overflow-y-auto">
                {siswaTrenList.map((s, i) => (
                  <div key={s.nama + i} className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5">
                    <span className="w-6 h-6 flex items-center justify-center font-bold text-xs border-2 border-black/30 dark:border-white/30 bg-gray-50 dark:bg-[#2a2a2a] dark:text-white shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-black dark:text-white w-28 sm:w-44 truncate shrink-0">
                      {s.nama}
                    </span>
                    <div className="flex-1 min-w-[60px]">
                      <RataRataBar nilai={s.rataRata} max={maxNilai} />
                    </div>
                    <span className="font-mono font-bold text-black dark:text-white text-xs sm:text-sm w-12 text-right shrink-0">
                      {s.rataRata.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Kartu Tren Siswa */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5 border-t-2 border-black/10 dark:border-white/10 pt-5">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <TrendingUp size={15} /> Tren Perkembangan Nilai Siswa
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Menampilkan {filtered.length} riwayat siswa
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((s, i) => (
                  <div
                    key={s.nama + i}
                    className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#202020] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-black dark:text-white">{s.nama}</h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {s.totalSesi} sesi · {s.tuntasCount} tuntas · rata-rata {s.rataRata.toFixed(1)}
                        </p>
                      </div>
                      <TrenBadge data={s.data} />
                    </div>
                    <TrenLineChart data={s.data} maxNilai={maxNilai} />
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="lg:col-span-2 text-center py-10 text-gray-400 dark:text-gray-500 font-medium text-xs sm:text-sm border-2 border-dashed border-black/15">
                    Tidak ada siswa yang cocok dengan kata kunci &quot;{query}&quot;.
                  </div>
                )}
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
                    Pilih format ekspor rapor sesuai kebutuhan Anda.
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
                    onClick={handleExportRaporPdf}
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
                          Format identik Word siap cetak
                        </div>
                      </div>
                    </div>
                    <Download size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>

                  {/* Microsoft Word */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportRaporDocx}
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
                    onClick={() => {
                      handleExportRaporExcel();
                      setIsDownloadModalOpen(false);
                    }}
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
                          Rekap nilai lengkap &amp; peringkat rapor kelas
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
      <div className="text-xl sm:text-3xl font-extrabold text-black dark:text-white my-0.5 tracking-tight">{value}</div>
      {sub && <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">{sub}</p>}
    </div>
  );
}
