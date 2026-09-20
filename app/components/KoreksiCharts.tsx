"use client";

/**
 * KoreksiCharts — Visualisasi analitik hasil Auto-Koreksi.
 *
 * Dibuat dengan SVG murni (tanpa dependency chart eksternal) agar konsisten
 * dengan gaya Neo-Brutalism (garis tepi hitam tebal + bayangan solid) dan
 * mendukung dark mode. Semua grafik diturunkan langsung dari `ResponseKoreksi`
 * tanpa memerlukan perubahan pada backend.
 *
 * Grafik yang disediakan:
 *  1. Distribusi Nilai (histogram batang) — sebaran nilai akhir siswa.
 *  2. Donut Ketuntasan — proporsi Tuntas vs Remedial.
 *  3. Analisis Butir Soal (bar per-nomor) — tingkat kesalahan tiap nomor.
 *
 * Grafik yang membutuhkan nilai numerik (Distribusi) otomatis disembunyikan
 * jika skala penilaian berupa huruf mutu (A-E).
 */

interface KoreksiItem {
  nomor: number;
  pertanyaan: string;
  jawaban_siswa: string;
  kunci_jawaban: string;
  status: "benar" | "salah" | "setengah";
  nilai: number;
  catatan: string;
}

interface HasilSiswa {
  nama_siswa: string;
  nilai_akhir: number | string;
  status_kelulusan: "tuntas" | "belum_tuntas";
  detail_koreksi: KoreksiItem[];
  rekomendasi: string;
}

interface ResponseKoreksi {
  hasil: HasilSiswa[];
  analitik_kelas: string;
}

/** Ubah nilai_akhir (number | string) menjadi angka; NaN jika bukan angka (huruf mutu). */
function toNumber(v: number | string): number {
  return typeof v === "number" ? v : parseFloat(v);
}

