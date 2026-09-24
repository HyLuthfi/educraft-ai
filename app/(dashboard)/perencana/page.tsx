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
  Loader2,
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
  "Ceramah Interaktif",
  "Discovery Learning",
  "Project-Based Learning",
  "Problem-Based Learning",
  "Kolaboratif / Diskusi",
  "Gamifikasi",
];

const TIPE_AKTIVITAS: Record<
  string,
  { label: string; icon: typeof BookOpen; warna: string }
> = {
  materi: { label: "Materi", icon: Presentation, warna: "bg-cyan-300" },
  diskusi: { label: "Diskusi", icon: MessagesSquare, warna: "bg-violet-300" },
  kuis: { label: "Kuis", icon: HelpCircle, warna: "bg-yellow-300" },
  game: { label: "Game", icon: Gamepad2, warna: "bg-lime-300" },
  praktikum: { label: "Praktikum", icon: FlaskConical, warna: "bg-orange-300" },
  review: { label: "Review", icon: RotateCcw, warna: "bg-pink-300" },
  proyek: { label: "Proyek", icon: FolderKanban, warna: "bg-emerald-300" },
};

const PERTEMUAN_WARNA = [
  "bg-yellow-300",
  "bg-cyan-300",
  "bg-lime-300",
  "bg-pink-300",
  "bg-violet-300",
  "bg-orange-300",
  "bg-emerald-300",
  "bg-rose-300",
];

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
  const [gaya, setGaya] = useState(GAYA_MENGAJAR[0]);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
          gaya,
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
        toast.success(`Rencana ${data.total_pertemuan} pertemuan berhasil disusun!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menyusun rencana: " + (err.message || "Error tidak diketahui"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setView("input");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = () => window.print();

  const formatFullRencanaMarkdown = (rencana: RencanaPembelajaran): string => {
    const parts: string[] = [];
    parts.push(`# ${rencana.judul_rencana}`);
    parts.push(`*Rencana Pembelajaran (${rencana.total_pertemuan} Pertemuan)*\n`);
    parts.push(`## Ringkasan Modul\n${rencana.ringkasan}\n`);

    rencana.daftar_pertemuan.forEach((p) => {
      parts.push(`---\n### Pertemuan ${p.pertemuan_ke}: ${p.judul_pertemuan}`);
      parts.push(`- **Topik:** ${p.topik}`);
      parts.push(`- **Metode Pembelajaran:** ${p.metode}`);
      parts.push(`- **Bentuk Penilaian:** ${p.penilaian}`);

      if (p.tujuan_pembelajaran && p.tujuan_pembelajaran.length > 0) {
        parts.push(`\n**Tujuan Pembelajaran:**`);
        p.tujuan_pembelajaran.forEach((t) => parts.push(`• ${t}`));
      }

      if (p.materi_pokok && p.materi_pokok.length > 0) {
        parts.push(`\n**Materi Pokok:**`);
        p.materi_pokok.forEach((m) => parts.push(`• ${m}`));
      }

      if (p.aktivitas && p.aktivitas.length > 0) {
        parts.push(`\n**Aktivitas Pembelajaran:**`);
        p.aktivitas.forEach((a, i) => {
          parts.push(`${i + 1}. [${a.tipe.toUpperCase()}] **${a.judul}** (${a.durasi_menit} menit)\n   ${a.deskripsi}`);
        });
      }

      if (p.catatan_guru) {
        parts.push(`\n*Catatan Guru:* ${p.catatan_guru}`);
      }
      parts.push("");
    });

    if (rencana.saran_asesmen) {
      parts.push(`---\n## Saran Asesmen Akhir\n${rencana.saran_asesmen}`);
    }

    return parts.join("\n");
  };

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

  const handleCopyFullPlan = () => {
    if (!result) return;
    const text = formatFullRencanaMarkdown(result);
    navigator.clipboard.writeText(text);
    toast.success("Rencana pembelajaran lengkap berhasil disalin ke clipboard!");
  };

  return (
    <div className="p-3.5 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-4 sm:space-y-10 pb-24">
      {view === "input" && (
        <>
          {/* Header */}
          <div className="mb-4 sm:mb-10">
            <div className="inline-flex items-center gap-1.5 sm:gap-2.5 bg-black dark:bg-white text-white dark:text-black px-2.5 py-0.5 sm:px-3.5 sm:py-1.5 mb-2 sm:mb-4 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
              <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" /> AI-Powered
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight dark:text-white flex items-center gap-2 sm:gap-3.5">
              <CalendarRange className="text-black dark:text-white w-7 h-7 sm:w-10 sm:h-10" strokeWidth={2.5} />
              Perencana Pembelajaran
            </h1>
            <p className="mt-1.5 sm:mt-3 font-medium text-gray-600 dark:text-gray-400 max-w-2xl text-xs sm:text-base leading-relaxed">
              Masukkan materi, atur kriteria, dan biarkan AI menyusun{" "}
              <b>rencana pembelajaran per pertemuan</b> lengkap dengan topik, aktivitas,
              kuis, hingga game — siap pakai di kelas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-4 sm:gap-8 md:gap-10 items-stretch">
            {/* ── Materi Card ── */}
            <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-6 md:p-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] flex flex-col justify-between h-full space-y-4 sm:space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-6">
                  <h2 className="text-base sm:text-xl font-black uppercase tracking-wider dark:text-white flex items-center gap-2 sm:gap-3">
                    <span className="bg-yellow-300 border-2 border-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">1</span>
                    Materi Pembelajaran
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsSelectMateriOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black font-black uppercase text-[10px] sm:text-xs tracking-wider shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <BookOpen size={13} className="sm:w-3.5 sm:h-3.5" />
                    <span>Pilih dari Bank Materi</span>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1.5 sm:gap-3 mb-3 sm:mb-6">
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
                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2.5 py-2 sm:py-3 px-2 sm:px-4 border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide transition-all ${
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

                {metodeInput === "text" && (
                  <textarea
                    value={rawMateri}
                    onChange={(e) => setRawMateri(e.target.value)}
                    placeholder={"Tempel atau tulis materi di sini. Contoh:\n\nBab 3: Fotosintesis\n- Pengertian & proses fotosintesis\n- Faktor yang memengaruhi\n- Reaksi terang & reaksi gelap\n..."}
                    className="w-full min-h-[160px] sm:min-h-[360px] p-3 sm:p-5 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:ring-4 focus:ring-yellow-300/50"
                  />
                )}

                {metodeInput === "file" && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[160px] sm:min-h-[360px] border-2 border-dashed border-black dark:border-white/30 bg-gray-50 dark:bg-[#2a2a2a] flex flex-col items-center justify-center gap-2 sm:gap-4 p-4 sm:p-8 hover:bg-yellow-50 dark:hover:bg-[#333] transition-colors"
                  >
                    <UploadCloud size={36} className="sm:w-12 sm:h-12 text-black dark:text-white" />
                    <span className="font-bold uppercase tracking-wide text-xs sm:text-base dark:text-white">Pilih File Materi</span>
                    <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">PDF, DOCX, PPTX — dibaca langsung oleh AI</span>
                  </button>
                )}

                {metodeInput === "image" && (
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full min-h-[160px] sm:min-h-[360px] border-2 border-dashed border-black dark:border-white/30 bg-gray-50 dark:bg-[#2a2a2a] flex flex-col items-center justify-center gap-2 sm:gap-4 p-4 sm:p-8 hover:bg-cyan-50 dark:hover:bg-[#333] transition-colors"
                  >
                    <ImageIcon size={36} className="sm:w-12 sm:h-12 text-black dark:text-white" />
                    <span className="font-bold uppercase tracking-wide text-xs sm:text-base dark:text-white">Pilih Gambar Materi</span>
                    <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Foto papan tulis / buku — AI membaca langsung</span>
                  </button>
                )}

                <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md" className="hidden" onChange={(e) => handleFilePicked(e, "file")} />
                <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFilePicked(e, "image")} />

                {lampiran.length > 0 && (
                  <div className="mt-3 sm:mt-5 flex flex-wrap gap-1.5 sm:gap-2.5">
                    {lampiran.map((l) => (
                      <div key={l.id} className="flex items-center gap-1.5 sm:gap-2.5 bg-black dark:bg-white text-white dark:text-black px-2.5 py-1 sm:px-3.5 sm:py-2 text-xs font-bold border-2 border-black dark:border-white/30">
                        {l.jenis === "image" ? <ImageIcon size={13} /> : <FileText size={13} />}
                        <span className="max-w-[130px] sm:max-w-[160px] truncate">{l.file.name}</span>
                        <button onClick={() => removeLampiran(l.id)} className="hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="pt-3 sm:pt-4 border-t-2 border-gray-100 dark:border-white/10 text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 flex items-start gap-1.5 sm:gap-2">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                Semakin lengkap materi, semakin detail & relevan rencana yang disusun AI.
              </p>
            </div>

            {/* ── Kriteria Card ── */}
            <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-6 md:p-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] flex flex-col justify-between h-full space-y-4 sm:space-y-6">
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-base sm:text-xl font-black uppercase tracking-wider mb-3 sm:mb-6 dark:text-white flex items-center gap-2 sm:gap-3">
                  <span className="bg-cyan-300 border-2 border-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">2</span>
                  Kriteria Rencana
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 block">Mata Pelajaran</label>
                    <input
                      value={mataPelajaran}
                      onChange={(e) => setMataPelajaran(e.target.value)}
                      placeholder="mis. Biologi"
                      className="w-full h-11 sm:h-16 px-3 sm:px-4 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white font-bold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-cyan-300/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 block">Jenjang / Kelas</label>
                    <input
                      value={jenjang}
                      onChange={(e) => setJenjang(e.target.value)}
                      placeholder="mis. SMA Kelas X"
                      className="w-full h-11 sm:h-16 px-3 sm:px-4 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white font-bold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-cyan-300/50"
                    />
                  </div>
                </div>

                {/* Jumlah pertemuan & durasi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 block">Jumlah Pertemuan</label>
                    <div className="flex items-center border-2 border-black dark:border-white/30 h-11 sm:h-16 bg-white dark:bg-[#2a2a2a]">
                      <button
                        type="button"
                        onClick={() => setJumlahPertemuan((j) => Math.max(1, j - 1))}
                        className="w-11 sm:w-16 h-full flex items-center justify-center border-r-2 border-black dark:border-white/30 bg-gray-100 dark:bg-[#222] hover:bg-yellow-300 dark:hover:bg-yellow-400 dark:hover:text-black text-black dark:text-white transition-colors flex-shrink-0"
                        title="Kurangi pertemuan"
                      >
                        <Minus size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </button>
                      <div className="flex-1 h-full flex items-center justify-center font-black text-sm sm:text-lg dark:text-white select-none">
                        {jumlahPertemuan} Pertemuan
                      </div>
                      <button
                        type="button"
                        onClick={() => setJumlahPertemuan((j) => Math.min(20, j + 1))}
                        className="w-11 sm:w-16 h-full flex items-center justify-center border-l-2 border-black dark:border-white/30 bg-gray-100 dark:bg-[#222] hover:bg-yellow-300 dark:hover:bg-yellow-400 dark:hover:text-black text-black dark:text-white transition-colors flex-shrink-0"
                        title="Tambah pertemuan"
                      >
                        <Plus size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 block">Durasi (menit)</label>
                    <div className="flex items-center border-2 border-black dark:border-white/30 h-11 sm:h-16 bg-white dark:bg-[#2a2a2a]">
                      <button
                        type="button"
                        onClick={() => setDurasi((d) => Math.max(30, d - 15))}
                        className="w-11 sm:w-16 h-full flex items-center justify-center border-r-2 border-black dark:border-white/30 bg-gray-100 dark:bg-[#222] hover:bg-cyan-300 dark:hover:bg-cyan-400 dark:hover:text-black text-black dark:text-white transition-colors flex-shrink-0"
                        title="Kurangi durasi"
                      >
                        <Minus size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </button>
                      <div className="flex-1 h-full flex items-center justify-center font-black text-sm sm:text-lg dark:text-white select-none">
                        {durasi} Menit
                      </div>
                      <button
                        type="button"
                        onClick={() => setDurasi((d) => Math.min(240, d + 15))}
                        className="w-11 sm:w-16 h-full flex items-center justify-center border-l-2 border-black dark:border-white/30 bg-gray-100 dark:bg-[#222] hover:bg-cyan-300 dark:hover:bg-cyan-400 dark:hover:text-black text-black dark:text-white transition-colors flex-shrink-0"
                        title="Tambah durasi"
                      >
                        <Plus size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gaya mengajar */}
                <div>
                  <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">Pilih Gaya Mengajar</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {GAYA_MENGAJAR.map((g) => {
                      const active = gaya === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGaya(g)}
                          className={`h-11 sm:h-14 px-3 sm:px-4 border-2 border-black dark:border-white/30 font-bold text-xs sm:text-sm tracking-wide transition-all flex items-center gap-2.5 sm:gap-3 text-left ${
                            active
                              ? "bg-violet-300 dark:bg-violet-500/20 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
                              : "bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333]"
                          }`}
                        >
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-black dark:border-white/30 flex items-center justify-center flex-shrink-0 transition-colors ${
                            active ? "bg-black dark:bg-white" : "bg-white dark:bg-[#2a2a2a]"
                          }`}>
                            {active && (
                              <div className="w-2 h-2 rounded-full bg-white dark:bg-black"></div>
                            )}
                          </div>
                          <span className={active ? "text-black dark:text-white truncate" : "truncate"}>{g}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => setSertakanKuis((v) => !v)}
                    className={`h-12 sm:h-16 px-3.5 sm:px-5 border-2 border-black dark:border-white/30 transition-all flex items-center gap-3 sm:gap-4 ${
                      sertakanKuis 
                        ? "bg-lime-300 dark:bg-lime-500/20 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]" 
                        : "bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#333]"
                    }`}
                  >
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 border-2 border-black dark:border-white/30 flex items-center justify-center flex-shrink-0 transition-colors ${
                      sertakanKuis ? "bg-black dark:bg-white" : "bg-white dark:bg-[#2a2a2a]"
                    }`}>
                      {sertakanKuis && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white dark:text-black">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <HelpCircle size={18} strokeWidth={2.5} className={sertakanKuis ? "text-black dark:text-lime-300 shrink-0" : "text-gray-600 dark:text-gray-400 shrink-0"} />
                      <span className="font-bold text-xs sm:text-base dark:text-white truncate">Sertakan Kuis</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSertakanGame((v) => !v)}
                    className={`h-12 sm:h-16 px-3.5 sm:px-5 border-2 border-black dark:border-white/30 transition-all flex items-center gap-3 sm:gap-4 ${
                      sertakanGame 
                        ? "bg-lime-300 dark:bg-lime-500/20 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]" 
                        : "bg-white dark:bg-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#333]"
                    }`}
                  >
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 border-2 border-black dark:border-white/30 flex items-center justify-center flex-shrink-0 transition-colors ${
                      sertakanGame ? "bg-black dark:bg-white" : "bg-white dark:bg-[#2a2a2a]"
                    }`}>
                      {sertakanGame && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white dark:text-black">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Gamepad2 size={18} strokeWidth={2.5} className={sertakanGame ? "text-black dark:text-lime-300 shrink-0" : "text-gray-600 dark:text-gray-400 shrink-0"} />
                      <span className="font-bold text-xs sm:text-base dark:text-white truncate">Sertakan Game</span>
                    </div>
                  </button>
                </div>

                {/* Instruksi tambahan */}
                <div>
                  <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 block">Instruksi Tambahan (opsional)</label>
                  <textarea
                    value={instruksi}
                    onChange={(e) => setInstruksi(e.target.value)}
                    placeholder="mis. Fokus ke praktikum, hindari hafalan, sisipkan studi kasus lokal..."
                    className="w-full h-20 sm:h-28 p-3 sm:p-4 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white text-xs sm:text-sm resize-none focus:outline-none focus:ring-4 focus:ring-cyan-300/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="mt-4 sm:mt-10 w-full py-3.5 sm:py-5 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-sm sm:text-lg border-2 sm:border-4 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3"
          >
            <Sparkles size={18} className="sm:w-[22px] sm:h-[22px]" /> Susun Rencana dengan AI
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-white dark:bg-[#1e1e1e] border-4 border-black dark:border-white/20 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-4 max-w-xs text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
                <Bot size={48} className="text-black dark:text-white" />
              </motion.div>
              <p className="font-black uppercase tracking-wider dark:text-white">AI Menyusun Rencana</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Membaca materi & merancang tiap pertemuan...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === "result" && result && result.daftar_pertemuan && result.daftar_pertemuan.length > 0 && (
        <RencanaResult
          result={result}
          pertemuanAktif={pertemuanAktif}
          setPertemuanAktif={setPertemuanAktif}
          onBack={handleBack}
          onPrint={handlePrint}
          onSave={handleSaveToBankMateri}
          onCopy={handleCopyFullPlan}
          isSaving={isSaving}
          isSaved={isSaved}
        />
      )}

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

interface RencanaResultProps {
  result: RencanaPembelajaran;
  pertemuanAktif: number;
  setPertemuanAktif: (i: number) => void;
  onBack: () => void;
  onPrint: () => void;
  onSave: () => void;
  onCopy: () => void;
  isSaving: boolean;
  isSaved: boolean;
}

function RencanaResult({
  result,
  pertemuanAktif,
  setPertemuanAktif,
  onBack,
  onPrint,
  onSave,
  onCopy,
  isSaving,
  isSaved,
}: RencanaResultProps) {
  const aktif = result.daftar_pertemuan[pertemuanAktif];

  return (
    <div className="mt-2" id="print-area">
      {/* Top bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-5 py-2 sm:py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all cursor-pointer"
        >
          <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" /> Kembali ke Input
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_#000] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all cursor-pointer"
          >
            <Copy size={15} /> Salin Teks
          </button>

          <button
            onClick={onSave}
            disabled={isSaving || isSaved}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-3 border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_#000] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all cursor-pointer ${
              isSaved
                ? "bg-emerald-300 text-black border-emerald-600 cursor-default"
                : "bg-yellow-300 hover:bg-yellow-400 text-black"
            }`}
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isSaved ? (
              <Check size={16} />
            ) : (
              <BookmarkPlus size={16} />
            )}
            <span>{isSaving ? "Menyimpan..." : isSaved ? "Tersimpan di Materi" : "Simpan ke Bank Materi"}</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-5 py-2 sm:py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all cursor-pointer"
          >
            <Printer size={16} className="sm:w-[18px] sm:h-[18px]" /> Cetak Rencana
          </button>
        </div>
      </div>

      {/* Result header */}
      <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] p-4 sm:p-8 md:p-10 mb-4 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-4">
          <CalendarRange size={12} className="sm:w-3.5 sm:h-3.5" /> {result.total_pertemuan} Pertemuan
        </div>
        <h2 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight dark:text-white leading-tight">{result.judul_rencana}</h2>
        <p className="mt-2 sm:mt-3 font-medium text-gray-600 dark:text-gray-400 text-xs sm:text-base leading-relaxed max-w-3xl">{result.ringkasan}</p>
      </div>

      {result.catatan_ai && (
        <div className="mb-4 sm:mb-8 flex items-start gap-2 sm:gap-3 bg-orange-100 dark:bg-orange-500/10 border-2 border-black dark:border-orange-500/40 p-3 sm:p-5 text-xs sm:text-sm font-medium text-gray-800 dark:text-orange-200">
          <Bot size={16} className="mt-0.5 flex-shrink-0 sm:w-5 sm:h-5" />
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest block mb-0.5 sm:mb-1">Catatan AI</span>
            <p className="leading-relaxed">{result.catatan_ai}</p>
          </div>
        </div>
      )}

      {/* Mobile Meeting Selector: Horizontal Scrollable Chips */}
      <div className="no-print lg:hidden mb-4">
        <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
          <Layers size={13} /> Pilih Pertemuan
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {result.daftar_pertemuan.map((p, idx) => {
            const active = idx === pertemuanAktif;
            return (
              <button
                key={idx}
                onClick={() => setPertemuanAktif(idx)}
                className={`px-3 py-1.5 border-2 border-black dark:border-white/30 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] -translate-y-0.5"
                    : "bg-white text-gray-700 dark:bg-[#1e1e1e] dark:text-gray-300"
                }`}
              >
                <span className="font-black">P{p.pertemuan_ke}</span>
                <span className="max-w-[120px] truncate">{p.judul_pertemuan}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 md:gap-10">
        {/* ── Timeline sidebar (Desktop only) ── */}
        <div className="no-print hidden lg:block">
          <div className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
            <Layers size={14} /> Alur Pertemuan
          </div>
          <div className="space-y-2.5">
            {result.daftar_pertemuan.map((p, idx) => {
              const active = idx === pertemuanAktif;
              const warna = PERTEMUAN_WARNA[idx % PERTEMUAN_WARNA.length];
              return (
                <button
                  key={idx}
                  onClick={() => setPertemuanAktif(idx)}
                  className={`w-full text-left border-2 border-black dark:border-white/30 transition-all flex items-stretch overflow-hidden ${
                    active
                      ? "bg-black dark:bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,0.3)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.15)] -translate-y-0.5 scale-[1.02]"
                      : "bg-white dark:bg-[#1e1e1e] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                  }`}
                >
                  <div className={`w-2 flex-shrink-0 ${active ? warna : "bg-transparent"}`} />
                  <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
                    <span className={`${
                      active 
                        ? "bg-white dark:bg-black text-black dark:text-white border-2 border-white dark:border-black" 
                        : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 border-2 border-black/20 dark:border-white/20"
                    } w-10 h-10 flex-shrink-0 flex items-center justify-center font-black text-base`}>
                      {p.pertemuan_ke}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-sm truncate leading-snug ${active ? "text-white dark:text-black" : "text-gray-800 dark:text-gray-200"}`}>{p.judul_pertemuan}</p>
                      <p className={`text-[11px] truncate leading-snug mt-0.5 ${active ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}>{p.topik}</p>
                    </div>
                    {active && (
                      <div className="text-white dark:text-black flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detail pertemuan ── */}
        <div className="space-y-4 sm:space-y-8">
          <div className="no-print">
            {aktif && <DetailPertemuan pertemuan={aktif} index={pertemuanAktif} />}
          </div>
          <div className="hidden print:block space-y-8">
            {result.daftar_pertemuan.map((p, idx) => (
              <DetailPertemuan key={idx} pertemuan={p} index={idx} />
            ))}
          </div>

          {result.saran_asesmen && (
            <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="bg-emerald-300 border-b-2 sm:border-b-4 border-black p-3.5 sm:p-5 flex items-center gap-2 sm:gap-3">
                <Target size={18} className="text-black sm:w-[22px] sm:h-[22px]" />
                <h3 className="font-black uppercase tracking-wide text-black text-sm sm:text-lg">Saran Asesmen Akhir</h3>
              </div>
              <p className="p-4 sm:p-6 md:p-8 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{result.saran_asesmen}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPertemuan({ pertemuan, index }: { pertemuan: Pertemuan; index: number }) {
  const warna = PERTEMUAN_WARNA[index % PERTEMUAN_WARNA.length];
  const totalMenit = pertemuan.aktivitas.reduce((acc, a) => acc + (a.durasi_menit || 0), 0);

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]"
    >
      {/* Header */}
      <div className={`${warna} border-b-2 sm:border-b-4 border-black p-4 sm:p-6 md:p-8`}>
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <span className="bg-black text-white w-9 h-9 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center font-black text-base sm:text-2xl border-2 border-black">
              {pertemuan.pertemuan_ke}
            </span>
            <div className="min-w-0">
              <h3 className="text-base sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-black leading-tight truncate">{pertemuan.judul_pertemuan}</h3>
              <p className="text-xs sm:text-sm font-bold text-black/60 mt-0.5 sm:mt-1 truncate">{pertemuan.topik}</p>
            </div>
          </div>
          {totalMenit > 0 && (
            <span className="flex-shrink-0 bg-black text-white text-xs sm:text-sm font-black px-2.5 py-1 sm:px-4 sm:py-2 flex items-center gap-1.5">
              <Clock size={13} className="sm:w-4 sm:h-4" /> {totalMenit}m
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-8">
        {/* Tujuan pembelajaran */}
        {pertemuan.tujuan_pembelajaran?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2.5 sm:mb-4">
              <div className="bg-yellow-300 border-2 border-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                <Target size={14} className="text-black sm:w-4 sm:h-4" />
              </div>
              <h4 className="font-black uppercase text-xs sm:text-sm tracking-wider dark:text-white">Tujuan Pembelajaran</h4>
            </div>
            <ul className="space-y-2 sm:space-y-3 ml-1">
              {pertemuan.tujuan_pembelajaran.map((t, i) => (
                <li key={i} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                  <span className="mt-1.5 w-2 h-2 bg-yellow-400 border border-black flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Materi pokok */}
        {pertemuan.materi_pokok?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2.5 sm:mb-4">
              <div className="bg-cyan-300 border-2 border-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                <BookOpen size={14} className="text-black sm:w-4 sm:h-4" />
              </div>
              <h4 className="font-black uppercase text-xs sm:text-sm tracking-wider dark:text-white">Materi Pokok</h4>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
              {pertemuan.materi_pokok.map((m, i) => (
                <span key={i} className="bg-cyan-50 dark:bg-cyan-500/10 border-2 border-black dark:border-cyan-500/30 px-2.5 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-gray-800 dark:text-cyan-100">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Aktivitas */}
        {pertemuan.aktivitas?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2.5 sm:mb-4">
              <div className="bg-violet-300 border-2 border-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                <Layers size={14} className="text-black sm:w-4 sm:h-4" />
              </div>
              <h4 className="font-black uppercase text-xs sm:text-sm tracking-wider dark:text-white">Rangkaian Aktivitas</h4>
            </div>
            <div className="space-y-2.5 sm:space-y-4">
              {pertemuan.aktivitas.map((a, i) => {
                const meta = ambilTipeAktivitas(a.tipe);
                const Icon = meta.icon;
                return (
                  <div key={i} className="border-2 border-black dark:border-white/20 flex overflow-hidden">
                    <div className={`${meta.warna} border-r-2 border-black flex flex-col items-center justify-center p-2.5 sm:p-4 flex-none w-20 sm:w-32`}>
                      <Icon size={18} className="text-black sm:w-6 sm:h-6" />
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-black mt-1 text-center">{meta.label}</span>
                      {a.durasi_menit > 0 && (
                        <span className="text-[9px] sm:text-[11px] font-bold text-black/60 flex items-center gap-0.5 sm:gap-1 mt-0.5">
                          <Clock size={10} /> {a.durasi_menit}m
                        </span>
                      )}
                    </div>
                    <div className="p-3 sm:p-5 min-w-0 flex-1 bg-white dark:bg-[#1e1e1e]">
                      <p className="font-bold text-xs sm:text-base dark:text-white leading-snug">{a.judul}</p>
                      {a.deskripsi && (
                        <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1 sm:mt-2">{a.deskripsi}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metode & penilaian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
          {pertemuan.metode && (
            <div className="bg-violet-100 dark:bg-violet-500/10 border-2 border-black dark:border-violet-500/40 p-3 sm:p-5">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <GraduationCap size={16} className="text-black dark:text-violet-200" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-black dark:text-violet-200">Metode Mengajar</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-violet-100 leading-relaxed">{pertemuan.metode}</p>
            </div>
          )}
          {pertemuan.penilaian && (
            <div className="bg-cyan-100 dark:bg-cyan-500/10 border-2 border-black dark:border-cyan-500/40 p-3 sm:p-5">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <ClipboardList size={16} className="text-black dark:text-cyan-200" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-black dark:text-cyan-200">Penilaian</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-cyan-100 leading-relaxed">{pertemuan.penilaian}</p>
            </div>
          )}
        </div>

        {/* Catatan guru */}
        {pertemuan.catatan_guru && (
          <div className="bg-yellow-100 dark:bg-yellow-500/10 border-2 border-black dark:border-yellow-500/30 p-3 sm:p-5 flex gap-2.5 sm:gap-4">
            <div className="bg-yellow-400 border-2 border-black w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center">
              <Lightbulb size={16} className="text-black sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-600 dark:text-yellow-200 block mb-1">Tips untuk Guru</span>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 leading-relaxed">{pertemuan.catatan_guru}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
