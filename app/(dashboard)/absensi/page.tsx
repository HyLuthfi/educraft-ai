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
  Download,
  ArrowRight,
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
  user_id: string;
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

// ── Palet Monokrom Neobrutalisme Murni (Zero Pastel / AI Rainbow) ──
export const STATUS_META: Record<Status, { label: string; short: string; badge: string; card: string; activeStyle: string }> = {
  hadir: {
    label: "Hadir",
    short: "H",
    badge: "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white",
    card: "bg-white dark:bg-[#181818]",
    activeStyle: "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000]",
  },
  izin: {
    label: "Izin",
    short: "I",
    badge: "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black border-black dark:border-white",
    card: "bg-white dark:bg-[#181818]",
    activeStyle: "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000]",
  },
  sakit: {
    label: "Sakit",
    short: "S",
    badge: "bg-neutral-700 text-white dark:bg-neutral-300 dark:text-black border-black dark:border-white",
    card: "bg-white dark:bg-[#181818]",
    activeStyle: "bg-neutral-700 text-white dark:bg-neutral-300 dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000]",
  },
  alpa: {
    label: "Alpa",
    short: "A",
    badge: "bg-neutral-600 text-white dark:bg-neutral-400 dark:text-black border-black dark:border-white",
    card: "bg-white dark:bg-[#181818]",
    activeStyle: "bg-neutral-600 text-white dark:bg-neutral-400 dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000]",
  },
  terlambat: {
    label: "Terlambat",
    short: "T",
    badge: "bg-neutral-500 text-white dark:bg-neutral-500 dark:text-white border-black dark:border-white",
    card: "bg-white dark:bg-[#181818]",
    activeStyle: "bg-neutral-500 text-white dark:bg-neutral-500 dark:text-white border-black dark:border-white shadow-[2px_2px_0px_#000]",
  },
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

  // Modal Download Hub State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState<{
    judul: string;
    tanggal: string;
    muridList: Murid[];
    rekap: Record<Status, number>;
  } | null>(null);

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
      setRiwayatList(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat riwayat: " + (err.message || "Error"));
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
    const newItems: AttachedFile[] = files.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      kind,
    }));
    setAttachedFiles((prev) => [...prev, ...newItems]);
    if (e.target) e.target.value = "";
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

  // ── Ekspor Excel ──
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

  // ── Ekspor DOCX Resmi ──
  const handleExportAbsensiDocx = async (target?: {
    judul: string;
    tanggal: string;
    muridList: Murid[];
    rekap: Record<Status, number>;
  }) => {
    const currentMurid = target ? target.muridList : murid.filter((m) => m.nama.trim());
    const currentJudul = target ? target.judul : (judul || "Presensi Kehadiran Kelas");
    const currentTanggal = target ? target.tanggal : tanggal;
    const currentRekap = target ? target.rekap : rekap;

    if (currentMurid.length === 0) {
      toast.error("Belum ada data murid untuk diekspor.");
      return;
    }

    const toastId = toast.loading("Menyiapkan dokumen Word presensi resmi...");
    try {
      const res = await fetch("/api/export/absensi-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: {
            judul: currentJudul,
            tanggal: currentTanggal,
            nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          },
          absensi: {
            rekap: currentRekap,
            murid: currentMurid,
          },
        }),
      });
      if (!res.ok) throw new Error("Gagal membuat dokumen Word");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Presensi_${currentJudul.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Dokumen Word presensi berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengunduh dokumen Word: " + (err.message || "Error"), { id: toastId });
    }
  };

  // ── Ekspor PDF Resmi ──
  const handleExportAbsensiPdf = async (target?: {
    judul: string;
    tanggal: string;
    muridList: Murid[];
    rekap: Record<Status, number>;
  }) => {
    const currentMurid = target ? target.muridList : murid.filter((m) => m.nama.trim());
    const currentJudul = target ? target.judul : (judul || "Presensi Kehadiran Kelas");
    const currentTanggal = target ? target.tanggal : tanggal;
    const currentRekap = target ? target.rekap : rekap;

    if (currentMurid.length === 0) {
      toast.error("Belum ada data murid untuk diekspor.");
      return;
    }

    const toastId = toast.loading("Menyiapkan dokumen PDF presensi resmi...");
    try {
      const res = await fetch("/api/export/absensi-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: {
            judul: currentJudul,
            tanggal: currentTanggal,
            nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          },
          absensi: {
            rekap: currentRekap,
            murid: currentMurid,
          },
        }),
      });
      if (!res.ok) throw new Error("Gagal membuat dokumen PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Presensi_${currentJudul.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Dokumen PDF presensi berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengunduh dokumen PDF: " + (err.message || "Error"), { id: toastId });
    }
  };

  // ── Salin Format WhatsApp Langsung ──
  const handleShareResultWhatsApp = () => {
    const valid = murid.filter((m) => m.nama.trim());
    if (valid.length === 0) {
      toast.error("Belum ada data murid untuk disalin.");
      return;
    }
    const dateFormatted = new Date(tanggal).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const total = valid.length;
    const persentase = total > 0 ? ((rekap.hadir / total) * 100).toFixed(1) : "0";

    let text = `*LAPORAN PRESENSI KEHADIRAN SISWA*\n`;
    text += `*Agenda / Kelas:* ${judul || "Presensi Kelas"}\n`;
    text += `*Hari / Tanggal:* ${dateFormatted}\n\n`;
    text += `*RINGKASAN KEHADIRAN:*\n`;
    text += `• Total Murid: ${total}\n`;
    text += `• Hadir: ${rekap.hadir} (${persentase}%)\n`;
    text += `• Izin: ${rekap.izin}\n`;
    text += `• Sakit: ${rekap.sakit}\n`;
    text += `• Alpa: ${rekap.alpa}\n`;
    text += `• Terlambat: ${rekap.terlambat}\n\n`;

    const absentees = valid.filter((m) => m.status && m.status !== "hadir");
    if (absentees.length > 0) {
      text += `*RINCIAN SISWA TIDAK HADIR / TERLAMBAT:*\n`;
      absentees.forEach((m, i) => {
        const meta = STATUS_META[m.status] || STATUS_META.alpa;
        text += `${i + 1}. [${meta.short}] ${m.nama}${m.keterangan ? ` - ${m.keterangan}` : ""}\n`;
      });
      text += `\n`;
    }

    text += `_Dibuat otomatis via EduCraft AI (saitech.co.id)_`;

    navigator.clipboard.writeText(text);
    toast.success("Format WhatsApp berhasil disalin ke clipboard!");
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
        const meta = STATUS_META[m.status] || STATUS_META.alpa;
        text += `${i + 1}. [${meta.short}] ${m.nama}${m.keterangan ? ` - ${m.keterangan}` : ""}\n`;
      });
      text += `\n`;
    }

    text += `_Dibuat otomatis via EduCraft AI (saitech.co.id)_`;

    navigator.clipboard.writeText(text);
    toast.success("Format WhatsApp berhasil disalin ke clipboard!");
  };

  const handleDownloadSessionExcel = (session: SesiAbsensiRow) => {
    const rekapSession: Record<Status, number> = {
      hadir: session.jumlah_hadir || 0,
      izin: session.jumlah_izin || 0,
      sakit: session.jumlah_sakit || 0,
      alpa: session.jumlah_alpa || 0,
      terlambat: session.jumlah_terlambat || 0,
    };

    downloadAbsensiExcel({
      judul: session.judul || "Absensi",
      tanggal: session.tanggal,
      muridList: session.data || [],
      rekap: rekapSession,
    });
    toast.success("File Excel berhasil diunduh!");
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#121212] p-3 sm:p-6 md:p-10 pb-24 font-sans text-black dark:text-white">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Title & Breadcrumb (1:1 Kiblat Buat Soal) */}
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] uppercase font-bold tracking-widest w-fit shadow-[2px_2px_0px_#000]">
            <ClipboardCheck size={12} /> Modul Presensi Kelas
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-editorial tracking-tight text-black dark:text-white mt-1">
            Absensi Murid
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-sans max-w-xl">
            Catat presensi harian, ekstrak dokumen fisik via AI, dan kelola arsip kehadiran kelas.
          </p>
        </div>

        {/* ── Kontainer Neobrutalisme Utama (Unified Master Container) ── */}
        <div className="relative border-2 border-black dark:border-white/30 bg-white dark:bg-[#1e1e1e] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* 4 Corner Ornaments */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

          {/* Top Segmented Navigation Tabs */}
          <div className="flex border-2 border-black dark:border-white/30 bg-neutral-100 dark:bg-[#252525] p-1 shadow-[3px_3px_0px_#000] self-start sm:self-auto shrink-0 w-fit">
            <button
              type="button"
              onClick={() => setMainTab("catat")}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mainTab === "catat"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_#000]"
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
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_#000]"
                  : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Riwayat Tersimpan ({riwayatList.length})
            </button>
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
                  onOpenDownloadModal={() => {
                    setDownloadTarget(null);
                    setIsDownloadModalOpen(true);
                  }}
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
              onOpenDownloadModal={(s) => {
                setDownloadTarget({
                  judul: s.judul || "Absensi",
                  tanggal: s.tanggal,
                  muridList: s.data || [],
                  rekap: {
                    hadir: s.jumlah_hadir || 0,
                    izin: s.jumlah_izin || 0,
                    sakit: s.jumlah_sakit || 0,
                    alpa: s.jumlah_alpa || 0,
                    terlambat: s.jumlah_terlambat || 0,
                  },
                });
                setIsDownloadModalOpen(true);
              }}
              onShareWhatsApp={handleShareWhatsApp}
              onDelete={handleDeleteSession}
              onNewAttendance={() => setMainTab("catat")}
            />
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-3 sm:gap-4 max-w-xs text-center">
              <div className="w-10 h-10 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider dark:text-white">
                {loadingLabel || "Memproses..."}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  Unduh Laporan Presensi
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsDownloadModalOpen(false);
                  setDownloadTarget(null);
                }}
                className="p-1 border border-black dark:border-white/30 bg-white dark:bg-[#252525] text-black dark:text-white hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 font-sans">
              Pilih format berkas laporan presensi kelas yang ingin diunduh atau dibagikan:
            </p>

            {/* Pilihan Ekspor */}
            <div className="space-y-2.5">
              {/* PDF */}
              <button
                onClick={() => {
                  handleExportAbsensiPdf(downloadTarget || undefined);
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
                      Format resmi presensi kelas siap cetak
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>

              {/* Word */}
              <button
                onClick={() => {
                  handleExportAbsensiDocx(downloadTarget || undefined);
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
                      Dokumen presensi resmi dapat diedit di Word / Docs
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>

              {/* Excel */}
              <button
                onClick={() => {
                  if (downloadTarget) {
                    downloadAbsensiExcel({
                      judul: downloadTarget.judul || "Absensi",
                      tanggal: downloadTarget.tanggal,
                      muridList: downloadTarget.muridList,
                      rekap: downloadTarget.rekap,
                    });
                  } else {
                    handleExportResultExcel();
                  }
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
                      Rekap kehadiran matriks lengkap & statistik
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>

              {/* Salin WA */}
              <button
                onClick={() => {
                  if (downloadTarget) {
                    handleShareWhatsApp({
                      id: "temp",
                      user_id: "",
                      judul: downloadTarget.judul,
                      tanggal: downloadTarget.tanggal,
                      total_murid: downloadTarget.muridList.length,
                      jumlah_hadir: downloadTarget.rekap.hadir,
                      jumlah_izin: downloadTarget.rekap.izin,
                      jumlah_sakit: downloadTarget.rekap.sakit,
                      jumlah_alpa: downloadTarget.rekap.alpa,
                      jumlah_terlambat: downloadTarget.rekap.terlambat,
                      data: downloadTarget.muridList,
                      created_at: new Date().toISOString(),
                    });
                  } else {
                    handleShareResultWhatsApp();
                  }
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
                      Salin Pesan WhatsApp
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Format teks rapi untuk laporan grup sekolah / wali murid
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Sesi Terpilih */}
      {selectedSessionDetail && (
        <DetailSesiModal
          session={selectedSessionDetail}
          onClose={() => setSelectedSessionDetail(null)}
          onOpenDownloadModal={() => {
            setDownloadTarget({
              judul: selectedSessionDetail.judul || "Absensi",
              tanggal: selectedSessionDetail.tanggal,
              muridList: selectedSessionDetail.data || [],
              rekap: {
                hadir: selectedSessionDetail.jumlah_hadir || 0,
                izin: selectedSessionDetail.jumlah_izin || 0,
                sakit: selectedSessionDetail.jumlah_sakit || 0,
                alpa: selectedSessionDetail.jumlah_alpa || 0,
                terlambat: selectedSessionDetail.jumlah_terlambat || 0,
              },
            });
            setIsDownloadModalOpen(true);
          }}
          onShareWhatsApp={() => handleShareWhatsApp(selectedSessionDetail)}
        />
      )}
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
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-black dark:border-white/30 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest mb-2 shadow-[2px_2px_0px_#000]">
          <Sparkles size={12} /> Langkah 1 dari 2 — Masukkan Daftar Nama
        </div>
        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
          Masukkan daftar nama murid dulu — ketik langsung, atau lampirkan <b>foto / berkas</b>. AI membaca
          namanya secara otomatis, lalu status kehadiran diisi di langkah berikutnya.
        </p>
      </div>

      {/* Judul / Agenda */}
      <div className="border-2 border-black dark:border-white/20 p-3.5 sm:p-5 bg-neutral-50 dark:bg-[#252525] shadow-[3px_3px_0px_0px_#000]">
        <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
          <FileText size={13} /> Judul / Agenda Kegiatan
        </label>
        <input
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Matematika Wajib X MIPA 1 — Pertemuan 4"
          className="w-full text-sm sm:text-base font-bold dark:text-white bg-transparent border-b-2 border-black/20 dark:border-white/20 py-1 sm:py-1.5 px-0.5 focus:outline-none focus:border-black dark:focus:border-white"
        />
      </div>

      {/* Input Box */}
      <div className="border-2 border-black dark:border-white/20 p-3.5 sm:p-6 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_0px_#000]">
        {/* Method Switcher */}
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
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_#000]"
                    : "bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-[#333]"
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
            className="w-full h-36 sm:h-56 p-3 sm:p-4 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] dark:text-white font-mono text-xs sm:text-sm resize-none focus:outline-none focus:border-black dark:focus:border-white shadow-inner"
          />
        )}

        {inputMethod === "file" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-36 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-neutral-100 dark:hover:bg-[#303030] transition-colors p-4 cursor-pointer"
          >
            <UploadCloud size={32} className="sm:w-10 sm:h-10 text-black dark:text-white" />
            <span className="font-bold uppercase tracking-wide text-xs sm:text-sm dark:text-white">Pilih File</span>
            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center">
              PDF, DOCX, XLSX, PPTX — nama murid dibaca otomatis oleh AI
            </span>
          </button>
        )}

        {inputMethod === "image" && (
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full h-36 sm:h-56 border-2 border-dashed border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-neutral-100 dark:hover:bg-[#303030] transition-colors p-4 cursor-pointer"
          >
            <ImageIcon size={32} className="sm:w-10 sm:h-10 text-black dark:text-white" />
            <span className="font-bold uppercase tracking-wide text-xs sm:text-sm dark:text-white">Pilih Foto</span>
            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center">
              Foto daftar presensi / tulisan tangan — AI membaca langsung
            </span>
          </button>
        )}

        <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv" className="hidden" onChange={(e) => handleFilePicked(e, "file")} />
        <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFilePicked(e, "image")} />

        {/* Attached Chips */}
        {attachedFiles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
            {attachedFiles.map((af) => (
              <div key={af.id} className="flex items-center gap-1.5 bg-black text-white dark:bg-white dark:text-black pl-2.5 pr-1.5 py-1 text-xs font-bold border border-black dark:border-white shadow-[2px_2px_0px_#000]">
                {af.kind === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                <span className="max-w-[120px] sm:max-w-[140px] truncate">{af.file.name}</span>
                <button onClick={() => removeFile(af.id)} className="hover:opacity-75 transition-opacity cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <button
            onClick={handleExtract}
            className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold uppercase text-xs sm:text-sm tracking-wider shadow-[3px_3px_0px_#000] hover:bg-neutral-800 dark:hover:bg-neutral-200 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Sparkles size={16} />
            Ekstrak Nama via AI
          </button>
          {inputMethod === "text" && rawMurid.trim() && (
            <button
              onClick={handleManual}
              className="flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 sm:px-6 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white font-bold uppercase text-xs sm:text-sm tracking-wider shadow-[3px_3px_0px_#000] hover:bg-neutral-100 dark:hover:bg-[#303030] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
            >
              Lewati AI (Manual)
            </button>
          )}
        </div>
      </div>
    </div>
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
  onOpenDownloadModal: () => void;
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
  onOpenDownloadModal,
  isSaving,
  isSaved,
  scanInputRef,
  handleScanPicked,
}: ResultViewProps) {
  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white dark:bg-[#252525] dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
        >
          <ArrowLeft size={14} /> Ganti Daftar Murid
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDownloadModal}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Download size={14} /> Unduh Presensi
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold uppercase text-xs sm:text-sm tracking-wide shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaved ? <Check size={14} /> : <Save size={14} />}
            {isSaved ? "Tersimpan" : isSaving ? "Menyimpan..." : "Simpan Sesi"}
          </button>
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest shadow-[2px_2px_0px_#000]">
        <ClipboardCheck size={13} /> Langkah 2 dari 2 — Isi Kehadiran Murid
      </div>

      {/* Header: Judul & Tanggal */}
      <div className="border-2 border-black dark:border-white/20 p-4 sm:p-5 bg-neutral-50 dark:bg-[#252525] shadow-[4px_4px_0px_0px_#000] flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[220px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 block">
            Judul / Agenda Kelas
          </label>
          <input
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Judul / Agenda Kelas..."
            className="w-full text-lg sm:text-xl font-bold dark:text-white bg-transparent border-b-2 border-black/20 dark:border-white/20 py-0.5 focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>
        <div className="inline-flex items-center gap-2 border-2 border-black dark:border-white/30 bg-white dark:bg-[#1a1a1a] px-3 py-1.5 shadow-[2px_2px_0px_#000]">
          <CalendarDays size={14} className="text-black dark:text-white" />
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="bg-transparent dark:text-white font-bold text-xs sm:text-sm focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Banner Scan Kertas via AI (Monokrom Neobrutal) */}
      <div className="border-2 border-black dark:border-white/30 bg-neutral-100 dark:bg-[#252525] p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-black dark:text-white">
          <ScanLine size={16} className="mt-0.5 shrink-0 text-black dark:text-white" />
          <span>Punya <b>foto / lembar kertas absensi fisik</b>? AI dapat membaca centang paraf secara otomatis.</span>
        </div>
        <button
          onClick={() => scanInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold uppercase text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          <ScanLine size={14} /> Unggah Foto Kertas
        </button>
        <input ref={scanInputRef} type="file" multiple accept="image/*,.pdf,.docx,.xlsx" className="hidden" onChange={handleScanPicked} />
      </div>

      {catatanAi && (
        <div className="flex items-start gap-2 border-2 border-black dark:border-white/30 bg-neutral-50 dark:bg-[#252525] p-3 text-xs sm:text-sm font-medium text-black dark:text-white shadow-[3px_3px_0px_0px_#000]">
          <Info size={15} className="mt-0.5 shrink-0 text-gray-500" />
          <span><b>Catatan AI:</b> {catatanAi}</span>
        </div>
      )}

      {/* Rekap 6 Kolom Monokrom Murni (Klik kartu = set semua ke status itu) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        <div className="border-2 border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black p-2.5 sm:p-3 text-center shadow-[3px_3px_0px_#000]">
          <div className="text-xl sm:text-2xl font-black font-sans">{murid.length}</div>
          <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Total</div>
        </div>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setAll(s)}
            className="border-2 border-black dark:border-white/30 p-2.5 sm:p-3 text-center bg-white dark:bg-[#252525] hover:bg-neutral-100 dark:hover:bg-[#303030] shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer group"
            title={`Set semua siswa ke ${STATUS_META[s].label}`}
          >
            <div className="text-xl sm:text-2xl font-black font-sans text-black dark:text-white group-hover:scale-105 transition-transform">
              {rekap[s]}
            </div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {STATUS_META[s].label}
            </div>
          </button>
        ))}
      </div>

      {/* Daftar Murid Card */}
      <div className="space-y-2.5 sm:space-y-3">
        {murid.map((m, idx) => (
          <div
            key={idx}
            className="border-2 border-black dark:border-white/30 p-3 sm:p-4 bg-white dark:bg-[#1e1e1e] shadow-[3px_3px_0px_#000] transition-colors"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                value={m.nomor_absen}
                onChange={(e) => updateMurid(idx, { nomor_absen: e.target.value })}
                className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 text-center font-black text-xs sm:text-sm bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white border-2 border-black dark:border-white/30 focus:outline-none"
                title="Nomor absen"
              />
              <input
                value={m.nama}
                onChange={(e) => updateMurid(idx, { nama: e.target.value })}
                placeholder="Nama peserta didik..."
                className="flex-1 min-w-0 text-sm sm:text-base font-bold dark:text-white bg-transparent border-b border-black/20 dark:border-white/20 py-0.5 sm:py-1 px-1 focus:outline-none focus:border-black dark:focus:border-white"
              />
              <button
                onClick={() => removeMurid(idx)}
                className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center border border-black/20 dark:border-white/20 text-gray-400 hover:text-white hover:bg-black dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                title="Hapus murid"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Status Toggle (Pil Monokrom Neobrutal Taktil) */}
            <div className="mt-2.5 sm:mt-3 grid grid-cols-5 gap-1 sm:gap-2">
              {STATUS_ORDER.map((s) => {
                const active = m.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => updateMurid(idx, { status: s })}
                    className={`py-1.5 sm:py-2 border-2 font-bold uppercase text-[10px] sm:text-xs tracking-tight transition-all cursor-pointer ${
                      active
                        ? STATUS_META[s].activeStyle
                        : "bg-white dark:bg-[#252525] text-gray-500 dark:text-gray-400 border-black/30 dark:border-white/20 hover:border-black dark:hover:border-white"
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
              placeholder="Catatan / keterangan (opsional)..."
              className="mt-2 sm:mt-2.5 w-full text-xs sm:text-sm dark:text-white bg-neutral-50 dark:bg-[#252525] border border-black/20 dark:border-white/20 px-2.5 sm:px-3 py-1.5 focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>
        ))}
      </div>

      <button
        onClick={addMurid}
        className="w-full py-2.5 sm:py-3 bg-neutral-50 dark:bg-[#252525] dark:text-white border-2 border-dashed border-black dark:border-white/30 font-bold uppercase text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#303030] transition-colors cursor-pointer"
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
  onOpenDownloadModal: (s: SesiAbsensiRow) => void;
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
  onOpenDownloadModal,
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
      {/* Top Bar: Search & Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kelas, agenda, atau tanggal..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/30 text-xs sm:text-sm font-bold dark:text-white focus:outline-none shadow-[2px_2px_0px_#000]"
          />
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* KPI Stats Bar Monokrom */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[3px_3px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Sesi</span>
          <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">{totalSesi} Sesi</div>
        </div>
        <div className="p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[3px_3px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Catatan</span>
          <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">{totalMuridSemua} Siswa</div>
        </div>
        <div className="p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[3px_3px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Rata Kehadiran</span>
          <div className="text-xl sm:text-2xl font-black text-black dark:text-white mt-0.5">{avgKehadiran}%</div>
        </div>
      </div>

      {/* Session Cards List */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Memuat riwayat kehadiran...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1e1e1e] border-2 border-dashed border-black/30 dark:border-white/30 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-white flex items-center justify-center">
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
              className="mt-3 px-4 py-2 bg-black text-white dark:bg-white dark:text-black border-2 border-black font-bold uppercase text-xs tracking-wider shadow-[3px_3px_0px_#000] active:translate-y-0.5 cursor-pointer"
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
                className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/30 p-4 sm:p-5 shadow-[4px_4px_0px_#000] flex flex-col gap-3.5"
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

                  <div className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black border border-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
                    {persentase}% Hadir
                  </div>
                </div>

                {/* Rekap Status Badges (Monokrom Murni) */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center py-2 border-y-2 border-black/10 dark:border-white/10">
                  <div className="p-1 border border-black/20 dark:border-white/20 bg-neutral-50 dark:bg-neutral-900">
                    <span className="text-[9px] font-black text-gray-500 uppercase block">Hadir</span>
                    <span className="text-xs sm:text-sm font-black text-black dark:text-white">{s.jumlah_hadir || 0}</span>
                  </div>
                  <div className="p-1 border border-black/20 dark:border-white/20 bg-neutral-50 dark:bg-neutral-900">
                    <span className="text-[9px] font-black text-gray-500 uppercase block">Izin</span>
                    <span className="text-xs sm:text-sm font-black text-black dark:text-white">{s.jumlah_izin || 0}</span>
                  </div>
                  <div className="p-1 border border-black/20 dark:border-white/20 bg-neutral-50 dark:bg-neutral-900">
                    <span className="text-[9px] font-black text-gray-500 uppercase block">Sakit</span>
                    <span className="text-xs sm:text-sm font-black text-black dark:text-white">{s.jumlah_sakit || 0}</span>
                  </div>
                  <div className="p-1 border border-black/20 dark:border-white/20 bg-neutral-50 dark:bg-neutral-900">
                    <span className="text-[9px] font-black text-gray-500 uppercase block">Alpa</span>
                    <span className="text-xs sm:text-sm font-black text-black dark:text-white">{s.jumlah_alpa || 0}</span>
                  </div>
                  <div className="p-1 border border-black/20 dark:border-white/20 bg-neutral-50 dark:bg-neutral-900">
                    <span className="text-[9px] font-black text-gray-500 uppercase block">Terlambat</span>
                    <span className="text-xs sm:text-sm font-black text-black dark:text-white">{s.jumlah_terlambat || 0}</span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => onSelectDetail(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black font-bold uppercase text-[11px] sm:text-xs tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Lihat Detail Murid</span>
                  </button>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => onOpenDownloadModal(s)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-[#333] transition-colors shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                      title="Unduh Laporan Presensi"
                    >
                      <Download size={14} className="text-black dark:text-white" />
                      <span className="hidden sm:inline">Unduh</span>
                    </button>

                    <button
                      onClick={() => onShareWhatsApp(s)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-[#333] transition-colors shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                      title="Salin Format WhatsApp"
                    >
                      <Share2 size={14} className="text-black dark:text-white" />
                      <span className="hidden sm:inline">Salin WA</span>
                    </button>

                    <button
                      onClick={() => onDelete(s.id, s.judul)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white hover:text-red-600 border-2 border-black dark:border-white/20 font-bold uppercase text-[11px] sm:text-xs tracking-wider flex items-center gap-1 hover:border-red-600 transition-colors shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
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
  onOpenDownloadModal: () => void;
  onShareWhatsApp: () => void;
}

function DetailSesiModal({
  session,
  onClose,
  onOpenDownloadModal,
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
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a1a1a] border-2 border-black dark:border-white shadow-[8px_8px_0px_#000] flex flex-col max-h-[90vh] overflow-hidden">
        {/* 4 Corner Ornaments */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

        {/* Header Modal (Monokrom Tegas) */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-2 border-black dark:border-white bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 bg-black text-white dark:bg-white dark:text-black">
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-black dark:text-white truncate max-w-xs sm:max-w-md">
                {session.judul}
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
                {dateFormatted} • {total} Murid • {persentase}% Hadir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white dark:bg-[#333] border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body: Table of Students */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Ringkasan Status Monokrom */}
          <div className="grid grid-cols-5 gap-1.5 text-center py-2 bg-neutral-50 dark:bg-[#222] border-2 border-black dark:border-white/30 p-2">
            <div className="p-1 border border-black/20 dark:border-white/20">
              <span className="text-[9px] font-black text-gray-500 uppercase block">Hadir</span>
              <span className="text-xs font-black text-black dark:text-white">{session.jumlah_hadir || 0}</span>
            </div>
            <div className="p-1 border border-black/20 dark:border-white/20">
              <span className="text-[9px] font-black text-gray-500 uppercase block">Izin</span>
              <span className="text-xs font-black text-black dark:text-white">{session.jumlah_izin || 0}</span>
            </div>
            <div className="p-1 border border-black/20 dark:border-white/20">
              <span className="text-[9px] font-black text-gray-500 uppercase block">Sakit</span>
              <span className="text-xs font-black text-black dark:text-white">{session.jumlah_sakit || 0}</span>
            </div>
            <div className="p-1 border border-black/20 dark:border-white/20">
              <span className="text-[9px] font-black text-gray-500 uppercase block">Alpa</span>
              <span className="text-xs font-black text-black dark:text-white">{session.jumlah_alpa || 0}</span>
            </div>
            <div className="p-1 border border-black/20 dark:border-white/20">
              <span className="text-[9px] font-black text-gray-500 uppercase block">Terlambat</span>
              <span className="text-xs font-black text-black dark:text-white">{session.jumlah_terlambat || 0}</span>
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
              <tbody className="divide-y divide-black/10 dark:divide-white/10 dark:text-gray-200">
                {students.map((m, idx) => {
                  const statusKey = (m.status || "hadir") as Status;
                  const meta = STATUS_META[statusKey] || STATUS_META.hadir;
                  return (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-[#252525]">
                      <td className="p-2 text-center font-bold text-gray-500">{idx + 1}</td>
                      <td className="p-2 text-center font-black">{m.nomor_absen || idx + 1}</td>
                      <td className="p-2 font-bold">{m.nama}</td>
                      <td className="p-2 text-center">
                        <span className={`inline-block px-2 py-0.5 border font-bold uppercase text-[10px] ${meta.badge}`}>
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
        <div className="p-3.5 sm:p-5 border-t-2 border-black dark:border-white bg-neutral-50 dark:bg-[#222] flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-[#333] border-2 border-black dark:border-white text-xs font-bold uppercase tracking-wider text-black dark:text-white hover:bg-neutral-100 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShareWhatsApp}
              className="px-3.5 py-2 bg-white dark:bg-[#252525] border-2 border-black dark:border-white text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <Share2 size={13} className="text-black dark:text-white" />
              <span>Salin WA</span>
            </button>

            <button
              type="button"
              onClick={onOpenDownloadModal}
              className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black border-2 border-black font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <Download size={14} />
              <span>Unduh Berkas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
