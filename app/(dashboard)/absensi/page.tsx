"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  FileSpreadsheet,
  Share2,
  Eye,
  Search,
  Users,
  RotateCcw,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { buatSupabaseClient } from "@/lib/supabase/client";
import { downloadAbsensiExcel } from "@/lib/absensi-export";

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

export interface SesiAbsensiRow {
  id: string;
  judul: string;
  tanggal: string;
  total_murid: number;
  jumlah_hadir: number;
  jumlah_izin: number;
  jumlah_sakit: number;
  jumlah_alpa: number;
  jumlah_terlambat: number;
  data: Murid[];
  created_at: string;
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
  const [mainTab, setMainTab] = useState<"catat" | "riwayat">("catat");
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

  // Riwayat Absensi State
  const [riwayatList, setRiwayatList] = useState<SesiAbsensiRow[]>([]);
  const [isRiwayatLoading, setIsRiwayatLoading] = useState(false);
  const [riwayatQuery, setRiwayatQuery] = useState("");
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<SesiAbsensiRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const fetchRiwayat = async () => {
    setIsRiwayatLoading(true);
    try {
      const supabase = buatSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sesi_absensi")
        .select("*")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRiwayatList((data as SesiAbsensiRow[]) || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Gagal memuat riwayat absensi: " + (e.message || "Error"));
    } finally {
      setIsRiwayatLoading(false);
    }
  };

  useEffect(() => {
    fetchRiwayat();
  }, []);

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
      setMurid(daftar);
      setCatatanAi(data.catatan_ai || "");
      setView("result");
      setIsSaved(false);
      toast.success(`${daftar.length} murid teridentifikasi.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal ekstrak nama: " + (err.message || "Error tidak diketahui"));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Manual: lewati AI, parse baris teks langsung ──
  const handleManual = () => {
    const lines = rawMurid
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) {
      toast.error("Tulis minimal satu nama murid pada kotak teks.");
      return;
    }
    const daftar: Murid[] = lines.map((line, idx) => {
      const match = line.match(/^(\d+)[\.\-\)]\s*(.*)$/);
      if (match) {
        return {
          nomor_absen: match[1],
          nama: match[2].trim(),
          status: "hadir",
          keterangan: "",
        };
      }
      return {
        nomor_absen: String(idx + 1),
        nama: line,
        status: "hadir",
        keterangan: "",
      };
    });
    setMurid(daftar);
    setCatatanAi("");
    setView("result");
    setIsSaved(false);
    toast.success(`${daftar.length} murid dimasukkan.`);
  };

  const handleBack = () => {
    setView("input");
    setIsSaved(false);
  };

  // ── Stage 2: Isi status otomatis dari foto/file kertas absensi ──
  const handleScanPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (murid.length === 0) {
      toast.error("Daftar murid kosong.");
      return;
    }

    setLoadingLabel("Membaca centang / paraf pada kertas...");
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append(
        "daftar_murid",
        JSON.stringify(murid.map((m) => ({ nama: m.nama, nomor_absen: m.nomor_absen })))
      );
      files.forEach((f) => formData.append("files", f, f.name));

      const res = await fetch("/api/absensi/fill-status", { method: "POST", body: formData });
      if (!res.ok) {
        let msg = "Gagal menghubungi server";
        try {
          const j = await res.json();
          msg = j?.error || j?.detail || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      const statusMap = new Map<string, { status: Status; keterangan: string }>();
      (data.hasil_status || []).forEach((item: any) => {
        const k = (item.nama || "").trim().toLowerCase();
        const validStatus: Status = STATUS_ORDER.includes(item.status) ? item.status : "hadir";
        if (k) statusMap.set(k, { status: validStatus, keterangan: item.keterangan || "" });
      });

      setMurid((prev) =>
        prev.map((m) => {
          const k = m.nama.trim().toLowerCase();
          const found = statusMap.get(k);
          if (found) {
            return { ...m, status: found.status, keterangan: found.keterangan || m.keterangan };
          }
          return m;
        })
      );

      if (data.catatan_ai) {
        setCatatanAi((prev) => (prev ? `${prev}\n${data.catatan_ai}` : data.catatan_ai));
      }
      setIsSaved(false);
      toast.success("Status kehadiran berhasil diperbarui dari kertas!");
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal membaca kertas absensi: " + (err.message || "Error tidak diketahui"));
    } finally {
      if (scanInputRef.current) scanInputRef.current.value = "";
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
      fetchRiwayat();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menyimpan: " + (err.message || "Error"), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportResultExcel = () => {
    const valid = murid.filter((m) => m.nama.trim());
    if (valid.length === 0) {
      toast.error("Belum ada data murid untuk diekspor.");
      return;
    }
    downloadAbsensiExcel({
      judul: judul || "Absensi",
      tanggal,
      muridList: valid,
      rekap,
    });
    toast.success("File Excel presensi berhasil diunduh!");
  };

  const handleDeleteSession = async (id: string, judulSesi: string) => {
    if (!confirm(`Hapus catatan absensi "${judulSesi}"? Data yang dihapus tidak dapat dipulihkan.`)) {
      return;
    }
    const toastId = toast.loading("Menghapus sesi absensi...");
    try {
      const supabase = buatSupabaseClient();
      const { error } = await supabase.from("sesi_absensi").delete().eq("id", id);
      if (error) throw error;
      toast.success("Catatan absensi berhasil dihapus.", { id: toastId });
      setRiwayatList((prev) => prev.filter((s) => s.id !== id));
      if (selectedSessionDetail?.id === id) {
        setSelectedSessionDetail(null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Gagal menghapus: " + (e.message || "Error"), { id: toastId });
    }
  };

  const handleShareWhatsApp = (session: SesiAbsensiRow) => {
    const dateFormatted = new Date(session.tanggal).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const total = session.total_murid || session.data?.length || 0;
    const persentase = total > 0 ? ((session.jumlah_hadir / total) * 100).toFixed(1) : "0";

    let text = `*LAPORAN PRESENSI KEHADIRAN SISWA*\n`;
    text += `*Agenda / Kelas:* ${session.judul}\n`;
    text += `*Hari / Tanggal:* ${dateFormatted}\n\n`;
    text += `*RINGKASAN KEHADIRAN:*\n`;
    text += `• Total Murid: ${total}\n`;
    text += `• Hadir: ${session.jumlah_hadir} (${persentase}%)\n`;
    text += `• Izin: ${session.jumlah_izin}\n`;
    text += `• Sakit: ${session.jumlah_sakit}\n`;
    text += `• Alpa: ${session.jumlah_alpa}\n`;
    text += `• Terlambat: ${session.jumlah_terlambat}\n\n`;

    const absentees = (session.data || []).filter(
      (m) => m.status && m.status !== "hadir"
    );

    if (absentees.length > 0) {
      text += `*RINCIAN SISWA TIDAK HADIR / TERLAMBAT:*\n`;
      absentees.forEach((m, i) => {
        text += `${i + 1}. ${m.nama} — [${m.status.toUpperCase()}] ${
          m.keterangan ? `(${m.keterangan})` : ""
        }\n`;
      });
    } else {
      text += `*Catatan:* Seluruh siswa hadir lengkap tanpa keterangan alpa/sakit.\n`;
    }

    navigator.clipboard.writeText(text);
    toast.success("Ringkasan format WhatsApp berhasil disalin ke clipboard!");
  };

  const handleDownloadSessionExcel = (session: SesiAbsensiRow) => {
    downloadAbsensiExcel({
      judul: session.judul,
      tanggal: session.tanggal,
      muridList: session.data || [],
      rekap: {
        hadir: session.jumlah_hadir,
        izin: session.jumlah_izin,
        sakit: session.jumlah_sakit,
        alpa: session.jumlah_alpa,
        terlambat: session.jumlah_terlambat,
      },
    });
    toast.success("File Excel presensi berhasil diunduh!");
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-3.5 sm:p-6 md:p-10 max-w-5xl mx-auto pb-24">
      {/* ── Top Header & Tab Navigation ── */}
      <div className="no-print mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-black dark:bg-white text-white dark:text-black px-2.5 sm:px-3 py-0.5 sm:py-1 mb-2 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
          <ClipboardCheck size={12} /> Modul Kelas
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight dark:text-white flex items-center gap-2 sm:gap-3">
              <ClipboardCheck className="text-black dark:text-white shrink-0" size={28} strokeWidth={2.5} />
              <span>Absensi Murid</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium max-w-xl">
              Catat presensi harian, ekstrak dokumen fisik via AI, dan kelola arsip kehadiran kelas.
            </p>
          </div>

          {/* Segmented Navigation Tab */}
          <div className="flex border-2 border-black dark:border-white/30 bg-white dark:bg-[#1e1e1e] p-1 shadow-[3px_3px_0px_0px_#000] self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setMainTab("catat")}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mainTab === "catat"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-[1.5px_1.5px_0px_0px_#FACC15]"
                  : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Catat Kehadiran
            </button>
            <button
              type="button"
              onClick={() => {
                setMainTab("riwayat");
                fetchRiwayat();
              }}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mainTab === "riwayat"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-[1.5px_1.5px_0px_0px_#FACC15]"
                  : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Riwayat Tersimpan ({riwayatList.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab 1: CATAT KEHADIRAN ── */}
      {mainTab === "catat" && (
        <>
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
              handleExportExcel={handleExportResultExcel}
              isSaving={isSaving}
              isSaved={isSaved}
              scanInputRef={scanInputRef}
              handleScanPicked={handleScanPicked}
            />
          )}
        </>
      )}

      {/* ── Tab 2: RIWAYAT TERSIMPAN ── */}
      {mainTab === "riwayat" && (
        <RiwayatAbsensiView
          sessions={riwayatList}
          loading={isRiwayatLoading}
          query={riwayatQuery}
          setQuery={setRiwayatQuery}
          onRefresh={fetchRiwayat}
          onSelectDetail={(s) => setSelectedSessionDetail(s)}
          onDownloadExcel={handleDownloadSessionExcel}
          onShareWhatsApp={handleShareWhatsApp}
          onDelete={handleDeleteSession}
          onNewAttendance={() => setMainTab("catat")}
        />
      )}

      {/* Modal Detail Sesi Terpilih */}
      {selectedSessionDetail && (
        <DetailSesiModal
          session={selectedSessionDetail}
          onClose={() => setSelectedSessionDetail(null)}
          onDownloadExcel={() => handleDownloadSessionExcel(selectedSessionDetail)}
          onShareWhatsApp={() => handleShareWhatsApp(selectedSessionDetail)}
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
      <div className="mb-4 sm:mb-6">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-yellow-300 border border-black px-2.5 py-0.5 mb-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-black">
          <Sparkles size={12} /> Langkah 1 dari 2 — Masukkan Daftar Nama
        </div>
        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
          Masukkan daftar nama murid dulu — ketik, atau lampirkan <b>foto/file</b>. AI membaca
          namanya, lalu status kehadiran diisi di langkah berikutnya.
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
          placeholder="Contoh: Matematika Wajib X MIPA 1 — Pertemuan 4"
          className="w-full text-sm sm:text-base font-bold dark:text-white bg-transparent border-b-2 border-black/20 dark:border-white/20 py-1 sm:py-1.5 px-0.5 focus:outline-none focus:border-black dark:focus:border-white/40"
        />
      </div>

      {/* Input box */}
      <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
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
            value={rawMurid}
            onChange={(e) => setRawMurid(e.target.value)}
            placeholder={"Tempel daftar nama murid di sini. Contoh:\n1. Ahmad Dhani\n2. Budi Gunawan\n3. Citra Kirana\n..."}
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
            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center">PDF, DOCX, XLSX, PPTX — nama murid dibaca otomatis oleh AI</span>
          </button>
        )}

        {inputMethod === "image" && (
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full h-36 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-gray-50 dark:bg-[#2a2a2a] flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-cyan-50 dark:hover:bg-[#333] transition-colors p-4"
          >
            <ImageIcon size={32} className="sm:w-10 sm:h-10 text-black dark:text-white" />
            <span className="font-bold uppercase tracking-wide text-xs sm:text-sm dark:text-white">Pilih Foto</span>
            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center">Foto daftar presensi / tulisan tangan — AI membaca langsung</span>
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

        {/* Action button */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <button
            onClick={handleExtract}
            className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-gray-800 dark:hover:bg-gray-200 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Sparkles size={16} />
            Ekstrak Nama via AI
          </button>
          {inputMethod === "text" && rawMurid.trim() && (
            <button
              onClick={handleManual}
              className="flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 sm:px-6 bg-white dark:bg-[#2a2a2a] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 dark:hover:bg-[#333] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
            >
              Lewati AI (Manual)
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────── Stage 2: Result ──────────────────────────── */

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
  handleExportExcel: () => void;
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
  handleExportExcel,
  isSaving,
  isSaved,
  scanInputRef,
  handleScanPicked,
}: ResultViewProps) {
  return (
    <div id="print-area">
      <button
        onClick={handleBack}
        className="no-print mb-4 sm:mb-6 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 sm:active:translate-y-1 sm:active:translate-x-1 active:shadow-none transition-all cursor-pointer"
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
        <div className="flex flex-wrap gap-2 sm:gap-3 no-print w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <FileSpreadsheet size={15} /> Unduh Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Printer size={15} /> Cetak
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none transition-all w-full sm:w-auto justify-center cursor-pointer"
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
            className={`border-2 sm:border-4 border-black dark:border-white/20 p-2 sm:p-3 text-center transition-all ${STATUS_META[s].color} text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 cursor-pointer`}
            title={`Set semua ke ${STATUS_META[s].label}`}
          >
            <div className="text-xl sm:text-2xl font-black">{rekap[s]}</div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{STATUS_META[s].label}</div>
          </button>
        ))}
      </div>

      {/* Daftar murid */}
      <div className="space-y-2 sm:space-y-3">
        {murid.map((m, idx) => (
          <div
            key={idx}
            className={`border-2 sm:border-4 border-black dark:border-white/20 p-2.5 sm:p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors ${STATUS_META[m.status].card}`}
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
                className="no-print w-7 h-7 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center border border-black/20 dark:border-white/20 text-gray-400 hover:text-white hover:bg-rose-500 hover:border-rose-500 transition-colors cursor-pointer"
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
                    className={`py-1.5 sm:py-2 border sm:border-2 border-black dark:border-white/30 font-black uppercase text-[10px] sm:text-xs tracking-tight sm:tracking-wide transition-all cursor-pointer ${
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
        className="no-print mt-3 sm:mt-4 w-full py-2.5 sm:py-3 bg-white dark:bg-[#1e1e1e] dark:text-white border-2 sm:border-4 border-dashed border-black/30 dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-yellow-50 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
      >
        <Plus size={15} /> Tambah Murid
      </button>
    </div>
  );
}

/* ──────────────────────────── Riwayat View ──────────────────────────── */

interface RiwayatAbsensiViewProps {
  sessions: SesiAbsensiRow[];
  loading: boolean;
  query: string;
  setQuery: (q: string) => void;
  onRefresh: () => void;
  onSelectDetail: (s: SesiAbsensiRow) => void;
  onDownloadExcel: (s: SesiAbsensiRow) => void;
  onShareWhatsApp: (s: SesiAbsensiRow) => void;
  onDelete: (id: string, judul: string) => void;
  onNewAttendance: () => void;
}

function RiwayatAbsensiView({
  sessions,
  loading,
  query,
  setQuery,
  onRefresh,
  onSelectDetail,
  onDownloadExcel,
  onShareWhatsApp,
  onDelete,
  onNewAttendance,
}: RiwayatAbsensiViewProps) {
  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter(
      (s) =>
        s.judul?.toLowerCase().includes(q) ||
        s.tanggal?.toLowerCase().includes(q)
    );
  }, [sessions, query]);

