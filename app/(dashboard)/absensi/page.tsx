"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Type,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  FileText,
  X,
  Sparkles,
  Bot,
  Info,
  ArrowLeft,
  Printer,
  Save,
  Plus,
  Trash2,
  Check,
  CalendarDays,
  ScanLine,
} from "lucide-react";
import { buatSupabaseClient } from "@/lib/supabase/client";

type InputMethod = "text" | "file" | "image";
type Status = "hadir" | "izin" | "sakit" | "alpa" | "terlambat";

interface AttachedFile {
  id: string;
  file: File;
  kind: "file" | "image";
}

interface Murid {
  nama: string;
  nomor_absen: string;
  status: Status;
  keterangan: string;
}

export const STATUS_META: Record<Status, { label: string; short: string; color: string; card: string }> = {
  hadir: { label: "Hadir", short: "H", color: "bg-lime-400", card: "bg-lime-100 dark:bg-[#1c2915]" },
  izin: { label: "Izin", short: "I", color: "bg-cyan-400", card: "bg-cyan-100 dark:bg-[#152628]" },
  sakit: { label: "Sakit", short: "S", color: "bg-yellow-400", card: "bg-yellow-100 dark:bg-[#2b2717]" },
  alpa: { label: "Alpa", short: "A", color: "bg-rose-400", card: "bg-rose-100 dark:bg-[#2b1519]" },
  terlambat: { label: "Terlambat", short: "T", color: "bg-orange-400", card: "bg-orange-100 dark:bg-[#2b1e12]" },
};

export const STATUS_ORDER: Status[] = ["hadir", "izin", "sakit", "alpa", "terlambat"];

