"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  Type,
  UploadCloud,
  Camera,
  X,
  Sparkles,
  Shuffle,
  Printer,
  Bot,
  AlignLeft,
  SortAsc,
  Hash,
  Scale,
  Layers,
  TrendingUp,
  UsersRound,
  Info,
  FileText,
  ArrowLeft,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";

type InputMethod = "text" | "file" | "image";

interface AttachedFile {
  id: string;
  file: File;
  kind: "file" | "image";
}

interface AnggotaKelompok {
  nama: string;
  nomor_absen: string;
  nilai: string;
  catatan: string;
}

interface Kelompok {
  nama_kelompok: string;
  anggota: AnggotaKelompok[];
  rata_rata_nilai: string;
  alasan_komposisi: string;
}

interface ResponseKelompok {
  daftar_kelompok: Kelompok[];
  ringkasan_strategi: string;
  catatan_ai: string;
}

const STRATEGI_OPTIONS = [
  { id: "heterogen", label: "Heterogen", desc: "Sebar merata pandai & kurang", icon: Scale, butuhNilai: true },
  { id: "homogen", label: "Homogen", desc: "Kelompokkan kemampuan setara", icon: Layers, butuhNilai: true },
  { id: "nilai", label: "Berdasarkan Nilai", desc: "Ranking lalu dibagi", icon: TrendingUp, butuhNilai: true },
  { id: "acak", label: "Acak", desc: "Pembagian acak murni", icon: Shuffle, butuhNilai: false },
  { id: "abjad", label: "Urut Abjad", desc: "Nama A-Z lalu dibagi", icon: SortAsc, butuhNilai: false },
  { id: "absen", label: "Urut Absen", desc: "Nomor absen lalu dibagi", icon: Hash, butuhNilai: false },
  { id: "gender", label: "Seimbang Gender", desc: "L/P merata tiap kelompok", icon: UsersRound, butuhNilai: false },
];

const CARD_COLORS = [
  "bg-yellow-300",
  "bg-pink-300",
  "bg-cyan-300",
  "bg-lime-300",
  "bg-orange-300",
  "bg-violet-300",
  "bg-emerald-300",
  "bg-rose-300",
];

