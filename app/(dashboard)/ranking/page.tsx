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
import {
  Trophy,
  Users,
  Award,
  Search,
  ClipboardList,
  ArrowUpRight,
  Sparkles,
  Crown,
} from "lucide-react";
import { buatSupabaseClient } from "@/lib/supabase/client";
import {
  hitungBadge,
  BadgeChip,
  MedaliPodium,
  type Badge,
} from "@/app/components/RankingBadges";

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

    // Urutkan: rata-rata desc → jumlah tuntas desc → nama asc (tie-break stabil)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#121212] p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
          <p className="font-bold uppercase tracking-wider text-sm text-gray-500 dark:text-gray-400">
            Menyusun peringkat...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#121212] p-3.5 sm:p-6 md:p-10 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-4 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 sm:mb-4">
            <Trophy size={12} className="sm:w-3.5 sm:h-3.5" /> Papan Peringkat
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-editorial font-bold tracking-tight text-black dark:text-white mb-1 sm:mb-2">
            Ranking Siswa
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-base max-w-2xl">
            Peringkat kelas dari akumulasi seluruh sesi koreksi, lengkap dengan lencana
            prestasi otomatis untuk merayakan capaian tiap siswa.
          </p>
        </header>

        {/* Error */}
        {error && (
          <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/20 p-3 sm:p-5 mb-4 sm:mb-8 shadow-[3px_3px_0px_0px_rgba(239,68,68,0.4)]">
            <p className="font-bold text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty: belum ada sesi */}
        {!error && sesiList.length === 0 && (
          <EmptyState
            title="Belum Ada Sesi Tersimpan"
            desc="Simpan minimal satu sesi koreksi bernilai numerik untuk mulai menyusun peringkat kelas."
          />
        )}

        {/* Empty: ada sesi tapi tak ada data numerik */}
        {!error && sesiList.length > 0 && ranking.length === 0 && (
          <EmptyState
            title="Peringkat Numerik Belum Tersedia"
            desc="Sesi tersimpan memakai skala huruf mutu (A–E) yang tidak dapat diperingkat secara angka. Simpan sesi skala 100 atau 10."
          />
        )}

        {/* Konten */}
        {!error && ranking.length > 0 && (
          <>
            {/* Statistik ringkas: 3 kolom ringkas bahkan di mobile */}
            <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-6 sm:mb-10">
              <StatCard
                icon={<Users className="text-blue-500" size={16} />}
                label="Total Siswa"
                value={String(ranking.length)}
                sub={`Dari ${numericSesiCount} sesi numerik`}
              />
              <StatCard
                icon={<Crown className="text-amber-500" size={16} />}
                label="Juara Kelas"
                value={podium[0]?.nama.split(" ")[0] ?? "-"}
                sub={podium[0] ? `Rata ${podium[0].rataRata.toFixed(1)}` : ""}
              />
              <StatCard
                icon={<Sparkles className="text-violet-500" size={16} />}
                label="Lencana"
                value={String(totalBadges)}
                sub="Total prestasi diraih"
              />
            </div>

            {/* Podium Top 3 */}
            {podium.length >= 1 && (
              <section className="mb-6 sm:mb-12">
                <h2 className="text-sm sm:text-lg font-bold uppercase tracking-wider text-black dark:text-white mb-3 sm:mb-5 flex items-center gap-2">
                  <Trophy size={16} className="sm:w-[18px] sm:h-[18px]" /> Podium Juara
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 items-end">
                  {/* Susun urutan visual: 2 - 1 - 3 pada desktop */}
                  {[podium[1], podium[0], podium[2]].map((s, visualIdx) => {
                    if (!s) return <div key={`empty-${visualIdx}`} className="hidden md:block" />;
                    const realPos = (ranking.indexOf(s) + 1) as 1 | 2 | 3;
                    const isChampion = realPos === 1;
                    return (
                      <div
                        key={s.nama}
                        className={`border-2 border-black dark:border-white/20 bg-white dark:bg-[#1e1e1e] p-3.5 sm:p-6 text-center ${
                          isChampion
                            ? "sm:-translate-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)]"
                            : "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]"
                        }`}
                      >
                        <div className="flex justify-center mb-1.5 sm:mb-2">
                          <MedaliPodium posisi={realPos} />
                        </div>
                        <div className="text-3xl sm:text-5xl font-editorial font-bold text-black dark:text-white mb-0.5 sm:mb-1">
                          #{realPos}
                        </div>
                        <h3 className="font-editorial font-bold text-sm sm:text-lg text-black dark:text-white truncate">
                          {s.nama}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                          {s.totalSesi} sesi · {s.tuntasCount} tuntas
                        </p>
                        <div className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 bg-black dark:bg-white text-white dark:text-black font-editorial font-bold text-base sm:text-xl">
                          {s.rataRata.toFixed(1)}
                        </div>
                        {s.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center mt-2.5 sm:mt-4">
                            {s.badges.map((b) => (
                              <BadgeChip key={b.id} badge={b} size="sm" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-5">
              <h2 className="text-sm sm:text-lg font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
                <Award size={16} className="sm:w-[18px] sm:h-[18px]" /> Klasemen Lengkap
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

            {/* Tabel klasemen */}
            <div className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#1e1e1e] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b-2 border-black dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a]">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-16">
                      #
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Siswa & Lencana
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                      Sesi
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                      Tuntas
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">
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
                        className="hover:bg-gray-50 dark:hover:bg-[#242424] transition-colors"
                      >
                        <td className="px-4 py-4">
                          <span
                            className={`w-8 h-8 flex items-center justify-center font-editorial font-bold text-sm border-2 border-black dark:border-white/30 ${
                              isTop3
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "bg-white dark:bg-[#2a2a2a] dark:text-white"
                            }`}
                          >
                            {pos}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-sm dark:text-white mb-1.5">{s.nama}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {s.badges.length > 0 ? (
                              s.badges.map((b) => <BadgeChip key={b.id} badge={b} size="sm" />)
                            ) : (
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium italic">
                                Belum ada lencana
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-sm dark:text-white">
                          {s.totalSesi}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {s.tuntasCount}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            /{s.totalSesi}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-editorial font-bold text-lg text-black dark:text-white">
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
                        className="text-center py-10 text-gray-400 dark:text-gray-500 font-medium"
                      >
                        Tidak ada siswa cocok dengan &quot;{query}&quot;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
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
      <div className="text-xl sm:text-4xl font-editorial font-bold text-black dark:text-white truncate">
        {value}
      </div>
      {sub && <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">{sub}</p>}
    </div>
  );
}

// ── Empty state generik ──
function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-2 border-black dark:border-white/20 bg-white dark:bg-[#1e1e1e] p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)]">
      <ClipboardList size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <h2 className="text-2xl font-editorial font-bold text-black dark:text-white mb-2">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">{desc}</p>
      <a
        href="/koreksi"
        className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-sm border-2 border-black dark:border-white/20 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-1 active:shadow-none"
      >
        Mulai Koreksi <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
