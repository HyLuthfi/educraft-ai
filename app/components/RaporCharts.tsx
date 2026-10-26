"use client";

/**
 * RaporCharts — Visualisasi tren nilai siswa lintas sesi koreksi.
 *
 * Dibuat dengan SVG murni (tanpa dependency chart eksternal) agar konsisten
 * dengan gaya Neo-Brutalism (garis tepi hitam tebal + bayangan solid) dan
 * mendukung dark mode. Grafik diturunkan dari deret nilai per siswa yang
 * dikumpulkan lintas `sesi_koreksi`.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Satu titik data pada tren (satu sesi) ──
export interface TitikTren {
  label: string; // label sesi (mis. tanggal singkat)
  nilai: number; // nilai numerik pada sesi tsb
}

// ═══════════════════════════════════════════════════════════════════════════
// Line Chart — Tren nilai satu siswa lintas sesi
// ═══════════════════════════════════════════════════════════════════════════
export function TrenLineChart({
  data,
  maxNilai,
  height = 160,
}: {
  data: TitikTren[];
  maxNilai: number;
  height?: number;
}) {
  const W = 520;
  const H = height;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(maxNilai, 1);
  const n = data.length;

  // Posisi X tiap titik (rata dari kiri ke kanan)
  const xOf = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const yOf = (v: number) => padT + innerH - (Math.min(v, max) / max) * innerH;

  const points = data.map((d, i) => ({ x: xOf(i), y: yOf(d.nilai), d }));
  const pathLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const pathArea =
    points.length > 0
      ? `${pathLine} L ${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : "";

  // Garis grid horizontal (4 baris)
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  if (n === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500 font-medium">
        Belum ada data nilai.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid + label sumbu Y */}
      {gridVals.map((val, i) => {
        const y = yOf(val);
        return (
          <g key={i}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              className="stroke-black/10 dark:stroke-white/10"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={padL - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-gray-400 dark:fill-gray-500"
              style={{ fontSize: 9, fontWeight: 700 }}
            >
              {val}
            </text>
          </g>
        );
      })}

      {/* Area gradasi di bawah garis */}
      {pathArea && <path d={pathArea} className="fill-black/5 dark:fill-white/10" />}

      {/* Garis tren */}
      <path
        d={pathLine}
        fill="none"
        className="stroke-black dark:stroke-white"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Titik + label nilai + label sumbu X */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={4}
            className="fill-white dark:fill-[#1e1e1e] stroke-black dark:stroke-white"
            strokeWidth={2.5}
          >
            <title>{`${p.d.label}: ${p.d.nilai}`}</title>
          </circle>
          <text
            x={p.x}
            y={p.y - 9}
            textAnchor="middle"
            className="fill-black dark:fill-white"
            style={{ fontSize: 10, fontWeight: 800 }}
          >
            {p.d.nilai}
          </text>
          <text
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400"
            style={{ fontSize: 9, fontWeight: 600 }}
          >
            {p.d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Badge tren (naik / turun / stabil) berdasar selisih titik awal & akhir
// ═══════════════════════════════════════════════════════════════════════════
export function TrenBadge({ data }: { data: TitikTren[] }) {
  if (data.length < 2) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-[#252525] border border-black/10 dark:border-white/10">
        <Minus size={12} /> Baru
      </span>
    );
  }
  const delta = data[data.length - 1].nilai - data[0].nilai;
  if (delta > 0.5) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-black dark:text-white px-2 py-0.5 bg-gray-100 dark:bg-white/10 border border-black/20 dark:border-white/20">
        <TrendingUp size={12} /> +{delta.toFixed(1)}
      </span>
    );
  }
  if (delta < -0.5) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-black dark:text-white px-2 py-0.5 bg-gray-100 dark:bg-white/10 border border-black/20 dark:border-white/20">
        <TrendingDown size={12} /> -{Math.abs(delta).toFixed(1)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-50 dark:bg-[#252525] border border-black/10 dark:border-white/10">
      <Minus size={12} /> Stabil
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Mini bar — perbandingan rata-rata antar siswa (leaderboard)
// ═══════════════════════════════════════════════════════════════════════════
export function RataRataBar({ nilai, max }: { nilai: number; max: number }) {
  const pct = Math.max(4, Math.min(100, (nilai / Math.max(max, 1)) * 100));
  return (
    <div className="w-full h-3 bg-gray-100 dark:bg-[#2a2a2a] border border-black/15 dark:border-white/15">
      <div
        className="h-full bg-black dark:bg-white border-r-2 border-black dark:border-white/40"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