// ── Kartu pembungkus konsisten Neo-Brutalism ──
function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-2 border-black dark:border-white/20 p-3 sm:p-6 bg-white dark:bg-[#1e1e1e] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)]">
      <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5 sm:mb-5 flex items-center gap-2">
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Distribusi Nilai (Histogram)
// ═══════════════════════════════════════════════════════════════════════════
function DistribusiNilai({ hasil, skala }: { hasil: HasilSiswa[]; skala: "100" | "10" | "huruf" }) {
  // Skala huruf tidak dapat dihistogram numerik.
  if (skala === "huruf") {
    // Tampilkan distribusi huruf mutu sebagai gantinya.
    const grades = ["A", "B", "C", "D", "E"];
    const counts = grades.map(
      (g) => hasil.filter((s) => String(s.nilai_akhir).trim().toUpperCase().startsWith(g)).length
    );
    const max = Math.max(1, ...counts);
    return (
      <div className="flex items-end justify-around gap-3 h-48">
        {grades.map((g, i) => {
          const h = (counts[i] / max) * 100;
          return (
            <div key={g} className="flex flex-col items-center gap-2 flex-1">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{counts[i]}</span>
              <div className="w-full flex items-end" style={{ height: "140px" }}>
                <div
                  className="w-full border-2 border-black dark:border-white/40 bg-indigo-400 dark:bg-indigo-500 transition-all"
                  style={{ height: `${Math.max(h, 4)}%` }}
                  title={`Nilai ${g}: ${counts[i]} siswa`}
                />
              </div>
              <span className="text-sm font-editorial font-bold text-black dark:text-white">{g}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Skala numerik: buat interval (bin).
  const maxScale = skala === "10" ? 10 : 100;
  const binCount = skala === "10" ? 5 : 5; // 5 interval
  const binSize = maxScale / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    label:
      skala === "10"
        ? `${(i * binSize).toFixed(0)}-${((i + 1) * binSize).toFixed(0)}`
        : `${i * binSize}-${(i + 1) * binSize}`,
    count: 0,
  }));

  hasil.forEach((s) => {
    const n = toNumber(s.nilai_akhir);
    if (isNaN(n)) return;
    let idx = Math.floor(n / binSize);
    if (idx >= binCount) idx = binCount - 1; // nilai maksimum masuk bin terakhir
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  });

  const max = Math.max(1, ...bins.map((b) => b.count));

  return (
    <div className="flex items-end justify-around gap-2 h-48">
      {bins.map((b, i) => {
        const h = (b.count / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{b.count}</span>
            <div className="w-full flex items-end" style={{ height: "130px" }}>
              <div
                className="w-full border-2 border-black dark:border-white/40 bg-emerald-400 dark:bg-emerald-500 transition-all"
                style={{ height: `${Math.max(h, 4)}%` }}
                title={`Rentang ${b.label}: ${b.count} siswa`}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Donut Ketuntasan
// ═══════════════════════════════════════════════════════════════════════════
function DonutKetuntasan({ hasil }: { hasil: HasilSiswa[] }) {
  const total = hasil.length;
  const tuntas = hasil.filter((s) => s.status_kelulusan === "tuntas").length;
  const remedial = total - tuntas;
  const pct = total > 0 ? (tuntas / total) * 100 : 0;

  const size = 160;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* track (remedial) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-rose-200 dark:stroke-rose-900/40"
            strokeWidth={stroke}
          />
          {/* progress (tuntas) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-emerald-500"
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="butt"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-editorial font-bold text-black dark:text-white">{pct.toFixed(0)}%</span>
          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">Tuntas</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-black dark:border-white/40 bg-emerald-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Tuntas <span className="font-bold">{tuntas}</span> siswa
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-black dark:border-white/40 bg-rose-300 dark:bg-rose-900/50" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Remedial <span className="font-bold">{remedial}</span> siswa
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Analisis Butir Soal (Bar per-nomor)
// ═══════════════════════════════════════════════════════════════════════════
function AnalisisButir({ hasil }: { hasil: HasilSiswa[] }) {
  // Kumpulkan statistik salah/setengah per nomor soal di seluruh siswa.
  const map = new Map<number, { salah: number; total: number }>();
  hasil.forEach((s) => {
    s.detail_koreksi?.forEach((item) => {
      const entry = map.get(item.nomor) ?? { salah: 0, total: 0 };
      entry.total += 1;
      if (item.status === "salah") entry.salah += 1;
      else if (item.status === "setengah") entry.salah += 0.5;
      map.set(item.nomor, entry);
    });
  });

  const rows = Array.from(map.entries())
    .map(([nomor, v]) => ({
      nomor,
      pctSalah: v.total > 0 ? (v.salah / v.total) * 100 : 0,
    }))
    .sort((a, b) => a.nomor - b.nomor);

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada rincian per nomor untuk dianalisis.</p>;
  }

  return (
    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
      {rows.map((r) => {
        // Warna berdasarkan tingkat kesulitan (semakin banyak salah = semakin merah).
        const color =
          r.pctSalah >= 60
            ? "bg-rose-400 dark:bg-rose-500"
            : r.pctSalah >= 30
            ? "bg-amber-400 dark:bg-amber-500"
            : "bg-emerald-400 dark:bg-emerald-500";
        return (
          <div key={r.nomor} className="flex items-center gap-3">
            <span className="text-xs font-bold w-14 shrink-0 text-gray-600 dark:text-gray-400">No. {r.nomor}</span>
            <div className="flex-1 h-6 border-2 border-black dark:border-white/30 bg-gray-100 dark:bg-white/5 relative overflow-hidden">
              <div
                className={`h-full ${color} transition-all`}
                style={{ width: `${Math.max(r.pctSalah, 2)}%` }}
              />
            </div>
            <span className="text-xs font-bold w-12 text-right text-gray-700 dark:text-gray-300">
              {r.pctSalah.toFixed(0)}%
            </span>
          </div>
        );
      })}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-2">
        Persentase siswa yang <span className="font-bold">salah/kurang tepat</span> pada tiap nomor. Merah = soal
        paling banyak dijawab keliru.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Komponen utama
// ═══════════════════════════════════════════════════════════════════════════
export default function KoreksiCharts({
  koreksiResult,
  skala,
}: {
  koreksiResult: ResponseKoreksi;
  skala: "100" | "10" | "huruf";
}) {
  const { hasil } = koreksiResult;
  if (!hasil || hasil.length === 0) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
        Visualisasi Analitik Kelas
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title={skala === "huruf" ? "Distribusi Huruf Mutu" : "Distribusi Nilai"}>
          <DistribusiNilai hasil={hasil} skala={skala} />
        </ChartCard>

        <ChartCard title="Tingkat Ketuntasan Kelas">
          <DonutKetuntasan hasil={hasil} />
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Analisis Butir Soal (Tingkat Kesalahan per Nomor)">
            <AnalisisButir hasil={hasil} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