export default function AbsensiPage() {
  const [view, setView] = useState<"input" | "result">("input");
  const [inputMethod, setInputMethod] = useState<InputMethod>("text");
  const [rawMurid, setRawMurid] = useState("");
  const [judul, setJudul] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [murid, setMurid] = useState<Murid[]>([]);
  const [catatanAi, setCatatanAi] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

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

  const removeFile = (id: string) =>
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));

  // ── Stage 1: ekstrak nama saja ──
  const handleExtract = async () => {
    if (!rawMurid.trim() && attachedFiles.length === 0) {
      toast.error("Masukkan daftar murid (teks) atau lampirkan foto/file.");
      return;
    }
    setLoadingLabel("Membaca daftar nama murid...");
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("raw_murid", rawMurid);
      formData.append("konteks", judul);
      attachedFiles.forEach((af) => formData.append("files", af.file, af.file.name));

      const res = await fetch("/api/absensi", { method: "POST", body: formData });
      if (!res.ok) {
        let msg = "Gagal menghubungi server";
        try {
          const j = await res.json();
          msg = j?.error || j?.detail || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      const daftar: Murid[] = (data.daftar_murid || []).map((m: any) => ({
        nama: m.nama || "",
        nomor_absen: m.nomor_absen || "",
        status: "hadir" as Status,
        keterangan: "",
      }));
      if (daftar.length === 0) {
        toast.error(data.catatan_ai || "AI tidak menemukan murid.");
        return;
      }
      setMurid(daftar);
      setCatatanAi(data.catatan_ai || "");
      goToResult();
      toast.success(`Berhasil membaca ${daftar.length} murid!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal: " + (err.message || "Error tidak diketahui"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManual = () => {
    setMurid([{ nama: "", nomor_absen: "1", status: "hadir", keterangan: "" }]);
    setCatatanAi("");
    goToResult();
  };

  const goToResult = () => {
    if (!judul.trim()) {
      setJudul(
        `Absensi — ${new Date(tanggal).toLocaleDateString("id-ID", { dateStyle: "medium" })}`
      );
    }
    setIsSaved(false);
    setView("result");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setView("input");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Stage 2: isi status dari foto/file kertas absensi ──
  const handleScanPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (scanInputRef.current) scanInputRef.current.value = "";
    if (files.length === 0) return;
    const roster = murid.map((m) => ({ nama: m.nama, nomor_absen: m.nomor_absen }));
    if (roster.length === 0) return;

    setLoadingLabel("AI membaca kertas absensi & mengisi status...");
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("roster", JSON.stringify(roster));
      formData.append("konteks", judul);
      files.forEach((f) => formData.append("files", f, f.name));

      const res = await fetch("/api/absensi/fill-status", { method: "POST", body: formData });
      if (!res.ok) {
        let msg = "Gagal memproses";
        try {
          const j = await res.json();
          msg = j?.error || j?.detail || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      const statuses = data.status_murid || [];
      setMurid((prev) =>
        prev.map((m, i) => ({
          ...m,
          status: (STATUS_ORDER.includes(statuses[i]?.status) ? statuses[i].status : m.status) as Status,
          keterangan: statuses[i]?.keterangan || m.keterangan,
        }))
      );
      if (data.catatan_ai) setCatatanAi(data.catatan_ai);
      setIsSaved(false);
      toast.success("Status kehadiran terisi otomatis! Silakan periksa & koreksi.");
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal isi otomatis: " + (err.message || "Error"));
    } finally {
      setIsLoading(false);
    }
  };

  const updateMurid = (idx: number, patch: Partial<Murid>) =>
    setMurid((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const removeMurid = (idx: number) =>
    setMurid((prev) => prev.filter((_, i) => i !== idx));

  const addMurid = () =>
    setMurid((prev) => [
      ...prev,
      { nama: "", nomor_absen: String(prev.length + 1), status: "hadir", keterangan: "" },
    ]);

  const setAll = (status: Status) =>
    setMurid((prev) => prev.map((m) => ({ ...m, status })));

  const rekap = STATUS_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: murid.filter((m) => m.status === s).length }),
    {} as Record<Status, number>
  );

  const handleSave = async () => {
    if (isSaving || isSaved) return;
    const valid = murid.filter((m) => m.nama.trim());
    if (valid.length === 0) {
      toast.error("Belum ada murid dengan nama terisi.");
      return;
    }
    setIsSaving(true);
    const toastId = toast.loading("Menyimpan absensi...");
    try {
      const supabase = buatSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Anda harus login untuk menyimpan.", { id: toastId });
        return;
      }
      const { error } = await supabase.from("sesi_absensi").insert({
        user_id: user.id,
        judul: judul.trim() || "Absensi",
        tanggal,
        total_murid: valid.length,
        jumlah_hadir: rekap.hadir,
        jumlah_izin: rekap.izin,
        jumlah_sakit: rekap.sakit,
        jumlah_alpa: rekap.alpa,
        jumlah_terlambat: rekap.terlambat,
        data: valid,
      });
      if (error) throw error;
      setIsSaved(true);
      toast.success("Absensi berhasil disimpan!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menyimpan: " + (err.message || "Error"), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-3.5 sm:p-6 md:p-10 max-w-5xl mx-auto">
      {view === "input" && (
        <InputView
          inputMethod={inputMethod}
          setInputMethod={setInputMethod}
          rawMurid={rawMurid}
          setRawMurid={setRawMurid}
          judul={judul}
          setJudul={setJudul}
          attachedFiles={attachedFiles}
          removeFile={removeFile}
          fileInputRef={fileInputRef}
          imageInputRef={imageInputRef}
          handleFilePicked={handleFilePicked}
          handleExtract={handleExtract}
          handleManual={handleManual}
        />
      )}

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.12)] flex flex-col items-center gap-3 sm:gap-4 max-w-xs text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
                <Bot size={40} className="text-black dark:text-white" />
              </motion.div>
              <p className="font-black text-sm sm:text-base uppercase tracking-wider dark:text-white">AI Bekerja</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">{loadingLabel}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === "result" && (
        <ResultView
          judul={judul}
          setJudul={setJudul}
          tanggal={tanggal}
          setTanggal={setTanggal}
          murid={murid}
          catatanAi={catatanAi}
          rekap={rekap}
          updateMurid={updateMurid}
          removeMurid={removeMurid}
          addMurid={addMurid}
          setAll={setAll}
          handleBack={handleBack}
          handleSave={handleSave}
          handlePrint={handlePrint}
          isSaving={isSaving}
          isSaved={isSaved}
          scanInputRef={scanInputRef}
          handleScanPicked={handleScanPicked}
        />
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

/* ──────────────────────────── Stage 1: Input ──────────────────────────── */

interface InputViewProps {
  inputMethod: InputMethod;
  setInputMethod: (m: InputMethod) => void;
  rawMurid: string;
  setRawMurid: (v: string) => void;
  judul: string;
  setJudul: (v: string) => void;
  attachedFiles: AttachedFile[];
  removeFile: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  handleFilePicked: (e: React.ChangeEvent<HTMLInputElement>, kind: "file" | "image") => void;
  handleExtract: () => void;
  handleManual: () => void;
}

function InputView({
  inputMethod,
  setInputMethod,
  rawMurid,
  setRawMurid,
  judul,
  setJudul,
  attachedFiles,
  removeFile,
  fileInputRef,
  imageInputRef,
  handleFilePicked,
  handleExtract,
  handleManual,
}: InputViewProps) {
  return (
    <>
      <div className="mb-5 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-black dark:bg-white text-white dark:text-black px-2.5 sm:px-3 py-0.5 sm:py-1 mb-2 sm:mb-3 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
          <Sparkles size={12} /> Langkah 1 dari 2
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight dark:text-white flex items-center gap-2 sm:gap-3">
          <ClipboardCheck className="text-black dark:text-white shrink-0" size={28} strokeWidth={2.5} />
          <span>Absensi Murid</span>
        </h1>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base font-medium text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
          Masukkan daftar nama murid dulu — ketik, atau lampirkan <b>foto/file</b>. AI cuma membaca
          namanya. Kehadiran kamu isi di langkah berikutnya.
        </p>
      </div>

      {/* Judul / Agenda */}
      <div className="mb-4 sm:mb-6 bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
        <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 flex items-center gap-1.5">
          <FileText size={13} /> Judul / Agenda Kegiatan
        </label>
        <input
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Absensi Kelas 7A — Matematika"
          className="w-full text-sm sm:text-lg font-bold dark:text-white bg-transparent border-b-2 sm:border-b-4 border-black dark:border-white/30 py-1 sm:py-2 focus:outline-none"
        />
      </div>

      {/* Daftar murid */}
      <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
        <h2 className="text-sm sm:text-lg font-black uppercase tracking-wider mb-3 sm:mb-4 dark:text-white flex items-center gap-2">
          <span className="bg-yellow-300 border border-black dark:border-white/30 w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm font-bold">1</span>
          Daftar Nama Murid
        </h2>

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
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide transition-all ${
                  active
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
                    : "bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333]"
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {inputMethod === "text" && (
          <textarea
            value={rawMurid}
            onChange={(e) => setRawMurid(e.target.value)}
            placeholder={"Tempel daftar murid di sini. Contoh:\n1. Budi Santoso\n2. Ani Wijaya\n3. Citra Dewi\n..."}
            className="w-full h-36 sm:h-56 p-3 sm:p-4 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] dark:text-white font-mono text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-yellow-300/50"
          />
        )}

        {inputMethod === "file" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-36 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-gray-50 dark:bg-[#2a2a2a] flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-yellow-50 dark:hover:bg-[#333] transition-colors p-4"
          >
            <UploadCloud size={30} className="text-black dark:text-white sm:w-10 sm:h-10" />
            <span className="font-bold uppercase tracking-wide text-xs sm:text-sm dark:text-white">Pilih File</span>
            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">PDF, DOCX, XLSX — dibaca langsung oleh AI</span>
          </button>
        )}

        {inputMethod === "image" && (
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full h-36 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-gray-50 dark:bg-[#2a2a2a] flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-cyan-50 dark:hover:bg-[#333] transition-colors p-4"
          >
            <ImageIcon size={30} className="text-black dark:text-white sm:w-10 sm:h-10" />
            <span className="font-bold uppercase tracking-wide text-xs sm:text-sm dark:text-white">Pilih Foto</span>
            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Foto daftar nama / tulisan tangan — AI membaca langsung</span>
          </button>
        )}

        <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv" className="hidden" onChange={(e) => handleFilePicked(e, "file")} />
        <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFilePicked(e, "image")} />

        {attachedFiles.length > 0 && (
          <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
            {attachedFiles.map((af) => (
              <div key={af.id} className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black pl-2.5 pr-1.5 py-1 text-[11px] sm:text-xs font-bold border-2 border-black dark:border-white/30">
                {af.kind === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                <span className="max-w-[120px] sm:max-w-[140px] truncate">{af.file.name}</span>
                <button onClick={() => removeFile(af.id)} className="hover:text-red-400 transition-colors p-0.5">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2.5 sm:mt-3 text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          Cukup daftar namanya saja. Kehadiran diisi di langkah 2.
        </p>

        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleExtract}
            className="flex-1 py-3 sm:py-4 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-wider sm:tracking-widest border-2 sm:border-4 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-0.5 active:translate-x-0.5 sm:active:translate-y-1 sm:active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm"
          >
            <Sparkles size={17} /> Baca dengan AI → Lanjut
          </button>
          <button
            onClick={handleManual}
            className="py-2.5 sm:py-4 px-4 sm:px-6 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 sm:border-4 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-0.5 active:translate-x-0.5 sm:active:translate-y-1 sm:active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Plus size={16} /> Isi Manual
          </button>
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────── Stage 2: Absensi ──────────────────────────── */

interface ResultViewProps {
  judul: string;
  setJudul: (v: string) => void;
  tanggal: string;
  setTanggal: (v: string) => void;
  murid: Murid[];
  catatanAi: string;
  rekap: Record<Status, number>;
  updateMurid: (idx: number, patch: Partial<Murid>) => void;
  removeMurid: (idx: number) => void;
  addMurid: () => void;
  setAll: (status: Status) => void;
  handleBack: () => void;
  handleSave: () => void;
  handlePrint: () => void;
  isSaving: boolean;
  isSaved: boolean;
  scanInputRef: React.RefObject<HTMLInputElement | null>;
  handleScanPicked: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ResultView({
  judul,
  setJudul,
  tanggal,
  setTanggal,
  murid,
  catatanAi,
  rekap,
  updateMurid,
  removeMurid,
  addMurid,
  setAll,
  handleBack,
  handleSave,
  handlePrint,
  isSaving,
  isSaved,
  scanInputRef,
  handleScanPicked,
}: ResultViewProps) {
  return (
    <div id="print-area">
      <button
        onClick={handleBack}
        className="no-print mb-4 sm:mb-6 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 sm:active:translate-y-1 sm:active:translate-x-1 active:shadow-none transition-all"
      >
        <ArrowLeft size={14} /> Ganti Daftar Murid
      </button>

      <div className="no-print inline-flex items-center gap-1.5 sm:gap-2 bg-black dark:bg-white text-white dark:text-black px-2.5 sm:px-3 py-0.5 sm:py-1 mb-2 sm:mb-3 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
        <ClipboardCheck size={13} /> Langkah 2 dari 2 — Isi Kehadiran
      </div>

      {/* Header: judul + tanggal + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 min-w-[200px] sm:min-w-[240px]">
          <label className="no-print text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 block">Judul / Agenda</label>
          <input
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            className="w-full text-lg sm:text-2xl font-black uppercase tracking-tight dark:text-white bg-transparent border-b-2 sm:border-b-4 border-black dark:border-white/30 py-1 focus:outline-none"
          />
          <div className="mt-2 sm:mt-3 inline-flex items-center gap-2 border-2 border-black dark:border-white/30 bg-white dark:bg-[#2a2a2a] px-2.5 sm:px-3 py-1.5 sm:py-2">
            <CalendarDays size={14} className="text-black dark:text-white" />
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="bg-transparent dark:text-white font-bold text-xs sm:text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 no-print w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
          >
            <Printer size={15} /> Cetak
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaved ? <Check size={15} /> : <Save size={15} />}
            {isSaved ? "Tersimpan" : isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>

      {/* Isi otomatis dari kertas */}
      <div className="no-print mb-4 sm:mb-6 bg-cyan-100 dark:bg-cyan-500/10 border-2 sm:border-4 border-black dark:border-cyan-500/40 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
        <div className="flex items-start gap-2 text-xs sm:text-sm font-medium text-gray-800 dark:text-cyan-100">
          <ScanLine size={16} className="mt-0.5 flex-shrink-0" />
          <span>Punya <b>foto/file kertas absensi</b>? Biar AI yang mengisikan status ke tiap murid.</span>
        </div>
        <button
          onClick={() => scanInputRef.current?.click()}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none transition-all w-full sm:w-auto justify-center"
        >
          <ScanLine size={15} /> Isi dari Foto/File
        </button>
        <input ref={scanInputRef} type="file" multiple accept="image/*,.pdf,.docx,.xlsx" className="hidden" onChange={handleScanPicked} />
      </div>

      {catatanAi && (
        <div className="no-print mb-4 sm:mb-6 flex items-start gap-2 bg-orange-100 dark:bg-orange-500/10 border-2 border-black dark:border-orange-500/40 p-2.5 sm:p-3 text-xs sm:text-sm font-medium text-gray-800 dark:text-orange-200">
          <Info size={15} className="mt-0.5 flex-shrink-0" />
          <span><b>Catatan AI:</b> {catatanAi}</span>
        </div>
      )}

      {/* Rekap — klik kartu = set semua ke status itu */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="border-2 sm:border-4 border-black dark:border-white/20 bg-black dark:bg-white text-white dark:text-black p-2 sm:p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
          <div className="text-xl sm:text-2xl font-black">{murid.length}</div>
          <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Total</div>
        </div>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setAll(s)}
            title={`Tandai semua ${STATUS_META[s].label}`}
            className={`no-print border-2 sm:border-4 border-black dark:border-white/20 ${STATUS_META[s].color} text-black p-2 sm:p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all`}
          >
            <div className="text-xl sm:text-2xl font-black">{rekap[s]}</div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{STATUS_META[s].label}</div>
          </button>
        ))}
      </div>

      {/* Kartu per murid (list vertikal) */}
      <div className="space-y-2.5 sm:space-y-4">
        {murid.map((m, idx) => (
          <div
            key={idx}
            className={`border-2 sm:border-4 border-black dark:border-white/20 p-2.5 sm:p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)] transition-colors ${STATUS_META[m.status].card}`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                value={m.nomor_absen}
                onChange={(e) => updateMurid(idx, { nomor_absen: e.target.value })}
                className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 text-center font-black text-xs sm:text-base dark:text-white bg-yellow-300 border border-black dark:border-white/30 text-black focus:outline-none"
                title="Nomor absen"
              />
              <input
                value={m.nama}
                onChange={(e) => updateMurid(idx, { nama: e.target.value })}
                placeholder="Nama murid"
                className="flex-1 min-w-0 text-sm sm:text-lg font-black dark:text-white bg-transparent border-b border-black/20 dark:border-white/20 py-0.5 sm:py-1 px-1 focus:outline-none focus:border-black dark:focus:border-white/40"
              />
              <button
                onClick={() => removeMurid(idx)}
                className="no-print w-7 h-7 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center border border-black/20 dark:border-white/20 text-gray-400 hover:text-white hover:bg-rose-500 hover:border-rose-500 transition-colors"
                title="Hapus murid"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Status toggle */}
            <div className="mt-2 sm:mt-3 grid grid-cols-5 gap-1 sm:gap-2">
              {STATUS_ORDER.map((s) => {
                const active = m.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => updateMurid(idx, { status: s })}
                    className={`py-1.5 sm:py-2 border sm:border-2 border-black dark:border-white/30 font-black uppercase text-[10px] sm:text-xs tracking-tight sm:tracking-wide transition-all ${
                      active
                        ? `${STATUS_META[s].color} text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5`
                        : "bg-white dark:bg-[#2a2a2a] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#333]"
                    }`}
                  >
                    {STATUS_META[s].label}
                  </button>
                );
              })}
            </div>

            <input
              value={m.keterangan}
              onChange={(e) => updateMurid(idx, { keterangan: e.target.value })}
              placeholder="Keterangan (opsional)..."
              className="mt-2 sm:mt-3 w-full text-xs sm:text-sm dark:text-white bg-gray-50 dark:bg-[#2a2a2a] border border-black/20 dark:border-white/20 px-2.5 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:border-black dark:focus:border-white/40"
            />
          </div>
        ))}
      </div>

      <button
        onClick={addMurid}
        className="no-print mt-3 sm:mt-4 w-full py-2.5 sm:py-3 bg-white dark:bg-[#1e1e1e] dark:text-white border-2 sm:border-4 border-dashed border-black/30 dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-yellow-50 dark:hover:bg-[#2a2a2a] transition-colors"
      >
        <Plus size={15} /> Tambah Murid
      </button>
    </div>
  );
}
