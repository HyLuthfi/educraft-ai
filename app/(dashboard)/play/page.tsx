"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SelectBankSoalModal } from "@/app/components/SelectBankSoalModal";
import { MathText } from "@/app/components/MathText";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle,
  Bot,
  ChevronDown,
  Trash2,
  FileQuestion,
  BookOpen,
  Type,
  UploadCloud,
  Camera,
  X
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isRef: boolean) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (isRef) setRefFiles(prev => [...prev, ...newFiles]);
      else setRawFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const removeFile = (idx: number, isRef: boolean) => {
    if (isRef) setRefFiles(prev => prev.filter((_, i) => i !== idx));
    else setRawFiles(prev => prev.filter((_, i) => i !== idx));
  };
  
  const [params, setParams] = useState({
    explanationLevel: "singkat",
    strictReference: "campuran",
    languageStyle: "formal"
  });

  const [solvedQuestions, setSolvedQuestions] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isSelectBankSoalOpen, setIsSelectBankSoalOpen] = useState(false);

  // Autosave draft (teks saja; File tak bisa diserialisasi ke localStorage).
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
        if (p.referenceMaterial !== undefined) setReferenceMaterial(p.referenceMaterial);
        if (p.params) setParams(p.params);
        if (p.solvedQuestions) setSolvedQuestions(p.solvedQuestions);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(
      "educraft_play_draft",
      JSON.stringify({ step, rawInputTypes, refInputTypes, rawQuestions, referenceMaterial, params, solvedQuestions }),
    );
  }, [step, rawInputTypes, refInputTypes, rawQuestions, referenceMaterial, params, solvedQuestions, isMounted]);

  const resetAll = () => {
    localStorage.removeItem("educraft_play_draft");
    setStep(1);
    setRawInputTypes(["text"]);
    setRefInputTypes(["text"]);
    setRawQuestions("");
    setReferenceMaterial("");
    setRawFiles([]);
    setRefFiles([]);
    setParams({ explanationLevel: "singkat", strictReference: "campuran", languageStyle: "formal" });
    setSolvedQuestions([]);
    toast.success("Formulir berhasil di-reset");
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
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
      
      rawFiles.forEach(f => formData.append("raw_files", f));
      refFiles.forEach(f => formData.append("reference_files", f));

      const res = await fetch("/api/solve", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errData = await res.text();
        throw new Error("Gagal menyelesaikan soal: " + errData);
      }
      
      const data = await res.json();
      
      if (data.warning || !data.soal || data.soal.length === 0) {
        toast.warning(
          data.warning || "AI tidak menemukan soal yang valid dalam input Anda. Coba masukkan teks yang berisi pertanyaan atau soal ujian.",
          { duration: 6000 }
        );
        setIsSolving(false);
        return;
      }

      setSolvedQuestions(data.soal);
      setStep(3);
    } catch(err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan saat memproses soal.");
    } finally {
      setIsSolving(false);
    }
  };

  const inputTypeOptions = [
    { id: "text", label: "Teks Bebas", icon: Type },
    { id: "file", label: "Upload PDF", icon: UploadCloud },
    { id: "image", label: "Foto/Kamera", icon: Camera },
  ];

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pb-24">
      <div className="mb-4 sm:mb-10">
        <div className="flex justify-between items-center mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
            Bot Penjawab & Perapi Soal
          </h1>
          <button
            onClick={resetAll}
            className="px-2.5 sm:px-4 py-1 sm:py-2 border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 transition-colors text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2"
          >
            <Trash2 size={14} /> Reset
          </button>
        </div>
        <div className="relative flex justify-between items-start sm:items-center">
          <div className="absolute top-4 sm:top-5 left-8 sm:left-10 right-8 sm:right-10 h-1 bg-gray-200 dark:bg-white/10 z-0 hidden sm:block">
            <motion.div
              className="h-full bg-black dark:bg-white"
              initial={{ width: "0%" }}
              animate={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {[
            { id: 1, label: "1. Input Soal" },
            { id: 2, label: "2. Parameter" },
            { id: 3, label: "3. Hasil" },
          ].map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-1 sm:gap-3 bg-[#f9f9f9] dark:bg-[#121212] px-1 sm:px-4">
              <div
                className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-colors duration-500
                ${step >= s.id ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-[#1e1e1e] border-2 border-black/10 dark:border-white/10 text-gray-400 dark:text-gray-500"}
                ${step === s.id ? "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] -translate-y-[1px]" : ""}
              `}
              >
                {step > s.id ? <CheckCircle size={14} className="sm:w-[18px] sm:h-[18px]" /> : s.id}
              </div>
              <span className={`hidden sm:block text-xs font-semibold uppercase tracking-wider ${step >= s.id ? "text-black dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-3 sm:p-6 md:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.12)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] min-h-0 sm:min-h-[500px]">
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
              className="space-y-4 sm:space-y-8"
            >
              <div>
                <h2 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Input Soal Mentah & Referensi</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Pilih satu atau beberapa kombinasi input sekaligus agar hasil AI lebih akurat.
                </p>
              </div>

              <div className="space-y-4 sm:space-y-8">
                <div className="border-2 border-black dark:border-white/20 p-3 sm:p-6 bg-white dark:bg-[#1e1e1e]">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
                    <div>
                      <h2 className="text-base sm:text-xl font-bold mb-0.5 sm:mb-1">Bahan Baku Soal Mentah</h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pilih satu atau beberapa jenis input untuk memasukkan soal berantakan Anda.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSelectBankSoalOpen(true)}
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black font-black uppercase text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        <FileQuestion size={13} /> Pilih dari Bank Soal
                      </button>
                      {(rawQuestions || rawFiles.length > 0) && (
                        <button onClick={() => { setRawQuestions(""); setRawFiles([]); }} className="px-2.5 sm:px-3 py-1 sm:py-1.5 border border-red-500 text-red-500 font-bold hover:bg-red-50 transition-colors text-xs flex items-center gap-1">
                          <Trash2 size={13} /> Reset
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    {inputTypeOptions.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => toggleInputType(type.id, false)}
                        className={`p-2.5 sm:p-4 flex flex-col items-center justify-center gap-1.5 sm:gap-3 border transition-all relative ${
                          rawInputTypes.includes(type.id)
                            ? "border-black dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-0.5 sm:-translate-y-1"
                            : "border-black/10 dark:border-white/10 hover:border-black/30 hover:bg-gray-50 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {rawInputTypes.includes(type.id) && (
                          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 text-black dark:text-white"><CheckCircle size={14} /></div>
                        )}
                        <type.icon size={20} className={`sm:w-6 sm:h-6 ${rawInputTypes.includes(type.id) ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500"}`} />
                        <span className={`font-semibold text-xs sm:text-sm text-center ${rawInputTypes.includes(type.id) ? "text-black dark:text-white" : ""}`}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <input type="file" accept=".pdf" ref={rawPdfRef} className="hidden" multiple onChange={(e) => handleFileChange(e, false)} />
                  <input type="file" accept="image/*" ref={rawImgRef} className="hidden" multiple onChange={(e) => handleFileChange(e, false)} />

                  <div className="space-y-4 sm:space-y-6">
                    {rawInputTypes.includes("text") && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                        <label className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider">
                          <FileQuestion size={14} className="text-black dark:text-white"/> Paste Soal Anda di sini <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={5}
                          className="w-full p-2.5 sm:p-4 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black dark:border-white/20 focus:bg-white dark:focus:bg-[#333] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none resize-none text-xs sm:text-sm transition-all"
                          placeholder="Paste soal-soal Anda di sini. Format teks tidak harus rapi, AI akan merapikannya."
                          value={rawQuestions}
                          onChange={(e) => setRawQuestions(e.target.value)}
                        ></textarea>
                      </motion.div>
                    )}

                    {rawInputTypes.includes("file") && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-4 sm:p-8 flex flex-col items-center justify-center text-center hover:border-black/50 hover:bg-gray-100 dark:bg-[#2a2a2a] transition-colors"
                      >
                        <UploadCloud size={32} className="sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500 mb-2 sm:mb-4" />
                        <p className="font-semibold text-black dark:text-white text-xs sm:text-base mb-1">Pilih file soal Anda</p>
                        <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">Mendukung format .PDF (Max 100MB)</p>
                        <button
                          onClick={() => rawPdfRef.current?.click()}
                          className="mt-3 sm:mt-6 px-4 sm:px-6 py-1.5 sm:py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 text-xs sm:text-sm font-medium hover:border-black dark:border-white/20 transition-colors"
                        >
                          Pilih File
                        </button>
                        {rawFiles.filter(f => f.type === "application/pdf").length > 0 && (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                            {rawFiles.filter(f => f.type === "application/pdf").map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold">
                                <span className="truncate max-w-[120px] sm:max-w-[150px]">{f.name}</span>
                                <button onClick={() => removeFile(rawFiles.indexOf(f), false)} className="hover:text-red-400"><X size={12}/></button>
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
                        <div className="flex items-center gap-2 mb-1">
                          <Camera size={18} className="text-gray-700 dark:text-gray-300" />
                          <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Foto Soal (Buku/Kertas Ujian)</label>
                        </div>
                        <button
                          onClick={() => rawImgRef.current?.click()}
                          className="py-5 sm:py-8 flex flex-col items-center justify-center gap-2 sm:gap-3 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 hover:border-black dark:border-white/20 hover:bg-gray-100 dark:bg-[#2a2a2a] transition-all text-gray-600 dark:text-gray-400 hover:text-black dark:text-white"
                        >
                          <UploadCloud size={22} />
                          <span className="font-medium text-xs sm:text-sm">Upload Foto (JPG/PNG)</span>
                        </button>
                        {rawFiles.filter(f => f.type.startsWith("image/")).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                            {rawFiles.filter(f => f.type.startsWith("image/")).map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold">
                                <span className="truncate max-w-[120px] sm:max-w-[150px]">{f.name}</span>
                                <button onClick={() => removeFile(rawFiles.indexOf(f), false)} className="hover:text-red-400"><X size={12}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-center">AI akan langsung membaca isi gambar tanpa OCR terpisah.</p>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="border-2 border-black dark:border-white/20 p-3 sm:p-6 bg-white dark:bg-[#1e1e1e]">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div>
                      <h2 className="text-base sm:text-xl font-bold mb-0.5 sm:mb-1">Materi Referensi / Kunci (Opsional)</h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pilih satu atau beberapa jenis input untuk memberikan referensi jawaban kepada AI.</p>
                    </div>
                    {(referenceMaterial || refFiles.length > 0) && (
                      <button onClick={() => { setReferenceMaterial(""); setRefFiles([]); }} className="px-2.5 sm:px-3 py-1 sm:py-1.5 border border-red-500 text-red-500 font-bold hover:bg-red-50 transition-colors text-xs flex items-center gap-1">
                        <Trash2 size={13} /> Reset
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    {inputTypeOptions.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => toggleInputType(type.id, true)}
                        className={`p-2.5 sm:p-4 flex flex-col items-center justify-center gap-1.5 sm:gap-3 border transition-all relative ${
                          refInputTypes.includes(type.id)
                            ? "border-black dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-0.5 sm:-translate-y-1"
                            : "border-black/10 dark:border-white/10 hover:border-black/30 hover:bg-gray-50 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {refInputTypes.includes(type.id) && (
                          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 text-black dark:text-white"><CheckCircle size={14} /></div>
                        )}
                        <type.icon size={20} className={`sm:w-6 sm:h-6 ${refInputTypes.includes(type.id) ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500"}`} />
                        <span className={`font-semibold text-xs sm:text-sm text-center ${refInputTypes.includes(type.id) ? "text-black dark:text-white" : ""}`}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <input type="file" accept=".pdf" ref={refPdfRef} className="hidden" multiple onChange={(e) => handleFileChange(e, true)} />
                  <input type="file" accept="image/*" ref={refImgRef} className="hidden" multiple onChange={(e) => handleFileChange(e, true)} />

                  <div className="space-y-6">
                    {refInputTypes.includes("text") && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 uppercase tracking-wider">
                          <BookOpen size={16} className="text-black dark:text-white"/> Paste Referensi di sini
                        </label>
                        <textarea
                          rows={6}
                          className="w-full p-4 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black dark:border-white/20 focus:bg-white dark:focus:bg-[#333] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] outline-none resize-none text-sm transition-all"
                          placeholder="Paste materi contekan, buku pedoman, atau kunci jawaban kotor di sini."
                          value={referenceMaterial}
                          onChange={(e) => setReferenceMaterial(e.target.value)}
                        ></textarea>
                      </motion.div>
                    )}

                    {refInputTypes.includes("file") && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-8 flex flex-col items-center justify-center text-center hover:border-black/50 hover:bg-gray-100 dark:bg-[#2a2a2a] transition-colors"
                      >
                        <UploadCloud size={40} className="text-gray-400 dark:text-gray-500 dark:text-gray-400 mb-4" />
                        <p className="font-semibold text-black dark:text-white mb-1">Pilih file referensi Anda</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Mendukung format .PDF (Max 100MB)</p>
                        <button
                          onClick={() => refPdfRef.current?.click()}
                          className="mt-6 px-6 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 text-sm font-medium hover:border-black dark:border-white/20 transition-colors"
                        >
                          Pilih File
                        </button>
                        {refFiles.filter(f => f.type === "application/pdf").length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {refFiles.filter(f => f.type === "application/pdf").map((f, i) => (
                              <div key={i} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 text-xs font-semibold">
                                <span className="truncate max-w-[150px]">{f.name}</span>
                                <button onClick={() => removeFile(refFiles.indexOf(f), true)} className="hover:text-red-400"><X size={12}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {refInputTypes.includes("image") && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-6 flex flex-col gap-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Camera size={20} className="text-gray-700 dark:text-gray-300" />
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Foto Referensi (Buku/Kunci Jawaban)</label>
                        </div>
                        <button
                          onClick={() => refImgRef.current?.click()}
                          className="py-8 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 hover:border-black dark:border-white/20 hover:bg-gray-100 dark:bg-[#2a2a2a] transition-all text-gray-600 dark:text-gray-400 hover:text-black dark:text-white"
                        >
                          <UploadCloud size={24} />
                          <span className="font-medium text-sm">Upload Foto (JPG/PNG)</span>
                        </button>
                        {refFiles.filter(f => f.type.startsWith("image/")).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {refFiles.filter(f => f.type.startsWith("image/")).map((f, i) => (
                              <div key={i} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 text-xs font-semibold">
                                <span className="truncate max-w-[150px]">{f.name}</span>
                                <button onClick={() => removeFile(refFiles.indexOf(f), true)} className="hover:text-red-400"><X size={12}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">AI akan langsung membaca isi gambar tanpa OCR terpisah.</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-black/10 dark:border-white/10">
                <button
                  onClick={handleNext}
                  disabled={!rawQuestions.trim() && rawFiles.length === 0}
                  className={`px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all ${
                    !rawQuestions.trim() && rawFiles.length === 0
                      ? "bg-gray-200 text-gray-400 dark:text-gray-500 dark:text-gray-400 cursor-not-allowed border border-gray-300"
                      : "btn-primary hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                  }`}
                >
                  Lanjut: Parameter <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && !isSolving && (
            <motion.div
              key="step2"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-4 sm:space-y-8"
            >
              <div>
                <h2 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Parameter Penjawab</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Atur cara AI merapikan format dan mengulas jawaban Anda.
                </p>
              </div>

              <div className="space-y-4 sm:space-y-6 max-w-2xl">
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Kedalaman Pembahasan</label>
                  <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                    {["tanpa_pembahasan", "singkat", "detail"].map((val) => (
                      <button
                        key={val}
                        onClick={() => setParams({...params, explanationLevel: val})}
                        className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 border font-bold text-xs sm:text-sm transition-all ${
                          params.explanationLevel === val ? "bg-black text-white border-black dark:border-white/20" : "bg-white dark:bg-[#1e1e1e] border-black/20 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-[#2a2a2a]"
                        }`}
                      >
                        {val === "tanpa_pembahasan" ? "Tanpa Pembahasan" : val === "singkat" ? "Singkat" : "Detail & Step-by-step"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Sumber Referensi Jawaban</label>
                  <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                    {["strict", "campuran"].map((val) => (
                      <button
                        key={val}
                        onClick={() => setParams({...params, strictReference: val})}
                        className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 border font-bold text-xs sm:text-sm transition-all ${
                          params.strictReference === val ? "bg-black text-white border-black dark:border-white/20" : "bg-white dark:bg-[#1e1e1e] border-black/20 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-[#2a2a2a]"
                        }`}
                      >
                        {val === "strict" ? "Hanya dari Panel Kanan" : "Campur dengan Otak AI"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <label className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Gaya Bahasa</label>
                  <select 
                    value={params.languageStyle}
                    onChange={(e) => setParams({...params, languageStyle: e.target.value})}
                    className="w-full p-2.5 sm:p-4 text-xs sm:text-base border-2 border-black dark:border-white/20 focus:bg-white dark:focus:bg-[#333] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none font-bold transition-all"
                  >
                    <option value="formal">Akademis Formal (Indonesia)</option>
                    <option value="santai">Ramah Anak / Santai (Indonesia)</option>
                    <option value="english">English (Formal)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 sm:pt-6 border-t border-black/10 dark:border-white/10 gap-2">
                <button
                  onClick={handlePrev}
                  className="px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:text-white flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft size={16} /> Kembali
                </button>
                <button
                  onClick={handleSolve}
                  className="btn-primary px-4 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[1px] hover:translate-x-[1px] active:shadow-none transition-all"
                >
                  <Sparkles size={16} className="text-current" /> Jawab Soal Sekarang
                </button>
              </div>
            </motion.div>
          )}

          {isSolving && (
            <motion.div
              key="solving"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-24 h-24 mb-8">
                <svg className="animate-spin w-full h-full text-black dark:text-white/10" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                <svg className="animate-spin w-full h-full text-black dark:text-white absolute top-0 left-0" viewBox="0 0 24 24" style={{ animationDirection: "reverse", animationDuration: "2s" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="15 45" />
                </svg>
                <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black dark:text-white animate-pulse" size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">AI Sedang Bekerja...</h2>
              <p className="text-gray-500 dark:text-gray-400 animate-pulse">Merapikan format dan memecahkan soal Anda</p>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-6 border-b border-black/10 dark:border-white/10 pb-3 sm:pb-6 gap-2">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold mb-0.5 sm:mb-2">Hasil Pemecahan Soal</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Soal Anda telah dirapikan dan dijawab oleh AI.</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-black dark:border-white/20 font-bold hover:bg-gray-100 dark:bg-[#2a2a2a] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none"
                >
                  Ulangi
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {solvedQuestions.map((q, idx) => (
                  <div key={idx} className="border border-black/10 dark:border-white/10 p-3 sm:p-6 bg-white dark:bg-[#1e1e1e] shadow-sm relative overflow-hidden group hover:border-black/30 transition-all">
                    <div className="flex gap-2.5 sm:gap-4">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 bg-gray-100 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 sm:py-1">
                            {q.tipe.toUpperCase()}
                          </span>
                        </div>
                        <div className="font-semibold text-sm sm:text-lg mb-3 sm:mb-4 leading-relaxed">
                          <MathText content={q.teks} />
                        </div>
                        
                        {q.tipe === "pg" && q.opsi && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                            {q.opsi.map((opt: any, oIdx: number) => (
                              <div 
                                key={oIdx} 
                                className={`p-2 sm:p-3 border flex gap-2 text-xs sm:text-sm ${
                                  opt.benar 
                                    ? "bg-green-50 border-green-500 text-green-900 shadow-[inset_3px_0_0_0_#22c55e]" 
                                    : "border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400"
                                }`}
                              >
                                <span className={`font-bold ${opt.benar ? "text-green-700" : "text-gray-400 dark:text-gray-500"}`}>{opt.label}.</span>
                                <span className="break-words">
                                  <MathText content={opt.teks} inline />
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-blue-50/50 border border-blue-200 p-3 sm:p-4 relative">
                          <h4 className="font-bold text-blue-800 text-[11px] sm:text-xs uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1.5">
                            <Sparkles size={13} /> Kunci Jawaban & Pembahasan
                          </h4>
                          <div className="font-bold text-black dark:text-white text-xs sm:text-sm mb-1.5">
                            Jawaban: <MathText content={q.kunci_jawaban || "-"} inline />
                          </div>
                          {q.pembahasan && (
                            <div className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed">
                              <MathText content={q.pembahasan} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SelectBankSoalModal
        isOpen={isSelectBankSoalOpen}
        onClose={() => setIsSelectBankSoalOpen(false)}
        onSelect={(item) => {
          if (!rawInputTypes.includes("text")) {
            setRawInputTypes((prev) => [...prev, "text"]);
          }
          setRawQuestions(item.questionsText);
          toast.success(`Paket "${item.title}" (${item.questionsCount} soal) siap dibedah!`);
        }}
      />
    </div>
  );
}
