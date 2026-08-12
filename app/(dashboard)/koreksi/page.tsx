"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle,
  Type,
  UploadCloud,
  Camera,
  X,
  ClipboardList,
  Sparkles,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings2,
  GraduationCap,
  TrendingUp,
  Award,
  AlertTriangle,
  RotateCcw,
  Printer,
  ChevronRight,
} from "lucide-react";
import KoreksiCharts from "@/app/components/KoreksiCharts";

type InputMethod = "text" | "file" | "image";

type StudentCard = {
  id: string;
  name: string;
  inputMethod: InputMethod;
  textContent: string;
  fileName: string;
  isParsing: boolean;
};

type ScoringConfig = {
  bobotBenar: number;
  bobotSalah: number;
  skala: "100" | "10" | "huruf";
  kkm: number;
};

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

export default function AutoKoreksiPage() {
  // ── Soal / Kunci Jawaban (Opsional) ──
  const [isSoalOpen, setIsSoalOpen] = useState(true);
  const [soalInputMethod, setSoalInputMethod] = useState<InputMethod>("text");
  const [soalText, setSoalText] = useState("");
  const [soalFileName, setSoalFileName] = useState("");
  const [isSoalParsing, setIsSoalParsing] = useState(false);
  const soalFileRef = useRef<HTMLInputElement>(null);
  const soalImgRef = useRef<HTMLInputElement>(null);

  // ── Konfigurasi Penilaian ──
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>({
    bobotBenar: 1,
    bobotSalah: 0,
    skala: "100",
    kkm: 75,
  });

  // ── Daftar Siswa ──
  const [students, setStudents] = useState<StudentCard[]>([
    { id: "s1", name: "", inputMethod: "text", textContent: "", fileName: "", isParsing: false },
  ]);

  // ── Hasil & Loading ──
  const [isKoreksiLoading, setIsKoreksiLoading] = useState(false);
  const [koreksiResult, setKoreksiResult] = useState<ResponseKoreksi | null>(null);
  const [activeStudentDetail, setActiveStudentDetail] = useState<number | null>(null);

  // ── Student CRUD ──
  const addStudent = () => {
    setStudents([
      ...students,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: "",
        inputMethod: "text",
        textContent: "",
        fileName: "",
        isParsing: false,
      },
    ]);
  };

  const removeStudent = (id: string) => {
    if (students.length <= 1) {
      toast.error("Minimal harus ada 1 siswa.");
      return;
    }
    setStudents(students.filter((s) => s.id !== id));
  };

  const updateStudent = (id: string, updates: Partial<StudentCard>) => {
    setStudents(students.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  // ── File Handlers for Soal ──
  const handleSoalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSoalParsing(true);
    const toastId = toast.loading("Mengekstrak teks soal...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.teks_hasil) {
        setSoalText((prev) => (prev ? prev + "\n\n" + data.teks_hasil : data.teks_hasil));
        setSoalFileName(file.name);
        toast.success("File soal berhasil diekstrak!", { id: toastId });
      }
    } catch {
      toast.error("Gagal membaca file soal.", { id: toastId });
    } finally {
      setIsSoalParsing(false);
      if (soalFileRef.current) {
        soalFileRef.current.value = "";
      }
    }
  };

  const handleSoalImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSoalParsing(true);
    const toastId = toast.loading("Membaca teks gambar (OCR)...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-image", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.teks_hasil) {
        setSoalText((prev) => (prev ? prev + "\n\n" + data.teks_hasil : data.teks_hasil));
        toast.success("Gambar soal berhasil dibaca!", { id: toastId });
      }
    } catch {
      toast.error("Gagal membaca gambar soal.", { id: toastId });
    } finally {
      setIsSoalParsing(false);
      if (soalImgRef.current) {
        soalImgRef.current.value = "";
      }
    }
  };

  // ── File Handlers for Student ──
  const handleStudentFile = async (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateStudent(studentId, { isParsing: true });
    const toastId = toast.loading(`Mengekstrak berkas siswa...`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.teks_hasil) {
        updateStudent(studentId, {
          textContent: data.teks_hasil,
          fileName: file.name,
          name: students.find((s) => s.id === studentId)?.name || file.name.replace(/\.[^/.]+$/, ""),
          isParsing: false,
        });
        toast.success("Teks berhasil diekstrak!", { id: toastId });
      }
    } catch {
      toast.error("Gagal membaca berkas.", { id: toastId });
      updateStudent(studentId, { isParsing: false });
    }
    e.target.value = "";
  };

  const handleStudentImage = async (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateStudent(studentId, { isParsing: true });
    const toastId = toast.loading(`Menjalankan OCR pada gambar...`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-image", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.teks_hasil) {
        updateStudent(studentId, {
          textContent: data.teks_hasil,
          isParsing: false,
        });
        toast.success("Gambar berhasil dipindai!", { id: toastId });
      }
    } catch {
      toast.error("Gagal memindai gambar.", { id: toastId });
      updateStudent(studentId, { isParsing: false });
    }
    e.target.value = "";
  };

  // ── AI Correct Operation ──
  const handleKoreksi = async () => {
    const filledStudents = students.filter((s) => s.textContent.trim());
    if (filledStudents.length === 0) {
      toast.error("Belum ada jawaban siswa yang diisi.");
      return;
    }

    setIsKoreksiLoading(true);
    const toastId = toast.loading("AI sedang menganalisis & mengoreksi jawaban...");

    try {
      const res = await fetch("/api/koreksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soalText,
          students: filledStudents.map((s) => ({
            id: s.id,
            name: s.name || `Siswa ${s.id}`,
            textContent: s.textContent,
          })),
          config: scoringConfig,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Gagal menghubungi server");
      }

      const data = await res.json();
      setKoreksiResult(data);
      setActiveStudentDetail(0);
      toast.success("Koreksi AI selesai!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal melakukan koreksi AI: " + (err.message || "Error tidak diketahui"), { id: toastId });
    } finally {
      setIsKoreksiLoading(false);
    }
  };

  const filledCount = students.filter((s) => s.textContent.trim()).length;

  // ── Tabs rendering helper ──
  const InputMethodTabs = ({
    active,
    onChange,
    size = "md",
  }: {
    active: InputMethod;
    onChange: (m: InputMethod) => void;
    size?: "sm" | "md";
  }) => (
    <div className="flex gap-1">
      {([
        { id: "text" as const, label: "Teks", icon: Type },
        { id: "file" as const, label: "File", icon: UploadCloud },
        { id: "image" as const, label: "Foto", icon: Camera },
      ] as const).map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex items-center gap-1.5 font-semibold transition-all ${
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          } ${
            active === m.id
              ? "bg-black dark:bg-white text-white dark:text-black"
              : "bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#444]"
          }`}
        >
          <m.icon size={size === "sm" ? 13 : 15} />
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 pb-32">
      {/* ────────────────── LAYOUT LOADING ────────────────── */}
      {isKoreksiLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white dark:bg-[#1e1e1e] border-4 border-black dark:border-white/20 p-10 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-yellow-400 border-r-blue-500 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black dark:text-white" size={32} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-wider dark:text-white">Menilai Jawaban...</h3>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm leading-relaxed">
              AI sedang mencocokkan pola jawaban, mengevaluasi isian esai, serta menyusun analitik ketuntasan kelas. Harap tunggu beberapa saat.
            </p>
          </div>
        </div>
      )}

      {/* ────────────────── LAYOUT HASIL KOREKSI ────────────────── */}
      {koreksiResult ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          {/* Header Hasil */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black/10 dark:border-white/10 pb-6 print:hidden">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Hasil Analisis AI</span>
              <h1 className="text-3xl font-editorial font-bold text-black dark:text-white mt-1">Laporan Auto-Koreksi</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setKoreksiResult(null)}
                className="px-5 py-3 border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-all bg-white dark:bg-[#1e1e1e] dark:text-white"
              >
                <RotateCcw size={16} /> Edit Data
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-sm flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]"
              >
                <Printer size={16} /> Cetak
              </button>
            </div>
          </div>

          {/* Grid Analitik Kelas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-2 border-black dark:border-white/20 p-6 bg-white dark:bg-[#1e1e1e] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs mb-3">
                <GraduationCap className="text-blue-500" size={18} /> Rata-Rata Nilai
              </div>
              <div className="text-4xl font-editorial font-bold text-black dark:text-white">
                {(() => {
                  const validScores = koreksiResult.hasil
                    .map((s) => typeof s.nilai_akhir === "number" ? s.nilai_akhir : parseFloat(s.nilai_akhir))
                    .filter((score) => !isNaN(score));
                  return validScores.length > 0
                    ? (validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length).toFixed(1)
                    : "-";
                })()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Berdasarkan total {koreksiResult.hasil.length} siswa</p>
            </div>

            <div className="border-2 border-black dark:border-white/20 p-6 bg-white dark:bg-[#1e1e1e] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs mb-3">
                <TrendingUp className="text-green-500" size={18} /> Tingkat Ketuntasan
              </div>
              <div className="text-4xl font-editorial font-bold text-black dark:text-white">
                {(
                  (koreksiResult.hasil.filter((s) => s.status_kelulusan === "tuntas").length /
                    koreksiResult.hasil.length) *
                  100
                ).toFixed(0)}
                %
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {koreksiResult.hasil.filter((s) => s.status_kelulusan === "tuntas").length} dari {koreksiResult.hasil.length} siswa lulus KKM ({scoringConfig.kkm})
              </p>
            </div>

            <div className="border-2 border-black dark:border-white/20 p-6 bg-white dark:bg-[#1e1e1e] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-xs mb-3">
                <Award className="text-yellow-500" size={18} /> Nilai Tertinggi
              </div>
              <div className="text-4xl font-editorial font-bold text-black dark:text-white">
                {(() => {
                  const validScores = koreksiResult.hasil
                    .map((s) => typeof s.nilai_akhir === "number" ? s.nilai_akhir : parseFloat(s.nilai_akhir))
                    .filter((score) => !isNaN(score));
                  return validScores.length > 0
                    ? Math.max(...validScores).toString()
                    : "-";
                })()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Perolehan nilai tertinggi kelas</p>
            </div>
          </div>

          {/* Rekomendasi / Analitik Global */}
          <div className="border-2 border-black dark:border-white/20 p-6 bg-yellow-50 dark:bg-yellow-950/10 text-yellow-900 dark:text-yellow-400">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle size={16} /> Analisis Performa Kelas (AI Insights)
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{koreksiResult.analitik_kelas}</p>
          </div>

          {/* Visualisasi Grafik Analitik */}
          <KoreksiCharts koreksiResult={koreksiResult} skala={scoringConfig.skala} />

          {/* Detail Koreksi Per-Siswa */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List Siswa */}
            <div className="space-y-3 print:hidden">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">Daftar Siswa</h3>
              <div className="space-y-2">
                {koreksiResult.hasil.map((siswa, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStudentDetail(idx)}
                    className={`w-full text-left p-4 border-2 flex items-center justify-between transition-all ${
                      activeStudentDetail === idx
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]"
                        : "border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] hover:border-black/30 dark:hover:border-white/30 dark:text-white"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">{siswa.nama_siswa}</div>
                      <div className="text-xs opacity-75 mt-0.5">
                        Status: <span className="uppercase font-bold">{siswa.status_kelulusan === "tuntas" ? "Tuntas" : "Remedial"}</span>
                      </div>
                    </div>
                    <div className="text-xl font-editorial font-bold">{siswa.nilai_akhir}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rincian per Nomor */}
            <div className="lg:col-span-2 space-y-6">
              {activeStudentDetail !== null && koreksiResult.hasil[activeStudentDetail] && (
                <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-6 space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] print:border-none print:shadow-none">
                  {/* Info Header Siswa */}
                  <div className="border-b border-black/10 dark:border-white/10 pb-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-editorial font-bold dark:text-white">
                        {koreksiResult.hasil[activeStudentDetail].nama_siswa}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-bold">
                        Rekomendasi: <span className="text-yellow-600 dark:text-yellow-400">{koreksiResult.hasil[activeStudentDetail].rekomendasi}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Nilai Akhir</div>
                      <div className="text-3xl font-editorial font-bold dark:text-white">
                        {koreksiResult.hasil[activeStudentDetail].nilai_akhir}
                      </div>
                    </div>
                  </div>

                  {/* List Soal Item */}
                  <div className="space-y-4">
                    {koreksiResult.hasil[activeStudentDetail].detail_koreksi.map((item, index) => (
                      <div
                        key={index}
                        className={`p-4 border border-black/10 dark:border-white/10 ${
                          item.status === "benar"
                            ? "bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900/30"
                            : item.status === "setengah"
                            ? "bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200 dark:border-yellow-900/30"
                            : "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30"
                        }`}
                      >
                        {/* Judul & Skor Soal */}
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm dark:text-white">Soal #{item.nomor}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                                item.status === "benar"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : item.status === "setengah"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Skor: <span className="font-bold text-black dark:text-white">{item.nilai}</span>
                          </span>
                        </div>

                        {/* Pertanyaan jika ada */}
                        {item.pertanyaan && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 italic">"{item.pertanyaan}"</div>
                        )}

                        {/* Jawaban vs Kunci */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                          <div className="bg-white/80 dark:bg-black/20 p-2.5 border border-black/5">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jawaban Siswa</div>
                            <div className="font-mono dark:text-white">{item.jawaban_siswa || "(Kosong)"}</div>
                          </div>
                          <div className="bg-white/80 dark:bg-black/20 p-2.5 border border-black/5">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kunci Acuan</div>
                            <div className="font-mono dark:text-white">{item.kunci_jawaban}</div>
                          </div>
                        </div>

                        {/* Catatan Koreksi */}
                        {item.catatan && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 border-t border-black/5 pt-2">
                            💡 {item.catatan}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        /* ────────────────── LAYOUT INPUT DATA (DEFAULT) ────────────────── */
        <div>
          {/* ════════════════ SEKSI 1: LEMBAR SOAL (OPSIONAL) ════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => setIsSoalOpen(!isSoalOpen)}
              className="w-full flex items-center justify-between bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] transition-colors hover:bg-gray-50 dark:hover:bg-[#252525]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 text-white flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-lg dark:text-white">Lembar Soal / Kunci Jawaban</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                    Opsional — Bisa diisi kunci jawaban atau soal lengkap
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {soalText && (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 uppercase tracking-wider">
                    ✓ Sudah diisi
                  </span>
                )}
                {isSoalOpen ? <ChevronUp size={20} className="dark:text-white" /> : <ChevronDown size={20} className="dark:text-white" />}
              </div>
            </button>

            <AnimatePresence>
              {isSoalOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white dark:bg-[#1e1e1e] border-2 border-t-0 border-black dark:border-white/20 p-6 space-y-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] -mt-[4px] transition-colors">
                    <div className="flex items-center justify-between">
                      <InputMethodTabs active={soalInputMethod} onChange={setSoalInputMethod} />
                      {soalText && (
                        <button
                          onClick={() => {
                            setSoalText("");
                            setSoalFileName("");
                          }}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={13} /> Bersihkan
                        </button>
                      )}
                    </div>

                    {soalInputMethod === "text" && (
                      <textarea
                        rows={5}
                        className="w-full p-4 bg-gray-50 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none resize-none transition-all font-mono text-sm dark:text-white"
                        placeholder={"Ketik soal atau kunci jawaban di sini...\n\nFormat kunci jawaban:\n1. A\n2. B\n3. C\n\nAtau soal lengkap:\n1. Siapa presiden pertama Indonesia?\na. Soekarno  b. Soeharto  c. Habibie  d. Megawati\nJawaban: A"}
                        value={soalText}
                        onChange={(e) => setSoalText(e.target.value)}
                      />
                    )}

                    {soalInputMethod === "file" && (
                      <div className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-8 flex flex-col items-center text-center hover:border-black/50 dark:hover:border-white/50 transition-colors">
                        <UploadCloud size={36} className="text-gray-400 mb-3" />
                        <p className="font-semibold text-black dark:text-white text-sm mb-1">Upload file soal / kunci jawaban</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOCX (Max 20MB)</p>
                        <input type="file" ref={soalFileRef} className="hidden" accept=".pdf,.docx" onChange={handleSoalFile} />
                        <button
                          onClick={() => soalFileRef.current?.click()}
                          disabled={isSoalParsing}
                          className="mt-4 px-5 py-2 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-sm font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
                        >
                          {isSoalParsing ? "Sedang membaca..." : "Pilih File"}
                        </button>
                        {soalFileName && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle size={14} /> {soalFileName}
                          </div>
                        )}
                      </div>
                    )}

                    {soalInputMethod === "image" && (
                      <div className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-8 flex flex-col items-center text-center hover:border-black/50 dark:hover:border-white/50 transition-colors">
                        <Camera size={36} className="text-gray-400 mb-3" />
                        <p className="font-semibold text-black dark:text-white text-sm mb-1">Foto lembar soal / kunci jawaban</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG, WebP</p>
                        <input type="file" ref={soalImgRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleSoalImage} />
                        <button
                          onClick={() => soalImgRef.current?.click()}
                          disabled={isSoalParsing}
                          className="mt-4 px-5 py-2 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-sm font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
                        >
                          {isSoalParsing ? "Sedang membaca..." : "Upload Foto"}
                        </button>
                      </div>
                    )}

                    {soalText && soalInputMethod !== "text" && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40">
                        <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-400 font-semibold text-xs uppercase tracking-wider">
                          <CheckCircle size={14} /> Hasil Pembacaan
                        </div>
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">{soalText}</pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ════════════════ SEKSI 2: KONFIGURASI PENILAIAN ════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="w-full flex items-center justify-between bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] transition-colors hover:bg-gray-50 dark:hover:bg-[#252525]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 text-white flex items-center justify-center">
                  <Settings2 size={20} />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-lg dark:text-white">Konfigurasi Penilaian</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                    Kustomisasi Bobot, Skala Nilai, dan Batas KKM ({scoringConfig.kkm})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isConfigOpen ? <ChevronUp size={20} className="dark:text-white" /> : <ChevronDown size={20} className="dark:text-white" />}
              </div>
            </button>

            <AnimatePresence>
              {isConfigOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white dark:bg-[#1e1e1e] border-2 border-t-0 border-black dark:border-white/20 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] -mt-[4px] grid grid-cols-1 md:grid-cols-2 gap-6 transition-colors">
                    {/* Bobot Benar */}
                    <div className="border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-4 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Skor per Jawaban Benar
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={scoringConfig.bobotBenar}
                        onChange={(e) =>
                          setScoringConfig({
                            ...scoringConfig,
                            bobotBenar: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-full p-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-bold text-center dark:text-white"
                      />
                    </div>

                    {/* Bobot Salah */}
                    <div className="border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-4 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Penalti Jawaban Salah
                      </label>
                      <input
                        type="number"
                        max={0}
                        value={scoringConfig.bobotSalah}
                        onChange={(e) =>
                          setScoringConfig({
                            ...scoringConfig,
                            bobotSalah: Math.min(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-full p-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-bold text-center dark:text-white"
                      />
                      <p className="text-[10px] text-gray-400 text-center">0 = tanpa pengurangan poin</p>
                    </div>

                    {/* Skala Nilai */}
                    <div className="border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-4 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
                        Skala Nilai Akhir
                      </label>
                      <div className="flex">
                        {(["100", "10", "huruf"] as const).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setScoringConfig({ ...scoringConfig, skala: val })}
                            className={`flex-1 py-2 text-center text-xs font-bold transition-all border ${
                              val !== "100" ? "border-l-0" : ""
                            } ${
                              scoringConfig.skala === val
                                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                                : "bg-white dark:bg-[#1e1e1e] border-black/20 dark:border-white/20 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#333]"
                            }`}
                          >
                            {val === "100" ? "0-100" : val === "10" ? "0-10" : "A-E"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* KKM */}
                    <div className="border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-4 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                        KKM (Kriteria Ketuntasan Minimal)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={scoringConfig.kkm}
                          onChange={(e) =>
                            setScoringConfig({ ...scoringConfig, kkm: parseInt(e.target.value) || 0 })
                          }
                          className="flex-1 accent-black dark:accent-white"
                        />
                        <div className="bg-black dark:bg-white text-white dark:text-black px-3 py-1 font-bold text-center min-w-[50px]">
                          {scoringConfig.kkm}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ════════════════ SEKSI 3: DAFTAR JAWABAN SISWA ════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-lg dark:text-white">Jawaban Siswa</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                    {filledCount} dari {students.length} siswa sudah diisi
                  </p>
                </div>
              </div>
              <button
                onClick={addStudent}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none"
              >
                <Plus size={16} /> Tambah Siswa
              </button>
            </div>

            <div className="space-y-5">
              <AnimatePresence>
                {students.map((student, index) => (
                  <StudentAnswerCard
                    key={student.id}
                    student={student}
                    index={index}
                    totalStudents={students.length}
                    onUpdate={(updates) => updateStudent(student.id, updates)}
                    onRemove={() => removeStudent(student.id)}
                    onFileUpload={(e) => handleStudentFile(student.id, e)}
                    onImageUpload={(e) => handleStudentImage(student.id, e)}
                    InputMethodTabs={InputMethodTabs}
                  />
                ))}
              </AnimatePresence>

              <button
                onClick={addStudent}
                className="w-full py-5 border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center gap-2 text-sm font-semibold text-gray-400 dark:text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-all"
              >
                <Plus size={18} /> Tambah Siswa Baru
              </button>
            </div>
          </motion.div>

          {/* FLOATING ACTION BAR */}
          <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 print:hidden">
            <div className="bg-white dark:bg-[#1e1e1e] border-t-2 border-black dark:border-white/20 px-6 py-4 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-colors">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  <span className="font-bold text-black dark:text-white text-lg">{filledCount}</span> siswa siap dikoreksi
                </span>
                {soalText && (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 uppercase tracking-wider hidden sm:inline-block">
                    ✓ Kunci acuan aktif
                  </span>
                )}
              </div>
              <button
                onClick={handleKoreksi}
                disabled={filledCount === 0}
                className={`px-8 py-3 flex items-center gap-2 font-bold uppercase tracking-wider text-sm transition-all ${
                  filledCount === 0
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none"
                }`}
              >
                <Sparkles size={18} /> Mulai Koreksi AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STUDENT ANSWER CARD COMPONENT (INPUT)
   ═══════════════════════════════════════════════════════════ */
function StudentAnswerCard({
  student,
  index,
  totalStudents,
  onUpdate,
  onRemove,
  onFileUpload,
  onImageUpload,
  InputMethodTabs,
}: {
  student: StudentCard;
  index: number;
  totalStudents: number;
  onUpdate: (updates: Partial<StudentCard>) => void;
  onRemove: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  InputMethodTabs: React.ComponentType<{ active: InputMethod; onChange: (m: InputMethod) => void; size?: "sm" | "md" }>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const hasContent = student.textContent.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`bg-white dark:bg-[#1e1e1e] border-2 transition-all ${
        hasContent
          ? "border-green-400 dark:border-green-600 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.3)]"
          : "border-black/15 dark:border-white/15 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.06)]"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 flex items-center justify-center font-bold text-sm ${
              hasContent ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-[#333] text-gray-500 dark:text-gray-400"
            }`}
          >
            {hasContent ? <CheckCircle size={16} /> : (index + 1).toString().padStart(2, "0")}
          </div>
          <input
            type="text"
            value={student.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={`Siswa ${index + 1}`}
            className="bg-transparent border-none outline-none font-bold text-sm dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 w-52"
          />
        </div>

        <div className="flex items-center gap-3">
          <InputMethodTabs active={student.inputMethod} onChange={(m) => onUpdate({ inputMethod: m })} size="sm" />
          {totalStudents > 1 && (
            <button
              onClick={onRemove}
              className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
              title="Hapus siswa"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        {/* Text input */}
        {student.inputMethod === "text" && (
          <textarea
            rows={3}
            value={student.textContent}
            onChange={(e) => onUpdate({ textContent: e.target.value })}
            className="w-full p-3 bg-gray-50 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white outline-none resize-none transition-all font-mono text-sm dark:text-white"
            placeholder="Ketik jawaban siswa: 1.A 2.B 3.C 4.D 5.A ..."
          />
        )}

        {/* File upload */}
        {student.inputMethod === "file" && (
          <div className="border-2 border-dashed border-black/15 dark:border-white/15 bg-gray-50 dark:bg-[#2a2a2a] p-6 flex flex-col items-center text-center hover:border-black/40 dark:hover:border-white/40 transition-colors">
            <UploadCloud size={28} className="text-gray-400 mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">PDF, DOCX</p>
            <input type="file" ref={fileRef} className="hidden" accept=".pdf,.docx" onChange={onFileUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={student.isParsing}
              className="px-4 py-1.5 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-xs font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
            >
              {student.isParsing ? "Membaca..." : "Pilih File"}
            </button>
            {student.fileName && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={12} /> {student.fileName}
              </div>
            )}
          </div>
        )}

        {/* Image upload */}
        {student.inputMethod === "image" && (
          <div className="border-2 border-dashed border-black/15 dark:border-white/15 bg-gray-50 dark:bg-[#2a2a2a] p-6 flex flex-col items-center text-center hover:border-black/40 dark:hover:border-white/40 transition-colors">
            <Camera size={28} className="text-gray-400 mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">JPG, PNG, WebP</p>
            <input type="file" ref={imgRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={onImageUpload} />
            <button
              onClick={() => imgRef.current?.click()}
              disabled={student.isParsing}
              className="px-4 py-1.5 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-xs font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
            >
              {student.isParsing ? "Membaca..." : "Upload Foto"}
            </button>
          </div>
        )}

        {/* Show parsed content if loaded via file/image */}
        {hasContent && student.inputMethod !== "text" && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-green-700 dark:text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle size={12} /> Hasil Pembacaan
              </span>
              <button
                onClick={() => onUpdate({ textContent: "", fileName: "" })}
                className="text-xs text-red-500 hover:text-red-700 font-semibold"
              >
                Hapus
              </button>
            </div>
            <pre className="text-xs text-gray-600 dark:text-gray-300 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">{student.textContent}</pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}
