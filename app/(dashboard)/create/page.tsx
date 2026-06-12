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
  Plus,
  Download,
  X,
  Bot,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

export default function CreateQuestionWizard() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [aiModel, setAiModel] = useState("auto");
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null,
  );

  const aiModels = [
    { id: "auto", name: "AI: Otomatis" },
    { id: "gpt-4o", name: "GPT-4o (OpenAI)" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "llama-3", name: "Llama 3 (Groq)" },
  ];

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
        <div className="relative flex justify-between items-start sm:items-center">
          <div className="absolute top-5 left-10 right-10 h-1 bg-gray-200 z-0 hidden sm:block">
            <motion.div
              className="h-full bg-black"
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
              className="relative z-10 flex flex-col items-center gap-3 bg-[#f5f5f7] px-2 sm:px-4"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-500
                ${step >= s.id ? "bg-black text-white" : "bg-white border-2 border-black/10 text-gray-400"}
                ${step === s.id ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-[2px]" : ""}
              `}
              >
                {step > s.id ? <CheckCircle size={18} /> : s.id}
              </div>
              <span
                className={`hidden sm:block text-xs font-semibold uppercase tracking-wider ${step >= s.id ? "text-black" : "text-gray-500"}`}
              >
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
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative hidden md:block">
                    <button
                      onClick={() => setIsAiDropdownOpen(!isAiDropdownOpen)}
                      className="px-5 py-3 bg-white border-2 border-black/20 font-bold text-sm flex items-center gap-3 hover:border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[4px] active:translate-x-[4px]"
                    >
                      <Bot size={18} className="text-blue-600" />
                      {aiModels.find((m) => m.id === aiModel)?.name ||
                        "AI: Otomatis"}
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 ml-2 transition-transform ${isAiDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {isAiDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full mb-4 left-0 w-56 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden z-50 flex flex-col"
                        >
                          {aiModels.map((model, idx) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setAiModel(model.id);
                                setIsAiDropdownOpen(false);
                              }}
                              className={`w-full text-left px-5 py-4 text-sm font-bold transition-colors flex items-center gap-3 ${idx !== 0 ? "border-t border-black/10" : ""} ${aiModel === model.id ? "bg-gray-100 text-black" : "text-gray-500 hover:bg-gray-50 hover:text-black"}`}
                            >
                              {model.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="btn-primary px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all bg-[#0a0a0a] w-full sm:w-auto justify-center"
                  >
                    <Sparkles size={18} className="text-yellow-300" /> Generate{" "}
                    {totalQuestions} Soal
                  </button>
                </div>
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
                  <button
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Download size={16} /> Unduh
                  </button>
                </div>
              </div>

              <div className="space-y-4 mt-8">
                {[
                  {
                    id: 1,
                    type: "Pilihan Ganda",
                    level: "HOTS (C4)",
                    question:
                      "Berdasarkan teks di atas, analisis apa dampak paling signifikan dari proses fotosintesis terhadap ekosistem global jika terjadi penurunan intensitas cahaya matahari secara drastis?",
                    options: [
                      "A. Penurunan populasi herbivora secara lambat.",
                      "B. Ketidakstabilan rantai makanan yang dimulai dari produsen.",
                      "C. Peningkatan kadar oksigen di atmosfer bumi.",
                      "D. Mutasi genetik pada tumbuhan tingkat rendah.",
                    ],
                    answer: 1,
                  },
                  {
                    id: 2,
                    type: "Essay",
                    level: "HOTS (C5)",
                    question:
                      "Evaluasilah efektivitas kebijakan pemerintah dalam menangani perubahan iklim berdasarkan data emisi karbon lima tahun terakhir. Berikan argumen yang mendukung posisi Anda.",
                    answerText:
                      "Panduan Jawaban: Kebijakan pemerintah dapat dievaluasi efektif jika terjadi tren penurunan emisi gas rumah kaca yang terukur. Argumen harus mencakup analisis kebijakan spesifik (misal: pajak karbon, subsidi energi terbarukan) yang berkorelasi dengan penurunan emisi.",
                  },
                  {
                    id: 3,
                    type: "Isian Singkat",
                    level: "LOTS (C1)",
                    question:
                      "Proses penguapan air dari permukaan tumbuhan, terutama melalui stomata pada daun, disebut dengan istilah...",
                    answerText: "Kunci Jawaban: Transpirasi",
                  },
                  {
                    id: 4,
                    type: "Benar/Salah",
                    level: "LOTS (C2)",
                    question:
                      "Pernyataan: Reaksi terang pada fotosintesis terjadi di dalam stroma kloroplas.",
                    options: ["Benar", "Salah"],
                    answer: 1,
                  },
                ].map((q) => (
                  <div
                    key={q.id}
                    className="border border-black/10 p-6 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-black text-white text-xs font-bold px-2 py-1 uppercase">
                          Soal {q.id} • {q.type}
                        </span>
                        <span className="text-xs font-semibold text-gray-500 uppercase border border-gray-300 px-2 py-1">
                          {q.level}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setEditingQuestionId(
                            editingQuestionId === q.id ? null : q.id,
                          )
                        }
                        className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold transition-all border ${editingQuestionId === q.id ? "bg-black text-white border-black" : "bg-white text-gray-600 border-black/10 hover:border-black hover:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]"}`}
                      >
                        <Sparkles
                          size={14}
                          className={
                            editingQuestionId === q.id
                              ? "text-yellow-400"
                              : "text-purple-500"
                          }
                        />
                        {editingQuestionId === q.id
                          ? "Batal"
                          : "Revisi dengan AI"}
                      </button>
                    </div>
                    <p className="font-medium text-lg mb-4">{q.question}</p>

                    {q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt, i) => (
                          <div
                            key={i}
                            className={`p-3 border ${i === q.answer ? "border-green-500 bg-green-50" : "border-black/10 bg-white"}`}
                          >
                            <span
                              className={
                                i === q.answer
                                  ? "text-green-700 font-medium"
                                  : "text-gray-600"
                              }
                            >
                              {opt} {i === q.answer && "(Kunci Jawaban)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.answerText && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 mt-4">
                        <span className="text-sm text-yellow-800 font-medium whitespace-pre-wrap">
                          {q.answerText}
                        </span>
                      </div>
                    )}

                    {/* Inline Regenerate UI */}
                    <AnimatePresence>
                      {editingQuestionId === q.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-black/10 flex flex-col gap-3">
                            <label className="text-xs font-bold uppercase text-gray-500">
                              Instruksi Perbaikan (Opsional)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Contoh: Ganti konteksnya menjadi tentang lingkungan RT/RW"
                                className="flex-1 px-3 py-2 text-sm border border-black/10 focus:border-black outline-none bg-white transition-colors"
                              />
                              <button className="px-5 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2">
                                <Sparkles
                                  size={14}
                                  className="text-yellow-400"
                                />{" "}
                                Buat Ulang
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
                  className="font-medium text-gray-500 hover:text-black underline transition-colors"
                >
                  Buat Soal Baru Lagi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              className="relative w-full max-w-4xl bg-white border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-black/10 bg-gray-50">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2 text-black">
                    <Download className="text-gray-400" /> Download Hub
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Pilih format ekspor yang paling sesuai dengan kebutuhan
                    kelas Anda.
                  </p>
                </div>
                <button
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-200 transition-colors rounded-full"
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
                      <h4 className="font-bold text-lg uppercase tracking-wider text-black">
                        Dokumen Cetak
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-4 border border-black/10 bg-white hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all group text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-50 text-red-600 flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              PDF Lembar Soal
                            </div>
                            <div className="text-xs text-gray-500">
                              Hanya pertanyaan, siap dibagikan ke siswa
                            </div>
                          </div>
                        </div>
                        <Download
                          size={18}
                          className="text-gray-300 group-hover:text-black"
                        />
                      </button>

                      <button className="w-full flex items-center justify-between p-4 border border-black/10 bg-white hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all group text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-yellow-50 text-yellow-600 flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              PDF Kunci Jawaban
                            </div>
                            <div className="text-xs text-gray-500">
                              Pegangan guru, lengkap dengan rubrik
                            </div>
                          </div>
                        </div>
                        <Download
                          size={18}
                          className="text-gray-300 group-hover:text-black"
                        />
                      </button>

                      <button className="w-full flex items-center justify-between p-4 border border-black/10 bg-white hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all group text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-50 text-green-600 flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              PDF Lengkap (Soal + Jawaban)
                            </div>
                            <div className="text-xs text-gray-500">
                              Bahan evaluasi komprehensif
                            </div>
                          </div>
                        </div>
                        <Download
                          size={18}
                          className="text-gray-300 group-hover:text-black"
                        />
                      </button>

                      <button className="w-full flex items-center justify-between p-4 border border-black/10 bg-white hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.2)] transition-all group text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                            W
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              Microsoft Word (.docx)
                            </div>
                            <div className="text-xs text-gray-500">
                              Format mentah, bisa diedit ulang di MS Word
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
                      <h4 className="font-bold text-lg uppercase tracking-wider text-black">
                        Platform Digital
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button className="p-6 border border-black/10 bg-white hover:border-[#864CFF] hover:bg-[#f9f5ff] transition-all flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-[#864CFF]/10 text-[#864CFF] flex items-center justify-center font-bold text-xl mb-1">
                          Q
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-[#864CFF]">
                            Quizizz
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                            Format Excel
                          </div>
                        </div>
                      </button>

                      <button className="p-6 border border-black/10 bg-white hover:border-[#673AB7] hover:bg-[#f9f5ff] transition-all flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-[#673AB7]/10 text-[#673AB7] flex items-center justify-center font-bold text-xl mb-1">
                          G
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-[#673AB7]">
                            Google Forms
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                            Auto-Import
                          </div>
                        </div>
                      </button>

                      <button className="p-6 border border-black/10 bg-white hover:border-[#46178f] hover:bg-[#f9f5ff] transition-all flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-[#46178f]/10 text-[#46178f] flex items-center justify-center font-bold text-xl mb-1">
                          K!
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-[#46178f]">
                            Kahoot!
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                            Format Excel
                          </div>
                        </div>
                      </button>

                      <button className="p-6 border border-black/10 bg-white hover:border-black transition-all flex flex-col items-center justify-center gap-3 text-center border-dashed group">
                        <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center font-bold text-xl mb-1 group-hover:bg-black group-hover:text-white transition-colors">
                          <Plus size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-500 group-hover:text-black">
                            Lainnya
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
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
