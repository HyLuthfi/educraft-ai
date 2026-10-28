"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarRange,
  Type,
  UploadCloud,
  Camera,
  X,
  Sparkles,
  Printer,
  Bot,
  Info,
  FileText,
  ArrowLeft,
  Image as ImageIcon,
  Clock,
  Target,
  BookOpen,
  Layers,
  ClipboardList,
  Lightbulb,
  GraduationCap,
  Presentation,
  MessagesSquare,
  HelpCircle,
  Gamepad2,
  FlaskConical,
  RotateCcw,
  FolderKanban,
  Plus,
  Minus,
  BookmarkPlus,
  Copy,
  Check,
  Download,
  Share2,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { buatSupabaseClient } from "@/lib/supabase/client";
import { SelectBankMateriModal } from "@/app/components/SelectBankMateriModal";

type MetodeInput = "text" | "file" | "image";

interface LampiranMateri {
  id: string;
  file: File;
  jenis: "file" | "image";
}

interface AktivitasPertemuan {
  judul: string;
  tipe: string;
  deskripsi: string;
  durasi_menit: number;
}

interface Pertemuan {
  pertemuan_ke: number;
  judul_pertemuan: string;
  topik: string;
  tujuan_pembelajaran: string[];
  materi_pokok: string[];
  aktivitas: AktivitasPertemuan[];
  metode: string;
  penilaian: string;
  catatan_guru: string;
}

interface RencanaPembelajaran {
  judul_rencana: string;
  ringkasan: string;
  total_pertemuan: number;
  daftar_pertemuan: Pertemuan[];
  saran_asesmen: string;
  catatan_ai: string;
}

const GAYA_MENGAJAR = [
  { id: "ceramah", label: "Penjelasan Seru" },
  { id: "diskusi", label: "Kerja Kelompok" },
  { id: "proyek", label: "Karya / Proyek" },
  { id: "masalah", label: "Pecahkan Masalah" },
  { id: "eksplorasi", label: "Eksplorasi Mandiri" },
  { id: "game", label: "Game Edukasi" },
];

const TIPE_AKTIVITAS: Record<
  string,
  { label: string; icon: typeof BookOpen }
> = {
  materi: { label: "Materi", icon: Presentation },
  diskusi: { label: "Diskusi", icon: MessagesSquare },
  kuis: { label: "Kuis", icon: HelpCircle },
  game: { label: "Game", icon: Gamepad2 },
  praktikum: { label: "Praktikum", icon: FlaskConical },
  review: { label: "Review", icon: RotateCcw },
  proyek: { label: "Proyek", icon: FolderKanban },
};

function ambilTipeAktivitas(tipe: string) {
  return TIPE_AKTIVITAS[tipe?.toLowerCase()] ?? TIPE_AKTIVITAS.materi;
}

