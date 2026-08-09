"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronRight,
  Type,
  UploadCloud,
  Camera,
  X,
  FileText,
  ClipboardList,
  Settings2,
  Sparkles,
  Trash2,
  Plus,
  AlertCircle,
  BookOpen,
} from "lucide-react";

type StudentAnswer = {
  id: string;
  name: string;
  answers: string;
};

export default function AutoKoreksiPage() {
  // ── Step navigation ──
  const [step, setStep] = useState(1);

  // ── Step 1: Kunci Jawaban (Answer Key) ──
  const [kunciInputType, setKunciInputType] = useState<"manual" | "file" | "image">("manual");
  const [kunciJawaban, setKunciJawaban] = useState("");
  const [kunciFileName, setKunciFileName] = useState("");
  const kunciFileRef = useRef<HTMLInputElement>(null);
  const kunciImgRef = useRef<HTMLInputElement>(null);
  const [isKunciParsing, setIsKunciParsing] = useState(false);

  // ── Step 2: Jawaban Siswa ──
  const [siswaInputType, setSiswaInputType] = useState<"manual" | "file" | "image">("manual");
  const [students, setStudents] = useState<StudentAnswer[]>([
    { id: "1", name: "", answers: "" },
  ]);
  const siswaFileRef = useRef<HTMLInputElement>(null);
  const siswaImgRef = useRef<HTMLInputElement>(null);
  const [isSiswaParsing, setIsSiswaParsing] = useState(false);

  // ── Step 3: Konfigurasi Penilaian ──
  const [scoringConfig, setScoringConfig] = useState({
    bobotBenar: 1,
    bobotSalah: 0,
    skala: "100" as "100" | "10" | "huruf",
    kkm: 75,
  });

  // ── Slide animation ──
  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  // ── Student CRUD ──
  const addStudent = () => {
    setStudents([
      ...students,
      { id: Math.random().toString(36).substring(7), name: "", answers: "" },
    ]);
  };

  const removeStudent = (id: string) => {
    if (students.length <= 1) return;
    setStudents(students.filter((s) => s.id !== id));
  };

  const updateStudent = (id: string, field: keyof StudentAnswer, value: string) => {
    setStudents(students.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  // ── File handlers ──
  const handleKunciFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsKunciParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Gagal membaca file");
      const data = await res.json();
      if (data.teks_hasil) {
        setKunciJawaban((prev) => (prev ? prev + "\n" + data.teks_hasil : data.teks_hasil));
        setKunciFileName(file.name);
        toast.success("File kunci jawaban berhasil dibaca!");
      }
    } catch {
      toast.error("Gagal membaca file.");
    } finally {
      setIsKunciParsing(false);
      if (kunciFileRef.current) kunciFileRef.current.value = "";
    }
  };

  const handleKunciImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsKunciParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-image", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Gagal membaca gambar");
      const data = await res.json();
      if (data.teks_hasil) {
        setKunciJawaban((prev) => (prev ? prev + "\n" + data.teks_hasil : data.teks_hasil));
        toast.success("Gambar kunci jawaban berhasil dibaca!");
      }
    } catch {
      toast.error("Gagal membaca gambar.");
    } finally {
      setIsKunciParsing(false);
      if (kunciImgRef.current) kunciImgRef.current.value = "";
    }
  };

  const handleSiswaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSiswaParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Gagal membaca file");
      const data = await res.json();
      if (data.teks_hasil) {
        if (students.length === 1 && !students[0].answers && !students[0].name) {
          setStudents([{ ...students[0], answers: data.teks_hasil, name: file.name.replace(/\.[^/.]+$/, "") }]);
        } else {
          setStudents([...students, {
            id: Math.random().toString(36).substring(7),
            name: file.name.replace(/\.[^/.]+$/, ""),
            answers: data.teks_hasil,
          }]);
        }
        toast.success("File jawaban siswa berhasil dibaca!");
      }
    } catch {
      toast.error("Gagal membaca file.");
    } finally {
      setIsSiswaParsing(false);
      if (siswaFileRef.current) siswaFileRef.current.value = "";
    }
  };

  const handleSiswaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSiswaParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-image", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Gagal membaca gambar");
      const data = await res.json();
      if (data.teks_hasil) {
        if (students.length === 1 && !students[0].answers && !students[0].name) {
          setStudents([{ ...students[0], answers: data.teks_hasil, name: "Siswa (Foto)" }]);
        } else {
          setStudents([...students, {
            id: Math.random().toString(36).substring(7),
            name: "Siswa (Foto)",
            answers: data.teks_hasil,
          }]);
        }
        toast.success("Gambar jawaban siswa berhasil dibaca!");
      }
    } catch {
      toast.error("Gagal membaca gambar.");
    } finally {
      setIsSiswaParsing(false);
      if (siswaImgRef.current) siswaImgRef.current.value = "";
    }
  };

  // ── Koreksi handler ──
  const handleKoreksi = () => {
    if (!kunciJawaban.trim()) {
      toast.error("Kunci jawaban belum diisi.");
      return;
    }
    const filledStudents = students.filter((s) => s.answers.trim());
    if (filledStudents.length === 0) {
      toast.error("Belum ada jawaban siswa yang diisi.");
      return;
    }
    toast.info("Fitur koreksi AI sedang dalam pengembangan. Nantikan segera! 🚀");
  };

  // ── Validation ──
  const isStep1Valid = kunciJawaban.trim().length > 0;
  const isStep2Valid = students.some((s) => s.answers.trim().length > 0);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 min-h-screen">
      {/* Header + Progress */}
      <div className="mb-12">
        <h1 className="text-3xl font-editorial font-bold text-black dark:text-white mb-6">
          Auto Koreksi Soal
        </h1>
        <div className="relative flex justify-between items-start sm:items-center">
          <div className="absolute top-5 left-10 right-10 h-1 bg-gray-200 dark:bg-gray-700 z-0 hidden sm:block">
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
            { id: 1, label: "1. Kunci Jawaban" },
            { id: 2, label: "2. Jawaban Siswa" },
            { id: 3, label: "3. Konfigurasi" },
          ].map((s) => (
            <div
              key={s.id}
              className="relative z-10 flex flex-col items-center gap-3 bg-[#f9f9f9] dark:bg-[#121212] px-2 sm:px-4"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-500
                ${step >= s.id ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-[#2a2a2a] border-2 border-black/10 dark:border-white/10 text-gray-400"}
                ${step === s.id ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] -translate-y-[2px]" : ""}
              `}
              >
                {step > s.id ? <CheckCircle size={18} /> : s.id}
              </div>
              <span
                className={`hidden sm:block text-xs font-semibold uppercase tracking-wider ${step >= s.id ? "text-black dark:text-white" : "text-gray-500"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div className="relative bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 p-8 shadow-xl min-h-[500px] transition-colors">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black dark:border-white/30 -mt-0.5 -ml-0.5"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-black dark:border-white/30 -mt-0.5 -mr-0.5"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-black dark:border-white/30 -mb-0.5 -ml-0.5"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black dark:border-white/30 -mb-0.5 -mr-0.5"></div>

        <AnimatePresence mode="wait" custom={1}>
          {/* ════════════════════ STEP 1: KUNCI JAWABAN ════════════════════ */}
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
                <h2 className="text-2xl font-bold mb-2 dark:text-white">Kunci Jawaban</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Masukkan kunci jawaban soal. Bisa diketik manual, upload file, atau foto lembar kunci.
                </p>
              </div>

              {/* Input method selector */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: "manual" as const, label: "Ketik Manual", icon: Type },
                  { id: "file" as const, label: "Upload File", icon: UploadCloud },
                  { id: "image" as const, label: "Foto/Scan", icon: Camera },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setKunciInputType(type.id)}
                    className={`p-4 flex flex-col items-center justify-center gap-3 border transition-all relative ${
                      kunciInputType === type.id
                        ? "border-black dark:border-white bg-gray-50 dark:bg-[#2a2a2a] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] -translate-y-1"
                        : "border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-500"
                    }`}
                  >
                    {kunciInputType === type.id && (
                      <div className="absolute top-2 right-2 text-black dark:text-white">
                        <CheckCircle size={16} />
                      </div>
                    )}
                    <type.icon
                      size={24}
                      className={kunciInputType === type.id ? "text-black dark:text-white" : "text-gray-400"}
                    />
                    <span className={`font-semibold text-sm text-center ${kunciInputType === type.id ? "text-black dark:text-white" : ""}`}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Manual input */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Kunci Jawaban
                  </label>
                  {kunciJawaban.length > 0 && (
                    <button
                      onClick={() => { setKunciJawaban(""); setKunciFileName(""); }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Bersihkan
                    </button>
                  )}
                </div>

                {kunciInputType === "manual" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <textarea
                      rows={6}
                      className="w-full p-4 bg-gray-50 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none resize-none transition-all font-mono text-sm dark:text-white"
                      placeholder={"Format yang didukung:\n1. A\n2. B\n3. C\n4. D\n5. A\n\nAtau: 1.A 2.B 3.C 4.D 5.A"}
                      value={kunciJawaban}
                      onChange={(e) => setKunciJawaban(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      💡 Pisahkan setiap jawaban dengan baris baru atau spasi. Format: <code className="bg-gray-100 dark:bg-[#333] px-1 rounded">1.A</code> atau <code className="bg-gray-100 dark:bg-[#333] px-1 rounded">1. A</code>
                    </p>
                  </motion.div>
                )}

                {kunciInputType === "file" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-8 flex flex-col items-center justify-center text-center hover:border-black/50 dark:hover:border-white/50 transition-colors"
                  >
                    <UploadCloud size={40} className="text-gray-400 mb-4" />
                    <p className="font-semibold text-black dark:text-white mb-1">Upload file kunci jawaban</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Format: PDF, DOCX (Max 20MB)</p>
                    <input type="file" ref={kunciFileRef} className="hidden" accept=".pdf,.docx" onChange={handleKunciFileUpload} />
                    <button
                      onClick={() => kunciFileRef.current?.click()}
                      disabled={isKunciParsing}
                      className="mt-6 px-6 py-2 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-sm font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
                    >
                      {isKunciParsing ? "Sedang membaca..." : "Pilih File"}
                    </button>
                    {kunciFileName && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle size={16} /> {kunciFileName}
                      </div>
                    )}
                  </motion.div>
                )}

                {kunciInputType === "image" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-8 flex flex-col items-center justify-center text-center hover:border-black/50 dark:hover:border-white/50 transition-colors"
                  >
                    <Camera size={40} className="text-gray-400 mb-4" />
                    <p className="font-semibold text-black dark:text-white mb-1">Foto lembar kunci jawaban</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Format: JPG, PNG, WebP</p>
                    <input type="file" ref={kunciImgRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleKunciImageUpload} />
                    <button
                      onClick={() => kunciImgRef.current?.click()}
                      disabled={isKunciParsing}
                      className="mt-6 px-6 py-2 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-sm font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
                    >
                      {isKunciParsing ? "Sedang membaca..." : "Upload Foto"}
                    </button>
                  </motion.div>
                )}

                {/* Preview parsed kunci */}
                {kunciJawaban && kunciInputType !== "manual" && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50">
                    <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-400 font-semibold text-sm">
                      <CheckCircle size={16} /> Hasil Pembacaan
                    </div>
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">{kunciJawaban}</pre>
                  </div>
                )}
              </div>

              {/* Next button */}
              <div className="flex justify-end pt-6 border-t border-black/10 dark:border-white/10">
                <button
                  onClick={handleNext}
                  disabled={!isStep1Valid}
                  className={`px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all ${
                    !isStep1Valid
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-600"
                      : "btn-primary dark:bg-white dark:text-black dark:hover:bg-gray-200 hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                  }`}
                >
                  Lanjut: Jawaban Siswa <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════════════════ STEP 2: JAWABAN SISWA ════════════════════ */}
          {step === 2 && (
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
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2 dark:text-white">Jawaban Siswa</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Input jawaban setiap siswa yang ingin dikoreksi.
                  </p>
                </div>
                <div className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-80 mr-2">Siswa:</span>
                  <span className="text-lg font-bold">{students.length}</span>
                </div>
              </div>

              {/* Input type selector for siswa */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "manual" as const, label: "Ketik Manual", icon: Type },
                  { id: "file" as const, label: "Upload File", icon: UploadCloud },
                  { id: "image" as const, label: "Foto/Scan", icon: Camera },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSiswaInputType(type.id)}
                    className={`p-3 flex items-center justify-center gap-2 border transition-all text-sm font-semibold ${
                      siswaInputType === type.id
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                        : "border-black/10 dark:border-white/10 text-gray-500 hover:border-black/30 dark:hover:border-white/30"
                    }`}
                  >
                    <type.icon size={16} />
                    {type.label}
                  </button>
                ))}
              </div>

              {/* File/Image upload for siswa */}
              {siswaInputType === "file" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-6 flex flex-col items-center text-center"
                >
                  <UploadCloud size={32} className="text-gray-400 mb-3" />
                  <p className="font-semibold text-sm text-black dark:text-white mb-1">Upload lembar jawaban siswa</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">PDF, DOCX — 1 file per siswa</p>
                  <input type="file" ref={siswaFileRef} className="hidden" accept=".pdf,.docx" onChange={handleSiswaFileUpload} />
                  <button
                    onClick={() => siswaFileRef.current?.click()}
                    disabled={isSiswaParsing}
                    className="px-6 py-2 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-sm font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
                  >
                    {isSiswaParsing ? "Sedang membaca..." : "Pilih File"}
                  </button>
                </motion.div>
              )}

              {siswaInputType === "image" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-2 border-dashed border-black/20 dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-6 flex flex-col items-center text-center"
                >
                  <Camera size={32} className="text-gray-400 mb-3" />
                  <p className="font-semibold text-sm text-black dark:text-white mb-1">Foto lembar jawaban siswa</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">JPG, PNG, WebP</p>
                  <input type="file" ref={siswaImgRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleSiswaImageUpload} />
                  <button
                    onClick={() => siswaImgRef.current?.click()}
                    disabled={isSiswaParsing}
                    className="px-6 py-2 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-sm font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
                  >
                    {isSiswaParsing ? "Sedang membaca..." : "Upload Foto"}
                  </button>
                </motion.div>
              )}

              {/* Student cards */}
              <div className="space-y-4">
                <AnimatePresence>
                  {students.map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: -20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm">
                            {(index + 1).toString().padStart(2, "0")}
                          </div>
                          <input
                            type="text"
                            value={student.name}
                            onChange={(e) => updateStudent(student.id, "name", e.target.value)}
                            placeholder="Nama Siswa"
                            className="bg-transparent border-b-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-semibold text-sm py-1 px-2 transition-colors dark:text-white dark:placeholder:text-gray-500 w-48"
                          />
                        </div>
                        {students.length > 1 && (
                          <button
                            onClick={() => removeStudent(student.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={3}
                        value={student.answers}
                        onChange={(e) => updateStudent(student.id, "answers", e.target.value)}
                        className="w-full p-3 bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white outline-none resize-none transition-all font-mono text-sm dark:text-white"
                        placeholder="1.A 2.B 3.C 4.D 5.A ..."
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button
                  onClick={addStudent}
                  className="w-full py-3 border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-all"
                >
                  <Plus size={18} /> Tambah Siswa
                </button>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-black/10 dark:border-white/10">
                <button
                  onClick={handlePrev}
                  className="px-6 py-3 border border-black/20 dark:border-white/20 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors flex items-center gap-2 dark:text-white"
                >
                  ← Kembali
                </button>
                <button
                  onClick={handleNext}
                  disabled={!isStep2Valid}
                  className={`px-8 py-3 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all ${
                    !isStep2Valid
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-600"
                      : "btn-primary dark:bg-white dark:text-black dark:hover:bg-gray-200 hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                  }`}
                >
                  Lanjut: Konfigurasi <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════════════════ STEP 3: KONFIGURASI & KOREKSI ════════════════════ */}
          {step === 3 && (
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
              <div>
                <h2 className="text-2xl font-bold mb-2 dark:text-white">Konfigurasi Penilaian</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Atur bobot, skala nilai, dan batas ketuntasan sebelum memulai koreksi.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bobot Benar */}
                <div className="border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-5 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                    Poin per Jawaban Benar
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={scoringConfig.bobotBenar}
                    onChange={(e) => setScoringConfig({ ...scoringConfig, bobotBenar: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full p-3 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-bold text-2xl text-center transition-colors dark:text-white"
                  />
                </div>

                {/* Penalti Salah */}
                <div className="border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-5 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                    Penalti Jawaban Salah
                  </label>
                  <input
                    type="number"
                    max={0}
                    value={scoringConfig.bobotSalah}
                    onChange={(e) => setScoringConfig({ ...scoringConfig, bobotSalah: Math.min(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-3 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-bold text-2xl text-center transition-colors dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">0 = tanpa penalti</p>
                </div>

                {/* Skala Nilai */}
                <div className="border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-5 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                    Skala Nilai
                  </label>
                  <div className="flex">
                    {(["100", "10", "huruf"] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => setScoringConfig({ ...scoringConfig, skala: val })}
                        className={`flex-1 py-3 text-center text-sm font-bold transition-all border ${
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
                <div className="border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#2a2a2a] p-5 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                    KKM (Kriteria Ketuntasan Minimal)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={scoringConfig.kkm}
                      onChange={(e) => setScoringConfig({ ...scoringConfig, kkm: parseInt(e.target.value) })}
                      className="flex-1 accent-black dark:accent-white"
                    />
                    <div className="bg-black dark:bg-white text-white dark:text-black px-3 py-1 font-bold text-lg min-w-[60px] text-center">
                      {scoringConfig.kkm}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border-2 border-black dark:border-white/20 bg-gray-50 dark:bg-[#2a2a2a] p-6 space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <ClipboardList size={16} /> Ringkasan Koreksi
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Jumlah Siswa</div>
                    <div className="text-2xl font-bold dark:text-white">{students.filter((s) => s.answers.trim()).length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Kunci Jawaban</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle size={18} /> Ada
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Skala</div>
                    <div className="text-2xl font-bold dark:text-white">
                      {scoringConfig.skala === "100" ? "0-100" : scoringConfig.skala === "10" ? "0-10" : "A-E"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">KKM</div>
                    <div className="text-2xl font-bold dark:text-white">{scoringConfig.kkm}</div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-black/10 dark:border-white/10">
                <button
                  onClick={handlePrev}
                  className="px-6 py-3 border border-black/20 dark:border-white/20 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors flex items-center gap-2 dark:text-white"
                >
                  ← Kembali
                </button>
                <button
                  onClick={handleKoreksi}
                  className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] transition-all font-bold uppercase tracking-wider text-sm"
                >
                  <Sparkles size={18} /> Mulai Koreksi AI
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
