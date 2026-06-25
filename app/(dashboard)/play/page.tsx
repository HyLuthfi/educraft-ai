"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
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
      setSolvedQuestions(data.soal || []);
      setStep(3);
    } catch(err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan");
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
    <div className="max-w-5xl mx-auto p-6 md:p-10 min-h-screen">
      <div className="mb-12">
        <h1 className="text-3xl font-editorial font-bold text-black mb-6">
          Bot Penjawab & Perapi Soal
        </h1>
        <div className="relative flex justify-between items-start sm:items-center">
          <div className="absolute top-5 left-10 right-10 h-1 bg-gray-200 z-0 hidden sm:block">
            <motion.div
              className="h-full bg-black"
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
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3 bg-[#f9f9f9] px-2 sm:px-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-500
                ${step >= s.id ? "bg-black text-white" : "bg-white border-2 border-black/10 text-gray-400"}
                ${step === s.id ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-[2px]" : ""}
              `}
              >
                {step > s.id ? <CheckCircle size={18} /> : s.id}
              </div>
              <span className={`hidden sm:block text-xs font-semibold uppercase tracking-wider ${step >= s.id ? "text-black" : "text-gray-500"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative bg-white border border-black/10 p-8 shadow-xl min-h-[500px]">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black -mt-0.5 -ml-0.5"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-black -mt-0.5 -mr-0.5"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-black -mb-0.5 -ml-0.5"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black -mb-0.5 -mr-0.5"></div>

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
              <div>
                <h2 className="text-2xl font-bold mb-2">Input Soal Mentah & Referensi</h2>
                <p className="text-gray-500">
                  Pilih satu atau beberapa kombinasi input sekaligus agar hasil AI lebih akurat.
                </p>
              </div>

              <div className="space-y-8">

                <div className="border border-black/10 p-6 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold mb-1">Bahan Baku Soal Mentah</h2>
                      <p className="text-sm text-gray-500">Pilih satu atau beberapa jenis input untuk memasukkan soal berantakan Anda.</p>
                    </div>
                    {(rawQuestions || rawFiles.length > 0) && (
                      <button onClick={() => { setRawQuestions(""); setRawFiles([]); }} className="px-3 py-1.5 border border-red-500 text-red-500 font-bold hover:bg-red-50 transition-colors text-xs flex items-center gap-2">
                        <Trash2 size={14} /> Reset
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    {inputTypeOptions.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => toggleInputType(type.id, false)}
                        className={`p-4 flex flex-col items-center justify-center gap-3 border transition-all relative ${
                          rawInputTypes.includes(type.id)
                            ? "border-black bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-1"
                            : "border-black/10 hover:border-black/30 hover:bg-gray-50 text-gray-500"
                        }`}
                      >
                        {rawInputTypes.includes(type.id) && (
                          <div className="absolute top-2 right-2 text-black"><CheckCircle size={16} /></div>
                        )}
                        <type.icon size={24} className={rawInputTypes.includes(type.id) ? "text-black" : "text-gray-400"} />
                        <span className={`font-semibold text-sm text-center ${rawInputTypes.includes(type.id) ? "text-black" : ""}`}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <input type="file" accept=".pdf" ref={rawPdfRef} className="hidden" multiple onChange={(e) => handleFileChange(e, false)} />
                  <input type="file" accept="image/*" ref={rawImgRef} className="hidden" multiple onChange={(e) => handleFileChange(e, false)} />

                  <div className="space-y-6">
                    {rawInputTypes.includes("text") && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
                          <FileQuestion size={16} className="text-blue-600"/> Paste Soal Anda di sini <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={6}
                          className="w-full p-4 bg-gray-50 border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none resize-none text-sm"
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
                        className="border-2 border-dashed border-black/20 bg-gray-50 p-8 flex flex-col items-center justify-center text-center hover:border-black/50 hover:bg-gray-100 transition-colors"
                      >
                        <UploadCloud size={40} className="text-gray-400 mb-4" />
                        <p className="font-semibold text-black mb-1">Pilih file soal Anda</p>
                        <p className="text-sm text-gray-500">Mendukung format .PDF (Max 100MB)</p>
                        <button
                          onClick={() => rawPdfRef.current?.click()}
                          className="mt-6 px-6 py-2 bg-white border border-black/20 text-sm font-medium hover:border-black transition-colors"
                        >
                          Pilih File
                        </button>
                        {rawFiles.filter(f => f.type === "application/pdf").length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {rawFiles.filter(f => f.type === "application/pdf").map((f, i) => (
                              <div key={i} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                                <span className="truncate max-w-[150px]">{f.name}</span>
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
                        className="border-2 border-black/10 bg-gray-50 p-6 flex flex-col gap-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Camera size={20} className="text-gray-700" />
                          <label className="text-sm font-semibold text-gray-700">Foto Soal (Buku/Kertas Ujian)</label>
                        </div>
                        <button
                          onClick={() => rawImgRef.current?.click()}
                          className="py-8 flex flex-col items-center justify-center gap-3 bg-white border border-black/20 hover:border-black hover:bg-gray-100 transition-all text-gray-600 hover:text-black"
                        >
                          <UploadCloud size={24} />
                          <span className="font-medium text-sm">Upload Foto (JPG/PNG)</span>
                        </button>
                        {rawFiles.filter(f => f.type.startsWith("image/")).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {rawFiles.filter(f => f.type.startsWith("image/")).map((f, i) => (
                              <div key={i} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                                <span className="truncate max-w-[150px]">{f.name}</span>
                                <button onClick={() => removeFile(rawFiles.indexOf(f), false)} className="hover:text-red-400"><X size={12}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 text-center">AI akan langsung membaca isi gambar tanpa OCR terpisah.</p>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="border border-black/10 p-6 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold mb-1">Materi Referensi / Kunci (Opsional)</h2>
                      <p className="text-sm text-gray-500">Pilih satu atau beberapa jenis input untuk memberikan referensi jawaban kepada AI.</p>
                    </div>
                    {(referenceMaterial || refFiles.length > 0) && (
                      <button onClick={() => { setReferenceMaterial(""); setRefFiles([]); }} className="px-3 py-1.5 border border-red-500 text-red-500 font-bold hover:bg-red-50 transition-colors text-xs flex items-center gap-2">
                        <Trash2 size={14} /> Reset
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    {inputTypeOptions.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => toggleInputType(type.id, true)}
                        className={`p-4 flex flex-col items-center justify-center gap-3 border transition-all relative ${
                          refInputTypes.includes(type.id)
                            ? "border-black bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-1"
                            : "border-black/10 hover:border-black/30 hover:bg-gray-50 text-gray-500"
                        }`}
                      >
                        {refInputTypes.includes(type.id) && (
                          <div className="absolute top-2 right-2 text-black"><CheckCircle size={16} /></div>
                        )}
                        <type.icon size={24} className={refInputTypes.includes(type.id) ? "text-black" : "text-gray-400"} />
                        <span className={`font-semibold text-sm text-center ${refInputTypes.includes(type.id) ? "text-black" : ""}`}>
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
                        <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
                          <BookOpen size={16} className="text-green-600"/> Paste Referensi di sini
                        </label>
                        <textarea
                          rows={6}
                          className="w-full p-4 bg-gray-50 border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none resize-none text-sm"
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
                        className="border-2 border-dashed border-black/20 bg-gray-50 p-8 flex flex-col items-center justify-center text-center hover:border-black/50 hover:bg-gray-100 transition-colors"
                      >
                        <UploadCloud size={40} className="text-gray-400 mb-4" />
                        <p className="font-semibold text-black mb-1">Pilih file referensi Anda</p>
                        <p className="text-sm text-gray-500">Mendukung format .PDF (Max 100MB)</p>
                        <button
                          onClick={() => refPdfRef.current?.click()}
                          className="mt-6 px-6 py-2 bg-white border border-black/20 text-sm font-medium hover:border-black transition-colors"
                        >
                          Pilih File
                        </button>
                        {refFiles.filter(f => f.type === "application/pdf").length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {refFiles.filter(f => f.type === "application/pdf").map((f, i) => (
                              <div key={i} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full text-xs font-semibold">
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
                        className="border-2 border-black/10 bg-gray-50 p-6 flex flex-col gap-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Camera size={20} className="text-gray-700" />
                          <label className="text-sm font-semibold text-gray-700">Foto Referensi (Buku/Kunci Jawaban)</label>
                        </div>
                        <button
                          onClick={() => refImgRef.current?.click()}
                          className="py-8 flex flex-col items-center justify-center gap-3 bg-white border border-black/20 hover:border-black hover:bg-gray-100 transition-all text-gray-600 hover:text-black"
                        >
                          <UploadCloud size={24} />
                          <span className="font-medium text-sm">Upload Foto (JPG/PNG)</span>
                        </button>
                        {refFiles.filter(f => f.type.startsWith("image/")).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {refFiles.filter(f => f.type.startsWith("image/")).map((f, i) => (
                              <div key={i} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                                <span className="truncate max-w-[150px]">{f.name}</span>
                                <button onClick={() => removeFile(refFiles.indexOf(f), true)} className="hover:text-red-400"><X size={12}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 text-center">AI akan langsung membaca isi gambar tanpa OCR terpisah.</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-black/10">
                <button
                  onClick={handleNext}
                  disabled={!rawQuestions.trim() && rawFiles.length === 0}
                  className={`px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all ${
                    !rawQuestions.trim() && rawFiles.length === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
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
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold mb-2">Parameter Penjawab</h2>
                <p className="text-gray-500">
                  Atur cara AI merapikan format dan mengulas jawaban Anda.
                </p>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div className="space-y-3">
                  <label className="text-sm font-semibold uppercase tracking-wider text-gray-700">Kedalaman Pembahasan</label>
                  <div className="flex gap-2">
                    {["tanpa_pembahasan", "singkat", "detail"].map((val) => (
                      <button
                        key={val}
                        onClick={() => setParams({...params, explanationLevel: val})}
                        className={`flex-1 py-3 px-4 border font-bold text-sm transition-all ${
                          params.explanationLevel === val ? "bg-black text-white border-black" : "bg-white border-black/20 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {val === "tanpa_pembahasan" ? "Tanpa Pembahasan" : val === "singkat" ? "Singkat" : "Detail & Step-by-step"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold uppercase tracking-wider text-gray-700">Sumber Referensi Jawaban</label>
                  <div className="flex gap-2">
                    {["strict", "campuran"].map((val) => (
                      <button
                        key={val}
                        onClick={() => setParams({...params, strictReference: val})}
                        className={`flex-1 py-3 px-4 border font-bold text-sm transition-all ${
                          params.strictReference === val ? "bg-black text-white border-black" : "bg-white border-black/20 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {val === "strict" ? "Hanya dari Panel Kanan" : "Campur dengan Otak AI"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold uppercase tracking-wider text-gray-700">Gaya Bahasa</label>
                  <select 
                    value={params.languageStyle}
                    onChange={(e) => setParams({...params, languageStyle: e.target.value})}
                    className="w-full p-4 border border-black/20 focus:border-black outline-none font-bold"
                  >
                    <option value="formal">Akademis Formal (Indonesia)</option>
                    <option value="santai">Ramah Anak / Santai (Indonesia)</option>
                    <option value="english">English (Formal)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-black/10">
                <button
                  onClick={handlePrev}
                  className="px-6 py-3 font-medium text-gray-500 hover:text-black flex items-center gap-2 transition-colors"
                >
                  <ChevronLeft size={18} /> Kembali
                </button>
                <button
                  onClick={handleSolve}
                  className="btn-primary px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all bg-blue-600 border-blue-800"
                >
                  <Sparkles size={18} className="text-white" /> Jawab Soal Sekarang
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
                <svg className="animate-spin w-full h-full text-black/10" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                <svg className="animate-spin w-full h-full text-blue-600 absolute top-0 left-0" viewBox="0 0 24 24" style={{ animationDirection: "reverse", animationDuration: "2s" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="15 45" />
                </svg>
                <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">AI Sedang Bekerja...</h2>
              <p className="text-gray-500 animate-pulse">Merapikan format dan memecahkan soal Anda</p>
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
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-6 border-b border-black/10 pb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Hasil Pemecahan Soal</h2>
                  <p className="text-gray-500">Soal Anda telah dirapikan dan dijawab oleh AI.</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border-2 border-black font-bold hover:bg-gray-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                >
                  Ulangi
                </button>
              </div>

              <div className="space-y-6">
                {solvedQuestions.map((q, idx) => (
                  <div key={idx} className="border border-black/10 p-6 bg-white shadow-sm relative overflow-hidden group hover:border-black/30 transition-all">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 shrink-0 bg-gray-100 border border-black/10 flex items-center justify-center font-bold text-gray-500 text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1">
                            {q.tipe.toUpperCase()}
                          </span>
                        </div>
                        <p className="font-semibold text-lg mb-4 whitespace-pre-wrap">{q.teks}</p>
                        
                        {q.tipe === "pg" && q.opsi && (
                          <div className="grid md:grid-cols-2 gap-3 mb-6">
                            {q.opsi.map((opt: any, oIdx: number) => (
                              <div 
                                key={oIdx} 
                                className={`p-3 border flex gap-3 ${
                                  opt.benar 
                                    ? "bg-green-50 border-green-500 text-green-900 shadow-[inset_4px_0_0_0_#22c55e]" 
                                    : "border-black/10 text-gray-600"
                                }`}
                              >
                                <span className={`font-bold ${opt.benar ? "text-green-700" : "text-gray-400"}`}>{opt.label}.</span>
                                <span>{opt.teks}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-blue-50/50 border border-blue-200 p-4 relative">
                          <h4 className="font-bold text-blue-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Sparkles size={14} /> Kunci Jawaban & Pembahasan
                          </h4>
                          <p className="font-bold text-black mb-2">Jawaban: {q.kunci_jawaban}</p>
                          {q.pembahasan && (
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{q.pembahasan}</p>
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
    </div>
  );
}
