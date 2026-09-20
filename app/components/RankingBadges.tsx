"use client";

/**
 * RankingBadges — Sistem lencana prestasi siswa untuk halaman Ranking.
 *
 * Lencana diturunkan secara deterministik dari statistik agregat tiap siswa
 * (rata-rata, tren, ketuntasan, konsistensi) sehingga tidak perlu data
 * tambahan di database. Gaya visual mengikuti Neo-Brutalism proyek:
 * garis tepi tebal, bayangan solid, dan warna aksen pekat + dukungan dark mode.
 */

import {
  Crown,
  Flame,
  TrendingUp,
  Target,
  Sparkles,
  Sprout,
  Medal,
  type LucideIcon,
} from "lucide-react";

// ── Statistik yang dipakai untuk menghitung lencana ──
export interface StatSiswaBadge {
  rataRata: number;
  totalSesi: number;
  tuntasCount: number;
  nilaiList: number[]; // deret nilai kronologis
  maxSkala: number; // 100 / 10
  peringkat: number; // 1-based, posisi di leaderboard
}

export interface Badge {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  /** kelas warna Tailwind: [bg, text, border] */
  tone: { bg: string; text: string; border: string };
}

// Palet warna per lencana (dipilih agar harmonis, bukan warna default polos).
const TONES = {
  gold: {
    bg: "bg-amber-100 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500",
  },
  fire: {
    bg: "bg-orange-100 dark:bg-orange-500/15",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500",
  },
  rise: {
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500",
  },
  perfect: {
    bg: "bg-violet-100 dark:bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500",
  },
  target: {
    bg: "bg-sky-100 dark:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500",
  },
  grow: {
    bg: "bg-lime-100 dark:bg-lime-500/15",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-500",
  },
} as const;

/**
 * Menghitung daftar lencana untuk satu siswa berdasar statistiknya.
 * Deterministik — input sama selalu menghasilkan lencana sama.
 */
export function hitungBadge(stat: StatSiswaBadge): Badge[] {
  const badges: Badge[] = [];
  const { rataRata, totalSesi, tuntasCount, nilaiList, maxSkala, peringkat } = stat;
  const persenRata = maxSkala > 0 ? (rataRata / maxSkala) * 100 : 0;

  // 🥇 Juara Kelas — peringkat 1 dengan minimal 1 sesi.
  if (peringkat === 1 && totalSesi > 0) {
    badges.push({
      id: "juara",
      label: "Juara Kelas",
      desc: "Rata-rata tertinggi di kelas",
      icon: Crown,
      tone: TONES.gold,
    });
  }

  // 💯 Nilai Sempurna — pernah mendapat nilai maksimal.
  if (nilaiList.some((n) => n >= maxSkala)) {
    badges.push({
      id: "sempurna",
      label: "Nilai Sempurna",
      desc: `Pernah meraih nilai ${maxSkala}`,
      icon: Sparkles,
      tone: TONES.perfect,
    });
  }

  // 🎯 Selalu Tuntas — lulus KKM di semua sesi (min. 2 sesi).
  if (totalSesi >= 2 && tuntasCount === totalSesi) {
    badges.push({
      id: "tuntas",
      label: "Selalu Tuntas",
      desc: "Lulus KKM di setiap sesi",
      icon: Target,
      tone: TONES.target,
    });
  }

  // 📈 Paling Progres — kenaikan signifikan dari sesi pertama ke terakhir.
  if (nilaiList.length >= 2) {
    const delta = nilaiList[nilaiList.length - 1] - nilaiList[0];
    if (delta >= maxSkala * 0.15) {
      badges.push({
        id: "progres",
        label: "Naik Kelas",
        desc: `Nilai naik ${delta.toFixed(1)} poin`,
        icon: TrendingUp,
        tone: TONES.rise,
      });
    }
  }

  // 🔥 Konsisten — variasi nilai rendah (stabil) & rata-rata tinggi.
  if (totalSesi >= 3 && persenRata >= 70) {
    const mean = nilaiList.reduce((a, c) => a + c, 0) / nilaiList.length;
    const variance =
      nilaiList.reduce((a, c) => a + (c - mean) ** 2, 0) / nilaiList.length;
    const stdev = Math.sqrt(variance);
    // stabil jika standar deviasi < 8% dari skala maksimum
    if (stdev <= maxSkala * 0.08) {
      badges.push({
        id: "konsisten",
        label: "Konsisten",
        desc: "Nilai stabil & tinggi",
        icon: Flame,
        tone: TONES.fire,
      });
    }
  }

  // 🌱 Pejuang — belum tuntas tapi menunjukkan usaha (tren tidak menurun).
  if (badges.length === 0 && nilaiList.length >= 2) {
    const delta = nilaiList[nilaiList.length - 1] - nilaiList[0];
    if (delta >= 0) {
      badges.push({
        id: "pejuang",
        label: "Pejuang",
        desc: "Terus berkembang, tetap semangat",
        icon: Sprout,
        tone: TONES.grow,
      });
    }
  }

  return badges;
}

// ── Chip lencana tunggal ──
export function BadgeChip({ badge, size = "md" }: { badge: Badge; size?: "sm" | "md" }) {
  const Icon = badge.icon;
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const iconSize = size === "sm" ? 11 : 13;
  return (
    <span
      title={badge.desc}
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider border-2 ${pad} ${badge.tone.bg} ${badge.tone.text} ${badge.tone.border}`}
    >
      <Icon size={iconSize} /> {badge.label}
    </span>
  );
}

// ── Medali podium (juara 1/2/3) ──
export function MedaliPodium({ posisi }: { posisi: 1 | 2 | 3 }) {
  const cfg = {
    1: { color: "text-amber-500", label: "Emas" },
    2: { color: "text-slate-400", label: "Perak" },
    3: { color: "text-orange-600", label: "Perunggu" },
  }[posisi];
  return (
    <span className={`inline-flex items-center gap-1 ${cfg.color}`} title={`Medali ${cfg.label}`}>
      <Medal size={20} strokeWidth={2.5} />
    </span>
  );
}
