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
  ChevronLeft,
  Save,
  Pencil,
  FileSpreadsheet,
  Share2,
  Loader2,
  Download,
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
  imageFile: File | null;
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
    <div className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="text-xs sm:text-sm font-bold text-black dark:text-white mt-3 mb-1 uppercase tracking-wider"
            >
              {parseInlineMarkdown(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className="text-sm sm:text-base font-bold text-black dark:text-white mt-4 mb-1"
            >
              {parseInlineMarkdown(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={idx}
              className="text-base sm:text-lg font-bold text-black dark:text-white mt-4 mb-2"
            >
              {parseInlineMarkdown(trimmed.slice(2))}
            </h2>
          );
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="text-black dark:text-white font-bold select-none">•</span>
              <span className="flex-1">{parseInlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }

        const matchNumbered = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (matchNumbered) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2">
              <span className="font-bold text-black dark:text-white shrink-0 select-none">
                {matchNumbered[1]}.
              </span>
              <span className="flex-1">{parseInlineMarkdown(matchNumbered[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{parseInlineMarkdown(trimmed)}</p>;
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
      <strong key={match.index} className="font-extrabold text-black dark:text-white">
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
  const [step, setStep] = useState(1);

  // ── Soal / Kunci Jawaban (Opsional) ──
  const [soalInputMethod, setSoalInputMethod] = useState<InputMethod>("text");
  const [soalText, setSoalText] = useState("");
  const [soalFileName, setSoalFileName] = useState("");
  const [isSoalParsing, setIsSoalParsing] = useState(false);
  const soalFileRef = useRef<HTMLInputElement>(null);
  const soalImgRef = useRef<HTMLInputElement>(null);

  // ── Konfigurasi Penilaian ──
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>({
    bobotBenar: 1,
    bobotSalah: 0,
    skala: "100",
    kkm: 75,
  });

  // ── Daftar Siswa ──
  const [students, setStudents] = useState<StudentCard[]>([
    {
      id: "s1",
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

  // ── Hasil & Loading ──
  const [isKoreksiLoading, setIsKoreksiLoading] = useState(false);
  const [koreksiResult, setKoreksiResult] = useState<ResponseKoreksi | null>(null);
  const [activeStudentDetail, setActiveStudentDetail] = useState<number | null>(null);
  const [reportTab, setReportTab] = useState<"rekap" | "analitik">("rekap");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // ── Timer Live Loading ──
  const [koreksiSeconds, setKoreksiSeconds] = useState(0);

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
          imageName: "",
          phase: "idle",
        }));
        setStudents(restored);
      }

      const savedKoreksiResult = localStorage.getItem("educraft_koreksiResult");
      if (savedKoreksiResult !== null) {
        setKoreksiResult(JSON.parse(savedKoreksiResult));
        setStep(3);
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

  // Loading Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isKoreksiLoading) {
      setKoreksiSeconds(0);
      timer = setInterval(() => {
        setKoreksiSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isKoreksiLoading]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Proteksi reload / tab close saat AI sedang mengoreksi jawaban
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isKoreksiLoading) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    if (isKoreksiLoading) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.dispatchEvent(
        new CustomEvent("educraft_ai_busy", {
          detail: {
            isBusy: true,
            message: "AI sedang memeriksa dan mengoreksi lembar jawaban ujian...",
          },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("educraft_ai_busy", {
          detail: { isBusy: false },
        })
      );
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.dispatchEvent(
        new CustomEvent("educraft_ai_busy", {
          detail: { isBusy: false },
        })
      );
    };
  }, [isKoreksiLoading]);

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

  const resetAll = () => {
    if (confirm("Reset seluruh data koreksi, soal, dan jawaban siswa?")) {
      localStorage.removeItem("educraft_soalText");
      localStorage.removeItem("educraft_soalFileName");
      localStorage.removeItem("educraft_scoringConfig");
      localStorage.removeItem("educraft_students");
      localStorage.removeItem("educraft_koreksiResult");
      localStorage.removeItem("educraft_activeStudentDetail");
      setSoalText("");
      setSoalFileName("");
      setScoringConfig({ bobotBenar: 1, bobotSalah: 0, skala: "100", kkm: 75 });
      setStudents([
        {
          id: "s1",
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
      setKoreksiResult(null);
      setActiveStudentDetail(null);
      setStep(1);
      toast.success("Formulir koreksi berhasil di-reset");
    }
  };

  // ── Parse Handlers untuk Soal Acuan ──
  const handleSoalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSoalParsing(true);
    setSoalFileName(file.name);
    const toastId = toast.loading(`Membaca file ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal mengekstrak teks");

      const data = await res.json();
      setSoalText(data.text || "");
      toast.success("File soal berhasil dibaca!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file soal.", { id: toastId });
      setSoalFileName("");
    } finally {
      setIsSoalParsing(false);
      e.target.value = "";
    }
  };

  const handleSoalImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSoalParsing(true);
    setSoalFileName(file.name);
    const toastId = toast.loading("AI sedang membaca foto lembar soal...");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/parse-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal membaca gambar");

      const data = await res.json();
      setSoalText(data.text || "");
      toast.success("Foto soal berhasil dibaca!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca foto soal.", { id: toastId });
      setSoalFileName("");
    } finally {
      setIsSoalParsing(false);
      e.target.value = "";
    }
  };

  // ── Parse Handlers untuk Jawaban Siswa ──
  const handleStudentFile = async (
    studentId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    updateStudent(studentId, { isParsing: true, fileName: file.name });
    const toastId = toast.loading(`Membaca file ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal mengekstrak teks");

      const data = await res.json();
      updateStudent(studentId, { textContent: data.text || "" });
      toast.success("File jawaban terbaca!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file jawaban.", { id: toastId });
      updateStudent(studentId, { fileName: "" });
    } finally {
      updateStudent(studentId, { isParsing: false });
      e.target.value = "";
    }
  };

  const handleStudentImage = async (
    studentId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateStudent(studentId, {
      imageFile: file,
      imageName: file.name,
    });
    toast.success("Foto jawaban disimpan. OCR diproses otomatis saat koreksi.");
    e.target.value = "";
  };

  // ── AI Correct Operation ──
  const handleKoreksi = async () => {
    const filledStudents = students.filter(
      (s) =>
        s.textContent.trim().length > 0 ||
        (s.inputMethod === "image" && s.imageFile !== null)
    );
    if (filledStudents.length === 0) {
      toast.error("Belum ada jawaban siswa yang diisi.");
      return;
    }

    setIsKoreksiLoading(true);
    setStudents((prev) =>
      prev.map((s) =>
        filledStudents.some((fs) => fs.id === s.id)
          ? { ...s, phase: "menunggu" }
          : s
      )
    );
    const toastId = toast.loading("AI sedang mempersiapkan koreksi paralel...");

    try {
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
          setStep(3);
          toast.success("Koreksi AI selesai!", { id: toastId });
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
                  prev.map((s) =>
                    s.id === payload.id ? { ...s, phase: payload.phase } : s
                  )
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
      setStep(3);
      toast.success("Koreksi AI selesai!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(
        "Gagal melakukan koreksi AI: " + (err.message || "Error tidak diketahui"),
        { id: toastId }
      );
      setStudents((prev) => prev.map((s) => ({ ...s, phase: "idle" })));
    } finally {
      setIsKoreksiLoading(false);
    }
  };

  const filledCount = students.filter(
    (s) =>
      s.textContent.trim().length > 0 ||
      (s.inputMethod === "image" && s.imageFile !== null)
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

      const validScores = koreksiResult.hasil
        .map((s) =>
          typeof s.nilai_akhir === "number"
            ? s.nilai_akhir
            : parseFloat(s.nilai_akhir)
        )
        .filter((score) => !isNaN(score));
      const rataRata =
        validScores.length > 0
          ? validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length
          : null;
      const tuntas = koreksiResult.hasil.filter(
        (s) => s.status_kelulusan === "tuntas"
      ).length;
      const tingkatKetuntasan =
        koreksiResult.hasil.length > 0
          ? (tuntas / koreksiResult.hasil.length) * 100
          : null;

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
      toast.error(
        "Gagal menyimpan sesi: " + (err.message || "Error tidak diketahui"),
        { id: toastId }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportKoreksiExcel = () => {
    if (
      !koreksiResult ||
      !koreksiResult.hasil ||
      koreksiResult.hasil.length === 0
    ) {
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

    rows.push([
      "No",
      "Nama Siswa",
      "Nilai Akhir",
      "Status Kelulusan",
      "Catatan & Rekomendasi",
    ]);

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
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Koreksi");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Hasil_Koreksi_Ujian_${dateStr}.xlsx`);
    toast.success("Laporan Excel berhasil diunduh!");
  };

  const handleShareKoreksiWhatsApp = () => {
    if (
      !koreksiResult ||
      !koreksiResult.hasil ||
      koreksiResult.hasil.length === 0
    ) {
      toast.error("Belum ada data hasil koreksi untuk dibagikan.");
      return;
    }

    const dateStr = new Date().toLocaleDateString("id-ID", {
      dateStyle: "full",
    });
    let text = `*📊 REKAP HASIL KOREKSI UJIAN SISWA*\n`;
    text += `*Tanggal:* ${dateStr}\n`;
    text += `*Total Siswa:* ${koreksiResult.hasil.length} orang\n`;
    text += `*KKM:* ${scoringConfig.kkm} (Skala: ${scoringConfig.skala})\n\n`;

    text += `*DAFTAR NILAI SISWA:*\n`;
    koreksiResult.hasil.forEach((s, i) => {
      const statusIcon = s.status_kelulusan === "tuntas" ? "✅" : "⚠️";
      text += `${i + 1}. *${s.nama_siswa}*: ${s.nilai_akhir} ${statusIcon} (${
        s.status_kelulusan === "tuntas" ? "Tuntas" : "Remedial"
      })\n`;
    });

    if (koreksiResult.analitik_kelas) {
      text += `\n*ANALISIS & EVALUASI GURU:*\n${koreksiResult.analitik_kelas}\n`;
    }

    text += `\n_Dibuat otomatis via EduCraft AI (saitech.co.id)_`;

    navigator.clipboard.writeText(text);
    toast.success("Teks rekap berhasil disalin ke clipboard! Siap kirim ke WhatsApp.");
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  // Reusable Neobrutalism Chip Selector for Input Methods
  const InputMethodTabs = ({
    active,
    onChange,
    size = "md",
  }: {
    active: InputMethod;
    onChange: (m: InputMethod) => void;
    size?: "sm" | "md";
  }) => (
    <div className="flex gap-1.5 sm:gap-2">
      {([
        { id: "text", label: "Teks Bebas", icon: Type },
        { id: "file", label: "Upload PDF", icon: UploadCloud },
        { id: "image", label: "Foto/Kamera", icon: Camera },
      ] as const).map((m) => {
        const isSel = active === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex items-center gap-1.5 font-bold border-2 transition-all cursor-pointer ${
              size === "sm"
                ? "px-2 sm:px-3 py-1 text-[11px] sm:text-xs"
                : "px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
            } ${
              isSel
                ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]"
                : "border-black/15 dark:border-white/15 bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-300 hover:border-black/40"
            }`}
          >
            <m.icon size={size === "sm" ? 13 : 15} />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pb-24">
      {/* ────────────────── HEADER HALAMAN ────────────────── */}
      <div className="mb-4 sm:mb-10">
        <div className="flex justify-between items-center mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
            Koreksi Lembar Ujian Siswa
          </h1>
          <button
            onClick={resetAll}
            className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-xs flex items-center gap-1.5 shrink-0"
            title="Bersihkan Semua Data"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        {/* Stepper Wizard - Standar Kiblat Buat Soal */}
        <div className="relative flex justify-between items-start sm:items-center">
          <div className="absolute top-4 sm:top-5 left-8 sm:left-10 right-8 sm:right-10 h-1 bg-gray-200 dark:bg-white/10 z-0 hidden sm:block">
            <motion.div
              className="h-full bg-black dark:bg-white"
              initial={{ width: "0%" }}
              animate={{
                width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
              }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {[
            { id: 1, label: "1. Kunci & Kriteria" },
            { id: 2, label: "2. Jawaban Siswa" },
            { id: 3, label: "3. Laporan Hasil" },
          ].map((s) => (
            <div
              key={s.id}
              className="relative z-10 flex flex-col items-center gap-1 sm:gap-3 bg-[#f5f5f7] dark:bg-[#121212] px-1 sm:px-4"
            >
              <div
                className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-colors duration-500
                ${
                  step >= s.id
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "bg-white dark:bg-[#1e1e1e] border-2 border-black/10 dark:border-white/10 text-gray-400 dark:text-gray-500"
                }
                ${
                  step === s.id
                    ? "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] -translate-y-[1px]"
                    : ""
                }
              `}
              >
                {step > s.id ? (
                  <CheckCircle size={14} className="sm:w-[18px] sm:h-[18px]" />
                ) : (
                  s.id
                )}
              </div>
              <span
                className={`hidden sm:block text-xs font-semibold uppercase tracking-wider ${
                  step >= s.id
                    ? "text-black dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ────────────────── KARTU KONTAINER UTAMA NEOBRUTALISME ────────────────── */}
      <div className="relative bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-3 sm:p-6 md:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.12)] min-h-0 sm:min-h-[500px]">
        {/* Sudut Balok Taktil */}
        <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-black dark:border-white/20 -mt-0.5 -ml-0.5"></div>
        <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-black dark:border-white/20 -mt-0.5 -mr-0.5"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-black dark:border-white/20 -mb-0.5 -ml-0.5"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-black dark:border-white/20 -mb-0.5 -mr-0.5"></div>

        {/* ────────────────── LOADING STATE DALAM KARTU ────────────────── */}
        {isKoreksiLoading && (
          <motion.div
            key="koreksi-loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-10 sm:py-16 px-3 sm:px-4 text-center max-w-lg mx-auto"
          >
            {/* Dual Orbit Rings */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-black/30 dark:border-white/30 animate-spin [animation-duration:8s]" />
              <div className="absolute inset-1.5 sm:inset-2 rounded-full border-4 border-t-black border-r-black/20 border-b-transparent border-l-black dark:border-t-white dark:border-r-white/20 dark:border-l-white animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <Sparkles size={28} className="text-black dark:text-white sm:w-8 sm:h-8" />
                </motion.div>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-editorial font-bold mb-2 text-black dark:text-white">
              Menilai Lembar Jawaban...
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-5 leading-relaxed">
              AI sedang memeriksa jawaban setiap siswa secara paralel dan menyusun analitik performa kelas.
            </p>

            {/* Shimmer Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative">
              <motion.div
                className="h-full bg-black dark:bg-white relative overflow-hidden"
                initial={{ width: "15%" }}
                animate={{ width: ["15%", "40%", "70%", "88%", "96%"] }}
                transition={{ duration: 22, ease: "easeOut" }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-black/30 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
              </motion.div>
            </div>

            {/* Live Status Card */}
            <div className="bg-gray-50 dark:bg-[#252525] border-2 border-black/15 dark:border-white/15 p-3.5 sm:p-4 w-full text-left shadow-[3px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pb-2 border-b border-black/10 dark:border-white/10 mb-2.5">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Koreksi Paralel Aktif
                </span>
                <span className="font-mono text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-[#1e1e1e] px-2 py-0.5 border border-black/10 dark:border-white/10 text-[10px]">
                  ⏱ {formatTimer(koreksiSeconds)}
                </span>
              </div>

              {/* Progress Per Siswa */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono">
                {students
                  .filter((s) => s.phase !== "idle")
                  .map((s) => {
                    let badgeColor = "text-gray-400";
                    let badgeText = "Menunggu";
                    if (s.phase === "ocr") {
                      badgeColor = "text-blue-600 font-bold animate-pulse";
                      badgeText = "OCR Gambar...";
                    } else if (s.phase === "koreksi") {
                      badgeColor = "text-amber-600 font-bold animate-pulse";
                      badgeText = "Koreksi AI...";
                    } else if (s.phase === "selesai") {
                      badgeColor = "text-emerald-600 font-bold";
                      badgeText = "Selesai ✓";
                    } else if (s.phase === "gagal") {
                      badgeColor = "text-red-500 font-bold";
                      badgeText = "Gagal";
                    }
                    return (
                      <div
                        key={s.id}
                        className="flex justify-between items-center py-1 border-b border-black/5 dark:border-white/5"
                      >
                        <span className="truncate max-w-[200px] font-semibold text-black dark:text-white">
                          {s.name || "Siswa"}
                        </span>
                        <span className={badgeColor}>{badgeText}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait" custom={1}>
          {/* ════════════════ STEP 1: KUNCI & KRITERIA PENILAIAN ════════════════ */}
          {step === 1 && !isKoreksiLoading && (
            <motion.div
              key="step1"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-6 sm:space-y-8"
            >
              <div>
                <h2 className="text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1 text-black dark:text-white">
                  Kunci Jawaban &amp; Kriteria Penilaian
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Tentukan naskah kunci acuan serta bobot nilai dan batas KKM kelulusan siswa.
                </p>
              </div>

              {/* CARD SOAL / KUNCI JAWABAN */}
              <div className="border-2 border-black/15 dark:border-white/15 p-4 sm:p-6 bg-gray-50/50 dark:bg-[#252525]">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pb-3 border-b border-black/10 dark:border-white/10">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-black dark:text-white flex items-center gap-2">
                      <FileText size={18} /> Lembar Kunci Jawaban{" "}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5">
                        Opsional
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Bisa berupa deretan kunci (1.A, 2.B) atau naskah soal lengkap.
                    </p>
                  </div>
                  {soalText && (
                    <button
                      onClick={() => {
                        setSoalText("");
                        setSoalFileName("");
                      }}
                      className="px-2.5 py-1.5 border border-red-500 text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-xs flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Bersihkan
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <InputMethodTabs active={soalInputMethod} onChange={setSoalInputMethod} />
                </div>

                <input
                  type="file"
                  ref={soalFileRef}
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleSoalFile}
                />
                <input
                  type="file"
                  ref={soalImgRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSoalImage}
                />

                <div className="space-y-4">
                  {soalInputMethod === "text" && (
                    <textarea
                      rows={5}
                      className="w-full p-3 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none resize-none transition-all font-mono text-xs sm:text-sm text-black dark:text-white"
                      placeholder={`Format kunci singkat:\n1. A\n2. B\n3. C\n\nAtau naskah soal lengkap:\n1. Bagian sel untuk fotosintesis adalah... Kunci: C\n2. Jelaskan fungsi fotosintesis... Kunci: Menghasilkan oksigen...`}
                      value={soalText}
                      onChange={(e) => setSoalText(e.target.value)}
                    />
                  )}

                  {soalInputMethod === "file" && (
                    <div className="border-2 border-dashed border-black/20 dark:border-white/20 bg-white dark:bg-[#1e1e1e] p-5 sm:p-7 flex flex-col items-center justify-center text-center">
                      <UploadCloud size={32} className="text-gray-400 dark:text-gray-500 mb-2" />
                      <p className="font-semibold text-black dark:text-white text-xs sm:text-sm mb-1">
                        Pilih Berkas PDF / DOCX Kunci Jawaban
                      </p>
                      <button
                        type="button"
                        onClick={() => soalFileRef.current?.click()}
                        disabled={isSoalParsing}
                        className="mt-3 px-4 py-1.5 bg-gray-100 dark:bg-[#2a2a2a] border border-black/20 dark:border-white/20 text-xs font-bold hover:border-black transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSoalParsing ? "Sedang membaca..." : "Pilih File"}
                      </button>
                      {soalFileName && (
                        <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                          <CheckCircle size={14} /> {soalFileName}
                        </div>
                      )}
                    </div>
                  )}

                  {soalInputMethod === "image" && (
                    <div className="border-2 border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => soalImgRef.current?.click()}
                        disabled={isSoalParsing}
                        className="py-6 flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-[#2a2a2a] border border-black/20 dark:border-white/20 hover:border-black transition-all cursor-pointer"
                      >
                        <Camera size={22} />
                        <span className="font-bold text-xs sm:text-sm">
                          {isSoalParsing ? "Membaca teks foto..." : "Unggah Foto Kunci Jawaban"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD KONFIGURASI PENILAIAN */}
              <div className="border-2 border-black/15 dark:border-white/15 p-4 sm:p-6 bg-gray-50/50 dark:bg-[#252525]">
                <div className="mb-4 pb-3 border-b border-black/10 dark:border-white/10">
                  <h3 className="text-base sm:text-lg font-bold text-black dark:text-white flex items-center gap-2">
                    <Settings2 size={18} /> Aturan Penskoran &amp; Ambang Kelulusan
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bobot Benar */}
                  <div className="border-2 border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
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
                      className="w-full p-2 border-2 border-black/15 dark:border-white/15 outline-none font-bold text-center text-sm"
                    />
                  </div>

                  {/* Bobot Salah */}
                  <div className="border-2 border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
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
                      className="w-full p-2 border-2 border-black/15 dark:border-white/15 outline-none font-bold text-center text-sm"
                    />
                    <p className="text-[10px] text-gray-400 text-center">0 = tanpa pengurangan nilai</p>
                  </div>

                  {/* Skala Nilai */}
                  <div className="border-2 border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                      Skala Nilai Akhir
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["100", "10", "huruf"] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setScoringConfig({ ...scoringConfig, skala: val })}
                          className={`py-2 text-center text-xs font-bold border-2 transition-all cursor-pointer ${
                            scoringConfig.skala === val
                              ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]"
                              : "bg-white dark:bg-[#1e1e1e] border-black/15 dark:border-white/15 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {val === "100" ? "0 - 100" : val === "10" ? "0 - 10" : "A - E"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* KKM */}
                  <div className="border-2 border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3.5 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                      KKM (Kriteria Ketuntasan Minimal)
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={scoringConfig.kkm}
                        onChange={(e) =>
                          setScoringConfig({
                            ...scoringConfig,
                            kkm: parseInt(e.target.value) || 0,
                          })
                        }
                        className="flex-1 accent-black dark:accent-white cursor-pointer"
                      />
                      <div className="bg-black text-white dark:bg-white dark:text-black px-3 py-1 font-bold text-center text-sm min-w-[50px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]">
                        {scoringConfig.kkm}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Lanjut ke Step 2 */}
              <div className="flex justify-end pt-4 sm:pt-6 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 sm:px-8 py-3 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none transition-all cursor-pointer"
                >
                  Lanjut: Jawaban Siswa <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════════════ STEP 2: DAFTAR JAWABAN SISWA ════════════════ */}
          {step === 2 && !isKoreksiLoading && (
            <motion.div
              key="step2"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="flex flex-wrap justify-between items-center gap-3 mb-2 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1 text-black dark:text-white">
                    Lembar Jawaban Siswa
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-bold text-black dark:text-white">{filledCount}</span> dari{" "}
                    {students.length} siswa sudah terisi dan siap dikoreksi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addStudent}
                  className="px-3.5 py-2 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <Plus size={16} /> Tambah Siswa
                </button>
              </div>

              {/* List Kartu Siswa */}
              <div className="space-y-4">
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
                  type="button"
                  onClick={addStudent}
                  className="w-full py-4 border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#252525] transition-all cursor-pointer"
                >
                  <Plus size={16} /> Tambah Siswa Baru
                </button>
              </div>

              {/* Action Navigasi Step 2 */}
              <div className="flex justify-between items-center pt-4 sm:pt-6 border-t border-black/10 dark:border-white/10 gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} /> Kembali
                </button>
                <button
                  type="button"
                  onClick={handleKoreksi}
                  disabled={filledCount === 0}
                  className={`px-6 sm:px-8 py-3 flex items-center gap-2 font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all ${
                    filledCount === 0
                      ? "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed border-2 border-gray-300 dark:border-gray-700"
                      : "bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none cursor-pointer"
                  }`}
                >
                  <Sparkles size={16} /> Koreksi AI Sekarang
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════════════ STEP 3: LAPORAN HASIL KOREKSI ════════════════ */}
          {step === 3 && koreksiResult && !isKoreksiLoading && (
            <motion.div
              key="step3"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Header Hasil & Toolbar Aksi Bersih (2 Tombol Utama sesuai Kiblat) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-black/10 dark:border-white/10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-black dark:text-white">
                    <CheckCircle className="text-emerald-600 shrink-0" size={24} /> Laporan Hasil Koreksi
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Evaluasi otomatis {koreksiResult.hasil.length} siswa • Standar KKM {scoringConfig.kkm}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveSesi}
                    disabled={isSaving || isSaved}
                    className={`flex-1 sm:flex-initial text-center px-3.5 sm:px-4 py-2 border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap ${
                      isSaved
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-black/20 dark:border-white/20 bg-white dark:bg-[#1e1e1e] hover:border-black"
                    }`}
                  >
                    {isSaved ? <CheckCircle size={14} className="text-emerald-600" /> : <Save size={14} />}
                    <span>{isSaving ? "Menyimpan..." : isSaved ? "Tersimpan" : "Simpan Sesi"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2 bg-black text-white dark:bg-white dark:text-black font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 text-xs sm:text-sm shrink-0 whitespace-nowrap shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                  >
                    <Download size={15} /> Ekspor / Bagikan
                  </button>
                </div>
              </div>

              {/* Ringkasan Metrik Angka */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                {(() => {
                  const validScores = koreksiResult.hasil
                    .map((s) => (typeof s.nilai_akhir === "number" ? s.nilai_akhir : parseFloat(s.nilai_akhir)))
                    .filter((score) => !isNaN(score));
                  const avg = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : "-";
                  const highest = validScores.length > 0 ? Math.max(...validScores) : "-";
                  const lowest = validScores.length > 0 ? Math.min(...validScores) : "-";
                  const passed = koreksiResult.hasil.filter((s) => s.status_kelulusan === "tuntas").length;
                  const passedPercent = ((passed / koreksiResult.hasil.length) * 100).toFixed(0);

                  return (
                    <>
                      <div className="bg-gray-50 dark:bg-[#252525] border-2 border-black/15 dark:border-white/15 p-3 sm:p-4">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Rata-rata Kelas
                        </span>
                        <div className="text-xl sm:text-2xl font-black text-black dark:text-white">{avg}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#252525] border-2 border-black/15 dark:border-white/15 p-3 sm:p-4">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Ketuntasan KKM
                        </span>
                        <div className="text-xl sm:text-2xl font-black text-black dark:text-white">
                          {passedPercent}% <span className="text-xs font-normal text-gray-500">({passed}/{koreksiResult.hasil.length})</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#252525] border-2 border-black/15 dark:border-white/15 p-3 sm:p-4">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Nilai Tertinggi
                        </span>
                        <div className="text-xl sm:text-2xl font-black text-black dark:text-white">{highest}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#252525] border-2 border-black/15 dark:border-white/15 p-3 sm:p-4">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Nilai Terendah
                        </span>
                        <div className="text-xl sm:text-2xl font-black text-black dark:text-white">{lowest}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Tab Switcher: Rekap Nilai Siswa vs Grafik & Evaluasi */}
              <div className="flex border-b-2 border-black/15 dark:border-white/15 gap-2 sm:gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTab("rekap")}
                  className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-3 -mb-[2px] transition-all cursor-pointer ${
                    reportTab === "rekap"
                      ? "border-black dark:border-white text-black dark:text-white font-extrabold"
                      : "border-transparent text-gray-500 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <GraduationCap size={16} /> Rekap Nilai &amp; Lembar Siswa ({koreksiResult.hasil.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReportTab("analitik")}
                  className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-3 -mb-[2px] transition-all cursor-pointer ${
                    reportTab === "analitik"
                      ? "border-black dark:border-white text-black dark:text-white font-extrabold"
                      : "border-transparent text-gray-500 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <TrendingUp size={16} /> Grafik &amp; Evaluasi AI
                </button>
              </div>

              {/* TAB 1: REKAP BUKU NILAI & LEMBAR SISWA */}
              {reportTab === "rekap" && (
                <div className="space-y-6">
                  {/* TABEL BUKU NILAI KELAS */}
                  <div className="border-2 border-black/15 dark:border-white/15 overflow-hidden bg-white dark:bg-[#1e1e1e]">
                    <div className="p-3 sm:p-4 bg-gray-50 dark:bg-[#252525] border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                        Buku Nilai Kelas • Klik Siswa untuk Buka Rincian
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {koreksiResult.hasil.length} Siswa Dinilai
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-black/10 dark:border-white/10 bg-gray-100/60 dark:bg-[#202020] text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-3 w-12 text-center">No</th>
                            <th className="py-2.5 px-4">Nama Siswa</th>
                            <th className="py-2.5 px-4 w-28 text-center">Nilai Akhir</th>
                            <th className="py-2.5 px-4 w-32 text-center">Status KKM</th>
                            <th className="py-2.5 px-4 hidden md:table-cell">Catatan AI</th>
                            <th className="py-2.5 px-4 w-32 text-right">Lembar Jawaban</th>
                          </tr>
                        </thead>
                        <tbody>
                          {koreksiResult.hasil.map((s, idx) => {
                            const isSelected = activeStudentDetail === idx;
                            const isTuntas = s.status_kelulusan === "tuntas";
                            return (
                              <tr
                                key={idx}
                                onClick={() => setActiveStudentDetail(idx)}
                                className={`border-b border-black/5 dark:border-white/5 transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-black/5 dark:bg-white/10 font-semibold"
                                    : "hover:bg-gray-50 dark:hover:bg-[#252525]"
                                }`}
                              >
                                <td className="py-3 px-3 text-center font-mono text-gray-500">{idx + 1}</td>
                                <td className="py-3 px-4 font-bold text-black dark:text-white">{s.nama_siswa}</td>
                                <td className="py-3 px-4 text-center font-mono font-black text-sm text-black dark:text-white">
                                  {s.nilai_akhir}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${
                                      isTuntas
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                        : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                                    }`}
                                  >
                                    {isTuntas ? "✓ Tuntas" : "⚠ Remedial"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell text-xs text-gray-600 dark:text-gray-400 truncate max-w-[240px]">
                                  {s.rekomendasi || "-"}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span
                                    className={`text-xs font-bold inline-flex items-center gap-1 ${
                                      isSelected
                                        ? "text-black dark:text-white"
                                        : "text-gray-400 group-hover:text-black"
                                    }`}
                                  >
                                    {isSelected ? "Buka Rincian ▼" : "Buka Rincian →"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DETAIL LEMBAR SISWA TERPILIH */}
                  {activeStudentDetail !== null && koreksiResult.hasil[activeStudentDetail] && (
                    <div className="border-2 border-black/15 dark:border-white/15 p-4 sm:p-6 bg-white dark:bg-[#1e1e1e] space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)]">
                      {(() => {
                        const cur = koreksiResult.hasil[activeStudentDetail];
                        const isTuntas = cur.status_kelulusan === "tuntas";

                        return (
                          <>
                            {/* Header Siswa & Navigasi Antar-Siswa */}
                            <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-black/10 dark:border-white/10">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Lembar Jawaban Siswa #{activeStudentDetail + 1}
                                </span>
                                <h4 className="text-base sm:text-xl font-bold text-black dark:text-white">
                                  {cur.nama_siswa}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Nilai Akhir: <strong className="text-black dark:text-white text-sm font-mono">{cur.nilai_akhir}</strong>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                                    isTuntas
                                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                      : "border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                                  }`}
                                >
                                  {isTuntas ? "✓ Tuntas KKM" : "⚠ Remedial"}
                                </span>

                                {/* Tombol Cepat Siswa Sebelumnya / Berikutnya */}
                                <div className="flex items-center gap-1 border-2 border-black/15 dark:border-white/15 p-0.5 bg-gray-50 dark:bg-[#252525]">
                                  <button
                                    type="button"
                                    onClick={() => setActiveStudentDetail(Math.max(0, activeStudentDetail - 1))}
                                    disabled={activeStudentDetail === 0}
                                    className="p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-30 transition-colors cursor-pointer"
                                    title="Siswa Sebelumnya"
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                  <span className="text-xs font-mono font-bold px-1.5">
                                    {activeStudentDetail + 1} / {koreksiResult.hasil.length}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveStudentDetail(Math.min(koreksiResult.hasil.length - 1, activeStudentDetail + 1))}
                                    disabled={activeStudentDetail === koreksiResult.hasil.length - 1}
                                    className="p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-30 transition-colors cursor-pointer"
                                    title="Siswa Berikutnya"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Rekomendasi Belajar */}
                            {cur.rekomendasi && (
                              <div className="p-3.5 bg-gray-50 dark:bg-[#252525] border-l-4 border-l-black dark:border-l-white border-t border-r border-b border-black/10 dark:border-white/10 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                <strong>Rekomendasi Belajar:</strong> {cur.rekomendasi}
                              </div>
                            )}

                            {/* Daftar Nomor Butir Soal */}
                            <div className="space-y-3 pt-2">
                              {cur.detail_koreksi.map((item, itemIdx) => {
                                const isBenar = item.status === "benar";
                                const isSetengah = item.status === "setengah";

                                return (
                                  <div
                                    key={itemIdx}
                                    className="p-3 sm:p-4 bg-gray-50 dark:bg-[#262626] border border-black/10 dark:border-white/10 space-y-2.5"
                                  >
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-bold text-black dark:text-white">
                                        Nomor {item.nomor}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${
                                            isBenar
                                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                              : isSetengah
                                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                              : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                                          }`}
                                        >
                                          {item.status}
                                        </span>
                                        <span className="font-mono font-bold text-black dark:text-white">
                                          Skor: {item.nilai}
                                        </span>
                                      </div>
                                    </div>

                                    {item.pertanyaan && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                        "{item.pertanyaan}"
                                      </p>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                      <div className="p-2.5 bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10">
                                        <span className="text-[10px] font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">
                                          Jawaban Siswa
                                        </span>
                                        <span className="font-mono text-black dark:text-white font-medium break-words">
                                          {item.jawaban_siswa || <span className="italic text-gray-400">(Kosong)</span>}
                                        </span>
                                      </div>
                                      <div className="p-2.5 bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10">
                                        <span className="text-[10px] font-bold text-gray-400 block mb-0.5 uppercase tracking-wider">
                                          Kunci Acuan
                                        </span>
                                        <span className="font-mono text-black dark:text-white font-medium break-words">
                                          {item.kunci_jawaban}
                                        </span>
                                      </div>
                                    </div>

                                    {item.catatan && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 pt-1 leading-relaxed border-t border-black/5 dark:border-white/5">
                                        💡 {parseInlineMarkdown(item.catatan)}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ANALITIK KELAS & GRAFIK VISUAL */}
              {reportTab === "analitik" && (
                <div className="space-y-6">
                  {/* Visualisasi Grafik Kelas */}
                  <div className="border-2 border-black/15 dark:border-white/15 p-4 sm:p-6 bg-white dark:bg-[#202020]">
                    <KoreksiCharts koreksiResult={koreksiResult} skala={scoringConfig.skala} />
                  </div>

                  {/* Evaluasi & Analitik Kelas AI */}
                  {koreksiResult.analitik_kelas && (
                    <div className="border-2 border-black/15 dark:border-white/15 p-4 sm:p-6 bg-gray-50 dark:bg-[#252525] border-l-6 border-l-black dark:border-l-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-black dark:text-white" />
                        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white">
                          Catatan Pedagogis &amp; Analitik AI
                        </h3>
                      </div>
                      <MarkdownText text={koreksiResult.analitik_kelas} />
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action Bar (Sesuai Kiblat Buat Soal) */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-8 pb-4 border-t border-black/10 dark:border-white/10 mt-8">
                <button
                  type="button"
                  onClick={handleSaveSesi}
                  disabled={isSaving || isSaved}
                  className={`w-full sm:w-auto text-center px-4 py-2.5 border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap ${
                    isSaved
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-black/20 dark:border-white/20 bg-white dark:bg-[#1e1e1e] hover:border-black"
                  }`}
                >
                  {isSaved ? <CheckCircle size={14} className="text-emerald-600" /> : <Save size={14} />}
                  <span>{isSaving ? "Menyimpan..." : isSaved ? "Sesi Tersimpan" : "Simpan ke Sesi"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 text-xs sm:text-sm shrink-0 whitespace-nowrap shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                >
                  <Download size={16} /> Ekspor / Bagikan Hasil
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setKoreksiResult(null);
                    setStep(2);
                  }}
                  className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline transition-colors cursor-pointer"
                >
                  Edit Jawaban Siswa
                </button>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setKoreksiResult(null);
                    setStep(1);
                  }}
                  className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline transition-colors cursor-pointer"
                >
                  Mulai Koreksi Baru Lagi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ────────────────── MODAL EXPORT & SHARE HUB ────────────────── */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExportModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] border-2 sm:border-3 border-black dark:border-white/20 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#252525]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-black dark:text-white">
                    <Download size={18} className="text-gray-500 dark:text-gray-400" /> Ekspor &amp; Bagikan Laporan
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs mt-0.5">
                    Pilih format penyajian hasil koreksi sesuai kebutuhan Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto">
                {/* 01 Dokumen & Spreadsheet */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white dark:bg-white dark:text-black text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                      01
                    </span>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Dokumen Rekap &amp; Cetak
                    </h4>
                  </div>

                  {/* Excel Button */}
                  <button
                    type="button"
                    onClick={() => {
                      handleExportKoreksiExcel();
                      setIsExportModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-300 dark:border-emerald-800">
                        <FileSpreadsheet size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white truncate">
                          Microsoft Excel (.xlsx)
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                          Tabel rekap nilai lengkap, status KKM, dan evaluasi kelas
                        </div>
                      </div>
                    </div>
                    <Download size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>

                  {/* Print / Cetak PDF Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportModalOpen(false);
                      setTimeout(() => window.print(), 200);
                    }}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded flex items-center justify-center font-bold text-sm shrink-0 border border-gray-300 dark:border-gray-700">
                        <Printer size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white truncate">
                          Cetak Dokumen Fisik / Simpan PDF
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                          Buka jendela pratinjau cetak browser resmi siap print
                        </div>
                      </div>
                    </div>
                    <Printer size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>
                </div>

                {/* 02 Komunikasi Guru & Wali Murid */}
                <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white dark:bg-white dark:text-black text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                      02
                    </span>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Komunikasi Langsung
                    </h4>
                  </div>

                  {/* Salin WhatsApp Button */}
                  <button
                    type="button"
                    onClick={() => {
                      handleShareKoreksiWhatsApp();
                      setIsExportModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-300 dark:border-emerald-800">
                        <Share2 size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white truncate">
                          Salin Format WhatsApp
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                          Salin ringkasan nilai rapi siap tempel ke grup WhatsApp
                        </div>
                      </div>
                    </div>
                    <Share2 size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STUDENT ANSWER CARD COMPONENT (STANDAR NEOBRUTALISME)
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
  InputMethodTabs: React.ComponentType<{
    active: InputMethod;
    onChange: (m: InputMethod) => void;
    size?: "sm" | "md";
  }>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const hasContent =
    student.textContent.trim().length > 0 ||
    (student.inputMethod === "image" && student.imageFile !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`bg-white dark:bg-[#1e1e1e] border-2 transition-all ${
        hasContent
          ? "border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]"
          : "border-black/15 dark:border-white/15 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.04)]"
      }`}
    >
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-black/10 dark:border-white/10 gap-2 bg-gray-50/50 dark:bg-[#252525]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center font-bold text-xs ${
              hasContent
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-gray-200 dark:bg-[#333] text-gray-500"
            }`}
          >
            {hasContent ? <CheckCircle size={14} /> : (index + 1).toString().padStart(2, "0")}
          </div>
          <div className="relative flex items-center group/input min-w-0">
            <input
              type="text"
              value={student.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder={`Siswa ${index + 1}`}
              className="bg-transparent border-b border-dashed border-black/20 dark:border-white/20 hover:border-black focus:border-solid focus:border-black dark:focus:border-white outline-none font-bold text-xs sm:text-sm text-black dark:text-white placeholder:text-gray-400 w-28 xs:w-36 sm:w-48 pr-5 pb-0.5 transition-all truncate"
            />
            <Pencil
              size={11}
              className="absolute right-0.5 text-gray-400 opacity-40 group-hover/input:opacity-100 pointer-events-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <InputMethodTabs
            active={student.inputMethod}
            onChange={(m) => onUpdate({ inputMethod: m })}
            size="sm"
          />
          {totalStudents > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
              title="Hapus Siswa"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 sm:p-5">
        {student.inputMethod === "text" && (
          <textarea
            rows={3}
            value={student.textContent}
            onChange={(e) => onUpdate({ textContent: e.target.value })}
            className="w-full p-2.5 sm:p-3 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/15 dark:border-white/15 focus:border-black dark:focus:border-white outline-none resize-none transition-all font-mono text-xs sm:text-sm text-black dark:text-white"
            placeholder="Ketik jawaban siswa: 1.A 2.B 3.C 4.D 5.A ..."
          />
        )}

        {student.inputMethod === "file" && (
          <div className="border-2 border-dashed border-black/15 dark:border-white/15 bg-gray-50 dark:bg-[#2a2a2a] p-4 sm:p-6 flex flex-col items-center text-center">
            <UploadCloud size={28} className="text-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500 mb-2">Berkas PDF atau DOCX</p>
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              accept=".pdf,.docx"
              onChange={onFileUpload}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={student.isParsing}
              className="px-3 py-1 bg-white dark:bg-[#1e1e1e] border-2 border-black/20 text-xs font-bold hover:border-black transition-colors cursor-pointer"
            >
              {student.isParsing ? "Membaca..." : "Pilih File"}
            </button>
            {student.fileName && (
              <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle size={12} /> {student.fileName}
              </div>
            )}
          </div>
        )}

        {student.inputMethod === "image" && (
          <div className="border-2 border-dashed border-black/15 dark:border-white/15 bg-gray-50 dark:bg-[#2a2a2a] p-4 sm:p-6 flex flex-col items-center text-center">
            <Camera size={28} className="text-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500 mb-2">Foto Lembar Jawaban (JPG/PNG)</p>
            <input
              type="file"
              ref={imgRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={onImageUpload}
            />
            <button
              type="button"
              onClick={() => imgRef.current?.click()}
              className="px-3 py-1 bg-white dark:bg-[#1e1e1e] border-2 border-black/20 text-xs font-bold hover:border-black transition-colors cursor-pointer"
            >
              {student.imageFile ? "Ubah Foto" : "Upload Foto"}
            </button>
            {student.imageName && (
              <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle size={12} /> {student.imageName} (Menunggu Koreksi)
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
