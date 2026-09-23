"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import GoogleFormExportButton from "@/app/components/GoogleFormExportButton";
import QuizizzExportButton from "@/app/components/QuizizzExportButton";
import {
  UploadCloud,
  FileText,
  Type,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Camera,
  Plus,
  Download,
  X,
  ChevronDown,
  RefreshCw,
  Trash2,
  History,
  Loader2,
} from "lucide-react";
import { buatSupabaseClient } from "@/lib/supabase/client";

export default function CreateQuestionWizard() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null,
  );
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [editInstruction, setEditInstruction] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const [inputTypes, setInputTypes] = useState<string[]>(["text"]);
  const [inputText, setInputText] = useState("");
  const [topicText, setTopicText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyMaterials, setHistoryMaterials] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  const [isSaveBankModalOpen, setIsSaveBankModalOpen] = useState(false);
  const [saveBankTitle, setSaveBankTitle] = useState("");
  const [saveBankFolder, setSaveBankFolder] = useState("Umum");
  const [instruksiKhusus, setInstruksiKhusus] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [generatingSeconds, setGeneratingSeconds] = useState(0);
  const [generatingStageIdx, setGeneratingStageIdx] = useState(0);

  const TAHAP_PENYUSUNAN = [
    "Membaca & mengekstrak konsep kunci dari materi...",
    "Membedah taksonomi Bloom (LOTS / HOTS) sesuai racikan...",
    "Merumuskan butir-butir pertanyaan & pilihan pengecoh...",
    "Menyusun kunci jawaban dan rubrik pembahasan detail...",
    "Memverifikasi struktur dan format akhir dokumen...",
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let stageTimer: NodeJS.Timeout;

    if (isGenerating) {
      setGeneratingSeconds(0);
      setGeneratingStageIdx(0);

      timer = setInterval(() => {
        setGeneratingSeconds((prev) => prev + 1);
      }, 1000);

      stageTimer = setInterval(() => {
        setGeneratingStageIdx((prev) => (prev + 1) % 5);
      }, 3500);
    }

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, [isGenerating]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const supabase = buatSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('bank_materi')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data) setHistoryMaterials(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal membaca gambar");
      
      const data = await res.json();
      if (data.teks_hasil) {
        setInputText((prev) => prev ? prev + "\n\n" + data.teks_hasil : data.teks_hasil);
        setInputTypes((prev) => prev.includes("text") ? prev : [...prev, "text"]);
        toast.success("Gambar berhasil dibaca oleh AI!");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat membaca gambar.");
    } finally {
      setIsOcrLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal membaca file");
      
      const data = await res.json();
      if (data.teks_hasil) {
        setInputText((prev) => prev ? prev + "\n\n" + data.teks_hasil : data.teks_hasil);
        setInputTypes((prev) => prev.includes("text") ? prev : [...prev, "text"]);
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengekstrak file.");
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  type ConfigBlock = {
    id: string;
    type: string;
    level: string;
    count: number;
    imageCount: number;
  };
  const [configBlocks, setConfigBlocks] = useState<ConfigBlock[]>([
    { id: "initial-1", type: "Pilihan Ganda", level: "HOTS", count: 10, imageCount: 0 },
  ]);

  const addBlock = () => {
    setConfigBlocks([
      ...configBlocks,
      { id: Math.random().toString(), type: "Essay", level: "LOTS", count: 5, imageCount: 0 },
    ]);
  };

  const removeBlock = (id: string) => {
    setConfigBlocks(configBlocks.filter((b) => b.id !== id));
  };

  const updateBlock = (
    id: string,
    field: keyof ConfigBlock,
    value: string | number,
  ) => {
    setConfigBlocks(
      configBlocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    );
  };

  const totalQuestions = configBlocks.reduce(
    (sum, block) => sum + block.count,
    0,
  );

  useEffect(() => {
    setIsMounted(true);
    const selectedMateri = typeof window !== "undefined" ? sessionStorage.getItem("educraft_selected_materi") : null;
    if (selectedMateri) {
      setInputText(selectedMateri);
      setInputTypes(["text"]);
      setStep(1);
      sessionStorage.removeItem("educraft_selected_materi");
      toast.success("Materi ajar berhasil dimuat dari Bank Materi!");
      return;
    }

    const savedData = localStorage.getItem("educraft_create_draft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.step) setStep(parsed.step);
        if (parsed.inputTypes) setInputTypes(parsed.inputTypes);
        if (parsed.inputText !== undefined) setInputText(parsed.inputText);
        if (parsed.topicText !== undefined) setTopicText(parsed.topicText);
        if (parsed.configBlocks) setConfigBlocks(parsed.configBlocks);
        if (parsed.instruksiKhusus !== undefined) setInstruksiKhusus(parsed.instruksiKhusus);
        if (parsed.generatedQuestions) setGeneratedQuestions(parsed.generatedQuestions);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const draft = {
      step,
      inputTypes,
      inputText,
      topicText,
      configBlocks,
      instruksiKhusus,
      generatedQuestions
    };
    localStorage.setItem("educraft_create_draft", JSON.stringify(draft));
  }, [step, inputTypes, inputText, topicText, configBlocks, instruksiKhusus, generatedQuestions, isMounted]);

  const handleNext = () => {
    if (step === 1) {
      const materi = (inputText || topicText || "").trim();
      if (!materi || materi.length < 5) {
        toast.error("Materi pembelajaran terlalu pendek! Masukkan minimal 5 karakter teks materi agar AI dapat meracik soal.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 3));
  };
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleExport = async (format: "pdf" | "docx", sertakan_jawaban: boolean, sertakan_pembahasan: boolean) => {
    if (generatedQuestions.length === 0) {
      toast.error("Belum ada soal untuk di-export.");
      return;
    }

    const toastId = toast.loading(`Sedang memproses dokumen ${format.toUpperCase()}...`);

    try {
      const payload = {
        soal: generatedQuestions,
        header: {
          nama_sekolah: "EDUCRAFT AI",
          mata_pelajaran: "Materi Umum",
          kelas: "Semua Kelas",
          tanggal: new Date().toLocaleDateString("id-ID"),
          durasi: "60 Menit"
        },
        sertakan_jawaban,
        sertakan_pembahasan
      };

      const res = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal mengunduh dokumen");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soal-educraft-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success("Dokumen berhasil diunduh!", { id: toastId });
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan export", { id: toastId });
    }
  };

  const openSaveBankModal = () => {
    if (generatedQuestions.length === 0) {
      toast.error("Belum ada soal untuk disimpan.");
      return;
    }
    let defaultTitle = topicText || inputText.substring(0, 30) || "Kuis Tanpa Judul";
    if (defaultTitle.length > 50) defaultTitle = defaultTitle.substring(0, 50) + "...";
    setSaveBankTitle(defaultTitle);
    setSaveBankFolder("Umum");
    setIsSaveBankModalOpen(true);
  };

  const handleSaveToBank = async () => {
    if (!saveBankTitle.trim()) {
      toast.error("Judul tidak boleh kosong.");
      return;
    }

    setIsSavingToBank(true);
    const toastId = toast.loading("Menyimpan ke Bank Soal...");

    try {
      const supabase = buatSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Anda harus login untuk menyimpan soal.");
      }

      const { error } = await supabase
        .from('bank_soal')
        .insert({
          user_id: user.id,
          title: saveBankTitle,
          folder: saveBankFolder || 'Umum',
          content: { soal: generatedQuestions }
        });

      if (error) throw error;

      toast.success("Berhasil disimpan ke Bank Soal!", { id: toastId });
      setIsSaveBankModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menyimpan ke Bank Soal.", { id: toastId });
    } finally {
      setIsSavingToBank(false);
    }
  };

  const handleRegenerate = async (idx: number) => {
    const q = generatedQuestions[idx];
    if (!q) return;
    setRegeneratingId(idx);
    try {
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soal_lama: JSON.stringify(q),
          konten_materi: inputText || topicText || "Materi Umum",
          instruksi: editInstruction || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const soalBaru = data.soal?.[0];
      if (soalBaru) {
        setGeneratedQuestions(prev => prev.map((s, i) => i === idx ? soalBaru : s));
        toast.success(`Soal ${idx + 1} berhasil dibuat ulang!`);
        setEditingQuestionId(null);
        setEditInstruction("");
      } else {
        toast.error("AI tidak mengembalikan soal pengganti.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal buat ulang soal: " + err.message);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleGenerate = async () => {
    const materi = (inputText || topicText || "").trim();
    if (!materi || materi.length < 5) {
      toast.error("Materi pembelajaran terlalu pendek! Masukkan minimal 5 karakter teks materi.");
      setStep(1);
      return;
    }

    setIsGenerating(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new DOMException("timeout", "AbortError")), 240000);

    try {
      const blocks_payload = configBlocks.map(b => ({
        tipe: b.type,
        level: b.level,
        count: b.count,
        image_count: 0 // gambar dinonaktifkan
      }));

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          konten_materi: materi,
          config: {
            blocks: blocks_payload,
            level_bloom: "campuran",
            mata_pelajaran: "Umum",
            jenjang: "Umum",
            bahasa: "id",
            instruksi_khusus: instruksiKhusus
          }
        })
      });

      if (!res.ok) {
        let errMessage = "Gagal generate soal.";
        try {
          const errData = await res.json();
          errMessage = errData.error || errData.detail || errMessage;
        } catch {
          errMessage = await res.text();
        }
        throw new Error(errMessage);
      }
      
      const data = await res.json();
      setGeneratedQuestions(data.soal || []);
      setStep(3);
    } catch(err: any) {
      if (err.name === "AbortError") {
        toast.error("Generate timeout (lebih dari 4 menit). Coba kurangi jumlah soal atau materi.");
      } else {
        console.error(err);
        toast.error(err.message || "Gagal generate soal.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  const toggleInputType = (type: string) => {
    if (inputTypes.includes(type)) {
      if (inputTypes.length > 1) {
        setInputTypes(inputTypes.filter((t) => t !== type));
      }
    } else {
      setInputTypes([...inputTypes, type]);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pb-24">
      <div className="mb-3 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-editorial font-bold text-black dark:text-white mb-2 sm:mb-6">
          Racik Soal Baru
        </h1>
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
            { id: 1, label: "1. Input Materi" },
            { id: 2, label: "2. Atur Parameter" },
            { id: 3, label: "3. Review Hasil" },
          ].map((s) => (
            <div
              key={s.id}
              className="relative z-10 flex flex-col items-center gap-1 sm:gap-3 bg-[#f5f5f7] dark:bg-[#121212] px-1 sm:px-4"
            >
              <div
                className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-colors duration-500
                ${step >= s.id ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-[#1e1e1e] border-2 border-black/10 dark:border-white/10 text-gray-400 dark:text-gray-500"}
                ${step === s.id ? "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] -translate-y-[1px]" : ""}
              `}
              >
                {step > s.id ? <CheckCircle size={14} className="sm:w-[18px] sm:h-[18px]" /> : s.id}
              </div>
              <span
                className={`hidden sm:block text-xs font-semibold uppercase tracking-wider ${step >= s.id ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-3 sm:p-6 md:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.12)] min-h-0 sm:min-h-[500px]">
        <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-black dark:border-white/20 -mt-0.5 -ml-0.5"></div>
        <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-black dark:border-white/20 -mt-0.5 -mr-0.5"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-black dark:border-white/20 -mb-0.5 -ml-0.5"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-black dark:border-white/20 -mb-0.5 -mr-0.5"></div>

        <AnimatePresence mode="wait" custom={1}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-start gap-2 mb-2 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1">Bahan Baku Materi</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Pilih satu atau kombinasi input materi untuk AI.
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("educraft_create_draft");
                    setStep(1);
                    setInputText("");
                    setTopicText("");
                    setInputTypes(["text"]);
                    setConfigBlocks([{ id: "initial-1", type: "Pilihan Ganda", level: "HOTS", count: 10, imageCount: 0 }]);
                    setInstruksiKhusus("");
                    setGeneratedQuestions([]);
                    toast.success("Formulir berhasil di-reset");
                  }}
                  className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 size={13} /> Reset
                </button>
              </div>

              {/* Input Method Selector: Horizontal Scrollable Chips on Mobile, 5-col Grid on Desktop */}
              <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-1.5 sm:gap-3 pb-1 md:pb-0 no-scrollbar">
                {[
                  { id: "text", label: "Teks Bebas", icon: Type },
                  { id: "file", label: "Upload PDF", icon: UploadCloud },
                  { id: "image", label: "Foto/Kamera", icon: Camera },
                  { id: "prompt", label: "Topik Singkat", icon: Sparkles },
                  { id: "history", label: "Riwayat", icon: History },
                ].map((type) => {
                  const isSelected = type.id === "history" ? false : inputTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        if (type.id === "history") {
                          setIsHistoryOpen(true);
                          fetchHistory();
                        } else {
                          toggleInputType(type.id);
                        }
                      }}
                      className={`shrink-0 md:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 md:p-4 flex md:flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-3 border transition-all text-xs md:text-sm ${
                        isSelected
                          ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                          : "border-black/15 dark:border-white/15 hover:border-black/40 hover:bg-gray-50 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <type.icon
                        size={15}
                        className="md:w-5 md:h-5 shrink-0"
                      />
                      <span className="font-semibold whitespace-nowrap">
                        {type.label}
                      </span>
                      {isSelected && (
                        <CheckCircle size={13} className="shrink-0 md:hidden ml-0.5 text-current" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4 sm:space-y-6 mt-3 sm:mt-8">
                {inputTypes.includes("text") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1.5 sm:space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Paste Materi Anda di sini
                      </label>
                      {inputText.length > 0 && (
                        <button
                          onClick={() => setInputText("")}
                          className="text-[11px] sm:text-xs font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Bersihkan Teks
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={4}
                      className="w-full p-2.5 sm:p-4 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black dark:border-white/20 focus:bg-white dark:focus:bg-[#333] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] outline-none resize-none transition-all text-xs sm:text-sm font-mono sm:font-sans"
                      placeholder="Contoh: Fotosintesis adalah proses tumbuhan mengubah sinar matahari menjadi makanan..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    ></textarea>
                  </motion.div>
                )}

                {inputTypes.includes("file") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-8 flex flex-col items-center justify-center text-center hover:border-black/50 hover:bg-gray-100 dark:bg-[#2a2a2a] transition-colors"
                  >
                    <UploadCloud size={40} className="text-gray-400 dark:text-gray-500 dark:text-gray-400 mb-4" />
                    <p className="font-semibold text-black dark:text-white mb-1">
                      Pilih file materi Anda
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Mendukung format .PDF, .DOCX, atau .PPTX (Max 20MB)
                    </p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".pdf,.docx,.pptx" 
                      onChange={handleFileUpload} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsing}
                      className="mt-6 px-6 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 text-sm font-medium hover:border-black dark:border-white/20 transition-colors disabled:opacity-50"
                    >
                      {isParsing ? "Sedang menyedot teks..." : "Pilih File"}
                    </button>
                  </motion.div>
                )}

                {inputTypes.includes("image") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-6 flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Camera size={20} className="text-gray-700 dark:text-gray-300" />
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Foto Materi (Buku/Papan Tulis)
                      </label>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handleImageUpload} 
                      />
                      <button 
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isOcrLoading}
                        className="flex-1 py-8 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 hover:border-black dark:border-white/20 hover:bg-gray-100 dark:bg-[#2a2a2a] transition-all text-gray-600 dark:text-gray-400 hover:text-black dark:text-white disabled:opacity-50"
                      >
                        <UploadCloud size={24} />
                        <span className="font-medium text-sm">
                          {isOcrLoading ? "Sedang Membaca..." : "Upload Foto (JPG/PNG)"}
                        </span>
                      </button>
                      <button className="flex-1 py-8 flex flex-col items-center justify-center gap-3 bg-black text-white hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        <Camera size={24} className="text-yellow-300" />
                        <span className="font-medium text-sm">
                          Ambil Foto dengan Kamera
                        </span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      AI akan secara otomatis membaca teks dari gambar
                      menggunakan teknologi OCR.
                    </p>
                  </motion.div>
                )}

                {inputTypes.includes("prompt") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Topik Spesifik (Tambahkan instruksi khusus untuk AI)
                    </label>
                    <div className="relative">
                      <Sparkles
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
                        value={topicText}
                        onChange={(e) => setTopicText(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black dark:border-white/20 focus:bg-white dark:focus:bg-[#333] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] outline-none transition-all"
                        placeholder="Contoh: Buatkan soal tentang Sejarah Kemerdekaan Indonesia 1945 dengan fokus pada Perjanjian Linggarjati"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex justify-end pt-6 border-t border-black/10 dark:border-white/10">
                <button
                  onClick={handleNext}
                  disabled={!inputText.trim() && !topicText.trim()}
                  className={`px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all ${
                    !inputText.trim() && !topicText.trim()
                      ? "bg-gray-200 text-gray-400 dark:text-gray-500 dark:text-gray-400 cursor-not-allowed border border-gray-300"
                      : "btn-primary hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                  }`}
                >
                  Lanjut: Atur Parameter <ChevronRight size={18} />
                </button>
              </div>

              {isHistoryOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] p-6 max-w-2xl w-full max-h-[80vh] flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold font-editorial flex items-center gap-2">
                        <History /> Riwayat Materi
                      </h3>
                      <button
                        onClick={() => setIsHistoryOpen(false)}
                        className="p-2 hover:bg-gray-100 dark:bg-[#2a2a2a] rounded-full transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                      {isHistoryLoading ? (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Memuat riwayat...</div>
                      ) : historyMaterials.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Belum ada riwayat materi.</div>
                      ) : (
                        historyMaterials.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setInputText(item.konten_mentah);
                              if (!inputTypes.includes("text")) setInputTypes([...inputTypes, "text"]);
                              setIsHistoryOpen(false);
                              toast.success("Materi berhasil dimuat!");
                            }}
                            className="w-full text-left p-4 border border-black/10 dark:border-white/10 hover:border-black dark:border-white/20 hover:bg-gray-50 dark:bg-[#2a2a2a] transition-all flex flex-col gap-1 group"
                          >
                            <h4 className="font-bold text-lg group-hover:text-blue-600 truncate">{item.judul}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.konten_mentah}</p>
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-2 font-bold">
                              {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && !isGenerating && (
            <motion.div
              key="step2"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Header Step 2 */}
              <div className="flex flex-row items-center justify-between gap-3 pb-3 border-b-2 border-black/10 dark:border-white/10">
                <div>
                  <h2 className="text-base sm:text-2xl font-bold dark:text-white">Parameter Soal</h2>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                    Atur tipe, tingkat kesulitan, dan jumlah butir soal.
                  </p>
                </div>
                <div className="bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 sm:px-5 sm:py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-80">
                    Total:
                  </span>
                  <span className="text-sm sm:text-lg font-black">{totalQuestions} Soal</span>
                </div>
              </div>

              {/* Racikan Blocks List */}
              <div className="space-y-3 sm:space-y-4">
                <AnimatePresence>
                  {configBlocks.map((block, index) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#222222] p-3.5 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)] space-y-3.5 sm:space-y-4"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="bg-black text-white dark:bg-white dark:text-black text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">
                            Racikan #{index + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                            {block.type} • {block.count} Soal
                          </span>
                        </div>
                        {configBlocks.length > 1 && (
                          <button
                            onClick={() => removeBlock(block.id)}
                            className="text-red-500 hover:text-red-600 px-2 py-1 text-xs font-bold flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Hapus racikan ini"
                          >
                            <Trash2 size={13} /> <span>Hapus</span>
                          </button>
                        )}
                      </div>

                      {/* 1. Tipe Soal (Responsive Pill Buttons) */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                          Tipe Soal
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            { id: "Pilihan Ganda", label: "Pilihan Ganda" },
                            { id: "Isian Singkat", label: "Isian Singkat" },
                            { id: "Essay", label: "Essay / Uraian" },
                            { id: "Benar/Salah", label: "Benar / Salah" },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => updateBlock(block.id, "type", t.id)}
                              className={`py-2 px-2 text-xs font-bold transition-all text-center border cursor-pointer ${
                                block.type === t.id
                                  ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                                  : "bg-gray-50 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Level Taksonomi Bloom */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                          Level Taksonomi Bloom
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5">
                          {[
                            { id: "LOTS", label: "LOTS (C1-C3)", desc: "Mengingat, Memahami, Menerapkan" },
                            { id: "HOTS", label: "HOTS (C4-C6)", desc: "Menganalisis, Mengevaluasi, Mengkreasi" },
                          ].map((lvl) => (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => updateBlock(block.id, "level", lvl.id)}
                              className={`py-2 px-2 border text-center transition-all cursor-pointer ${
                                block.level === lvl.id
                                  ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                                  : "bg-gray-50 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white"
                              }`}
                            >
                              <div className="text-xs font-bold leading-tight">{lvl.label}</div>
                              <div className="text-[9px] opacity-75 mt-0.5 line-clamp-1">{lvl.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Jumlah Soal (Touch-Friendly Stepper + Sliders + Quick Chips) */}
                      <div className="space-y-2.5 bg-gray-50 dark:bg-[#282828] p-3 sm:p-4 border border-black/10 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                            Jumlah Butir Soal
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateBlock(block.id, "count", Math.max(1, block.count - 1))}
                              className="w-8 h-8 rounded bg-white dark:bg-[#1e1e1e] border-2 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white flex items-center justify-center font-bold text-base active:scale-95 transition-all cursor-pointer"
                              aria-label="Kurangi 1 soal"
                            >
                              -
                            </button>
                            <div className="w-10 text-center font-black text-base dark:text-white">
                              {block.count}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateBlock(block.id, "count", Math.min(50, block.count + 1))}
                              className="w-8 h-8 rounded bg-white dark:bg-[#1e1e1e] border-2 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white flex items-center justify-center font-bold text-base active:scale-95 transition-all cursor-pointer"
                              aria-label="Tambah 1 soal"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Slider bar */}
                        <div className="space-y-1">
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={block.count}
                            onChange={(e) =>
                              updateBlock(
                                block.id,
                                "count",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-full accent-black dark:accent-white h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                            <span>1 Soal</span>
                            <span>25 Soal</span>
                            <span>50 Soal</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Tambah Racikan Lainnya */}
                <button
                  type="button"
                  onClick={addBlock}
                  className="w-full py-2.5 sm:py-3.5 border-2 border-dashed border-black/20 dark:border-white/20 text-gray-600 dark:text-gray-400 font-bold text-xs sm:text-sm hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5"
                >
                  <Plus size={16} /> + Tambah Racikan Lainnya
                </button>
              </div>

              {/* Instruksi Khusus (Opsional) */}
              <div className="space-y-1.5 pt-2 sm:pt-3">
                <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-500" />
                  <span>Instruksi Khusus untuk AI (Opsional)</span>
                </label>
                <div className="relative">
                  <textarea
                    id="instruksi-khusus"
                    rows={3}
                    value={instruksiKhusus}
                    onChange={(e) => setInstruksiKhusus(e.target.value)}
                    className="w-full p-3 sm:p-4 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors text-xs sm:text-sm min-h-[85px] leading-relaxed resize-y dark:text-white"
                    placeholder="Contoh: Fokuskan pertanyaan pada pemahaman konsep dan studi kasus lingkungan, hindari pertanyaan hafalan tahun kejadian."
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Bantu AI memahami fokus khusus atau aturan penulisan yang Anda inginkan.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 sm:pt-6 border-t border-black/10 dark:border-white/10 gap-2.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="order-2 sm:order-1 px-4 py-2.5 sm:py-3 font-bold text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white flex items-center justify-center gap-1.5 border border-black/15 dark:border-white/15 sm:border-0 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} /> Kembali
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="order-1 sm:order-2 btn-primary px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] bg-black text-white hover:bg-gray-800 transition-all cursor-pointer active:translate-y-0.5"
                >
                  <Sparkles size={16} className="text-yellow-400" />
                  <span>Generate {totalQuestions} Soal Sekarang</span>
                </button>
              </div>
            </motion.div>
          )}

          {isGenerating && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 sm:py-16 px-3 sm:px-4 text-center max-w-lg mx-auto"
            >
              {/* Dual Spinning Orbit Rings with Sparkle Core */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-black/30 dark:border-white/30 animate-spin [animation-duration:8s]" />
                <div className="absolute inset-1.5 sm:inset-2 rounded-full border-4 border-t-yellow-400 border-r-black border-b-transparent border-l-black dark:border-r-white dark:border-l-white animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <Sparkles size={28} className="text-yellow-500 fill-yellow-400/30 sm:w-8 sm:h-8" />
                  </motion.div>
                </div>
              </div>

              {/* Title & Description */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-editorial font-bold mb-2 text-black dark:text-white">
                Meracik Soal Kelas Dunia...
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-5 leading-relaxed">
                AI sedang mengekstrak materi Anda dan menyusun <strong>{totalQuestions} butir soal</strong> lengkap dengan kunci dan pembahasan.
              </p>

              {/* Animated Shimmer Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative">
                <motion.div
                  className="h-full bg-black dark:bg-white relative overflow-hidden"
                  initial={{ width: "8%" }}
                  animate={{ width: ["8%", "30%", "58%", "82%", "94%"] }}
                  transition={{ duration: 25, ease: "easeOut" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-black/30 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                </motion.div>
              </div>

              {/* Live Status Card with Ticking Timer */}
              <div className="bg-gray-50 dark:bg-[#252525] border-2 border-black/15 dark:border-white/15 p-3.5 sm:p-4 w-full text-left shadow-[3px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pb-2 border-b border-black/10 dark:border-white/10 mb-2.5">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Proses Aktif
                  </span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-[#1e1e1e] px-2 py-0.5 border border-black/10 dark:border-white/10 text-[10px]">
                    ⏱ {formatTimer(generatingSeconds)}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 min-h-[32px]">
                  <Loader2 size={15} className="animate-spin text-black dark:text-white shrink-0 mt-0.5" />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={generatingStageIdx}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="leading-snug"
                    >
                      {TAHAP_PENYUSUNAN[generatingStageIdx]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              {/* Helpful Hint */}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3.5">
                Estimasi waktu sekitar 10–25 detik. Layar akan otomatis berpindah ke hasil kuis.
              </p>
            </motion.div>
          )}

          {step === 3 && !isGenerating && (
            <motion.div
              key="step3"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 flex items-center gap-2">
                    <CheckCircle className="text-green-600 shrink-0" size={24} /> Selesai!
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Berhasil membuat {totalQuestions} soal dari materi Anda.
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button 
                    onClick={openSaveBankModal}
                    disabled={isSavingToBank}
                    className="flex-1 sm:flex-initial text-center px-3 sm:px-4 py-2 border border-black/20 dark:border-white/20 font-medium hover:border-black dark:border-white/20 transition-colors bg-white dark:bg-[#1e1e1e] text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSavingToBank ? "Menyimpan..." : "Simpan ke Bank Soal"}
                  </button>
                  <button
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs sm:text-sm shrink-0 whitespace-nowrap"
                  >
                    <Download size={15} /> Unduh
                  </button>
                </div>
              </div>

              <div className="space-y-4 mt-6 sm:mt-8">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="border border-black/10 dark:border-white/10 p-3.5 sm:p-6 bg-gray-50 dark:bg-[#2a2a2a]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
                      <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                        <span className="bg-black text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 uppercase">
                          Soal {idx + 1} • {q.tipe.toUpperCase()}
                        </span>
                        <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border border-gray-300 dark:border-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1">
                          {q.kesulitan} ({q.level_bloom})
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setEditingQuestionId(
                            editingQuestionId === idx ? null : idx,
                          )
                        }
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold transition-all border shrink-0 ${editingQuestionId === idx ? "bg-black text-white border-black dark:border-white/20" : "bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 border-black/10 dark:border-white/10 hover:border-black dark:border-white/20 hover:text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]"}`}
                      >
                        <Sparkles
                          size={13}
                          className={
                            editingQuestionId === idx
                              ? "text-yellow-400"
                              : "text-purple-500"
                          }
                        />
                        {editingQuestionId === idx
                          ? "Batal"
                          : "Revisi dengan AI"}
                      </button>
                    </div>
                    <p className="font-medium text-sm sm:text-lg mb-3 sm:mb-4 leading-relaxed">{q.teks}</p>

                    {false && q.image_prompt && (
                      <div className="mb-4 border border-black/10 dark:border-white/10 relative overflow-hidden bg-gray-100 dark:bg-[#2a2a2a]">
                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 z-10 flex items-center gap-1">
                          <Sparkles size={10} /> AI GENERATED
                        </div>
                        <img 
                          src={q.image_url || `/api/image?prompt=${encodeURIComponent(q.image_prompt)}`} 
                          alt="Ilustrasi Soal" 
                          className="w-full h-auto object-cover max-h-[300px]"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {q.opsi && (
                      <div className="space-y-1.5 mt-2">
                        {q.opsi.map((opt: any, i: number) => (
                          <div
                            key={i}
                            className={`px-2.5 py-1.5 sm:py-2 border flex items-center justify-between gap-2 text-xs sm:text-sm ${
                              opt.benar
                                ? "border-green-500 bg-green-50/80 dark:bg-green-950/20 text-green-800 dark:text-green-300 font-semibold"
                                : "border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <span className="flex-1 leading-snug">
                              <span className="font-bold mr-1.5 text-black dark:text-white">{opt.label}.</span>
                              {opt.teks}
                            </span>
                            {opt.benar && (
                              <span className="text-[9px] sm:text-[10px] font-bold bg-green-600 text-white px-1.5 py-0.5 uppercase tracking-wider shrink-0">
                                Kunci
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(q.kunci_jawaban || q.pembahasan) && q.tipe !== "pg" && (
                      <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 mt-2 text-xs text-yellow-900 dark:text-yellow-200">
                        <span className="font-bold">Kunci Jawaban:</span> {q.kunci_jawaban}
                      </div>
                    )}

                    {q.pembahasan && (
                      <details className="mt-2 text-xs group">
                        <summary className="cursor-pointer text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline select-none py-1">
                          <span>💡 Lihat Pembahasan & Analisis</span>
                        </summary>
                        <div className="mt-1 p-2.5 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 text-blue-900 dark:text-blue-200 leading-relaxed text-xs">
                          {q.pembahasan}
                        </div>
                      </details>
                    )}

                    <AnimatePresence>
                      {editingQuestionId === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 flex flex-col gap-3">
                            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                              Instruksi Perbaikan (Opsional)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editInstruction}
                                onChange={(e) => setEditInstruction(e.target.value)}
                                placeholder="Contoh: Ganti konteksnya menjadi tentang lingkungan RT/RW"
                                className="flex-1 px-3 py-2 text-sm border border-black/10 dark:border-white/10 focus:border-black dark:border-white/20 outline-none bg-white dark:bg-[#1e1e1e] transition-colors"
                                disabled={regeneratingId === idx}
                              />
                              <button
                                onClick={() => handleRegenerate(idx)}
                                disabled={regeneratingId !== null}
                                className="px-5 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {regeneratingId === idx ? (
                                  <><Loader2 size={14} className="animate-spin" /> Memproses...</>
                                ) : (
                                  <><Sparkles size={14} className="text-yellow-400" /> Buat Ulang</>
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-8">
                <button
                  onClick={() => setStep(1)}
                  className="font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:text-white underline transition-colors"
                >
                  Buat Soal Baru Lagi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isSaveBankModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaveBankModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b-2 border-black dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a]">
                <h3 className="text-xl font-bold flex items-center gap-2 text-black dark:text-white">
                  Simpan ke Bank Soal
                </h3>
                <button
                  onClick={() => setIsSaveBankModalOpen(false)}
                  className="p-2 text-gray-400 dark:text-gray-500 dark:text-gray-400 hover:text-black dark:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Judul Kuis</label>
                  <input 
                    type="text" 
                    value={saveBankTitle} 
                    onChange={(e) => setSaveBankTitle(e.target.value)}
                    className="w-full p-3 border-2 border-black/20 dark:border-white/20 focus:border-black dark:border-white/20 outline-none transition-colors font-medium"
                    placeholder="Contoh: Kuis Sejarah Bab 1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Folder / Kategori</label>
                  <input 
                    type="text" 
                    value={saveBankFolder} 
                    onChange={(e) => setSaveBankFolder(e.target.value)}
                    className="w-full p-3 border-2 border-black/20 dark:border-white/20 focus:border-black dark:border-white/20 outline-none transition-colors font-medium"
                    placeholder="Contoh: Sejarah, Matematika, Umum"
                  />
                </div>
              </div>

              <div className="p-6 pt-0 flex justify-end gap-3">
                <button 
                  onClick={() => setIsSaveBankModalOpen(false)}
                  className="px-6 py-2 border-2 border-black/20 dark:border-white/20 font-bold hover:border-black dark:border-white/20 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveToBank}
                  disabled={isSavingToBank || !saveBankTitle.trim()}
                  className="btn-primary px-8 py-2 font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all bg-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  {isSavingToBank ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDownloadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDownloadModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a]">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2 text-black dark:text-white">
                    <Download className="text-gray-400 dark:text-gray-500 dark:text-gray-400" /> Download Hub
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Pilih format ekspor yang paling sesuai dengan kebutuhan
                    kelas Anda.
                  </p>
                </div>
                <button
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="p-2 text-gray-400 dark:text-gray-500 dark:text-gray-400 hover:text-black dark:text-white hover:bg-gray-200 transition-colors rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-xs font-bold font-editorial">
                        01
                      </div>
                      <h4 className="font-bold text-lg uppercase tracking-wider text-black dark:text-white">
                        Dokumen Cetak
                      </h4>
                    </div>

                    <div className="space-y-3">


                      <button 
                        onClick={() => handleExport("docx", true, true)}
                        className="w-full flex items-center justify-between p-4 border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.2)] transition-all group text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                            W
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              Microsoft Word (.docx)
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Format MS Word sepaket (Soal, Kunci, Pembahasan)
                            </div>
                          </div>
                        </div>
                        <Download
                          size={18}
                          className="text-gray-300 group-hover:text-blue-500"
                        />
                      </button>

                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-xs font-bold font-editorial">
                        02
                      </div>
                      <h4 className="font-bold text-lg uppercase tracking-wider text-black dark:text-white">
                        Platform Digital
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <QuizizzExportButton 
                        soalData={{
                          soal: generatedQuestions
                        }}
                      />

                      <GoogleFormExportButton 
                        soalData={{
                          header: {
                            nama_sekolah: "EDUCRAFT AI",
                            mata_pelajaran: "Materi Umum",
                            kelas: "Umum",
                            durasi: "60 Menit"
                          },
                          soal: generatedQuestions
                        }}
                      />

                      <button className="p-6 border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] hover:border-black dark:border-white/20 transition-all flex flex-col items-center justify-center gap-3 text-center border-dashed group">
                        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#2a2a2a] text-gray-400 dark:text-gray-500 dark:text-gray-400 flex items-center justify-center font-bold text-xl mb-1 group-hover:bg-black group-hover:text-white transition-colors">
                          <Plus size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-500 dark:text-gray-400 group-hover:text-black dark:text-white">
                            Lainnya
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">
                            Moodle, Canvas
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