export default function PerencanaPembelajaranPage() {
  const [metodeInput, setMetodeInput] = useState<MetodeInput>("text");
  const [rawMateri, setRawMateri] = useState("");
  const [lampiran, setLampiran] = useState<LampiranMateri[]>([]);

  const [mataPelajaran, setMataPelajaran] = useState("");
  const [jenjang, setJenjang] = useState("");
  const [jumlahPertemuan, setJumlahPertemuan] = useState(4);
  const [durasi, setDurasi] = useState(90);
  const [gaya, setGaya] = useState(GAYA_MENGAJAR[0].id);
  const [sertakanKuis, setSertakanKuis] = useState(true);
  const [sertakanGame, setSertakanGame] = useState(true);
  const [instruksi, setInstruksi] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RencanaPembelajaran | null>(null);
  const [view, setView] = useState<"input" | "result">("input");
  const [pertemuanAktif, setPertemuanAktif] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSelectMateriOpen, setIsSelectMateriOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const handleSelectPertemuan = (idx: number) => {
    setPertemuanAktif(idx);
    const el = document.getElementById(`pertemuan-tab-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  useEffect(() => {
    const selected = typeof window !== "undefined" ? sessionStorage.getItem("educraft_selected_materi") : null;
    if (selected) {
      setRawMateri(selected);
      setMetodeInput("text");
      sessionStorage.removeItem("educraft_selected_materi");
      toast.success("Materi ajar berhasil dimuat dari Bank Materi!");
    }
  }, []);

  const handleFilePicked = (
    e: React.ChangeEvent<HTMLInputElement>,
    jenis: "file" | "image"
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const mapped: LampiranMateri[] = files.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      jenis,
    }));
    setLampiran((prev) => [...prev, ...mapped]);
    toast.success(`${files.length} ${jenis === "image" ? "gambar" : "file"} materi dilampirkan.`);
    if (jenis === "file" && fileInputRef.current) fileInputRef.current.value = "";
    if (jenis === "image" && imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeLampiran = (id: string) => {
    setLampiran((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!rawMateri.trim() && lampiran.length === 0) {
      toast.error("Masukkan materi (teks) atau lampirkan file/gambar terlebih dahulu.");
      return;
    }

    setIsLoading(true);

    const gayaObj = GAYA_MENGAJAR.find((g) => g.id === gaya);
    const gayaLabel = gayaObj ? gayaObj.label : gaya;

    try {
      const formData = new FormData();
      formData.append("raw_materi", rawMateri);
      formData.append(
        "config",
        JSON.stringify({
          jumlah_pertemuan: jumlahPertemuan,
          durasi,
          jenjang,
          mata_pelajaran: mataPelajaran,
          gaya: gayaLabel,
          sertakan_kuis: sertakanKuis,
          sertakan_game: sertakanGame,
          instruksi,
        })
      );
      lampiran.forEach((l) => formData.append("files", l.file, l.file.name));

      const res = await fetch("/api/perencana", {
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

      const data: RencanaPembelajaran = await res.json();
      setResult(data);

      if (!data.daftar_pertemuan || data.daftar_pertemuan.length === 0) {
        toast.error(data.catatan_ai || "AI tidak dapat menyusun rencana dari materi ini.");
      } else {
        setView("result");
        setPertemuanAktif(0);
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        window.dispatchEvent(new CustomEvent("educraft_wallet_updated"));
        toast.success(`Rencana ${data.total_pertemuan} pertemuan berhasil disusun!`);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Error tidak diketahui";
      toast.error("Gagal menyusun rencana: " + errMsg);
      if (errMsg.toLowerCase().includes("saldo") || errMsg.includes("INSUFFICIENT_BALANCE")) {
        window.dispatchEvent(new CustomEvent("educraft_open_topup"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setView("input");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Format Teks Lengkap untuk Salin
  const formatFullRencanaMarkdown = (rencana: RencanaPembelajaran): string => {
    const parts: string[] = [];
    parts.push(`*${rencana.judul_rencana.toUpperCase()}*`);
    parts.push(`_Modul Ajar / Rencana Pelaksanaan Pembelajaran (${rencana.total_pertemuan} Pertemuan)_\n`);
    parts.push(`*Ringkasan Modul:*\n${rencana.ringkasan}\n`);

    rencana.daftar_pertemuan.forEach((p) => {
      parts.push(`━━━━━━━━━━━━━━━━━━━━━`);
      parts.push(`*PERTEMUAN ${p.pertemuan_ke}: ${p.judul_pertemuan.toUpperCase()}*`);
      parts.push(`• Topik: ${p.topik}`);
      parts.push(`• Metode: ${p.metode}`);
      parts.push(`• Penilaian: ${p.penilaian}`);

      if (p.tujuan_pembelajaran && p.tujuan_pembelajaran.length > 0) {
        parts.push(`\n*Tujuan Pembelajaran:*`);
        p.tujuan_pembelajaran.forEach((t) => parts.push(` - ${t}`));
      }

      if (p.materi_pokok && p.materi_pokok.length > 0) {
        parts.push(`\n*Materi Pokok:* ${p.materi_pokok.join(", ")}`);
      }

      if (p.aktivitas && p.aktivitas.length > 0) {
        parts.push(`\n*Rangkaian Aktivitas:*`);
        p.aktivitas.forEach((a, i) => {
          parts.push(` ${i + 1}. [${a.tipe.toUpperCase()}] *${a.judul}* (${a.durasi_menit}m) - ${a.deskripsi}`);
        });
      }

      if (p.catatan_guru) {
        parts.push(`\n_Catatan Guru: ${p.catatan_guru}_`);
      }
      parts.push("");
    });

    if (rencana.saran_asesmen) {
      parts.push(`━━━━━━━━━━━━━━━━━━━━━`);
      parts.push(`*Saran Asesmen Akhir:*\n${rencana.saran_asesmen}\n`);
    }

    parts.push(`_Dibuat otomatis via EduCraft AI (saitech.co.id)_`);
    return parts.join("\n");
  };

  // Simpan ke Bank Materi
  const handleSaveToBankMateri = async () => {
    if (!result || isSaving) return;
    setIsSaving(true);
    const toastId = toast.loading("Menyimpan ke Bank Materi...");
    try {
      const supabase = buatSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Silakan login terlebih dahulu untuk menyimpan.", { id: toastId });
        return;
      }

      const formatted = formatFullRencanaMarkdown(result);

      const { error } = await supabase.from("bank_materi").insert({
        user_id: user.id,
        judul: result.judul_rencana || "Rencana Pembelajaran",
        jenis_sumber: "rencana_ajar",
        konten_mentah: formatted,
      });

      if (error) throw error;

      setIsSaved(true);
      toast.success("Rencana pembelajaran berhasil disimpan ke Bank Materi!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menyimpan ke Bank Materi: " + (err.message || "Error"), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Ekspor Word (.docx)
  const handleExportDocx = async () => {
    if (!result || !result.daftar_pertemuan) return;
    const toastId = toast.loading("Menyiapkan dokumen Word Modul Ajar...");
    const gayaObj = GAYA_MENGAJAR.find((g) => g.id === gaya);
    const gayaLabel = gayaObj ? gayaObj.label : (gaya || "Problem-Based Learning");

    try {
      const res = await fetch("/api/export/perencana-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: {
            judul: result.judul_rencana,
            mata_pelajaran: mataPelajaran || "Mata Pelajaran Umum",
            jenjang: jenjang || "Fase E / Kelas X",
            gaya: gayaLabel,
            durasi: durasi || 90,
            tanggal: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
            nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          },
          perencana: {
            judul_rencana: result.judul_rencana,
            ringkasan: result.ringkasan,
            total_pertemuan: result.total_pertemuan,
            daftar_pertemuan: result.daftar_pertemuan,
            saran_asesmen: result.saran_asesmen,
            catatan_ai: result.catatan_ai,
          },
        }),
      });
      if (!res.ok) throw new Error("Gagal membuat dokumen Word");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Modul_Ajar_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Dokumen Word Modul Ajar berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengunduh Word: " + (err.message || "Error"), { id: toastId });
    }
  };

  // Ekspor PDF (.pdf)
  const handleExportPdf = async () => {
    if (!result || !result.daftar_pertemuan) return;
    const toastId = toast.loading("Menyiapkan dokumen PDF Modul Ajar...");
    const gayaObj = GAYA_MENGAJAR.find((g) => g.id === gaya);
    const gayaLabel = gayaObj ? gayaObj.label : (gaya || "Problem-Based Learning");

    try {
      const res = await fetch("/api/export/perencana-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: {
            judul: result.judul_rencana,
            mata_pelajaran: mataPelajaran || "Mata Pelajaran Umum",
            jenjang: jenjang || "Fase E / Kelas X",
            gaya: gayaLabel,
            durasi: durasi || 90,
            tanggal: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
            nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          },
          perencana: {
            judul_rencana: result.judul_rencana,
            ringkasan: result.ringkasan,
            total_pertemuan: result.total_pertemuan,
            daftar_pertemuan: result.daftar_pertemuan,
            saran_asesmen: result.saran_asesmen,
            catatan_ai: result.catatan_ai,
          },
        }),
      });
      if (!res.ok) throw new Error("Gagal membuat dokumen PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Modul_Ajar_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Dokumen PDF Modul Ajar berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengunduh PDF: " + (err.message || "Error"), { id: toastId });
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = formatFullRencanaMarkdown(result);
    navigator.clipboard.writeText(text);
    toast.success("Format WhatsApp berhasil disalin ke clipboard!");
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#121212] p-3 sm:p-6 md:p-10 pb-24 font-sans text-black dark:text-white">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Title & Breadcrumb (1:1 Kiblat Buat Soal) */}
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] uppercase font-bold tracking-widest w-fit shadow-[2px_2px_0px_#000]">
            <CalendarRange size={12} /> Modul RPP & Perencana Ajar
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-editorial tracking-tight text-black dark:text-white mt-1">
            Perencana Pembelajaran
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-sans max-w-xl">
            Masukkan materi, atur kriteria, dan biarkan AI merancang modul ajar per pertemuan lengkap dengan tujuan, aktivitas, rubrik penilaian, dan catatan guru.
          </p>
        </div>

        {/* ── Kontainer Neobrutalisme Utama (Unified Master Container) ── */}
        <div className="relative border-2 border-black dark:border-white/30 bg-white dark:bg-[#1e1e1e] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* 4 Corner Ornaments */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

          {/* ── View 1: Input & Kriteria ── */}
          {view === "input" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                {/* Kolom Kiri: Input Materi */}
                <div className="border-2 border-black dark:border-white/20 p-4 sm:p-5 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_#000] flex flex-col justify-between space-y-4">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider dark:text-white flex items-center gap-2">
                        <span className="w-5 h-5 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px] font-bold">1</span>
                        Materi Pembelajaran
                      </h2>
                      <button
                        type="button"
                        onClick={() => setIsSelectMateriOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-[10px] tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        <BookOpen size={12} />
                        <span>Pilih dari Bank Materi</span>
                      </button>
                    </div>

                    {/* Method Switcher */}
                    <div className="flex gap-1.5">
                      {[
                        { id: "text", label: "Teks", icon: Type },
                        { id: "file", label: "File", icon: FileText },
                        { id: "image", label: "Gambar", icon: ImageIcon },
                      ].map((t) => {
                        const Icon = t.icon;
                        const active = metodeInput === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setMetodeInput(t.id as MetodeInput)}
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

                    {metodeInput === "text" && (
                      <textarea
                        value={rawMateri}
                        onChange={(e) => setRawMateri(e.target.value)}
                        placeholder={"Tempel atau tulis materi di sini. Contoh:\n\nBab 3: Fotosintesis\n- Pengertian & proses fotosintesis\n- Faktor yang memengaruhi\n- Reaksi terang & reaksi gelap\n..."}
                        className="w-full h-44 sm:h-56 p-3 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] dark:text-white font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:border-black dark:focus:border-white shadow-inner"
                      />
                    )}

                    {metodeInput === "file" && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-44 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] flex flex-col items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#303030] transition-colors p-4 cursor-pointer"
                      >
                        <UploadCloud size={30} className="text-black dark:text-white" />
                        <span className="font-bold uppercase tracking-wide text-xs dark:text-white">Pilih Berkas Materi</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 text-center">PDF, DOCX, PPTX — dibaca langsung oleh AI</span>
                      </button>
                    )}

                    {metodeInput === "image" && (
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full h-44 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] flex flex-col items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#303030] transition-colors p-4 cursor-pointer"
                      >
                        <ImageIcon size={30} className="text-black dark:text-white" />
                        <span className="font-bold uppercase tracking-wide text-xs dark:text-white">Pilih Foto Papan Tulis / Buku</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 text-center">AI membaca teks tulisan tangan & buku otomatis</span>
                      </button>
                    )}

                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md" className="hidden" onChange={(e) => handleFilePicked(e, "file")} />
                    <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFilePicked(e, "image")} />

                    {/* Attached Chips */}
                    {lampiran.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {lampiran.map((l) => (
                          <div key={l.id} className="flex items-center gap-1.5 bg-black text-white dark:bg-white dark:text-black pl-2 pr-1 py-0.5 text-xs font-bold border border-black dark:border-white shadow-[2px_2px_0px_#000]">
                            {l.jenis === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                            <span className="max-w-[120px] truncate">{l.file.name}</span>
                            <button onClick={() => removeLampiran(l.id)} className="hover:opacity-75 transition-opacity cursor-pointer">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="pt-2 border-t border-black/10 dark:border-white/10 text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    Semakin detail materi yang dimasukkan, semakin kaya rangkaian aktivitas pertemuannya.
                  </p>
                </div>

                {/* Kolom Kanan: Kriteria Rencana Pembelajaran */}
                <div className="border-2 border-black dark:border-white/20 p-4 sm:p-5 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_#000] space-y-4">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-[10px] font-bold">2</span>
                    Kriteria & Parameter Modul
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 block">Mata Pelajaran</label>
                      <input
                        value={mataPelajaran}
                        onChange={(e) => setMataPelajaran(e.target.value)}
                        placeholder="mis. Biologi"
                        className="w-full h-9 px-2.5 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-black dark:focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 block">Jenjang / Fase</label>
                      <input
                        value={jenjang}
                        onChange={(e) => setJenjang(e.target.value)}
                        placeholder="mis. Fase E / X SMA"
                        className="w-full h-9 px-2.5 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-black dark:focus:border-white"
                      />
                    </div>
                  </div>

                  {/* Stepper Jumlah Pertemuan & Durasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 block">Jumlah Pertemuan</label>
                      <div className="flex items-center border-2 border-black dark:border-white/30 h-9 bg-neutral-50 dark:bg-[#252525] shadow-[2px_2px_0px_#000]">
                        <button
                          type="button"
                          onClick={() => setJumlahPertemuan((j) => Math.max(1, j - 1))}
                          className="w-8 h-full flex items-center justify-center border-r-2 border-black dark:border-white/30 bg-white dark:bg-[#222] font-black active:translate-y-0.5 cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <div className="flex-1 text-center font-black text-xs sm:text-sm dark:text-white">
                          {jumlahPertemuan} Pertemuan
                        </div>
                        <button
                          type="button"
                          onClick={() => setJumlahPertemuan((j) => Math.min(20, j + 1))}
                          className="w-8 h-full flex items-center justify-center border-l-2 border-black dark:border-white/30 bg-white dark:bg-[#222] font-black active:translate-y-0.5 cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 block">Durasi Sesi</label>
                      <div className="flex items-center border-2 border-black dark:border-white/30 h-9 bg-neutral-50 dark:bg-[#252525] shadow-[2px_2px_0px_#000]">
                        <button
                          type="button"
                          onClick={() => setDurasi((d) => Math.max(30, d - 15))}
                          className="w-8 h-full flex items-center justify-center border-r-2 border-black dark:border-white/30 bg-white dark:bg-[#222] font-black active:translate-y-0.5 cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <div className="flex-1 text-center font-black text-xs sm:text-sm dark:text-white">
                          {durasi} Menit
                        </div>
                        <button
                          type="button"
                          onClick={() => setDurasi((d) => Math.min(240, d + 15))}
                          className="w-8 h-full flex items-center justify-center border-l-2 border-black dark:border-white/30 bg-white dark:bg-[#222] font-black active:translate-y-0.5 cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Gaya Mengajar Grid (Bahasa Ringkas, Pas Tanpa Terpotong) */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 block">
                      Suasana & Cara Belajar
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {GAYA_MENGAJAR.map((item) => {
                        const active = gaya === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setGaya(item.id)}
                            className={`py-2 px-2.5 sm:px-3 border-2 font-bold text-xs uppercase tracking-tight text-center transition-all cursor-pointer ${
                              active
                                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000] -translate-y-0.5"
                                : "bg-white dark:bg-[#252525] text-gray-700 dark:text-gray-300 border-black/30 dark:border-white/20 hover:border-black dark:hover:border-white"
                            }`}
                          >
                            <span className="block leading-snug">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggles Kuis & Game Monokrom */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSertakanKuis((v) => !v)}
                      className={`p-2 border-2 transition-all flex items-center gap-2 cursor-pointer ${
                        sertakanKuis
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000]"
                          : "bg-white dark:bg-[#252525] text-gray-600 dark:text-gray-400 border-black/30 dark:border-white/20"
                      }`}
                    >
                      <HelpCircle size={14} />
                      <span className="font-bold text-xs truncate">Sisipkan Kuis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSertakanGame((v) => !v)}
                      className={`p-2 border-2 transition-all flex items-center gap-2 cursor-pointer ${
                        sertakanGame
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000]"
                          : "bg-white dark:bg-[#252525] text-gray-600 dark:text-gray-400 border-black/30 dark:border-white/20"
                      }`}
                    >
                      <Gamepad2 size={14} />
                      <span className="font-bold text-xs truncate">Sisipkan Game</span>
                    </button>
                  </div>

                  {/* Instruksi Tambahan */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 block">Catatan Tambahan (opsional)</label>
                    <textarea
                      value={instruksi}
                      onChange={(e) => setInstruksi(e.target.value)}
                      placeholder="mis. Fokus praktikum, hindari hafalan, sisipkan studi kasus lokal..."
                      className="w-full h-16 p-2 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] dark:text-white text-xs resize-none focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button Utama (Ringkas, Proporsional, & Bersih) */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs sm:text-sm border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>Susun Rencana Ajar</span>
                </button>
              </div>
            </div>
          )}

          {/* ── View 2: Hasil Modul Ajar ── */}
          {view === "result" && result && result.daftar_pertemuan && result.daftar_pertemuan.length > 0 && (
            <div className="space-y-6">
              {/* Top Controls Bar (1 Baris Rapi) */}
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
                    onClick={handleSaveToBankMateri}
                    disabled={isSaving || isSaved}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : isSaved ? <Check size={13} /> : <BookmarkPlus size={13} />}
                    <span>{isSaved ? "Tersimpan" : "Simpan ke Materi"}</span>
                  </button>

                  <button
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Unduh Modul</span>
                  </button>
                </div>
              </div>

              {/* Header Info Hasil */}
              <div className="border-2 border-black dark:border-white/20 p-4 bg-neutral-50 dark:bg-[#252525] shadow-[3px_3px_0px_#000] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold uppercase">
                    {result.total_pertemuan} Pertemuan
                  </span>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {durasi} Menit / Sesi
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white leading-tight">
                  {result.judul_rencana}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                  {result.ringkasan}
                </p>
              </div>

              {result.catatan_ai && (
                <div className="flex items-start gap-2 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] p-3 text-xs sm:text-sm font-medium text-black dark:text-white shadow-[2px_2px_0px_#000]">
                  <Bot size={15} className="mt-0.5 shrink-0 text-gray-500" />
                  <span><b>Catatan AI:</b> {result.catatan_ai}</span>
                </div>
              )}

              {/* Selector Pertemuan Stepper Bar (Opsi 1: Panah Navigasi + Tab Bebas Terpotong) */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPertemuan(Math.max(0, pertemuanAktif - 1))}
                  disabled={pertemuanAktif === 0}
                  className="h-9 w-9 shrink-0 flex items-center justify-center border-2 border-black dark:border-white/30 bg-white dark:bg-[#252525] text-black dark:text-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Pertemuan sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                <div ref={tabsScrollRef} className="flex-1 flex gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none scroll-smooth">
                  {result.daftar_pertemuan.map((p, idx) => {
                    const active = idx === pertemuanAktif;
                    return (
                      <button
                        key={idx}
                        id={`pertemuan-tab-${idx}`}
                        type="button"
                        onClick={() => handleSelectPertemuan(idx)}
                        className={`px-3 py-1.5 border-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          active
                            ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000] -translate-y-0.5"
                            : "bg-white text-gray-700 dark:bg-[#252525] dark:text-gray-300 border-black/30 dark:border-white/20 hover:border-black dark:hover:border-white"
                        }`}
                      >
                        <span className="font-black">Pertemuan {p.pertemuan_ke}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPertemuan(Math.min(result.daftar_pertemuan.length - 1, pertemuanAktif + 1))}
                  disabled={pertemuanAktif === result.daftar_pertemuan.length - 1}
                  className="h-9 w-9 shrink-0 flex items-center justify-center border-2 border-black dark:border-white/30 bg-white dark:bg-[#252525] text-black dark:text-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Pertemuan berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Detail Pertemuan Aktif (Monokrom Neobrutal Bersih) */}
              {result.daftar_pertemuan[pertemuanAktif] && (
                <div className="border-2 border-black dark:border-white/30 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_#000] space-y-4">
                  {/* Header Pertemuan */}
                  <div className="p-3.5 sm:p-4 border-b-2 border-black dark:border-white/30 bg-neutral-100 dark:bg-[#252525] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-sm sm:text-base border border-black">
                        {result.daftar_pertemuan[pertemuanAktif].pertemuan_ke}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-black dark:text-white truncate">
                          {result.daftar_pertemuan[pertemuanAktif].judul_pertemuan}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                          Topik: {result.daftar_pertemuan[pertemuanAktif].topik} • Metode: {result.daftar_pertemuan[pertemuanAktif].metode}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-5">
                    {/* Tujuan Pembelajaran */}
                    {result.daftar_pertemuan[pertemuanAktif].tujuan_pembelajaran?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                          <Target size={13} /> Tujuan Pembelajaran
                        </h4>
                        <ul className="space-y-1.5">
                          {result.daftar_pertemuan[pertemuanAktif].tujuan_pembelajaran.map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm font-medium dark:text-gray-300">
                              <span className="w-1.5 h-1.5 bg-black dark:bg-white mt-1.5 shrink-0" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Materi Pokok */}
                    {result.daftar_pertemuan[pertemuanAktif].materi_pokok?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                          <BookOpen size={13} /> Materi Pokok
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {result.daftar_pertemuan[pertemuanAktif].materi_pokok.map((m, i) => (
                            <span key={i} className="px-2 py-0.5 border border-black/30 dark:border-white/30 bg-neutral-100 dark:bg-[#252525] text-xs font-bold">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rangkaian Aktivitas */}
                    {result.daftar_pertemuan[pertemuanAktif].aktivitas?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
                          <Layers size={13} /> Rangkaian Aktivitas Pembelajaran
                        </h4>
                        <div className="space-y-2">
                          {result.daftar_pertemuan[pertemuanAktif].aktivitas.map((a, i) => {
                            const meta = ambilTipeAktivitas(a.tipe);
                            const Icon = meta.icon;
                            return (
                              <div key={i} className="border border-black/30 dark:border-white/20 flex overflow-hidden bg-neutral-50 dark:bg-[#222]">
                                <div className="border-r border-black/30 dark:border-white/20 p-2.5 flex flex-col items-center justify-center w-20 shrink-0 bg-neutral-100 dark:bg-[#282828]">
                                  <Icon size={16} className="text-black dark:text-white" />
                                  <span className="text-[9px] font-black uppercase mt-1 text-center">{meta.label}</span>
                                  <span className="text-[9px] font-bold text-gray-500">{a.durasi_menit}m</span>
                                </div>
                                <div className="p-3 min-w-0 flex-1">
                                  <p className="font-bold text-xs sm:text-sm dark:text-white leading-snug">{a.judul}</p>
                                  {a.deskripsi && (
                                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-1">{a.deskripsi}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Penilaian & Tips Guru */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {result.daftar_pertemuan[pertemuanAktif].penilaian && (
                        <div className="border border-black/20 dark:border-white/20 p-3 bg-neutral-50 dark:bg-[#252525]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                            Bentuk Penilaian
                          </span>
                          <p className="text-xs font-bold text-black dark:text-white">
                            {result.daftar_pertemuan[pertemuanAktif].penilaian}
                          </p>
                        </div>
                      )}
                      {result.daftar_pertemuan[pertemuanAktif].catatan_guru && (
                        <div className="border border-black/20 dark:border-white/20 p-3 bg-neutral-50 dark:bg-[#252525]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                            Tips Pedagogis Guru
                          </span>
                          <p className="text-xs font-medium text-black dark:text-white">
                            {result.daftar_pertemuan[pertemuanAktif].catatan_guru}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Saran Asesmen Akhir */}
              {result.saran_asesmen && (
                <div className="border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] p-4 shadow-[3px_3px_0px_#000]">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                    <Target size={13} /> Saran Asesmen Akhir
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-black dark:text-white leading-relaxed">
                    {result.saran_asesmen}
                  </p>
                </div>
              )}

              {/* Bottom Action Bar: Unduh & Simpan di Bagian Bawah */}
              <div className="pt-3 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#252525] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Kembali ke Input</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToBankMateri}
                    disabled={isSaving || isSaved}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : isSaved ? <Check size={13} /> : <BookmarkPlus size={13} />}
                    <span>{isSaved ? "Tersimpan" : "Simpan ke Materi"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Unduh Modul</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Download Hub Terpadu (Word, PDF, Bank Materi, WA) ── */}
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
                  Unduh Modul Ajar / RPP
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
              Pilih format dokumen rencana pembelajaran yang ingin diunduh atau disimpan:
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
                      Modul Ajar / RPP resmi kedinasan siap cetak
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
                      Dokumen RPP lengkap dapat diedit di Word / Docs
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>

              {/* Salin WA */}
              <button
                onClick={() => {
                  handleCopy();
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
                      Salin Ringkasan WhatsApp
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Format pesan ringkas per pertemuan siap kirim
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
                Menyusun Modul Ajar AI...
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Membaca materi & merancang rangkaian alur per pertemuan...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SelectBankMateriModal
        isOpen={isSelectMateriOpen}
        onClose={() => setIsSelectMateriOpen(false)}
        onSelect={(item) => {
          setMetodeInput("text");
          setRawMateri(item.konten);
          if (!mataPelajaran && item.judul) {
            setMataPelajaran(item.judul.split("-")[0].trim());
          }
        }}
      />
    </div>
  );
}
