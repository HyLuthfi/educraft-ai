"use client";

import { useState, useRef } from "react";
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
  User,
} from "lucide-react";

type InputMethod = "text" | "file" | "image";

type StudentCard = {
  id: string;
  name: string;
  inputMethod: InputMethod;
  textContent: string;
  fileName: string;
  isParsing: boolean;
};

export default function AutoKoreksiPage() {
  // ── Soal / Kunci Jawaban (Opsional) ──
  const [isSoalOpen, setIsSoalOpen] = useState(true);
  const [soalInputMethod, setSoalInputMethod] = useState<InputMethod>("text");
  const [soalText, setSoalText] = useState("");
  const [soalFileName, setSoalFileName] = useState("");
  const [isSoalParsing, setIsSoalParsing] = useState(false);
  const soalFileRef = useRef<HTMLInputElement>(null);
  const soalImgRef = useRef<HTMLInputElement>(null);

  // ── Daftar Siswa ──
  const [students, setStudents] = useState<StudentCard[]>([
    { id: "s1", name: "", inputMethod: "text", textContent: "", fileName: "", isParsing: false },
  ]);

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

  // ── File handlers for Soal ──
  const handleSoalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSoalParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.teks_hasil) {
        setSoalText((prev) => (prev ? prev + "\n\n" + data.teks_hasil : data.teks_hasil));
        setSoalFileName(file.name);
        toast.success("File soal berhasil dibaca!");
      }
    } catch {
      toast.error("Gagal membaca file soal.");
    } finally {
      setIsSoalParsing(false);
      if (soalFileRef.current) soalFileRef.current.value = "";
    }
  };

  const handleSoalImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSoalParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-image", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.teks_hasil) {
        setSoalText((prev) => (prev ? prev + "\n\n" + data.teks_hasil : data.teks_hasil));
        toast.success("Gambar soal berhasil dibaca!");
      }
    } catch {
      toast.error("Gagal membaca gambar soal.");
    } finally {
      setIsSoalParsing(false);
      if (soalImgRef.current) soalImgRef.current.value = "";
    }
  };

  // ── File handlers for Student ──
  const handleStudentFile = async (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateStudent(studentId, { isParsing: true });
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
          name: students.find((s) => s.id === studentId)?.name || file.name.replace(/\.[^/.]+$/, ""),
          isParsing: false,
        });
        toast.success("File jawaban berhasil dibaca!");
      }
    } catch {
      toast.error("Gagal membaca file.");
      updateStudent(studentId, { isParsing: false });
    }
    e.target.value = "";
  };

  const handleStudentImage = async (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateStudent(studentId, { isParsing: true });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-image", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.teks_hasil) {
        updateStudent(studentId, {
          textContent: data.teks_hasil,
          isParsing: false,
        });
        toast.success("Gambar jawaban berhasil dibaca!");
      }
    } catch {
      toast.error("Gagal membaca gambar.");
      updateStudent(studentId, { isParsing: false });
    }
    e.target.value = "";
  };

  // ── Koreksi ──
  const handleKoreksi = () => {
    const filledStudents = students.filter((s) => s.textContent.trim());
    if (filledStudents.length === 0) {
      toast.error("Belum ada jawaban siswa yang diisi.");
      return;
    }
    toast.info("Fitur koreksi AI sedang dalam pengembangan. Nantikan segera! 🚀");
  };

  const filledCount = students.filter((s) => s.textContent.trim()).length;

  // ── Input method selector component ──
  const InputMethodTabs = ({
    active,
    onChange,
    size = "md",
  }: {
    active: InputMethod;
    onChange: (m: InputMethod) => void;
    size?: "sm" | "md";
  }) => (
    <div className={`flex gap-1 ${size === "sm" ? "" : ""}`}>
      {([
        { id: "text" as const, label: "Teks", icon: Type },
        { id: "file" as const, label: "File", icon: UploadCloud },
        { id: "image" as const, label: "Foto", icon: Camera },
      ] as const).map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex items-center gap-1.5 font-semibold transition-all ${
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          } ${
            active === m.id
              ? "bg-black dark:bg-white text-white dark:text-black"
              : "bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#444]"
          }`}
        >
          <m.icon size={size === "sm" ? 13 : 15} />
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 pb-32">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-editorial font-bold text-black dark:text-white mb-2">
          Auto Koreksi Soal
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Input lembar soal (opsional) dan jawaban siswa, lalu biarkan AI mengoreksi otomatis.
        </p>
      </div>

      {/* ════════════════ SEKSI 1: LEMBAR SOAL (OPSIONAL) ════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => setIsSoalOpen(!isSoalOpen)}
          className="w-full flex items-center justify-between bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-colors hover:bg-gray-50 dark:hover:bg-[#252525]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 text-white flex items-center justify-center">
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
              <div className="bg-white dark:bg-[#1e1e1e] border-2 border-t-0 border-black dark:border-white/20 p-6 space-y-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] -mt-[4px] transition-colors">
                {/* Input method tabs */}
                <div className="flex items-center justify-between">
                  <InputMethodTabs active={soalInputMethod} onChange={setSoalInputMethod} />
                  {soalText && (
                    <button
                      onClick={() => { setSoalText(""); setSoalFileName(""); }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={13} /> Bersihkan
                    </button>
                  )}
                </div>

                {/* Text input */}
                {soalInputMethod === "text" && (
                  <textarea
                    rows={5}
                    className="w-full p-4 bg-gray-50 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none resize-none transition-all font-mono text-sm dark:text-white"
                    placeholder={"Ketik soal atau kunci jawaban di sini...\n\nFormat kunci jawaban:\n1. A\n2. B\n3. C\n\nAtau soal lengkap:\n1. Siapa presiden pertama Indonesia?\na. Soekarno  b. Soeharto  c. Habibie  d. Megawati\nJawaban: A"}
                    value={soalText}
                    onChange={(e) => setSoalText(e.target.value)}
                  />
                )}

                {/* File upload */}
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

                {/* Image upload */}
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

                {/* Preview parsed content (for file/image) */}
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

      {/* ════════════════ SEKSI 2: DAFTAR JAWABAN SISWA ════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Section header */}
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

        {/* Student cards list */}
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

          {/* Add student (dashed) */}
          <button
            onClick={addStudent}
            className="w-full py-5 border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center gap-2 text-sm font-semibold text-gray-400 dark:text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-all"
          >
            <Plus size={18} /> Tambah Siswa Baru
          </button>
        </div>
      </motion.div>

      {/* ════════════════ FLOATING ACTION BAR ════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40">
        <div className="bg-white dark:bg-[#1e1e1e] border-t-2 border-black dark:border-white/20 px-6 py-4 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-colors">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              <span className="font-bold text-black dark:text-white text-lg">{filledCount}</span> siswa siap dikoreksi
            </span>
            {soalText && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 uppercase tracking-wider hidden sm:inline-block">
                ✓ Kunci jawaban ada
              </span>
            )}
          </div>
          <button
            onClick={handleKoreksi}
            disabled={filledCount === 0}
            className={`px-8 py-3 flex items-center gap-2 font-bold uppercase tracking-wider text-sm transition-all ${
              filledCount === 0
                ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none"
            }`}
          >
            <Sparkles size={18} /> Mulai Koreksi AI
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STUDENT ANSWER CARD COMPONENT
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

  const hasContent = student.textContent.trim().length > 0;

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
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 flex items-center justify-center font-bold text-sm ${
            hasContent
              ? "bg-green-500 text-white"
              : "bg-gray-200 dark:bg-[#333] text-gray-500 dark:text-gray-400"
          }`}>
            {hasContent ? <CheckCircle size={16} /> : (index + 1).toString().padStart(2, "0")}
          </div>
          <input
            type="text"
            value={student.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={`Siswa ${index + 1}`}
            className="bg-transparent border-none outline-none font-bold text-sm dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 w-52"
          />
        </div>

        <div className="flex items-center gap-3">
          <InputMethodTabs
            active={student.inputMethod}
            onChange={(m) => onUpdate({ inputMethod: m })}
            size="sm"
          />
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
              disabled={student.isParsing}
              className="px-4 py-1.5 bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 text-xs font-medium hover:border-black dark:hover:border-white transition-colors disabled:opacity-50 dark:text-white"
            >
              {student.isParsing ? "Membaca..." : "Upload Foto"}
            </button>
          </div>
        )}

        {/* Show parsed content if loaded via file/image */}
        {hasContent && student.inputMethod !== "text" && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-green-700 dark:text-green-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle size={12} /> Hasil Pembacaan
              </span>
              <button
                onClick={() => onUpdate({ textContent: "", fileName: "" })}
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