export default function BuatKelompokPage() {
  const [inputMethod, setInputMethod] = useState<InputMethod>("text");
  const [rawStudents, setRawStudents] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const [strategi, setStrategi] = useState("heterogen");
  const [mode, setMode] = useState<"jumlah_kelompok" | "anggota_per_kelompok">("jumlah_kelompok");
  const [jumlah, setJumlah] = useState(4);
  const [seimbangGender, setSeimbangGender] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResponseKelompok | null>(null);
  const [view, setView] = useState<"input" | "result">("input");
  const [hideDeskripsi, setHideDeskripsi] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>, kind: "file" | "image") => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const mapped: AttachedFile[] = files.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      kind,
    }));
    setAttachedFiles((prev) => [...prev, ...mapped]);
    toast.success(`${files.length} ${kind === "image" ? "foto" : "file"} dilampirkan.`);
    if (kind === "file" && fileInputRef.current) fileInputRef.current.value = "";
    if (kind === "image" && imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Bangun daftar siswa versi teks dari hasil AI, agar "Acak Ulang" tidak perlu
  // mengirim ulang file/foto ke Gemini (hemat kuota & lebih cepat).
  const buatRosterDariHasil = (data: ResponseKelompok): string => {
    const baris: string[] = [];
    data.daftar_kelompok.forEach((k) => {
      k.anggota.forEach((a) => {
        const absen = a.nomor_absen ? `${a.nomor_absen}. ` : "";
        const nilai = a.nilai ? ` - ${a.nilai}` : "";
        baris.push(`${absen}${a.nama}${nilai}`.trim());
      });
    });
    return baris.join("\n");
  };

  // rosterOverride: bila diisi, request memakai teks ini (tanpa file) — dipakai saat Acak Ulang.
  const handleSubmit = async (rosterOverride?: string) => {
    const usingRoster = typeof rosterOverride === "string" && rosterOverride.trim().length > 0;

    if (!usingRoster && !rawStudents.trim() && attachedFiles.length === 0) {
      toast.error("Masukkan daftar siswa (teks) atau lampirkan foto/file terlebih dahulu.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("raw_students", usingRoster ? rosterOverride! : rawStudents);
      formData.append(
        "config",
        JSON.stringify({
          strategi,
          mode,
          jumlah,
          opsi: seimbangGender ? "Usahakan gender seimbang antar kelompok." : "",
        })
      );
      // Saat Acak Ulang (pakai roster), tidak perlu melampirkan ulang file.
      if (!usingRoster) {
        attachedFiles.forEach((af) => formData.append("files", af.file, af.file.name));
      }

      const res = await fetch("/api/kelompok", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // Backend/proxy mengembalikan { error: ... } (JSON). Ambil pesan bersihnya,
        // fallback ke text mentah bila bukan JSON.
        let msg = "Gagal menghubungi server";
        try {
          const errJson = await res.json();
          msg = errJson?.error || errJson?.detail || JSON.stringify(errJson);
        } catch {
          const errText = await res.text().catch(() => "");
          if (errText) msg = errText;
        }
        throw new Error(msg);
      }

      const data: ResponseKelompok = await res.json();
      setResult(data);

      if (!data.daftar_kelompok || data.daftar_kelompok.length === 0) {
        toast.error(data.catatan_ai || "AI tidak menemukan siswa yang cukup.");
      } else {
        setView("result");
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        toast.success(`Berhasil membentuk ${data.daftar_kelompok.length} kelompok!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal membentuk kelompok: " + (err.message || "Error tidak diketahui"));
    } finally {
      setIsLoading(false);
    }
  };

  // Acak ulang memakai daftar siswa yang sudah diekstrak AI (bila ada), sehingga
  // file/foto tidak diunggah & dibaca ulang oleh AI setiap kali.
  const handleReshuffle = () => {
    if (result && result.daftar_kelompok?.length) {
      handleSubmit(buatRosterDariHasil(result));
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setView("input");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = () => window.print();

  const selectedStrategi = STRATEGI_OPTIONS.find((s) => s.id === strategi);

  return (
    <div className="p-3.5 sm:p-6 md:p-10 max-w-7xl mx-auto pb-24">
      {view === "input" && (
      <>
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black px-2.5 py-0.5 sm:px-3 sm:py-1 mb-2 sm:mb-3 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
          <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" /> AI-Powered
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight dark:text-white flex items-center gap-2 sm:gap-3">
          <Users className="text-black dark:text-white w-7 h-7 sm:w-10 sm:h-10" strokeWidth={2.5} />
          Buat Kelompok
        </h1>
        <p className="mt-1.5 font-medium text-gray-600 dark:text-gray-400 max-w-2xl text-xs sm:text-base">
          Bagi siswa ke dalam kelompok secara otomatis dengan AI. Tempel daftar siswa, atau
          langsung lampirkan <b>foto/file</b> — AI membacanya sendiri (tanpa OCR manual).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* ── Input Card ── */}
        <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider mb-3 sm:mb-4 dark:text-white flex items-center gap-2">
            <span className="bg-yellow-300 border-2 border-black w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm">1</span>
            Daftar Siswa
          </h2>

          {/* Tabs */}
          <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {[
              { id: "text", label: "Teks", icon: Type },
              { id: "file", label: "File", icon: FileText },
              { id: "image", label: "Foto", icon: Camera },
            ].map((t) => {
              const Icon = t.icon;
              const active = inputMethod === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setInputMethod(t.id as InputMethod)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide transition-all ${
                    active
                      ? "bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                      : "bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333]"
                  }`}
                >
                  <Icon size={14} className="sm:w-4 sm:h-4" /> {t.label}
                </button>
              );
            })}
          </div>

          {inputMethod === "text" && (
            <textarea
              value={rawStudents}
              onChange={(e) => setRawStudents(e.target.value)}
              placeholder={"Tempel daftar siswa di sini. Contoh:\n1. Budi Santoso - 90\n2. Ani Wijaya - 75\n3. Citra Dewi - 82\n..."}
              className="w-full h-36 sm:h-56 p-3 sm:p-4 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white font-mono text-xs sm:text-sm resize-none focus:outline-none focus:ring-4 focus:ring-yellow-300/50"
            />
          )}

          {inputMethod === "file" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-gray-50 dark:bg-[#2a2a2a] flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-yellow-50 dark:hover:bg-[#333] transition-colors p-4"
            >
              <UploadCloud size={32} className="sm:w-10 sm:h-10 text-black dark:text-white" />
              <span className="font-bold uppercase tracking-wide text-xs sm:text-sm dark:text-white">Pilih File</span>
              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center">PDF, DOCX, XLSX, PPTX — dibaca langsung oleh AI</span>
            </button>
          )}

          {inputMethod === "image" && (
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-full h-36 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-gray-50 dark:bg-[#2a2a2a] flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-cyan-50 dark:hover:bg-[#333] transition-colors p-4"
            >
              <ImageIcon size={32} className="sm:w-10 sm:h-10 text-black dark:text-white" />
              <span className="font-bold uppercase tracking-wide text-xs sm:text-sm dark:text-white">Pilih Foto</span>
              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center">Foto absensi / tulisan tangan — AI membaca langsung</span>
            </button>
          )}

          <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv" className="hidden" onChange={(e) => handleFilePicked(e, "file")} />
          <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFilePicked(e, "image")} />

          {/* Attached chips */}
          {attachedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {attachedFiles.map((af) => (
                <div key={af.id} className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black pl-2.5 pr-1.5 py-1 text-xs font-bold border-2 border-black dark:border-white/30">
                  {af.kind === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                  <span className="max-w-[120px] sm:max-w-[140px] truncate">{af.file.name}</span>
                  <button onClick={() => removeFile(af.id)} className="hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 sm:mt-3 text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            Kamu bisa mencampur teks + beberapa foto + file sekaligus. Semua dikirim langsung ke AI.
          </p>
        </div>

        {/* ── Config Card ── */}
        <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider mb-3 sm:mb-4 dark:text-white flex items-center gap-2">
            <span className="bg-cyan-300 border-2 border-black w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm">2</span>
            Strategi
          </h2>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-4 sm:mb-6">
            {STRATEGI_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = strategi === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setStrategi(opt.id)}
                  className={`text-left p-2 sm:p-3 border-2 border-black dark:border-white/30 transition-all ${
                    active
                      ? "bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] -translate-y-0.5"
                      : "bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon size={14} className="sm:w-4 sm:h-4" />
                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wide">{opt.label}</span>
                  </div>
                  <span className={`text-[10px] sm:text-[11px] leading-tight block ${active ? "opacity-80" : "text-gray-500 dark:text-gray-400"}`}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedStrategi?.butuhNilai && (
            <div className="mb-3 sm:mb-4 flex items-start gap-1.5 bg-yellow-100 dark:bg-yellow-500/10 border-2 border-black dark:border-yellow-500/40 p-2 sm:p-2.5 text-xs font-medium text-gray-800 dark:text-yellow-200">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>Strategi ini butuh <b>nilai</b>. Jika nilai tak tersedia, AI otomatis beralih ke pembagian acak.</span>
            </div>
          )}

          {/* Mode */}
          <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 block">Mode Pembagian</label>
          <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {[
              { id: "jumlah_kelompok", label: "Jumlah Kelompok" },
              { id: "anggota_per_kelompok", label: "Anggota / Kelompok" },
            ].map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as typeof mode)}
                  className={`flex-1 py-2 sm:py-2.5 px-1.5 sm:px-2 border-2 border-black dark:border-white/30 font-bold uppercase text-[11px] sm:text-xs tracking-wide transition-all ${
                    active
                      ? "bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                      : "bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333]"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <button
              onClick={() => setJumlah((j) => Math.max(1, j - 1))}
              className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white font-black text-lg sm:text-xl active:translate-y-0.5 transition-transform"
            >
              −
            </button>
            <div className="flex-1 text-center border-2 border-black dark:border-white/30 py-1.5 sm:py-2 bg-gray-50 dark:bg-[#2a2a2a]">
              <span className="text-xl sm:text-3xl font-black dark:text-white">{jumlah}</span>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {mode === "jumlah_kelompok" ? "Kelompok" : "Orang / Kelompok"}
              </span>
            </div>
            <button
              onClick={() => setJumlah((j) => j + 1)}
              className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white font-black text-lg sm:text-xl active:translate-y-0.5 transition-transform"
            >
              +
            </button>
          </div>

          <label className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none">
            <button
              onClick={() => setSeimbangGender((v) => !v)}
              className={`w-11 h-6 sm:w-12 sm:h-7 border-2 border-black dark:border-white/30 relative transition-colors ${seimbangGender ? "bg-lime-400" : "bg-gray-200 dark:bg-[#2a2a2a]"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-black dark:bg-white border-2 border-black dark:border-white transition-all ${seimbangGender ? "left-[20px] sm:left-[22px]" : "left-0.5"}`} />
            </button>
            <span className="font-bold text-xs sm:text-sm dark:text-white">Usahakan gender seimbang</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={() => handleSubmit()}
        disabled={isLoading}
        className="mt-4 sm:mt-6 w-full py-3.5 sm:py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm sm:text-lg border-2 sm:border-4 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3"
      >
        <Sparkles size={18} className="sm:w-[22px] sm:h-[22px]" /> Bentuk Kelompok dengan AI
      </button>
      </>
      )}

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-3 sm:gap-4 max-w-xs text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
                <Bot size={40} className="sm:w-12 sm:h-12 text-black dark:text-white" />
              </motion.div>
              <p className="font-black uppercase tracking-wider text-sm sm:text-base dark:text-white">AI Menyusun Kelompok</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Membaca daftar siswa & menerapkan strategi...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result ── */}
      {view === "result" && result && result.daftar_kelompok && result.daftar_kelompok.length > 0 && (
        <div className="mt-2" id="print-area">
          <button
            onClick={handleBack}
            className="no-print mb-4 sm:mb-6 inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
          >
            <ArrowLeft size={14} /> Kembali ke Input
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight dark:text-white">Hasil Kelompok</h2>
              <p className="font-medium text-xs sm:text-sm text-gray-600 dark:text-gray-400">{result.ringkasan_strategi}</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-3 no-print w-full sm:w-auto">
              <button
                onClick={() => setHideDeskripsi((v) => !v)}
                className={`flex items-center justify-center gap-1 px-2.5 py-2 sm:px-4 sm:py-3 border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${
                  hideDeskripsi
                    ? "bg-lime-300 text-black"
                    : "bg-white dark:bg-[#2a2a2a] dark:text-white"
                }`}
              >
                {hideDeskripsi ? <Eye size={14} /> : <EyeOff size={14} />}
                <span className="truncate">{hideDeskripsi ? "Deskripsi" : "Sembunyi"}</span>
              </button>
              <button
                onClick={handleReshuffle}
                className="flex items-center justify-center gap-1 px-2.5 py-2 sm:px-4 sm:py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
              >
                <Shuffle size={14} /> <span className="truncate">Acak</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-1 px-2.5 py-2 sm:px-4 sm:py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
              >
                <Printer size={14} /> <span className="truncate">Cetak</span>
              </button>
            </div>
          </div>

          {result.catatan_ai && (
            <div className="mb-4 sm:mb-6 flex items-start gap-2 bg-orange-100 dark:bg-orange-500/10 border-2 border-black dark:border-orange-500/40 p-2.5 sm:p-3 text-xs sm:text-sm font-medium text-gray-800 dark:text-orange-200">
              <Info size={15} className="mt-0.5 flex-shrink-0" />
              <span><b>Catatan AI:</b> {result.catatan_ai}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {result.daftar_kelompok.map((k, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] flex flex-col"
              >
                <div className={`${CARD_COLORS[idx % CARD_COLORS.length]} border-b-2 sm:border-b-4 border-black p-3 sm:p-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-black">{k.nama_kelompok}</h3>
                    <span className="bg-black text-white text-[11px] sm:text-xs font-bold px-2 py-0.5 sm:py-1">{k.anggota.length} org</span>
                  </div>
                  {k.rata_rata_nilai && (
                    <p className="text-[11px] sm:text-xs font-bold text-black/70 mt-0.5 sm:mt-1">Rata-rata: {k.rata_rata_nilai}</p>
                  )}
                </div>

                <ul className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2 flex-1">
                  {k.anggota.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 sm:gap-3 border-2 border-black/10 dark:border-white/10 p-1.5 sm:p-2 min-w-0">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs font-black flex items-center justify-center">
                        {a.nomor_absen || i + 1}
                      </span>
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="font-bold text-xs sm:text-sm dark:text-white truncate leading-snug">{a.nama}</p>
                        {!hideDeskripsi && a.catatan && (
                          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate leading-snug">{a.catatan}</p>
                        )}
                      </div>
                      {a.nilai && (
                        <span className="flex-shrink-0 min-w-[2.25rem] sm:min-w-[2.75rem] text-center whitespace-nowrap text-xs sm:text-sm font-black text-black dark:text-white bg-gray-100 dark:bg-[#2a2a2a] px-1.5 py-0.5 sm:px-2 sm:py-1 border-2 border-black/10 dark:border-white/10">
                          {a.nilai}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {k.alasan_komposisi && (
                  <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4">
                    <div className="bg-gray-50 dark:bg-[#2a2a2a] border-l-4 border-black dark:border-white/30 p-2 sm:p-3 text-[11px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 flex gap-1.5 sm:gap-2">
                      <Bot size={13} className="mt-0.5 flex-shrink-0" />
                      <span>{k.alasan_komposisi}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print,
          aside,
          header {
            display: none !important;
          }
          #print-area {
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
