"use client";

import { useState, useRef, useEffect } from "react";
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
  Save,
  Pencil,
  FileSpreadsheet,
  Share2,
} from "lucide-react";
import * as XLSX from "xlsx";
import KoreksiCharts from "@/app/components/KoreksiCharts";
import { buatSupabaseClient } from "@/lib/supabase/client";

type InputMethod = "text" | "file" | "image";

type Phase = "idle" | "menunggu" | "ocr" | "koreksi" | "selesai" | "gagal";

type StudentCard = {
  id: string;
  name: string;
  inputMethod: InputMethod;
  textContent: string;
  fileName: string;
  isParsing: boolean;
  imageFile: File | null;   // lazy: foto disimpan, OCR ditunda sampai Mulai Koreksi
  imageName: string;
  phase: Phase;
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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

function MarkdownText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        let cleanLine = line.trim();
        if (!cleanLine) return <div key={idx} className="h-2" />;

        // Header Check (e.g. ## Title)
        const isHeader = cleanLine.startsWith("##");
        if (isHeader) {
          const content = cleanLine.replace(/^##\s*/, "");
          return (
            <h4 key={idx} className="font-black text-base mt-4 mb-2 text-yellow-950 dark:text-yellow-300">
              {parseInlineMarkdown(content)}
            </h4>
          );
        }

        // List item with bullet (e.g. * Item or - Item)
        const isBulletList = cleanLine.startsWith("* ") || cleanLine.startsWith("- ");
        if (isBulletList) {
          const content = cleanLine.replace(/^[\*\-]\s+/, "");
          return (
            <div key={idx} className="flex gap-2 pl-4 py-0.5">
              <span className="text-yellow-600 dark:text-yellow-400 font-black">•</span>
              <span className="flex-1 text-yellow-900 dark:text-yellow-100">{parseInlineMarkdown(content)}</span>
            </div>
          );
        }

        // List item with number (e.g. 1. Item)
        const isNumberedList = /^\d+\.\s+/.test(cleanLine);
        if (isNumberedList) {
          const match = cleanLine.match(/^(\d+)\.\s+(.*)/);
          const num = match ? match[1] : "1";
          const content = match ? match[2] : cleanLine;
          return (
            <div key={idx} className="flex gap-2 pl-4 py-0.5">
              <span className="text-yellow-600 dark:text-yellow-400 font-bold">{num}.</span>
              <span className="flex-1 text-yellow-900 dark:text-yellow-100">{parseInlineMarkdown(content)}</span>
            </div>
          );
        }

        // Normal paragraph line
        return (
          <p key={idx} className="pl-0 text-yellow-900 dark:text-yellow-100">
            {parseInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

function parseInlineMarkdown(text: string) {
  const regex = /\*\*(.*?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-extrabold text-yellow-950 dark:text-yellow-100 brightness-110">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
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
    { id: "s1", name: "", inputMethod: "text", textContent: "", fileName: "", isParsing: false, imageFile: null, imageName: "", phase: "idle" },
  ]);

  // ── Hasil & Loading ──
  const [isKoreksiLoading, setIsKoreksiLoading] = useState(false);
  const [koreksiResult, setKoreksiResult] = useState<ResponseKoreksi | null>(null);
  const [activeStudentDetail, setActiveStudentDetail] = useState<number | null>(null);

  // ── Simpan Sesi ke Supabase ──
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // ── Load State from LocalStorage ──
  useEffect(() => {
    try {
      const savedSoalText = localStorage.getItem("educraft_soalText");
      if (savedSoalText !== null) setSoalText(savedSoalText);

      const savedSoalFileName = localStorage.getItem("educraft_soalFileName");
      if (savedSoalFileName !== null) setSoalFileName(savedSoalFileName);

      const savedScoringConfig = localStorage.getItem("educraft_scoringConfig");
      if (savedScoringConfig !== null) {
        setScoringConfig(JSON.parse(savedScoringConfig));
      }

      const savedStudents = localStorage.getItem("educraft_students");
      if (savedStudents !== null) {
        const parsed = JSON.parse(savedStudents);
        const restored = parsed.map((s: any) => ({
          ...s,
          imageFile: null,
          imageName: "", // Hapus nama file foto karena file aslinya hilang saat refresh
          phase: "idle", // Reset phase ke idle saat refresh
        }));
        setStudents(restored);
      }

      const savedKoreksiResult = localStorage.getItem("educraft_koreksiResult");
      if (savedKoreksiResult !== null) {
        setKoreksiResult(JSON.parse(savedKoreksiResult));
      }
      
      const savedActiveStudentDetail = localStorage.getItem("educraft_activeStudentDetail");
      if (savedActiveStudentDetail !== null) {
        setActiveStudentDetail(JSON.parse(savedActiveStudentDetail));
      }
    } catch (e) {
      console.error("Gagal memuat state dari localStorage:", e);
    }
  }, []);

  // ── Save State to LocalStorage ──
  useEffect(() => {
    try {
      localStorage.setItem("educraft_soalText", soalText);
      localStorage.setItem("educraft_soalFileName", soalFileName);
    } catch (e) {
      console.error(e);
    }
  }, [soalText, soalFileName]);

  useEffect(() => {
    try {
      localStorage.setItem("educraft_scoringConfig", JSON.stringify(scoringConfig));
    } catch (e) {
      console.error(e);
    }
  }, [scoringConfig]);

  useEffect(() => {
    try {
      const serializable = students.map(({ imageFile, ...rest }) => rest);
      localStorage.setItem("educraft_students", JSON.stringify(serializable));
    } catch (e) {
      console.error(e);
    }
  }, [students]);

  useEffect(() => {
    try {
      if (koreksiResult) {
        localStorage.setItem("educraft_koreksiResult", JSON.stringify(koreksiResult));
      } else {
        localStorage.removeItem("educraft_koreksiResult");
      }
    } catch (e) {
      console.error(e);
    }
  }, [koreksiResult]);

  useEffect(() => {
    try {
      if (activeStudentDetail !== null) {
        localStorage.setItem("educraft_activeStudentDetail", JSON.stringify(activeStudentDetail));
      } else {
        localStorage.removeItem("educraft_activeStudentDetail");
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeStudentDetail]);

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
        imageFile: null,
        imageName: "",
        phase: "idle",
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
    updateStudent(studentId, {
      imageFile: file,
      imageName: file.name,
    });
    toast.success("Foto jawaban disimpan. OCR akan diproses saat koreksi dimulai.");
    e.target.value = "";
  };

  // ── AI Correct Operation ──
  const handleKoreksi = async () => {
    const filledStudents = students.filter(
      (s) => s.textContent.trim().length > 0 || (s.inputMethod === "image" && s.imageFile !== null)
    );
    if (filledStudents.length === 0) {
      toast.error("Belum ada jawaban siswa yang diisi.");
      return;
    }

    setIsKoreksiLoading(true);
    // Set all filled students to "menunggu" status
    setStudents((prev) =>
      prev.map((s) =>
        filledStudents.some((fs) => fs.id === s.id) ? { ...s, phase: "menunggu" } : s
      )
    );
    const toastId = toast.loading("AI sedang mempersiapkan koreksi...");

    try {
      // Convert images to base64
      const processedStudents = await Promise.all(
        filledStudents.map(async (s) => {
          let base64: string | null = null;
          let mime: string | null = null;
          if (s.inputMethod === "image" && s.imageFile) {
            base64 = await fileToBase64(s.imageFile);
            mime = s.imageFile.type;
          }
          const originalIndex = students.findIndex((orig) => orig.id === s.id);
          return {
            id: s.id,
            name: s.name.trim() || `Siswa ${originalIndex + 1}`,
            textContent: s.textContent,
            imageBase64: base64,
            imageMime: mime,
          };
        })
      );

      toast.loading("Memulai pemrosesan paralel...", { id: toastId });

      const res = await fetch("/api/koreksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soalText,
          students: processedStudents,
          config: scoringConfig,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Gagal menghubungi server");
      }

      // Fallback untuk backend lama yang mengembalikan JSON utuh (misal belum di-restart)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        const data = await res.json();
        if (data.hasil) {
          const finalResult: ResponseKoreksi = {
            hasil: data.hasil,
            analitik_kelas: data.analitik_kelas || "Analisis selesai.",
          };
          setStudents((prev) => prev.map((s) => ({ ...s, phase: "selesai" })));
          setKoreksiResult(finalResult);
          setActiveStudentDetail(0);
          setIsSaved(false);
          toast.success("Koreksi AI selesai (fallback JSON)!", { id: toastId });
          return;
        }
      }

      if (!res.body) {
        throw new Error("Respons stream kosong dari server");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const results: HasilSiswa[] = [];
      let globalAnalitik = "";

      toast.loading("Menganalisis & mengoreksi (paralel)...", { id: toastId });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            try {
              const payload = JSON.parse(cleanLine.slice(6));
              if (payload.type === "status") {
                setStudents((prev) =>
                  prev.map((s) => (s.id === payload.id ? { ...s, phase: payload.phase } : s))
                );
              } else if (payload.type === "hasil") {
                results.push(payload.data);
              } else if (payload.type === "analitik") {
                globalAnalitik = payload.data;
              }
            } catch (e) {
              console.error("Error parsing SSE line:", e, cleanLine);
            }
          }
        }
      }

      if (results.length === 0) {
        throw new Error("Tidak ada hasil koreksi yang berhasil diproses");
      }

      const finalResult: ResponseKoreksi = {
        hasil: results,
        analitik_kelas: globalAnalitik || "Analisis kelas selesai.",
      };

      setKoreksiResult(finalResult);
      setActiveStudentDetail(0);
      setIsSaved(false);
      toast.success("Koreksi AI selesai!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal melakukan koreksi AI: " + (err.message || "Error tidak diketahui"), { id: toastId });
      // Reset status on error
      setStudents((prev) => prev.map((s) => ({ ...s, phase: "idle" })));
    } finally {
      setIsKoreksiLoading(false);
    }
  };

  const filledCount = students.filter(
    (s) => s.textContent.trim().length > 0 || (s.inputMethod === "image" && s.imageFile !== null)
  ).length;

  // ── Simpan hasil koreksi ke Supabase ──
  const handleSaveSesi = async () => {
    if (!koreksiResult || isSaving || isSaved) return;

    setIsSaving(true);
    const toastId = toast.loading("Menyimpan sesi koreksi...");
    try {
      const supabase = buatSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Anda harus login untuk menyimpan sesi.", { id: toastId });
        setIsSaving(false);
        return;
      }

      // Hitung ringkasan denormalisasi
      const validScores = koreksiResult.hasil
        .map((s) => (typeof s.nilai_akhir === "number" ? s.nilai_akhir : parseFloat(s.nilai_akhir)))
        .filter((score) => !isNaN(score));
      const rataRata =
        validScores.length > 0
          ? validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length
          : null;
      const tuntas = koreksiResult.hasil.filter((s) => s.status_kelulusan === "tuntas").length;
      const tingkatKetuntasan =
        koreksiResult.hasil.length > 0 ? (tuntas / koreksiResult.hasil.length) * 100 : null;

      const defaultTitle = `Sesi Koreksi — ${new Date().toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })}`;

      const { error } = await supabase.from("sesi_koreksi").insert({
        user_id: user.id,
        title: defaultTitle,
        jumlah_siswa: koreksiResult.hasil.length,
        rata_rata: rataRata,
        tingkat_ketuntasan: tingkatKetuntasan,
        skala: scoringConfig.skala,
        kkm: scoringConfig.kkm,
        hasil: koreksiResult,
        config: scoringConfig,
      });

      if (error) throw error;

      setIsSaved(true);
      toast.success("Sesi koreksi berhasil disimpan!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menyimpan sesi: " + (err.message || "Error tidak diketahui"), {
        id: toastId,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportKoreksiExcel = () => {
    if (!koreksiResult || !koreksiResult.hasil || koreksiResult.hasil.length === 0) {
      toast.error("Belum ada data hasil koreksi untuk diekspor.");
      return;
    }

    const rows: any[] = [];
    rows.push(["LAPORAN HASIL KOREKSI UJIAN SISWA"]);
    rows.push(["TANGGAL KOREKSI", new Date().toLocaleDateString("id-ID")]);
    rows.push(["TOTAL SISWA", koreksiResult.hasil.length]);
    rows.push(["SKALA PENILAIAN", scoringConfig.skala]);
    rows.push(["KKM", scoringConfig.kkm]);
    if (koreksiResult.analitik_kelas) {
      rows.push(["ANALITIK KELAS", koreksiResult.analitik_kelas]);
    }
    rows.push([]);

    rows.push(["No", "Nama Siswa", "Nilai Akhir", "Status Kelulusan", "Catatan & Rekomendasi"]);

    koreksiResult.hasil.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.nama_siswa,
        s.nilai_akhir,
        s.status_kelulusan === "tuntas" ? "TUNTAS" : "REMEDIAL",
        s.rekomendasi || "-",
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 14 },
      { wch: 18 },
      { wch: 50 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil_Koreksi");

    const fileName = `Hasil_Koreksi_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Hasil koreksi berhasil diunduh ke format Excel!");
  };

  const handleShareKoreksiWhatsApp = () => {
    if (!koreksiResult || !koreksiResult.hasil || koreksiResult.hasil.length === 0) return;

    const total = koreksiResult.hasil.length;
    const tuntas = koreksiResult.hasil.filter((s) => s.status_kelulusan === "tuntas").length;
    const persentase = total > 0 ? ((tuntas / total) * 100).toFixed(0) : "0";

    let text = `*LAPORAN HASIL KOREKSI UJIAN*\n`;
    text += `*Tanggal:* ${new Date().toLocaleDateString("id-ID")}\n`;
    text += `*Total Siswa:* ${total} | *Ketuntasan:* ${persentase}% (${tuntas}/${total} Tuntas)\n\n`;

    text += `*DAFTAR NILAI SISWA:*\n`;
    koreksiResult.hasil.forEach((s, i) => {
      const statusBadge = s.status_kelulusan === "tuntas" ? "✓" : "✗";
      text += `${i + 1}. ${s.nama_siswa} — Nilai: *${s.nilai_akhir}* [${statusBadge}]\n`;
    });

    if (koreksiResult.analitik_kelas) {
      text += `\n*ANALISIS KELAS:*\n${koreksiResult.analitik_kelas}\n`;
    }

    navigator.clipboard.writeText(text);
    toast.success("Ringkasan nilai format WhatsApp berhasil disalin ke clipboard!");
  };

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
          className={`flex items-center gap-1 sm:gap-1.5 font-semibold transition-all ${
            size === "sm" ? "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs" : "px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
          } ${
            active === m.id
              ? "bg-black dark:bg-white text-white dark:text-black"
              : "bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#444]"
          }`}
        >
          <m.icon size={size === "sm" ? 12 : 14} />
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-10 pb-32">
      {/* ────────────────── LAYOUT LOADING ────────────────── */}
      {isKoreksiLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white dark:bg-[#1e1e1e] border-4 border-black dark:border-white/20 p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-gray-100 dark:border-zinc-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black dark:text-white" size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider dark:text-white">Menilai Jawaban...</h3>
            
            {/* Real-time progress per student list */}
            <div className="border-t border-b border-black/10 dark:border-white/10 py-4 text-left font-mono text-xs max-h-56 overflow-y-auto space-y-2">
              {students.filter(s => s.phase !== "idle").map(s => {
                let badgeColor = "text-gray-400";
                let badgeText = "Menunggu";
                if (s.phase === "ocr") {
                  badgeColor = "text-cyan-500 font-bold animate-pulse";
                  badgeText = "OCR Gambar";
                } else if (s.phase === "koreksi") {
                  badgeColor = "text-yellow-500 font-bold animate-pulse";
                  badgeText = "Koreksi AI";
                } else if (s.phase === "selesai") {
                  badgeColor = "text-green-500 font-bold";
                  badgeText = "Selesai";
                } else if (s.phase === "gagal") {
                  badgeColor = "text-red-500 font-bold";
                  badgeText = "Gagal";
                }
                return (
                  <div key={s.id} className="flex justify-between items-center gap-2">
                    <span className="truncate max-w-[200px] font-semibold dark:text-zinc-300">
                      {s.name || `Siswa`}
                    </span>
                    <span className={badgeColor}>{badgeText}</span>
                  </div>
                );
              })}
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 font-medium text-xs leading-relaxed">
              Jawaban siswa sedang diproses secara paralel. Analitik performa kelas akan disusun setelah semua selesai.
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black/10 dark:border-white/10 pb-5 sm:pb-6 print:hidden">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-black dark:text-white">Hasil Analisis AI</span>
              <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-black dark:text-white mt-1">Laporan Auto-Koreksi</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setKoreksiResult(null)}
                className="py-2.5 px-3 sm:px-4 border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-all bg-white dark:bg-[#1e1e1e] dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] active:translate-y-0.5 cursor-pointer"
              >
                <RotateCcw size={14} className="shrink-0" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleExportKoreksiExcel}
                className="py-2.5 px-3 sm:px-4 border-2 border-black font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all bg-emerald-400 hover:bg-emerald-300 text-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} className="shrink-0" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleShareKoreksiWhatsApp}
                className="py-2.5 px-3 sm:px-4 border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all bg-white dark:bg-[#1e1e1e] dark:text-white hover:bg-gray-50 dark:hover:bg-[#2a2a2a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] active:translate-y-0.5 cursor-pointer"
              >
                <Share2 size={14} className="shrink-0 text-emerald-600" />
                <span>Salin WA</span>
              </button>
              <button
                onClick={handleSaveSesi}
                disabled={isSaving || isSaved}
                className={`py-2.5 px-3 sm:px-4 border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] disabled:opacity-60 disabled:cursor-not-allowed active:translate-y-0.5 cursor-pointer ${
                  isSaved
                    ? "bg-green-500 text-white border-green-600"
                    : "bg-white dark:bg-[#1e1e1e] dark:text-white hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                }`}
              >
                {isSaved ? <CheckCircle size={14} className="shrink-0" /> : <Save size={14} className="shrink-0" />}
                <span>{isSaving ? "Menyimpan..." : isSaved ? "Tersimpan" : "Simpan"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="py-2.5 px-3 sm:px-4 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-0.5 cursor-pointer"
              >
                <Printer size={14} className="shrink-0" />
                <span>Cetak</span>
              </button>
            </div>
          </div>

          {/* Grid Analitik Kelas: Compact 3-col on Mobile */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
            {/* Rata-Rata Nilai */}
            <div className="border-2 border-black dark:border-white/20 p-2.5 sm:p-5 md:p-6 bg-white dark:bg-[#1e1e1e] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)] flex flex-col justify-between">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[9px] sm:text-xs mb-1 sm:mb-3">
                <GraduationCap className="text-black dark:text-white shrink-0" size={13} />
                <span className="truncate">Rata-Rata</span>
              </div>
              <div className="text-xl sm:text-3xl md:text-4xl font-editorial font-bold text-black dark:text-white">
                {(() => {
                  const validScores = koreksiResult.hasil
                    .map((s) => typeof s.nilai_akhir === "number" ? s.nilai_akhir : parseFloat(s.nilai_akhir))
                    .filter((score) => !isNaN(score));
                  return validScores.length > 0
                    ? (validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length).toFixed(1)
                    : "-";
                })()}
              </div>
              <p className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                <span className="hidden sm:inline">Total </span>{koreksiResult.hasil.length} siswa
              </p>
            </div>

            {/* Tingkat Ketuntasan */}
            <div className="border-2 border-black dark:border-white/20 p-2.5 sm:p-5 md:p-6 bg-white dark:bg-[#1e1e1e] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)] flex flex-col justify-between">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[9px] sm:text-xs mb-1 sm:mb-3">
                <TrendingUp className="text-green-500 shrink-0" size={13} />
                <span className="truncate">Ketuntasan</span>
              </div>
              <div className="text-xl sm:text-3xl md:text-4xl font-editorial font-bold text-black dark:text-white">
                {(
                  (koreksiResult.hasil.filter((s) => s.status_kelulusan === "tuntas").length /
                    koreksiResult.hasil.length) *
                  100
                ).toFixed(0)}
                %
              </div>
              <p className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                {koreksiResult.hasil.filter((s) => s.status_kelulusan === "tuntas").length}/{koreksiResult.hasil.length} lulus
              </p>
            </div>

            {/* Nilai Tertinggi */}
            <div className="border-2 border-black dark:border-white/20 p-2.5 sm:p-5 md:p-6 bg-white dark:bg-[#1e1e1e] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)] flex flex-col justify-between">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[9px] sm:text-xs mb-1 sm:mb-3">
                <Award className="text-black dark:text-white shrink-0" size={13} />
                <span className="truncate">Tertinggi</span>
              </div>
              <div className="text-xl sm:text-3xl md:text-4xl font-editorial font-bold text-black dark:text-white">
                {(() => {
                  const validScores = koreksiResult.hasil
                    .map((s) => typeof s.nilai_akhir === "number" ? s.nilai_akhir : parseFloat(s.nilai_akhir))
                    .filter((score) => !isNaN(score));
                  return validScores.length > 0
                    ? Math.max(...validScores).toString()
                    : "-";
                })()}
              </div>
              <p className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                Skor maks
              </p>
            </div>
          </div>

          {/* Rekomendasi / Analitik Global */}
          <div className="border-2 border-black dark:border-white/20 p-4 sm:p-6 bg-yellow-50 dark:bg-yellow-950/10 text-yellow-900 dark:text-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" /> Analisis Performa Kelas (AI Insights)
            </h3>
            <div className="text-xs sm:text-sm leading-relaxed text-yellow-900 dark:text-yellow-400">
              <MarkdownText text={koreksiResult.analitik_kelas} />
            </div>
          </div>

          {/* Visualisasi Grafik Analitik */}
          <KoreksiCharts koreksiResult={koreksiResult} skala={scoringConfig.skala} />

          {/* Detail Koreksi Per-Siswa */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* List Siswa */}
            <div className="space-y-2 lg:space-y-3 print:hidden">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Daftar Siswa ({koreksiResult.hasil.length})
                </h3>
                <span className="text-[10px] text-gray-400 lg:hidden">Geser untuk pilih &rarr;</span>
              </div>
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 no-scrollbar">
                {koreksiResult.hasil.map((siswa, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStudentDetail(idx)}
                    className={`shrink-0 text-left p-2.5 sm:p-3 lg:p-3.5 border-2 flex items-center justify-between gap-3 transition-all min-w-[140px] lg:w-full ${
                      activeStudentDetail === idx
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]"
                        : "border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] hover:border-black/30 dark:hover:border-white/30 dark:text-white"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm whitespace-nowrap">{siswa.nama_siswa}</div>
                      <div className="text-[10px] sm:text-xs opacity-75 mt-0.5 whitespace-nowrap">
                        <span className="uppercase font-bold">{siswa.status_kelulusan === "tuntas" ? "Tuntas" : "Remedial"}</span>
                      </div>
                    </div>
                    <div className="text-base sm:text-lg lg:text-xl font-editorial font-bold">{siswa.nilai_akhir}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rincian per Nomor */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-6">
              {activeStudentDetail !== null && koreksiResult.hasil[activeStudentDetail] && (
                <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-3.5 sm:p-5 lg:p-6 space-y-3 sm:space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)] print:border-none print:shadow-none">
                  {/* Info Header Siswa */}
                  <div className="border-b border-black/10 dark:border-white/10 pb-2.5 sm:pb-3 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-2xl font-editorial font-bold dark:text-white truncate">
                          {koreksiResult.hasil[activeStudentDetail].nama_siswa}
                        </h3>
                        <span
                          className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider ${
                            koreksiResult.hasil[activeStudentDetail].status_kelulusan === "tuntas"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-800"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-800"
                          }`}
                        >
                          {koreksiResult.hasil[activeStudentDetail].status_kelulusan === "tuntas" ? "Tuntas" : "Remedial"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[9px] sm:text-xs text-gray-400 uppercase font-bold tracking-wider">Nilai Akhir</div>
                      <div className="text-xl sm:text-3xl font-editorial font-bold dark:text-white leading-tight">
                        {koreksiResult.hasil[activeStudentDetail].nilai_akhir}
                      </div>
                    </div>
                  </div>

                  {/* Rekomendasi Siswa */}
                  {koreksiResult.hasil[activeStudentDetail].rekomendasi && (
                    <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 p-2.5 sm:p-3 text-xs leading-relaxed">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400 mb-1">
                        <span className="shrink-0">⚡</span>
                        <span>Rekomendasi & Catatan Siswa</span>
                      </div>
                      <div className="font-normal text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed normal-case">
                        {parseInlineMarkdown(koreksiResult.hasil[activeStudentDetail].rekomendasi)}
                      </div>
                    </div>
                  )}

                  {/* List Soal Item */}
                  <div className="space-y-2.5 sm:space-y-3">
                    {koreksiResult.hasil[activeStudentDetail].detail_koreksi.map((item, index) => (
                      <div
                        key={index}
                        className={`p-2.5 sm:p-3.5 border border-black/10 dark:border-white/10 ${
                          item.status === "benar"
                            ? "bg-green-50/40 dark:bg-green-950/10 border-green-200 dark:border-green-900/30"
                            : item.status === "setengah"
                            ? "bg-yellow-50/40 dark:bg-yellow-950/10 border-yellow-200 dark:border-yellow-900/30"
                            : "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-900/30"
                        }`}
                      >
                        {/* Judul & Skor Soal */}
                        <div className="flex justify-between items-center gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm dark:text-white">Soal #{item.nomor}</span>
                            <span
                              className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider ${
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
                          <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Skor: <span className="font-bold text-black dark:text-white">{item.nilai}</span>
                          </span>
                        </div>

                        {/* Pertanyaan jika ada */}
                        {item.pertanyaan && (
                          <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2 italic leading-relaxed">
                            "{item.pertanyaan}"
                          </div>
                        )}

                        {/* Jawaban vs Kunci */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2.5 text-xs mt-1">
                          <div className="bg-white/90 dark:bg-black/30 p-2 border border-black/5 dark:border-white/10">
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Jawaban Siswa</div>
                            <div className="font-mono text-xs dark:text-white break-words leading-relaxed">
                              {item.jawaban_siswa || <span className="italic text-gray-400">(Kosong)</span>}
                            </div>
                          </div>
                          <div className="bg-white/90 dark:bg-black/30 p-2 border border-black/5 dark:border-white/10">
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Kunci Acuan</div>
                            <div className="font-mono text-xs dark:text-white break-words leading-relaxed">{item.kunci_jawaban}</div>
                          </div>
                        </div>

                        {/* Catatan Koreksi */}
                        {item.catatan && (
                          <div className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-2 border-t border-black/5 dark:border-white/5 pt-1.5 leading-relaxed">
                            💡 {parseInlineMarkdown(item.catatan)}
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
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
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
                        className="w-full p-4 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black dark:border-white/10 focus:bg-white dark:focus:bg-[#333] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:focus:border-white outline-none resize-none transition-all font-mono text-sm text-black dark:text-white"
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
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
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
          <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-64 z-30 print:hidden">
            <div className="bg-white dark:bg-[#1e1e1e] border-t-2 border-black dark:border-white/20 px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-colors gap-2">
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm min-w-0">
                <span className="text-gray-500 dark:text-gray-400 truncate">
                  <span className="font-bold text-black dark:text-white text-base sm:text-lg">{filledCount}</span> siswa siap
                </span>
                {soalText && (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 uppercase tracking-wider hidden sm:inline-block">
                    ✓ Kunci aktif
                  </span>
                )}
              </div>
              <button
                onClick={handleKoreksi}
                disabled={filledCount === 0}
                className={`px-4 sm:px-8 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2 font-bold uppercase tracking-wider text-xs sm:text-sm shrink-0 transition-all ${
                  filledCount === 0
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-black dark:bg-white text-white dark:text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] hover:translate-y-[2px] hover:translate-x-[2px] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none"
                }`}
              >
                <Sparkles size={16} /> Koreksi AI
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
  const hasContent = student.textContent.trim().length > 0 || (student.inputMethod === "image" && student.imageFile !== null);

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
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-4 border-b border-black/10 dark:border-white/10 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className={`w-7 h-7 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center font-bold text-xs sm:text-sm ${
              hasContent ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-[#333] text-gray-500 dark:text-gray-400"
            }`}
          >
            {hasContent ? <CheckCircle size={14} /> : (index + 1).toString().padStart(2, "0")}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <div className="relative flex items-center group/input min-w-0">
              <input
                type="text"
                value={student.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder={`Siswa ${index + 1}`}
                className="bg-transparent border-b border-dashed border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 focus:border-solid focus:border-black dark:focus:border-white outline-none font-bold text-xs sm:text-sm dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 w-24 xs:w-32 sm:w-44 md:w-52 pr-4 sm:pr-6 pb-0.5 transition-all truncate"
              />
              <Pencil size={11} className="absolute right-1 text-gray-400 opacity-40 group-hover/input:opacity-100 group-focus-within/input:opacity-0 transition-opacity pointer-events-none" />
            </div>
            {student.phase !== "idle" && (
              <span className={`text-[9px] font-bold px-1.5 py-0.2 uppercase tracking-wider self-start sm:self-auto rounded ${
                student.phase === "menunggu" ? "bg-gray-100 dark:bg-zinc-800 text-gray-500" :
                student.phase === "ocr" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 animate-pulse" :
                student.phase === "koreksi" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 animate-pulse" :
                student.phase === "selesai" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              }`}>
                {student.phase}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
              className="px-4 py-1.5 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-xs font-medium hover:border-black dark:hover:border-white transition-colors dark:text-white"
            >
              {student.imageFile ? "Ubah Foto" : "Upload Foto"}
            </button>
            {student.imageName && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={12} /> {student.imageName} (Menunggu Koreksi AI)
              </div>
            )}
          </div>
        )}

        {/* Show parsed content if loaded via file/image */}
        {student.textContent.trim().length > 0 && student.inputMethod !== "text" && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-green-700 dark:text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle size={12} /> Hasil Pembacaan
              </span>
              <button
                onClick={() => onUpdate({ textContent: "", fileName: "", imageFile: null, imageName: "" })}
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
