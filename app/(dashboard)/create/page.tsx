"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Trash2,
  Plus,
} from "lucide-react";

export default function CreateQuestionWizard() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const [inputTypes, setInputTypes] = useState<string[]>(["text"]);
  const [inputText, setInputText] = useState("");

  type ConfigBlock = {
    id: string;
    type: string;
    level: string;
    count: number;
  };
  const [configBlocks, setConfigBlocks] = useState<ConfigBlock[]>([
    { id: "initial-1", type: "Pilihan Ganda", level: "HOTS", count: 10 },
  ]);

  const addBlock = () => {
    setConfigBlocks([
      ...configBlocks,
      { id: Math.random().toString(), type: "Essay", level: "LOTS", count: 5 },
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

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleGenerate = () => {
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      setStep(3);
    }, 4000);
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
    <div className="max-w-5xl mx-auto p-6 md:p-10 min-h-screen">
      <div className="mb-12">
        <h1 className="text-3xl font-editorial font-bold text-black mb-6">
          Racik Soal Baru
        </h1>
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-500 z-10 relative
                  ${step >= s ? "bg-black text-white" : "bg-white border-2 border-black/10 text-gray-400"}
                  ${step === s ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-[2px]" : ""}
                `}
                >
                  {step > s ? <CheckCircle size={18} /> : s}
                </div>
              </div>
              <div className="flex-1 h-1 bg-gray-200 relative overflow-hidden hidden sm:block">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-black"
                  initial={{ width: "0%" }}
                  animate={{ width: step > s ? "100%" : "0%" }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs font-semibold text-gray-500 mt-3 uppercase tracking-wider hidden sm:flex">
          <span className={step >= 1 ? "text-black" : ""}>1. Input Materi</span>
          <span
            className={step >= 2 ? "text-black text-center" : "text-center"}
          >
            2. Atur Parameter
          </span>
          <span className={step >= 3 ? "text-black text-right" : "text-right"}>
            3. Review Hasil
          </span>
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
                <h2 className="text-2xl font-bold mb-2">Bahan Baku Materi</h2>
                <p className="text-gray-500">
                  Pilih satu atau beberapa kombinasi input sekaligus agar hasil
                  AI lebih akurat.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: "text", label: "Teks Bebas", icon: Type },
                  { id: "file", label: "Upload PDF", icon: UploadCloud },
                  { id: "image", label: "Foto/Kamera", icon: Camera },
                  { id: "prompt", label: "Topik Singkat", icon: Sparkles },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => toggleInputType(type.id)}
                    className={`p-4 flex flex-col items-center justify-center gap-3 border transition-all relative ${
                      inputTypes.includes(type.id)
                        ? "border-black bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-1"
                        : "border-black/10 hover:border-black/30 hover:bg-gray-50 text-gray-500"
                    }`}
                  >
                    {inputTypes.includes(type.id) && (
                      <div className="absolute top-2 right-2 text-black">
                        <CheckCircle size={16} />
                      </div>
                    )}
                    <type.icon
                      size={24}
                      className={
                        inputTypes.includes(type.id)
                          ? "text-black"
                          : "text-gray-400"
                      }
                    />
                    <span
                      className={`font-semibold text-sm text-center ${inputTypes.includes(type.id) ? "text-black" : ""}`}
                    >
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-6 mt-8">
                {inputTypes.includes("text") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-semibold text-gray-700">
                      Paste Materi Anda di sini
                    </label>
                    <textarea
                      rows={5}
                      className="w-full p-4 bg-gray-50 border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none resize-none transition-all"
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
                    className="border-2 border-dashed border-black/20 bg-gray-50 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-black/50 hover:bg-gray-100 transition-colors"
                  >
                    <UploadCloud size={40} className="text-gray-400 mb-4" />
                    <p className="font-semibold text-black mb-1">
                      Drag & Drop file materi di sini
                    </p>
                    <p className="text-sm text-gray-500">
                      Mendukung format .PDF, .DOCX, atau .TXT (Max 10MB)
                    </p>
                    <button className="mt-6 px-6 py-2 bg-white border border-black/20 text-sm font-medium hover:border-black transition-colors">
                      Pilih File
                    </button>
                  </motion.div>
                )}

                {inputTypes.includes("image") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-2 border-black/10 bg-gray-50 p-6 flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Camera size={20} className="text-gray-700" />
                      <label className="text-sm font-semibold text-gray-700">
                        Foto Materi (Buku/Papan Tulis)
                      </label>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <button className="flex-1 py-8 flex flex-col items-center justify-center gap-3 bg-white border border-black/20 hover:border-black hover:bg-gray-100 transition-all text-gray-600 hover:text-black">
                        <UploadCloud size={24} />
                        <span className="font-medium text-sm">
                          Upload Foto (JPG/PNG)
                        </span>
                      </button>
                      <button className="flex-1 py-8 flex flex-col items-center justify-center gap-3 bg-black text-white hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        <Camera size={24} className="text-yellow-300" />
                        <span className="font-medium text-sm">
                          Ambil Foto dengan Kamera
                        </span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
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
                    <label className="text-sm font-semibold text-gray-700">
                      Topik Spesifik (Tambahkan instruksi khusus untuk AI)
                    </label>
                    <div className="relative">
                      <Sparkles
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                        placeholder="Contoh: Buatkan soal tentang Sejarah Kemerdekaan Indonesia 1945 dengan fokus pada Perjanjian Linggarjati"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex justify-end pt-6 border-t border-black/10">
                <button
                  onClick={handleNext}
                  className="btn-primary px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                >
                  Lanjut: Atur Parameter <ChevronRight size={18} />
                </button>
              </div>
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
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Parameter Soal</h2>
                  <p className="text-gray-500">
                    Racik tipe, tingkat kesulitan, dan jumlah soal secara
                    spesifik.
                  </p>
                </div>
                <div className="bg-black text-white px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                  <span className="text-sm font-semibold uppercase tracking-wider opacity-80 mr-2">
                    Total Soal:
                  </span>
                  <span className="text-2xl font-bold">{totalQuestions}</span>
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {configBlocks.map((block, index) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: -20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-2 border-black/10 bg-gray-50 p-6 flex flex-col md:flex-row gap-6 items-center"
                    >
                      <div className="font-bold text-gray-300 text-2xl hidden md:block">
                        {(index + 1).toString().padStart(2, "0")}
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Tipe Soal
                          </label>
                          <select
                            value={block.type}
                            onChange={(e) =>
                              updateBlock(block.id, "type", e.target.value)
                            }
                            className="w-full p-3 bg-white border border-black/20 focus:border-black outline-none font-medium cursor-pointer"
                          >
                            <option value="Pilihan Ganda">Pilihan Ganda</option>
                            <option value="Essay">Essay</option>
                            <option value="Isian Singkat">Isian Singkat</option>
                            <option value="Benar/Salah">Benar / Salah</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Level (Taksonomi)
                          </label>
                          <div className="flex">
                            <button
                              onClick={() =>
                                updateBlock(block.id, "level", "LOTS")
                              }
                              className={`flex-1 py-3 px-2 border border-r-0 text-center text-sm font-bold transition-all ${block.level === "LOTS" ? "bg-black text-white border-black" : "bg-white border-black/20 text-gray-500 hover:bg-gray-100"}`}
                            >
                              LOTS (C1-C3)
                            </button>
                            <button
                              onClick={() =>
                                updateBlock(block.id, "level", "HOTS")
                              }
                              className={`flex-1 py-3 px-2 border text-center text-sm font-bold transition-all ${block.level === "HOTS" ? "bg-black text-white border-black" : "bg-white border-black/20 text-gray-500 hover:bg-gray-100"}`}
                            >
                              HOTS (C4-C6)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Jumlah Soal
                            </label>
                            <span className="font-bold">{block.count}</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={block.count}
                            onChange={(e) =>
                              updateBlock(
                                block.id,
                                "count",
                                parseInt(e.target.value),
                              )
                            }
                            className="w-full accent-black h-2 bg-gray-200 rounded-none appearance-none mt-2"
                          />
                        </div>
                      </div>

                      {configBlocks.length > 1 && (
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-3 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                          title="Hapus baris ini"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button
                  onClick={addBlock}
                  className="w-full py-4 border-2 border-dashed border-black/20 text-gray-500 font-semibold hover:border-black hover:text-black hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> Tambah Racikan Lainnya
                </button>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                  Instruksi Khusus (Opsional)
                </label>
                <div className="relative">
                  <Sparkles
                    className="absolute left-4 top-4 text-gray-400"
                    size={18}
                  />
                  <textarea
                    rows={3}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                    placeholder="Contoh: Fokuskan pertanyaan hanya pada definisi dan tokoh penemu, jangan masukkan tahun kejadian."
                  />
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
                  onClick={handleGenerate}
                  className="btn-primary px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all bg-[#0a0a0a]"
                >
                  <Sparkles size={18} className="text-yellow-300" /> Generate{" "}
                  {totalQuestions} Soal
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
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-24 h-24 mb-8">
                <svg
                  className="animate-spin w-full h-full text-black/10"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <svg
                  className="animate-spin w-full h-full text-black absolute top-0 left-0"
                  viewBox="0 0 24 24"
                  style={{
                    animationDirection: "reverse",
                    animationDuration: "2s",
                  }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="15 45"
                  />
                </svg>
                <Sparkles
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black animate-pulse"
                  size={32}
                />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Meracik Soal Kelas Dunia...
              </h2>
              <p className="text-gray-500 text-center max-w-sm">
                AI sedang mengekstrak materi Anda dan menyusun {totalQuestions}{" "}
                soal sesuai parameter blok yang diminta.
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
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <CheckCircle className="text-green-600" /> Selesai!
                  </h2>
                  <p className="text-gray-500">
                    Berhasil membuat {totalQuestions} soal dari materi Anda.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 border border-black/20 font-medium hover:border-black transition-colors bg-white">
                    Simpan ke Bank Soal
                  </button>
                  <button className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                    <FileText size={16} /> Ekspor PDF
                  </button>
                </div>
              </div>

              <div className="space-y-4 mt-8">
                {[1, 2, 3].map((q) => (
                  <div
                    key={q}
                    className="border border-black/10 p-6 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-black text-white text-xs font-bold px-2 py-1 uppercase">
                        Soal {q} • Pilihan Ganda
                      </span>
                      <span className="text-xs font-semibold text-gray-500 uppercase border border-gray-300 px-2 py-1">
                        HOTS (C4)
                      </span>
                    </div>
                    <p className="font-medium text-lg mb-4">
                      Berdasarkan teks di atas, analisis apa dampak paling
                      signifikan dari proses fotosintesis terhadap ekosistem
                      global jika terjadi penurunan intensitas cahaya matahari
                      secara drastis?
                    </p>
                    <div className="space-y-2">
                      {[
                        "A. Penurunan populasi herbivora secara lambat.",
                        "B. Ketidakstabilan rantai makanan yang dimulai dari produsen.",
                        "C. Peningkatan kadar oksigen di atmosfer bumi.",
                        "D. Mutasi genetik pada tumbuhan tingkat rendah.",
                      ].map((opt, i) => (
                        <div
                          key={i}
                          className={`p-3 border ${i === 1 ? "border-green-500 bg-green-50" : "border-black/10 bg-white"}`}
                        >
                          <span
                            className={
                              i === 1
                                ? "text-green-700 font-medium"
                                : "text-gray-600"
                            }
                          >
                            {opt} {i === 1 && "(Kunci Jawaban)"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-8">
                <button
                  onClick={() => setStep(1)}
                  className="font-medium text-gray-500 hover:text-black underline transition-colors"
                >
                  Buat Soal Baru Lagi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
