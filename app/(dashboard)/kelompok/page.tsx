"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ImportAbsensiModal } from "@/app/components/ImportAbsensiModal";
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
  Download,
  Share2,
  FileSpreadsheet,
  ArrowRight,
  Check,
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
  { id: "acak", label: "Acak Murni", desc: "Pembagian acak merata", icon: Shuffle, butuhNilai: false },
  { id: "abjad", label: "Urut Abjad", desc: "Nama A-Z lalu dibagi", icon: SortAsc, butuhNilai: false },
  { id: "absen", label: "Urut Absen", desc: "Nomor absen lalu dibagi", icon: Hash, butuhNilai: false },
  { id: "gender", label: "Seimbang Gender", desc: "L/P merata tiap kelompok", icon: UsersRound, butuhNilai: false },
];

export default function BuatKelompokPage() {
  const [inputMethod, setInputMethod] = useState<InputMethod>("text");
  const [judul, setJudul] = useState("");
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

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
      if (!usingRoster) {
        attachedFiles.forEach((af) => formData.append("files", af.file, af.file.name));
      }

      const res = await fetch("/api/kelompok", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
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

  // ── Ekspor Word DOCX Resmi ──
  const handleExportDocx = async () => {
    if (!result || !result.daftar_kelompok) return;
    const toastId = toast.loading("Menyiapkan dokumen Word pembagian kelompok...");
    try {
      const res = await fetch("/api/export/kelompok-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: {
            judul: judul || "Pembagian Kelompok Belajar",
            tanggal: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
            strategi: selectedStrategi?.label || strategi,
            nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          },
          kelompok: {
            daftar_kelompok: result.daftar_kelompok,
            ringkasan_strategi: result.ringkasan_strategi,
            catatan_ai: result.catatan_ai,
          },
        }),
      });
      if (!res.ok) throw new Error("Gagal membuat dokumen Word");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Pembagian_Kelompok_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Dokumen Word berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengunduh Word: " + (err.message || "Error"), { id: toastId });
    }
  };

  // ── Ekspor PDF Resmi ──
  const handleExportPdf = async () => {
    if (!result || !result.daftar_kelompok) return;
    const toastId = toast.loading("Menyiapkan dokumen PDF pembagian kelompok...");
    try {
      const res = await fetch("/api/export/kelompok-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: {
            judul: judul || "Pembagian Kelompok Belajar",
            tanggal: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
            strategi: selectedStrategi?.label || strategi,
            nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          },
          kelompok: {
            daftar_kelompok: result.daftar_kelompok,
            ringkasan_strategi: result.ringkasan_strategi,
            catatan_ai: result.catatan_ai,
          },
        }),
      });
      if (!res.ok) throw new Error("Gagal membuat dokumen PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Pembagian_Kelompok_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Dokumen PDF berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengunduh PDF: " + (err.message || "Error"), { id: toastId });
    }
  };

  // ── Ekspor Excel (.xlsx) ──
  const handleExportExcel = () => {
    if (!result || !result.daftar_kelompok) return;
    const rows: any[] = [];
    result.daftar_kelompok.forEach((k, kIdx) => {
      k.anggota.forEach((a, aIdx) => {
        rows.push({
          "No": rows.length + 1,
          "Kelompok": k.nama_kelompok,
          "No. Anggota": aIdx + 1,
          "No. Absen": a.nomor_absen || "-",
          "Nama Peserta Didik": a.nama,
          "Nilai": a.nilai || "-",
          "Peran / Catatan": a.catatan || "-",
          "Rata-rata Nilai Kelompok": k.rata_rata_nilai || "-",
          "Alasan Komposisi": k.alasan_komposisi || "-",
        });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Kelompok");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Pembagian_Kelompok_${dateStr}.xlsx`);
    toast.success("File Excel pembagian kelompok berhasil diunduh!");
  };

  // ── Salin Format WhatsApp ──
  const handleShareWhatsApp = () => {
    if (!result || !result.daftar_kelompok) return;
    let text = `*LAPORAN PEMBAGIAN KELOMPOK BELAJAR*\n`;
    if (judul) text += `*Agenda / Kelas:* ${judul}\n`;
    text += `*Strategi:* ${result.ringkasan_strategi || selectedStrategi?.label || strategi}\n`;
    text += `*Total:* ${result.daftar_kelompok.length} Kelompok\n\n`;

    result.daftar_kelompok.forEach((k, idx) => {
      text += `*${idx + 1}. ${k.nama_kelompok.toUpperCase()}* (${k.anggota.length} siswa${k.rata_rata_nilai ? `, Rata-rata: ${k.rata_rata_nilai}` : ""})\n`;
      k.anggota.forEach((a, aIdx) => {
        text += `  ${aIdx + 1}. ${a.nama}${a.catatan ? ` - _${a.catatan}_` : ""}\n`;
      });
      text += `\n`;
    });

    text += `_Dibuat otomatis via EduCraft AI (saitech.co.id)_`;
    navigator.clipboard.writeText(text);
    toast.success("Format WhatsApp berhasil disalin ke clipboard!");
  };

  const selectedStrategi = STRATEGI_OPTIONS.find((s) => s.id === strategi);

  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#121212] p-3 sm:p-6 md:p-10 pb-24 font-sans text-black dark:text-white">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Title & Breadcrumb (1:1 Kiblat Buat Soal) */}
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] uppercase font-bold tracking-widest w-fit shadow-[2px_2px_0px_#000]">
            <Users size={12} /> Modul Pembagian Kelompok
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-editorial tracking-tight text-black dark:text-white mt-1">
            Buat Kelompok Belajar
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-sans max-w-xl">
            Bagi siswa ke dalam kelompok belajar secara seimbang, acak, heterogen, atau berdasarkan nilai secara otomatis dengan AI.
          </p>
        </div>

        {/* ── Kontainer Neobrutalisme Utama (Unified Master Container) ── */}
        <div className="relative border-2 border-black dark:border-white/30 bg-white dark:bg-[#1e1e1e] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* 4 Corner Ornaments */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

          {/* ── View 1: Input & Konfigurasi ── */}
          {view === "input" && (
            <div className="space-y-6">
              {/* Agenda / Kelas Input */}
              <div className="border-2 border-black dark:border-white/20 p-3.5 sm:p-4 bg-neutral-50 dark:bg-[#252525] shadow-[3px_3px_0px_#000]">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <FileText size={13} /> Agenda / Kelas Pembagian
                </label>
                <input
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Diskusi Biologi Bab 3 — X MIPA 1"
                  className="w-full text-sm sm:text-base font-bold dark:text-white bg-transparent border-b-2 border-black/20 dark:border-white/20 py-1 px-0.5 focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              {/* 2 Kolom Grid: Daftar Siswa & Parameter Strategi */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                {/* Kolom Kiri: Input Daftar Siswa */}
                <div className="border-2 border-black dark:border-white/20 p-4 sm:p-5 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_#000] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px] font-bold">1</span>
                      Daftar Peserta Didik
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-[10px] tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                    >
                      <Users size={12} />
                      <span>Impor dari Absensi</span>
                    </button>
                  </div>

                  {/* Tabs Input Method */}
                  <div className="flex gap-1.5">
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
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wide transition-all cursor-pointer ${
                            active
                              ? "bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_#000]"
                              : "bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-[#303030]"
                          }`}
                        >
                          <Icon size={13} /> {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {inputMethod === "text" && (
                    <textarea
                      value={rawStudents}
                      onChange={(e) => setRawStudents(e.target.value)}
                      placeholder={"Tempel daftar siswa di sini. Contoh:\n1. Budi Santoso - 90\n2. Ani Wijaya - 75\n3. Citra Dewi - 82\n..."}
                      className="w-full h-44 sm:h-52 p-3 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] dark:text-white font-mono text-xs sm:text-sm resize-none focus:outline-none focus:border-black dark:focus:border-white shadow-inner"
                    />
                  )}

                  {inputMethod === "file" && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-44 sm:h-52 border-2 border-dashed border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] flex flex-col items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#303030] transition-colors p-4 cursor-pointer"
                    >
                      <UploadCloud size={30} className="text-black dark:text-white" />
                      <span className="font-bold uppercase tracking-wide text-xs dark:text-white">Pilih Berkas Dokumen</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
                        PDF, DOCX, XLSX, PPTX — nama & nilai dibaca otomatis oleh AI
                      </span>
                    </button>
                  )}

                  {inputMethod === "image" && (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full h-44 sm:h-52 border-2 border-dashed border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] flex flex-col items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#303030] transition-colors p-4 cursor-pointer"
                    >
                      <ImageIcon size={30} className="text-black dark:text-white" />
                      <span className="font-bold uppercase tracking-wide text-xs dark:text-white">Pilih Foto Lembaran</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
                        Foto absensi / tabel tulisan tangan — AI membaca langsung
                      </span>
                    </button>
                  )}

                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv" className="hidden" onChange={(e) => handleFilePicked(e, "file")} />
                  <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFilePicked(e, "image")} />

                  {/* Attached Chips */}
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {attachedFiles.map((af) => (
                        <div key={af.id} className="flex items-center gap-1.5 bg-black text-white dark:bg-white dark:text-black pl-2 pr-1 py-0.5 text-xs font-bold border border-black dark:border-white shadow-[2px_2px_0px_#000]">
                          {af.kind === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                          <span className="max-w-[120px] truncate">{af.file.name}</span>
                          <button onClick={() => removeFile(af.id)} className="hover:opacity-75 transition-opacity cursor-pointer">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    Dapat mencampur teks + beberapa foto / berkas dokumen sekaligus.
                  </p>
                </div>

                {/* Kolom Kanan: Parameter & Strategi */}
                <div className="border-2 border-black dark:border-white/20 p-4 sm:p-5 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_#000] space-y-4">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px] font-bold">2</span>
                    Strategi Pembagian
                  </h2>

                  {/* Strategi Grid Monokrom Taktil */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {STRATEGI_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const active = strategi === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setStrategi(opt.id)}
                          className={`text-left p-2 border-2 transition-all cursor-pointer ${
                            active
                              ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000] -translate-y-0.5"
                              : "bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 border-black/30 dark:border-white/20 hover:border-black dark:hover:border-white"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Icon size={13} />
                            <span className="font-bold text-xs uppercase tracking-tight">{opt.label}</span>
                          </div>
                          <span className={`text-[10px] leading-tight block ${active ? "opacity-85" : "text-gray-500 dark:text-gray-400"}`}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedStrategi?.butuhNilai && (
                    <div className="flex items-start gap-1.5 bg-neutral-100 dark:bg-[#252525] border border-black/30 dark:border-white/30 p-2 text-xs font-medium text-black dark:text-white">
                      <Info size={13} className="mt-0.5 shrink-0 text-gray-500" />
                      <span>Strategi ini membutuhkan data <b>nilai</b>. Jika nilai kosong, sistem otomatis membagi acak merata.</span>
                    </div>
                  )}

                  {/* Mode Pembagian */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 block">
                      Target Pembagian
                    </label>
                    <div className="flex gap-1.5">
                      {[
                        { id: "jumlah_kelompok", label: "Jumlah Kelompok" },
                        { id: "anggota_per_kelompok", label: "Anggota / Kelompok" },
                      ].map((m) => {
                        const active = mode === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setMode(m.id as typeof mode)}
                            className={`flex-1 py-1.5 px-2 border-2 font-bold uppercase text-[11px] tracking-wide transition-all cursor-pointer ${
                              active
                                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000]"
                                : "bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 border-black/30 dark:border-white/20 hover:border-black dark:hover:border-white"
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kontrol Stepper Jumlah */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setJumlah((j) => Math.max(1, j - 1))}
                      className="w-10 h-10 border-2 border-black dark:border-white/30 bg-white dark:bg-[#252525] text-black dark:text-white font-black text-lg active:translate-y-0.5 transition-transform cursor-pointer shadow-[2px_2px_0px_#000]"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center border-2 border-black dark:border-white/30 py-1 bg-neutral-50 dark:bg-[#252525] shadow-[2px_2px_0px_#000]">
                      <span className="text-2xl font-black font-sans text-black dark:text-white">{jumlah}</span>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {mode === "jumlah_kelompok" ? "Kelompok" : "Siswa / Kelompok"}
                      </span>
                    </div>
                    <button
                      onClick={() => setJumlah((j) => j + 1)}
                      className="w-10 h-10 border-2 border-black dark:border-white/30 bg-white dark:bg-[#252525] text-black dark:text-white font-black text-lg active:translate-y-0.5 transition-transform cursor-pointer shadow-[2px_2px_0px_#000]"
                    >
                      +
                    </button>
                  </div>

                  {/* Toggle Seimbang Gender Monokrom */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                    <button
                      type="button"
                      onClick={() => setSeimbangGender((v) => !v)}
                      className={`w-11 h-6 border-2 border-black dark:border-white/30 relative transition-colors ${seimbangGender ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-[#252525]"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 transition-all ${seimbangGender ? "left-[22px] bg-white dark:bg-black" : "left-0.5 bg-black dark:bg-white"}`} />
                    </button>
                    <span className="font-bold text-xs dark:text-white">Seimbangkan rasio gender (L/P)</span>
                  </label>
                </div>
              </div>

              {/* Submit Button Utama */}
              <button
                onClick={() => handleSubmit()}
                disabled={isLoading}
                className="w-full py-4 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-sm sm:text-base border-2 border-black dark:border-white shadow-[4px_4px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={18} />
                <span>Bentuk Kelompok dengan AI</span>
              </button>
            </div>
          )}

          {/* ── View 2: Hasil Pembagian Kelompok ── */}
          {view === "result" && result && result.daftar_kelompok && result.daftar_kelompok.length > 0 && (
            <div className="space-y-6">
              {/* Top Navigation & Action Controls (1 Baris Rapi) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-black/10 dark:border-white/10">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#252525] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Kembali ke Input</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHideDeskripsi((v) => !v)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    {hideDeskripsi ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{hideDeskripsi ? "Tampil Catatan" : "Sembunyi Catatan"}</span>
                  </button>

                  <button
                    onClick={handleReshuffle}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                    title="Acak ulang susunan kelompok"
                  >
                    <Shuffle size={13} />
                    <span>Acak Ulang</span>
                  </button>

                  <button
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Unduh Laporan</span>
                  </button>
                </div>
              </div>

              {/* Header Info Hasil */}
              <div className="border-2 border-black dark:border-white/20 p-3.5 sm:p-4 bg-neutral-50 dark:bg-[#252525] shadow-[3px_3px_0px_#000] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black dark:text-white">
                    {judul || "Pembagian Kelompok Belajar"}
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                    {result.ringkasan_strategi || `Berdasarkan strategi ${selectedStrategi?.label || strategi}`}
                  </p>
                </div>
                <div className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black border border-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
                  {result.daftar_kelompok.length} Kelompok Terbentuk
                </div>
              </div>

              {result.catatan_ai && (
                <div className="flex items-start gap-2 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] p-3 text-xs sm:text-sm font-medium text-black dark:text-white shadow-[2px_2px_0px_#000]">
                  <Info size={15} className="mt-0.5 shrink-0 text-gray-500" />
                  <span><b>Catatan AI:</b> {result.catatan_ai}</span>
                </div>
              )}

              {/* ── Cards Kelompok (Monokrom Neobrutal Bersih) ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {result.daftar_kelompok.map((k, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-2 border-black dark:border-white/30 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_#000] flex flex-col justify-between"
                  >
                    {/* Header Kelompok */}
                    <div className="p-3 sm:p-3.5 border-b-2 border-black dark:border-white/30 bg-neutral-100 dark:bg-[#252525] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                          Kelompok {idx + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-black dark:text-white">
                          {k.nama_kelompok}
                        </h3>
                        {k.rata_rata_nilai && (
                          <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                            Rata-rata: {k.rata_rata_nilai}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 border border-black dark:border-white/40 bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold uppercase">
                        {k.anggota.length} Siswa
                      </span>
                    </div>

                    {/* Daftar Anggota */}
                    <ul className="p-3 sm:p-3.5 space-y-1.5 flex-1">
                      {k.anggota.map((a, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 border border-black/15 dark:border-white/15 p-1.5 bg-neutral-50 dark:bg-[#222]"
                        >
                          <span className="w-5 h-5 shrink-0 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black flex items-center justify-center">
                            {a.nomor_absen || i + 1}
                          </span>
                          <div className="flex-1 min-w-0 pr-1">
                            <p className="font-bold text-xs sm:text-sm dark:text-white truncate leading-snug">
                              {a.nama}
                            </p>
                            {!hideDeskripsi && a.catatan && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-snug">
                                {a.catatan}
                              </p>
                            )}
                          </div>
                          {a.nilai && (
                            <span className="shrink-0 text-center text-xs font-black text-black dark:text-white bg-white dark:bg-[#2a2a2a] px-1.5 py-0.5 border border-black/20 dark:border-white/20">
                              {a.nilai}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Alasan Komposisi */}
                    {k.alasan_komposisi && !hideDeskripsi && (
                      <div className="px-3 pb-3">
                        <div className="bg-neutral-50 dark:bg-[#252525] border-l-2 border-black dark:border-white/40 p-2 text-[10px] sm:text-[11px] font-medium text-gray-600 dark:text-gray-300 flex items-start gap-1.5">
                          <Bot size={13} className="mt-0.5 shrink-0 text-gray-500" />
                          <span>{k.alasan_komposisi}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Download Hub Terpadu (Word, PDF, Excel, WA) ── */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md border-2 border-black dark:border-white/30 bg-white dark:bg-[#1a1a1a] p-5 sm:p-6 shadow-[8px_8px_0px_#000] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* 4 Corner Ornaments */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white/20">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-black dark:text-white" />
                <h3 className="font-editorial text-lg font-bold text-black dark:text-white">
                  Unduh Laporan Pembagian Kelompok
                </h3>
              </div>
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="p-1 border border-black dark:border-white/30 bg-white dark:bg-[#252525] text-black dark:text-white hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 font-sans">
              Pilih format berkas pembagian kelompok belajar yang ingin diunduh atau dibagikan:
            </p>

            {/* Opsi Unduhan */}
            <div className="space-y-2.5">
              {/* PDF */}
              <button
                onClick={() => {
                  handleExportPdf();
                  setIsDownloadModalOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 border-2 border-black dark:border-white/20 bg-white dark:bg-[#252525] hover:bg-neutral-50 dark:hover:bg-[#2e2e2e] shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 border border-black dark:border-white/30 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-black dark:text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Dokumen PDF (.pdf)
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Laporan resmi pembagian kelompok siap cetak
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>

              {/* Word */}
              <button
                onClick={() => {
                  handleExportDocx();
                  setIsDownloadModalOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 border-2 border-black dark:border-white/20 bg-white dark:bg-[#252525] hover:bg-neutral-50 dark:hover:bg-[#2e2e2e] shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 border border-black dark:border-white/30 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-black dark:text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Microsoft Word (.docx)
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Dokumen pembagian kelompok resmi dapat diedit
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>

              {/* Excel */}
              <button
                onClick={() => {
                  handleExportExcel();
                  setIsDownloadModalOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 border-2 border-black dark:border-white/20 bg-white dark:bg-[#252525] hover:bg-neutral-50 dark:hover:bg-[#2e2e2e] shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 border border-black dark:border-white/30 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={18} className="text-black dark:text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Microsoft Excel (.xlsx)
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Tabel matriks data kelompok & anggota
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>

              {/* Salin WA */}
              <button
                onClick={() => {
                  handleShareWhatsApp();
                  setIsDownloadModalOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 border-2 border-black dark:border-white/20 bg-white dark:bg-[#252525] hover:bg-neutral-50 dark:hover:bg-[#2e2e2e] shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 border border-black dark:border-white/30 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Share2 size={18} className="text-black dark:text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Salin Format WhatsApp
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Format pesan rapi untuk grup kelas / wali murid
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
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
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-6 sm:p-8 shadow-[8px_8px_0px_#000] flex flex-col items-center gap-3 max-w-xs text-center">
              <div className="w-10 h-10 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="font-black uppercase tracking-wider text-xs sm:text-sm dark:text-white">
                Menyusun Komposisi Kelompok...
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
                Membaca data siswa & menerapkan parameter strategi terbaik...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImportAbsensiModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(names) => {
          setInputMethod("text");
          setRawStudents(names.map((n, i) => `${i + 1}. ${n}`).join("\n"));
        }}
      />
    </div>
  );
}