  const { totalSesi, totalHadir, totalMuridSemua } = useMemo(() => {
    let tHadir = 0;
    let tSemua = 0;
    sessions.forEach((s) => {
      tHadir += s.jumlah_hadir || 0;
      tSemua += s.total_murid || s.data?.length || 0;
    });
    return {
      totalSesi: sessions.length,
      totalHadir: tHadir,
      totalMuridSemua: tSemua,
    };
  }, [sessions]);

  const avgKehadiran = totalMuridSemua > 0 ? ((totalHadir / totalMuridSemua) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Top Bar: Search & Stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kelas, agenda, atau tanggal..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 text-xs sm:text-sm font-bold dark:text-white focus:outline-none focus:shadow-[2px_2px_0px_0px_#000]"
          />
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 bg-white dark:bg-[#2a2a2a] text-black dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Sesi</span>
          <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">{totalSesi} Sesi</div>
        </div>
        <div className="p-3 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Catatan</span>
          <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">{totalMuridSemua} Siswa</div>
        </div>
        <div className="p-3 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Rata Kehadiran</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{avgKehadiran}%</div>
        </div>
      </div>

      {/* Session Cards List */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Memuat riwayat kehadiran...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1e1e1e] border-3 sm:border-4 border-dashed border-black/30 dark:border-white/30 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-zinc-800 border-2 border-black dark:border-white flex items-center justify-center">
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="font-black text-base sm:text-lg uppercase tracking-tight text-black dark:text-white">
            {sessions.length === 0 ? "Belum Ada Riwayat Presensi" : "Tidak Ditemukan"}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {sessions.length === 0
              ? "Catat kehadiran kelas Anda hari ini untuk mulai menyimpan riwayat presensi yang aman di database."
              : `Tidak ada sesi absensi yang cocok dengan kata kunci "${query}".`}
          </p>
          {sessions.length === 0 && (
            <button
              onClick={onNewAttendance}
              className="mt-3 px-4 py-2 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_0px_#000] active:translate-y-0.5 cursor-pointer"
            >
              Mulai Catat Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
            const total = s.total_murid || s.data?.length || 0;
            const persentase = total > 0 ? ((s.jumlah_hadir / total) * 100).toFixed(0) : "0";
            const dateFormatted = new Date(s.tanggal).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-3 border-black dark:border-white/20 p-4 sm:p-5 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col gap-3.5"
              >
                {/* Header Sesi */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-base sm:text-lg uppercase tracking-tight text-black dark:text-white">
                      {s.judul || "Absensi Kelas"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <CalendarDays size={13} />
                      <span>{dateFormatted}</span>
                      <span>•</span>
                      <span className="font-bold text-black dark:text-white">{total} Siswa</span>
                    </div>
                  </div>

                  <div className="px-2.5 py-1 bg-emerald-400 text-black border-2 border-black text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_#000]">
                    {persentase}% Hadir
                  </div>
                </div>

                {/* Rekap Status Badges */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center py-2 border-y-2 border-black/10 dark:border-white/10">
                  <div className="p-1 bg-lime-100 dark:bg-lime-950/40 border border-lime-600">
                    <span className="text-[9px] font-black text-lime-800 dark:text-lime-300 uppercase block">Hadir</span>
                    <span className="text-xs sm:text-sm font-black text-lime-900 dark:text-lime-200">{s.jumlah_hadir || 0}</span>
                  </div>
                  <div className="p-1 bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-600">
                    <span className="text-[9px] font-black text-cyan-800 dark:text-cyan-300 uppercase block">Izin</span>
                    <span className="text-xs sm:text-sm font-black text-cyan-900 dark:text-cyan-200">{s.jumlah_izin || 0}</span>
                  </div>
                  <div className="p-1 bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-600">
                    <span className="text-[9px] font-black text-yellow-800 dark:text-yellow-300 uppercase block">Sakit</span>
                    <span className="text-xs sm:text-sm font-black text-yellow-900 dark:text-yellow-200">{s.jumlah_sakit || 0}</span>
                  </div>
                  <div className="p-1 bg-rose-100 dark:bg-rose-950/40 border border-rose-600">
                    <span className="text-[9px] font-black text-rose-800 dark:text-rose-300 uppercase block">Alpa</span>
                    <span className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200">{s.jumlah_alpa || 0}</span>
                  </div>
                  <div className="p-1 bg-orange-100 dark:bg-orange-950/40 border border-orange-600">
                    <span className="text-[9px] font-black text-orange-800 dark:text-orange-300 uppercase block">Terlambat</span>
                    <span className="text-xs sm:text-sm font-black text-orange-900 dark:text-orange-200">{s.jumlah_terlambat || 0}</span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => onSelectDetail(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black font-black uppercase text-[11px] sm:text-xs tracking-wider shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Lihat Detail Murid</span>
                  </button>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => onDownloadExcel(s)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 cursor-pointer"
                      title="Unduh Excel (.xlsx)"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>

                    <button
                      onClick={() => onShareWhatsApp(s)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 cursor-pointer"
                      title="Salin Format WhatsApp"
                    >
                      <Share2 size={14} className="text-emerald-600" />
                      <span className="hidden sm:inline">Salin WA</span>
                    </button>

                    <button
                      onClick={() => onDelete(s.id, s.judul)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white dark:bg-[#252525] text-red-600 dark:text-red-400 border-2 border-red-500 font-bold uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shadow-[2px_2px_0px_0px_#EF4444] active:translate-y-0.5 cursor-pointer"
                      title="Hapus Sesi Absensi"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────── Detail Sesi Modal ──────────────────────────── */

interface DetailSesiModalProps {
  session: SesiAbsensiRow;
  onClose: () => void;
  onDownloadExcel: () => void;
  onShareWhatsApp: () => void;
}

function DetailSesiModal({
  session,
  onClose,
  onDownloadExcel,
  onShareWhatsApp,
}: DetailSesiModalProps) {
  const students = session.data || [];
  const total = session.total_murid || students.length;
  const persentase = total > 0 ? ((session.jumlah_hadir / total) * 100).toFixed(1) : "0";
  const dateFormatted = new Date(session.tanggal).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a1a1a] border-3 sm:border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_#000] sm:shadow-[10px_10px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-3 sm:border-b-4 border-black dark:border-white bg-yellow-300 dark:bg-yellow-400">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 bg-black text-white">
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-black truncate max-w-xs sm:max-w-md">
                {session.judul}
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-black/70">
                {dateFormatted} • {total} Murid • {persentase}% Hadir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white border-2 border-black text-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body: Table of Students */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Ringkasan Status */}
          <div className="grid grid-cols-5 gap-1.5 text-center py-2 bg-gray-50 dark:bg-[#222] border-2 border-black dark:border-white/30 p-2">
            <div className="p-1 bg-lime-100 dark:bg-lime-950/40 border border-lime-600">
              <span className="text-[9px] font-black text-lime-800 dark:text-lime-300 uppercase block">Hadir</span>
              <span className="text-xs font-black text-lime-900 dark:text-lime-200">{session.jumlah_hadir || 0}</span>
            </div>
            <div className="p-1 bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-600">
              <span className="text-[9px] font-black text-cyan-800 dark:text-cyan-300 uppercase block">Izin</span>
              <span className="text-xs font-black text-cyan-900 dark:text-cyan-200">{session.jumlah_izin || 0}</span>
            </div>
            <div className="p-1 bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-600">
              <span className="text-[9px] font-black text-yellow-800 dark:text-yellow-300 uppercase block">Sakit</span>
              <span className="text-xs font-black text-yellow-900 dark:text-yellow-200">{session.jumlah_sakit || 0}</span>
            </div>
            <div className="p-1 bg-rose-100 dark:bg-rose-950/40 border border-rose-600">
              <span className="text-[9px] font-black text-rose-800 dark:text-rose-300 uppercase block">Alpa</span>
              <span className="text-xs font-black text-rose-900 dark:text-rose-200">{session.jumlah_alpa || 0}</span>
            </div>
            <div className="p-1 bg-orange-100 dark:bg-orange-950/40 border border-orange-600">
              <span className="text-[9px] font-black text-orange-800 dark:text-orange-300 uppercase block">Terlambat</span>
              <span className="text-xs font-black text-orange-900 dark:text-orange-200">{session.jumlah_terlambat || 0}</span>
            </div>
          </div>

          {/* Student Table */}
          <div className="border-2 border-black dark:border-white/30 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black">
                  <th className="p-2 w-10 text-center font-black">#</th>
                  <th className="p-2 w-12 text-center font-black">Absen</th>
                  <th className="p-2 font-black">Nama Siswa</th>
                  <th className="p-2 w-24 text-center font-black">Status</th>
                  <th className="p-2 font-black">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y border-black/10 dark:divide-white/10 dark:text-gray-200">
                {students.map((m, idx) => {
                  const statusKey = (m.status || "hadir") as Status;
                  const meta = STATUS_META[statusKey] || STATUS_META.hadir;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#252525]">
                      <td className="p-2 text-center font-bold text-gray-500">{idx + 1}</td>
                      <td className="p-2 text-center font-black">{m.nomor_absen || idx + 1}</td>
                      <td className="p-2 font-bold">{m.nama}</td>
                      <td className="p-2 text-center">
                        <span className={`inline-block px-2 py-0.5 border border-black font-black uppercase text-[10px] text-black ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-2 text-gray-500 italic text-[11px]">{m.keterangan || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t-3 sm:border-t-4 border-black dark:border-white bg-gray-100 dark:bg-[#222] flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-[#333] border-2 border-black dark:border-white text-xs font-bold uppercase tracking-wider text-black dark:text-white hover:bg-gray-100 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShareWhatsApp}
              className="px-3.5 py-2 bg-white dark:bg-[#252525] border-2 border-black dark:border-white text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <Share2 size={13} className="text-emerald-600" />
              <span>Salin WA</span>
            </button>

            <button
              type="button"
              onClick={onDownloadExcel}
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Unduh Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
