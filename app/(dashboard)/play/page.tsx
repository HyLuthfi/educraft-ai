"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SelectBankSoalModal } from "@/app/components/SelectBankSoalModal";
import GoogleFormExportButton from "@/app/components/GoogleFormExportButton";
import QuizizzExportButton from "@/app/components/QuizizzExportButton";
import { MathText } from "@/app/components/MathText";
import { buatSupabaseClient } from "@/lib/supabase/client";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle,
  Trash2,
  FileQuestion,
  BookOpen,
  Type,
  UploadCloud,
  Camera,
  X,
  Download,
  Loader2,
  FileText,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

export default function SolveQuestionWizard() {
  const [step, setStep] = useState(1);
  const [isSolving, setIsSolving] = useState(false);

  const [rawInputTypes, setRawInputTypes] = useState<string[]>(["text"]);
  const [refInputTypes, setRefInputTypes] = useState<string[]>(["text"]);

  const [rawQuestions, setRawQuestions] = useState("");
  const [referenceMaterial, setReferenceMaterial] = useState("");

  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const rawPdfRef = useRef<HTMLInputElement>(null);
  const rawImgRef = useRef<HTMLInputElement>(null);
  const refPdfRef = useRef<HTMLInputElement>(null);
  const refImgRef = useRef<HTMLInputElement>(null);

  const toggleInputType = (type: string, isRef: boolean) => {
    const setter = isRef ? setRefInputTypes : setRawInputTypes;
    const current = isRef ? refInputTypes : rawInputTypes;
    if (current.includes(type)) {
      if (current.length > 1) {
        setter(current.filter((t) => t !== type));
      }
    } else {
      setter([...current, type]);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isRef: boolean
  ) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (isRef) setRefFiles((prev) => [...prev, ...newFiles]);
      else setRawFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const removeFile = (idx: number, isRef: boolean) => {
    if (isRef) setRefFiles((prev) => prev.filter((_, i) => i !== idx));
    else setRawFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const [params, setParams] = useState({
    explanationLevel: "singkat",
    strictReference: "campuran",
    languageStyle: "formal",
  });

  const [solvedQuestions, setSolvedQuestions] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isSelectBankSoalOpen, setIsSelectBankSoalOpen] = useState(false);
  const [showReference, setShowReference] = useState(false);

  // Modals Download & Simpan ke Bank Soal
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isSaveBankModalOpen, setIsSaveBankModalOpen] = useState(false);
  const [saveBankTitle, setSaveBankTitle] = useState("");
  const [saveBankFolder, setSaveBankFolder] = useState("Umum");
  const [isSavingToBank, setIsSavingToBank] = useState(false);

  // Loading Timer & Dynamic Stages
  const [solvingSeconds, setSolvingSeconds] = useState(0);
  const [solvingStageIdx, setSolvingStageIdx] = useState(0);

  const TAHAP_PENYELESAIAN = [
    "Membaca teks dan mengekstrak butir-butir soal mentah...",
    "Memvalidasi struktur pertanyaan dan opsi pilihan...",
    "Menganalisis logika pertanyaan & merumuskan kunci jawaban...",
    "Menyusun penjelasan edukatif dan langkah pembahasan...",
    "Memverifikasi konsistensi format naskah akhir...",
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let stageTimer: NodeJS.Timeout;

    if (isSolving) {
      setSolvingSeconds(0);
      setSolvingStageIdx(0);

      timer = setInterval(() => {
        setSolvingSeconds((prev) => prev + 1);
      }, 1000);

      stageTimer = setInterval(() => {
        setSolvingStageIdx((prev) => (prev + 1) % TAHAP_PENYELESAIAN.length);
      }, 3500);
    }

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, [isSolving]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Autosave draft ke localStorage
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("educraft_play_draft");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.step) setStep(p.step);
        if (p.rawInputTypes) setRawInputTypes(p.rawInputTypes);
        if (p.refInputTypes) setRefInputTypes(p.refInputTypes);
        if (p.rawQuestions !== undefined) setRawQuestions(p.rawQuestions);
        if (p.referenceMaterial !== undefined)
          setReferenceMaterial(p.referenceMaterial);
        if (p.params) setParams(p.params);
        if (p.solvedQuestions) setSolvedQuestions(p.solvedQuestions);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(
      "educraft_play_draft",
      JSON.stringify({
        step,
        rawInputTypes,
        refInputTypes,
        rawQuestions,
        referenceMaterial,
        params,
        solvedQuestions,
      })
    );
  }, [
    step,
    rawInputTypes,
    refInputTypes,
    rawQuestions,
    referenceMaterial,
    params,
    solvedQuestions,
    isMounted,
  ]);

  const resetAll = () => {
    localStorage.removeItem("educraft_play_draft");
    setStep(1);
    setRawInputTypes(["text"]);
    setRefInputTypes(["text"]);
    setRawQuestions("");
    setReferenceMaterial("");
    setRawFiles([]);
    setRefFiles([]);
    setParams({
      explanationLevel: "singkat",
      strictReference: "campuran",
      languageStyle: "formal",
    });
    setSolvedQuestions([]);
    toast.success("Formulir berhasil di-reset");
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

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSolve = async () => {
    setIsSolving(true);
    try {
      const formData = new FormData();
      formData.append("raw_questions", rawQuestions);
      formData.append("reference", referenceMaterial);
      formData.append("config", JSON.stringify(params));

      rawFiles.forEach((f) => formData.append("raw_files", f));
      refFiles.forEach((f) => formData.append("reference_files", f));

      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.text();
        throw new Error("Gagal menyelesaikan soal: " + errData);
      }

      const data = await res.json();

      if (data.warning || !data.soal || data.soal.length === 0) {
        toast.warning(
          data.warning ||
            "AI tidak menemukan soal yang valid dalam input Anda. Coba masukkan teks yang berisi pertanyaan atau soal ujian.",
          { duration: 6000 }
        );
        setIsSolving(false);
        return;
      }

      setSolvedQuestions(data.soal);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan saat memproses soal.");
    } finally {
      setIsSolving(false);
    }
  };

  // Simpan ke Bank Soal
  const openSaveBankModal = () => {
    if (!solvedQuestions.length) {
      toast.error("Belum ada soal untuk disimpan.");
      return;
    }
    let defaultTitle = rawQuestions.trim().substring(0, 35) || "Hasil Jawab Soal";
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Anda harus login untuk menyimpan soal.");
      }

      const { error } = await supabase.from("bank_soal").insert({
        user_id: user.id,
        title: saveBankTitle,
        folder: saveBankFolder || "Umum",
        content: { soal: solvedQuestions },
      });

      if (error) throw error;

      toast.success("Berhasil disimpan ke Bank Soal!", { id: toastId });
      setIsSaveBankModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menyimpan ke Bank Soal.", {
        id: toastId,
      });
    } finally {
      setIsSavingToBank(false);
    }
  };

  // Ekspor Dokumen Cetak (Word DOCX & PDF)
  const handleExport = async (
    format: "pdf" | "docx",
    sertakan_jawaban: boolean,
    sertakan_pembahasan: boolean
  ) => {
    const toastId = toast.loading(
      `Sedang memproses dokumen ${format.toUpperCase()}...`
    );

    try {
      const subject = "Hasil Jawab & Bedah Soal";

      const payload = {
        soal: solvedQuestions,
        header: {
          nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          mata_pelajaran: subject,
          kelas: "Semua Kelas",
          tanggal: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          durasi: "60 Menit",
        },
        sertakan_jawaban,
        sertakan_pembahasan,
      };

      const res = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail ||
            errData.error ||
            `Gagal mengekspor ${format.toUpperCase()}`
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Jawab_Soal_${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(
        `Berhasil mengunduh dokumen ${format.toUpperCase()}!`,
        { id: toastId }
      );
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.message ||
          `Terjadi kesalahan saat mengekspor ${format.toUpperCase()}`,
        { id: toastId }
      );
    }
  };

  const inputTypeOptions = [
    { id: "text", label: "Teks Bebas", icon: Type },
    { id: "file", label: "Upload PDF", icon: UploadCloud },
    { id: "image", label: "Foto/Kamera", icon: Camera },
  ];

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pb-24">
      {/* Header Halaman */}
      <div className="mb-4 sm:mb-10">
        <div className="flex justify-between items-center mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
            Jawab &amp; Bedah Soal
          </h1>
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
            { id: 1, label: "1. Input Soal" },
            { id: 2, label: "2. Parameter" },
            { id: 3, label: "3. Hasil Kuis" },
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

      {/* Kontainer Utama Neobrutalisme Bersih */}
      <div className="relative bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-3 sm:p-6 md:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.12)] min-h-0 sm:min-h-[500px]">
        {/* Sudut Balok Taktil */}
        <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-black dark:border-white/20 -mt-0.5 -ml-0.5"></div>
        <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-black dark:border-white/20 -mt-0.5 -mr-0.5"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-black dark:border-white/20 -mb-0.5 -ml-0.5"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-black dark:border-white/20 -mb-0.5 -mr-0.5"></div>

        <AnimatePresence mode="wait" custom={1}>
          {/* STEP 1: INPUT SOAL */}
          {step === 1 && !isSolving && (
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
              <div className="flex justify-between items-start gap-2 mb-2 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1">Bahan Baku Soal</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Pilih satu atau kombinasi input naskah soal untuk dipecahkan.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSelectBankSoalOpen(true)}
                    className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <FileText size={13} /> Bank Soal
                  </button>
                  <button
                    onClick={resetAll}
                    className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-xs flex items-center gap-1.5 shrink-0"
                    title="Bersihkan Semua Data"
                  >
                    <Trash2 size={13} /> Reset
                  </button>
                </div>
              </div>

              {/* Input Method Selector */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {inputTypeOptions.map((type) => {
                  const isSelected = rawInputTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleInputType(type.id, false)}
                      className={`p-2.5 sm:p-3 flex items-center justify-center gap-2 border-2 transition-all cursor-pointer text-xs sm:text-sm font-bold ${
                        isSelected
                          ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                          : "border-black/15 dark:border-white/15 hover:border-black/40 hover:bg-gray-50 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <type.icon size={16} />
                      <span>{type.label}</span>
                      {isSelected && (
                        <CheckCircle size={13} className="shrink-0 md:hidden ml-0.5 text-current" />
                      )}
                    </button>
                  );
                })}
              </div>

              <input
                type="file"
                accept=".pdf"
                ref={rawPdfRef}
                className="hidden"
                multiple
                onChange={(e) => handleFileChange(e, false)}
              />
              <input
                type="file"
                accept="image/*"
                ref={rawImgRef}
                className="hidden"
                multiple
                onChange={(e) => handleFileChange(e, false)}
              />

              <div className="space-y-4 sm:space-y-6">
                {rawInputTypes.includes("text") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1.5 sm:space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Paste Soal Anda di sini
                      </label>
                      {rawQuestions.length > 0 && (
                        <button
                          onClick={() => setRawQuestions("")}
                          className="text-[11px] sm:text-xs font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Bersihkan Teks
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      className="w-full p-2.5 sm:p-4 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black dark:border-white/20 focus:bg-white dark:focus:bg-[#333] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] outline-none resize-none transition-all text-xs sm:text-sm font-mono sm:font-sans"
                      placeholder="Tempel naskah soal mentah di sini (misal dari Word, ujian, atau buku)..."
                      value={rawQuestions}
                      onChange={(e) => setRawQuestions(e.target.value)}
                    />
                  </motion.div>
                )}

                {rawInputTypes.includes("file") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-4 sm:p-8 flex flex-col items-center justify-center text-center hover:border-black/50 transition-colors"
                  >
                    <UploadCloud size={32} className="text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="font-semibold text-black dark:text-white text-xs sm:text-base mb-1">
                      Pilih berkas PDF soal Anda
                    </p>
                    <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">
                      Mendukung format .PDF (Naskah ujian, kisi-kisi, modul)
                    </p>
                    <button
                      type="button"
                      onClick={() => rawPdfRef.current?.click()}
                      className="mt-3 sm:mt-5 px-4 sm:px-6 py-1.5 sm:py-2 bg-white dark:bg-[#1e1e1e] border-2 border-black/20 dark:border-white/20 text-xs sm:text-sm font-bold hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      Pilih File PDF
                    </button>

                    {rawFiles.filter((f) => f.name.endsWith(".pdf")).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                        {rawFiles
                          .filter((f) => f.name.endsWith(".pdf"))
                          .map((f, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold"
                            >
                              <span className="truncate max-w-[120px] sm:max-w-[150px]">{f.name}</span>
                              <button
                                type="button"
                                onClick={() => removeFile(rawFiles.indexOf(f), false)}
                                className="hover:text-red-400"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {rawInputTypes.includes("image") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-3.5 sm:p-6 flex flex-col gap-3 sm:gap-4"
                  >
                    <button
                      type="button"
                      onClick={() => rawImgRef.current?.click()}
                      className="py-4 sm:py-6 px-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 bg-white dark:bg-[#1e1e1e] border-2 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
                    >
                      <Camera size={20} className="sm:w-6 sm:h-6" />
                      <span className="font-bold text-xs sm:text-sm">
                        Ambil Foto / Unggah Gambar (JPG/PNG)
                      </span>
                    </button>

                    {rawFiles.filter((f) => f.type.startsWith("image/")).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                        {rawFiles
                          .filter((f) => f.type.startsWith("image/"))
                          .map((f, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold"
                            >
                              <span className="truncate max-w-[120px] sm:max-w-[150px]">{f.name}</span>
                              <button
                                type="button"
                                onClick={() => removeFile(rawFiles.indexOf(f), false)}
                                className="hover:text-red-400"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Collapsible Rujukan Tambahan (Opsional) */}
              <div className="pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowReference(!showReference)}
                  className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${
                      showReference ? "rotate-180" : ""
                    }`}
                  />
                  <span>+ Referensi Pembelajaran / Kunci Tambahan (Opsional)</span>
                </button>

                {showReference && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 p-3.5 sm:p-4 bg-gray-50 dark:bg-[#252525] border-2 border-black/10 dark:border-white/10 space-y-2"
                  >
                    <textarea
                      rows={3}
                      value={referenceMaterial}
                      onChange={(e) => setReferenceMaterial(e.target.value)}
                      placeholder="Tempelkan materi referensi atau kunci acuan jika ingin jawaban diprioritaskan dari sumber tertentu..."
                      className="w-full p-2.5 sm:p-3 bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 focus:border-black dark:focus:border-white outline-none resize-none text-xs sm:text-sm transition-all"
                    />
                  </motion.div>
                )}
              </div>

              {/* Tombol Lanjut Step 2 */}
              <div className="flex justify-end pt-4 sm:pt-6 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!rawQuestions.trim() && rawFiles.length === 0}
                  className={`px-6 sm:px-8 py-3 flex items-center gap-2 font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all ${
                    !rawQuestions.trim() && rawFiles.length === 0
                      ? "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed border-2 border-gray-300 dark:border-gray-700"
                      : "bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none cursor-pointer"
                  }`}
                >
                  Lanjut: Parameter <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: ATUR PARAMETER PENJAWAB */}
          {step === 2 && !isSolving && (
            <motion.div
              key="step2"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-6 sm:space-y-8 max-w-2xl"
            >
              <div>
                <h2 className="text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1 text-black dark:text-white">
                  Parameter Jawaban
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Atur kedalaman pembahasan dan gaya ulasan AI.
                </p>
              </div>

              <div className="space-y-5">
                {/* 1. Kedalaman Pembahasan */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Kedalaman Pembahasan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "tanpa_pembahasan", label: "Tanpa Pembahasan" },
                      { id: "singkat", label: "Singkat (1-2 Kalimat)" },
                      { id: "detail", label: "Detail & Step-by-step" },
                    ].map((opt) => {
                      const isSel = params.explanationLevel === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setParams({ ...params, explanationLevel: opt.id })
                          }
                          className={`py-3 px-3 border-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                            isSel
                              ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]"
                              : "bg-white dark:bg-[#1e1e1e] border-black/15 dark:border-white/15 text-gray-600 dark:text-gray-400 hover:border-black/40"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Sumber Referensi */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Sumber Rujukan Jawaban
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: "campuran", label: "Kombinasi Otak AI & Rujukan" },
                      { id: "strict", label: "Ketat (Hanya dari Rujukan)" },
                    ].map((opt) => {
                      const isSel = params.strictReference === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setParams({ ...params, strictReference: opt.id })
                          }
                          className={`py-3 px-3 border-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                            isSel
                              ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]"
                              : "bg-white dark:bg-[#1e1e1e] border-black/15 dark:border-white/15 text-gray-600 dark:text-gray-400 hover:border-black/40"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Gaya Bahasa */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Gaya Bahasa Pembahasan
                  </label>
                  <select
                    value={params.languageStyle}
                    onChange={(e) =>
                      setParams({ ...params, languageStyle: e.target.value })
                    }
                    className="w-full p-3 text-xs sm:text-sm bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none font-bold transition-all cursor-pointer"
                  >
                    <option value="formal">Akademis Formal (Bahasa Indonesia Baku)</option>
                    <option value="santai">Edukatif Ramah Anak (Mudah Dipahami)</option>
                    <option value="english">Formal English (International)</option>
                  </select>
                </div>
              </div>

              {/* Tombol Navigasi Step 2 */}
              <div className="flex justify-between items-center pt-6 border-t border-black/10 dark:border-white/10 gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} /> Kembali
                </button>
                <button
                  type="button"
                  onClick={handleSolve}
                  className="px-6 sm:px-8 py-3 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none transition-all cursor-pointer"
                >
                  <Sparkles size={16} /> Mulai Bedah &amp; Jawab Soal
                </button>
              </div>
            </motion.div>
          )}

          {/* LOADING ANIMATION (Persis Standar Buat Soal) */}
          {isSolving && (
            <motion.div
              key="solving"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 sm:py-16 px-3 sm:px-4 text-center max-w-lg mx-auto"
            >
              {/* Dual Spinning Orbit Rings */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-black/30 dark:border-white/30 animate-spin [animation-duration:8s]" />
                <div className="absolute inset-1.5 sm:inset-2 rounded-full border-4 border-t-black border-r-black/20 border-b-transparent border-l-black dark:border-t-white dark:border-r-white/20 dark:border-l-white animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut",
                    }}
                  >
                    <Sparkles size={28} className="text-black dark:text-white sm:w-8 sm:h-8" />
                  </motion.div>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-editorial font-bold mb-2 text-black dark:text-white">
                Membedah &amp; Menjawab Soal...
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-5 leading-relaxed">
                AI sedang menganalisis naskah Anda, merapikan struktur soal, dan menyusun pembahasan ilmiah.
              </p>

              {/* Progress Bar Shimmer */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative">
                <motion.div
                  className="h-full bg-black dark:bg-white relative overflow-hidden"
                  initial={{ width: "12%" }}
                  animate={{ width: ["12%", "35%", "65%", "85%", "95%"] }}
                  transition={{ duration: 20, ease: "easeOut" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-black/30 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "linear",
                    }}
                  />
                </motion.div>
              </div>

              {/* Live Status Card with Timer */}
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
                    ⏱ {formatTimer(solvingSeconds)}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 min-h-[32px]">
                  <Loader2
                    size={15}
                    className="animate-spin text-black dark:text-white shrink-0 mt-0.5"
                  />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={solvingStageIdx}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="leading-snug"
                    >
                      {TAHAP_PENYELESAIAN[solvingStageIdx]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: HASIL PEMBAHASAN & EXPORT */}
          {step === 3 && !isSolving && (
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
              {/* Header Step 3 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-black/10 dark:border-white/10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 flex items-center gap-2 text-black dark:text-white">
                    <CheckCircle
                      className="text-emerald-600 shrink-0"
                      size={24}
                    />{" "}
                    Hasil Selesai!
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Berhasil membedah dan menjawab {solvedQuestions.length} butir soal dari materi Anda.
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={openSaveBankModal}
                    disabled={isSavingToBank}
                    className="flex-1 sm:flex-initial text-center px-3 sm:px-4 py-2 border border-black/20 dark:border-white/20 font-medium hover:border-black dark:border-white/20 transition-colors bg-white dark:bg-[#1e1e1e] text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    {isSavingToBank ? "Menyimpan..." : "Simpan ke Bank Soal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2 bg-black text-white dark:bg-white dark:text-black font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 text-xs sm:text-sm shrink-0 whitespace-nowrap shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                  >
                    <Download size={15} /> Unduh
                  </button>
                </div>
              </div>

              {/* Daftar Kartu Soal & Jawaban */}
              <div className="space-y-4">
                {solvedQuestions.map((q, idx) => {
                  const t = (q.tipe || "pg").toLowerCase().trim();
                  const isBS =
                    t.includes("benar") ||
                    t.includes("salah") ||
                    t === "bs" ||
                    t.includes("true_false") ||
                    t.includes("tf");

                  return (
                    <div
                      key={idx}
                      className="border border-black/10 dark:border-white/10 p-3.5 sm:p-6 bg-gray-50 dark:bg-[#2a2a2a]"
                    >
                      {/* Badge Nomor & Tipe */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 uppercase">
                            Soal {idx + 1} • {isBS ? "BENAR / SALAH" : t.toUpperCase()}
                          </span>
                          {q.kesulitan && (
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border border-gray-300 dark:border-white/20 px-1.5 py-0.5">
                              {q.kesulitan}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Teks Pertanyaan */}
                      <div className="font-medium text-sm sm:text-lg mb-3 leading-relaxed text-black dark:text-white">
                        <MathText content={q.teks} />
                      </div>

                      {/* Opsi Pilihan Ganda Biasa */}
                      {!isBS && q.tipe === "pg" && q.opsi && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          {q.opsi.map((opt: any, oIdx: number) => (
                            <div
                              key={oIdx}
                              className={`p-2.5 sm:p-3 border-2 flex items-center gap-2.5 text-xs sm:text-sm font-medium ${
                                opt.benar
                                  ? "border-green-600 bg-green-50/50 dark:bg-green-950/20 text-green-900 dark:text-green-300 font-bold"
                                  : "border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                                  opt.benar
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {opt.label || String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="break-words">
                                <MathText content={opt.teks} inline />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Opsi Benar / Salah Checklist Badge */}
                      {isBS && (
                        <div className="grid grid-cols-2 gap-2 mb-4 max-w-xs">
                          {(() => {
                            const kunciLower = String(
                              q.kunci_jawaban || ""
                            ).toLowerCase();
                            const isBenar =
                              kunciLower.includes("benar") ||
                              kunciLower === "a";
                            return (
                              <>
                                <div
                                  className={`p-2.5 border-2 text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
                                    isBenar
                                      ? "border-green-600 bg-green-50/50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
                                      : "border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] text-gray-400"
                                  }`}
                                >
                                  <span>[✓] Benar</span>
                                </div>
                                <div
                                  className={`p-2.5 border-2 text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 ${
                                    !isBenar
                                      ? "border-green-600 bg-green-50/50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
                                      : "border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] text-gray-400"
                                  }`}
                                >
                                  <span>[✓] Salah</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Box Kunci Jawaban & Pembahasan (Clean Monokrom Editorial) */}
                      <div className="mt-3 p-3.5 sm:p-4 bg-white dark:bg-[#202020] border-l-4 border-l-black dark:border-l-white border-t border-r border-b border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles size={13} className="text-black dark:text-white" />
                          <h4 className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-black dark:text-white">
                            Kunci Jawaban &amp; Pembahasan
                          </h4>
                        </div>
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white mb-1.5">
                          Kunci:{" "}
                          <span className="font-mono">
                            <MathText
                              content={q.kunci_jawaban || "-"}
                              inline
                            />
                          </span>
                        </div>
                        {q.pembahasan && (
                          <div className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed">
                            <MathText content={q.pembahasan} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-8 pb-4 border-t border-black/10 dark:border-white/10 mt-8">
                <button
                  type="button"
                  onClick={openSaveBankModal}
                  disabled={isSavingToBank}
                  className="w-full sm:w-auto text-center px-4 py-2.5 border border-black/20 dark:border-white/20 font-medium hover:border-black dark:border-white/20 transition-colors bg-white dark:bg-[#1e1e1e] text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  {isSavingToBank ? "Menyimpan..." : "Simpan ke Bank Soal"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 text-xs sm:text-sm shrink-0 whitespace-nowrap shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                >
                  <Download size={16} /> Unduh Naskah Soal
                </button>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline transition-colors cursor-pointer"
                >
                  Bedah Soal Baru Lagi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL PILIH DARI BANK SOAL */}
      <SelectBankSoalModal
        isOpen={isSelectBankSoalOpen}
        onClose={() => setIsSelectBankSoalOpen(false)}
        onSelect={(item) => {
          if (!rawInputTypes.includes("text")) {
            setRawInputTypes((prev) => [...prev, "text"]);
          }
          setRawQuestions(item.questionsText);
          toast.success(
            `Paket "${item.title}" (${item.questionsCount} soal) siap dibedah!`
          );
        }}
      />

      {/* MODAL SIMPAN KE BANK SOAL */}
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
              <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a]">
                <h3 className="text-lg font-bold flex items-center gap-2 text-black dark:text-white">
                  Simpan ke Bank Soal
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSaveBankModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-black dark:text-white">
                    Judul Paket Soal
                  </label>
                  <input
                    type="text"
                    value={saveBankTitle}
                    onChange={(e) => setSaveBankTitle(e.target.value)}
                    placeholder="Contoh: Soal Biologi Sel & Jaringan"
                    className="w-full p-3 border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors font-medium text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-black dark:text-white">
                    Folder / Kategori
                  </label>
                  <input
                    type="text"
                    value={saveBankFolder}
                    onChange={(e) => setSaveBankFolder(e.target.value)}
                    placeholder="Contoh: Biologi, Kimia, Umum"
                    className="w-full p-3 border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors font-medium text-sm"
                  />
                </div>
              </div>

              <div className="p-5 border-t-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSaveBankModalOpen(false)}
                  className="px-5 py-2 border-2 border-black/20 dark:border-white/20 font-bold hover:border-black text-xs sm:text-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveToBank}
                  disabled={isSavingToBank}
                  className="px-6 py-2 bg-black text-white dark:bg-white dark:text-black font-bold text-xs sm:text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingToBank ? "Menyimpan..." : "Simpan Paket"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DOWNLOAD HUB (Word DOCX, Quizizz, GForm) */}
      <AnimatePresence>
        {isDownloadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDownloadModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg sm:max-w-xl bg-white dark:bg-[#1e1e1e] border-2 sm:border-3 border-black dark:border-white/20 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#252525]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-black dark:text-white">
                    <Download
                      size={18}
                      className="text-gray-500 dark:text-gray-400"
                    />{" "}
                    Download Hub
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs mt-0.5">
                    Pilih format dokumen hasil bedah soal sesuai kebutuhan Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto">
                {/* 01 Dokumen Cetak */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white dark:bg-white dark:text-black text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                      01
                    </span>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Dokumen Cetak Resmi
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExport("docx", true, true)}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded flex items-center justify-center font-bold text-sm shrink-0 border border-blue-300 dark:border-blue-800">
                        W
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white truncate">
                          Microsoft Word (.docx)
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                          Format resmi standar dinas (Soal, Kunci, Pembahasan)
                        </div>
                      </div>
                    </div>
                    <Download
                      size={16}
                      className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2"
                    />
                  </button>
                </div>

                {/* 02 Platform Digital */}
                <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white dark:bg-white dark:text-black text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                      02
                    </span>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Platform Digital
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    <QuizizzExportButton
                      soalData={{
                        soal: solvedQuestions,
                      }}
                    />

                    <GoogleFormExportButton
                      soalData={{
                        header: {
                          nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
                          mata_pelajaran: "Hasil Jawab Soal",
                          kelas: "Umum",
                          durasi: "60 Menit",
                        },
                        soal: solvedQuestions,
                      }}
                    />
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
