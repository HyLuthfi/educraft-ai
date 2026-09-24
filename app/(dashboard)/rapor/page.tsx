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
        entry.data.push({ label, nilai: Math.round(nilai * 10) / 10 });
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

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#121212] p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
          <p className="font-bold uppercase tracking-wider text-sm text-gray-500 dark:text-gray-400">
            Memuat rapor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#121212] p-3.5 sm:p-6 md:p-10 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-4 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 sm:mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
              <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5" /> Analitik Longitudinal
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-editorial font-bold tracking-tight text-black dark:text-white mb-1 sm:mb-2">
              Rapor Siswa
            </h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-base max-w-2xl">
              Pantau tren nilai tiap siswa lintas sesi koreksi. Data ditarik otomatis dari sesi
              yang Anda simpan pada halaman Koreksi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            {siswaTrenList.length > 0 && (
              <button
                type="button"
                onClick={handleExportRaporExcel}
                className="px-3.5 sm:px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black font-bold uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>Unduh Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="px-3.5 sm:px-4 py-2 bg-white dark:bg-[#1e1e1e] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <Settings size={14} />
              <span>Kelola Sesi ({sesiList.length})</span>
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/20 p-3 sm:p-5 mb-4 sm:mb-8 shadow-[3px_3px_0px_0px_rgba(239,68,68,0.4)]">
            <p className="font-bold text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!error && sesiList.length === 0 && (
          <div className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#1e1e1e] p-6 sm:p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
            <ClipboardList size={36} className="sm:w-12 sm:h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-editorial font-bold text-black dark:text-white mb-1.5 sm:mb-2">
              Belum Ada Sesi Tersimpan
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6 max-w-md mx-auto">
              Simpan minimal satu sesi koreksi untuk mulai membangun rapor tren siswa. Semakin
              banyak sesi, semakin akurat trennya.
            </p>
            <a
              href="/koreksi"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs sm:text-sm border-2 border-black dark:border-white/20 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-1 active:shadow-none"
            >
              Mulai Koreksi <ArrowUpRight size={14} className="sm:w-4 sm:h-4" />
            </a>
          </div>
        )}

        {/* Empty numeric (ada sesi tapi semua skala huruf) */}
        {!error && sesiList.length > 0 && siswaTrenList.length === 0 && (
          <div className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#1e1e1e] p-6 sm:p-10 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
            <Award size={32} className="sm:w-10 sm:h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2 sm:mb-3" />
            <h2 className="text-lg sm:text-xl font-editorial font-bold text-black dark:text-white mb-1.5 sm:mb-2">
              Tren Numerik Belum Tersedia
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Sesi tersimpan menggunakan skala huruf mutu (A–E) yang tidak dapat diagregasi
              menjadi tren angka. Simpan sesi dengan skala 100 atau 10 untuk melihat grafik tren.
            </p>
          </div>
        )}

        {/* Konten utama */}
        {!error && siswaTrenList.length > 0 && (
          <>
            {/* Statistik ringkas kelas: 3 kolom compact di mobile */}
            <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-6 sm:mb-10">
              <StatCard
                icon={<Users className="text-blue-500" size={16} />}
                label="Total Siswa"
                value={String(totalSiswa)}
                sub={`Dari ${numericSesiCount} sesi numerik`}
              />
              <StatCard
                icon={<GraduationCap className="text-indigo-500" size={16} />}
                label="Rata-Rata"
                value={rataKelas.toFixed(1)}
                sub="Rata dari semua siswa"
              />
              <StatCard
                icon={<Trophy className="text-amber-500" size={16} />}
                label="Teratas"
                value={filtered.length ? siswaTrenList[0].nama.split(" ")[0] : "-"}
                sub={siswaTrenList.length ? `Rata ${siswaTrenList[0].rataRata.toFixed(1)}` : ""}
              />
            </div>

            {/* Leaderboard rata-rata */}
            <section className="mb-6 sm:mb-10">
              <h2 className="text-sm sm:text-lg font-bold uppercase tracking-wider text-black dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Award size={16} className="sm:w-[18px] sm:h-[18px]" /> Peringkat Rata-Rata
              </h2>
              <div className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#1e1e1e] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)] divide-y-2 divide-black/10 dark:divide-white/10">
                {siswaTrenList.map((s, i) => (
                  <div key={s.nama + i} className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2 sm:py-3">
                    <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-editorial font-bold text-xs sm:text-sm border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-bold text-xs sm:text-sm dark:text-white w-24 sm:w-40 truncate shrink-0">{s.nama}</span>
                    <div className="flex-1">
                      <RataRataBar nilai={s.rataRata} max={maxNilai} />
                    </div>
                    <span className="font-editorial font-bold text-black dark:text-white text-xs sm:text-base w-10 sm:w-12 text-right shrink-0">
                      {s.rataRata.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-5">
              <h2 className="text-sm sm:text-lg font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
                <TrendingUp size={16} className="sm:w-[18px] sm:h-[18px]" /> Tren Per Siswa
              </h2>
              <div className="relative w-full sm:w-auto">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama siswa..."
                  className="pl-9 pr-3 py-2 sm:py-2.5 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] transition-all font-medium text-xs sm:text-sm dark:text-white w-full sm:w-64"
                />
              </div>
            </div>

            {/* Grid kartu tren siswa */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {filtered.map((s, i) => (
                <div
                  key={s.nama + i}
                  className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#1e1e1e] p-3.5 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div>
                      <h3 className="font-editorial font-bold text-sm sm:text-lg text-black dark:text-white">{s.nama}</h3>
                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {s.totalSesi} sesi · {s.tuntasCount} tuntas · rata {s.rataRata.toFixed(1)}
                      </p>
                    </div>
                    <TrenBadge data={s.data} />
                  </div>
                  <TrenLineChart data={s.data} maxNilai={maxNilai} />
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="lg:col-span-2 text-center py-8 sm:py-10 text-gray-400 dark:text-gray-500 font-medium text-xs sm:text-sm">
                  Tidak ada siswa cocok dengan &quot;{query}&quot;.
                </div>
              )}
            </div>
          </>
        )}

        <ManageSesiKoreksiModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          onSesiDeleted={(deletedId) => {
            setSesiList((prev) => prev.filter((s) => s.id !== deletedId));
          }}
        />
      </div>
    </div>
  );
}

// ── Kartu statistik ringkas ──
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
    <div className="border-2 border-black dark:border-white/20 p-2.5 sm:p-6 bg-white dark:bg-[#1e1e1e] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-1 sm:gap-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1 sm:mb-3 truncate">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className="text-xl sm:text-4xl font-editorial font-bold text-black dark:text-white truncate">{value}</div>
      {sub && <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">{sub}</p>}
    </div>
  );
}
