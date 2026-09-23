"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { buatSupabaseClient } from "@/lib/supabase/client";
import {
  Folder,
  FileText,
  Search,
  Plus,
  MoreVertical,
  Download,
  Clock,
  Tag,
  Loader2,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Check,
  Share2,
  Sparkles,
  ClipboardCheck,
  CheckCircle,
  FileDown,
  X,
  Save,
  GraduationCap,
  Layers,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export default function LibraryPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");

  // Modal States
  const [activeDoc, setActiveDoc] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Viewer State (Mode Guru vs Mode Murid)
  const [viewMode, setViewMode] = useState<"guru" | "murid">("guru");
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<any[]>([]);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [copiedType, setCopiedType] = useState<"wa" | "clean" | null>(null);

  // Download Config State
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("docx");
  const [sertakanJawaban, setSertakanJawaban] = useState(true);
  const [sertakanPembahasan, setSertakanPembahasan] = useState(true);
  const [schoolName, setSchoolName] = useState("LEMBAGA PENDIDIKAN");
  const [subjectName, setSubjectName] = useState("");
  const [classNameStr, setClassNameStr] = useState("Semua Kelas");
  const [durationStr, setDurationStr] = useState("60 Menit");
  const [isExporting, setIsExporting] = useState(false);

  const supabase = buatSupabaseClient();

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bank_soal")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat bank soal: " + (err.message || "Error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Derive folder list dynamically from documents
  const folderCounts = useMemo(() => {
    return documents.reduce((acc: any, doc) => {
      const folderName = doc.folder || "Umum";
      acc[folderName] = (acc[folderName] || 0) + 1;
      return acc;
    }, {});
  }, [documents]);

  const dynamicFolders = useMemo(() => {
    const colors = [
      "bg-green-100 dark:bg-green-500/10 border-green-300 dark:border-green-500/40 text-green-900 dark:text-green-300",
      "bg-blue-100 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40 text-blue-900 dark:text-blue-300",
      "bg-yellow-100 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/40 text-yellow-900 dark:text-yellow-300",
      "bg-pink-100 dark:bg-pink-500/10 border-pink-300 dark:border-pink-500/40 text-pink-900 dark:text-pink-300",
      "bg-purple-100 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40 text-purple-900 dark:text-purple-300",
    ];
    return Object.keys(folderCounts).map((name, i) => ({
      id: i,
      name,
      count: folderCounts[name],
      color: colors[i % colors.length],
    }));
  }, [folderCounts]);

  // Filter Logic
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.folder || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedFolder === "all") return true;
      return (doc.folder || "Umum").toLowerCase() === selectedFolder.toLowerCase();
    });
  }, [documents, searchQuery, selectedFolder]);

  // Open Viewer Modal
  const openViewModal = (doc: any) => {
    setActiveDoc(doc);
    const questions = doc.content?.soal || [];
    setEditedQuestions(JSON.parse(JSON.stringify(questions)));
    setIsEditing(false);
    setViewMode("guru");
    setIsViewModalOpen(true);
  };

  // Open Download Modal
  const openDownloadModal = (doc: any) => {
    setActiveDoc(doc);
    setSubjectName(doc.title);
    setIsDownloadModalOpen(true);
  };

  // Delete Question Set
  const handleDeleteDoc = async (id: string, title: string) => {
    if (!confirm(`Hapus paket soal "${title}" dari Bank Soal?`)) return;

    try {
      const { error } = await supabase.from("bank_soal").delete().eq("id", id);
      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (activeDoc?.id === id) {
        setIsViewModalOpen(false);
        setActiveDoc(null);
      }
      toast.success("Paket soal berhasil dihapus.");
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  // Save Inline Edits
  const handleSaveEdits = async () => {
    if (!activeDoc) return;
    setIsSavingEdits(true);
    const toastId = toast.loading("Menyimpan revisi soal...");

    try {
      const updatedContent = {
        ...activeDoc.content,
        soal: editedQuestions,
      };

      const { error } = await supabase
        .from("bank_soal")
        .update({ content: updatedContent })
        .eq("id", activeDoc.id);

      if (error) throw error;

      setDocuments((prev) =>
        prev.map((d) => (d.id === activeDoc.id ? { ...d, content: updatedContent } : d))
      );
      setActiveDoc({ ...activeDoc, content: updatedContent });
      setIsEditing(false);
      toast.success("Revisi butir soal berhasil disimpan!", { id: toastId });
    } catch (err: any) {
      toast.error("Gagal menyimpan revisi: " + err.message, { id: toastId });
    } finally {
      setIsSavingEdits(false);
    }
  };

  // Bridge to Auto-Koreksi (/koreksi)
  const handleBridgeToKoreksi = (doc: any) => {
    const questions = doc.content?.soal || [];
    if (questions.length === 0) {
      toast.error("Paket soal tidak memiliki butir pertanyaan.");
      return;
    }

    const lines = questions.map((q: any, idx: number) => {
      let line = `${idx + 1}. ${q.teks}`;
      if (q.opsi && Array.isArray(q.opsi)) {
        const opsiText = q.opsi.map((o: any) => `${o.label}. ${o.teks}`).join("  ");
        line += `\n${opsiText}`;
      }
      line += `\nJawaban: ${q.kunci_jawaban || "-"}`;
      return line;
    });

    const fullSoalText = lines.join("\n\n");
    localStorage.setItem("educraft_soalText", fullSoalText);
    localStorage.setItem("educraft_soalFileName", `${doc.title} (Bank Soal)`);

    toast.success("Kunci jawaban siap! Mengalihkan ke modul koreksi...");
    router.push("/koreksi");
  };

  // Copy Format WhatsApp
  const handleCopyWhatsApp = (doc: any) => {
    const questions = isEditing ? editedQuestions : doc.content?.soal || [];
    let text = `*${doc.title.toUpperCase()}*\n`;
    text += `_Paket Ujian • ${questions.length} Butir Soal_\n\n`;

    questions.forEach((q: any, idx: number) => {
      text += `*${idx + 1}. ${q.teks}*\n`;
      if (q.opsi && Array.isArray(q.opsi)) {
        q.opsi.forEach((o: any) => {
          text += `   ${o.label}. ${o.teks}\n`;
        });
      }
      if (viewMode === "guru") {
        text += `\n   *Kunci Jawaban:* ${q.kunci_jawaban || "-"}\n`;
        if (q.pembahasan) text += `   *Pembahasan:* ${q.pembahasan}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedType("wa");
    toast.success("Format WhatsApp tersalin! Siap ditempel ke chat grup.");
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Copy Clean Exam Sheet (Mode Murid)
  const handleCopyClean = (doc: any) => {
    const questions = isEditing ? editedQuestions : doc.content?.soal || [];
    let text = `${doc.title.toUpperCase()}\n`;
    text += `Nama Siswa: .......................................\nKelas: ....................\n\n`;

    questions.forEach((q: any, idx: number) => {
      text += `${idx + 1}. ${q.teks}\n`;
      if (q.opsi && Array.isArray(q.opsi)) {
        q.opsi.forEach((o: any) => {
          text += `   ${o.label}. ${o.teks}\n`;
        });
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedType("clean");
    toast.success("Lembar soal ujian tersalin ke papan klip!");
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Trigger Download API
  const handleExportSubmit = async () => {
    if (!activeDoc) return;
    const questions = activeDoc.content?.soal || [];
    if (questions.length === 0) {
      toast.error("Paket soal tidak memiliki butir pertanyaan.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading(`Menyiapkan berkas ${exportFormat.toUpperCase()}...`);

    try {
      const payload = {
        soal: questions,
        header: {
          nama_sekolah: schoolName || "LEMBAGA PENDIDIKAN",
          mata_pelajaran: subjectName || activeDoc.title,
          kelas: classNameStr || "Semua Kelas",
          tanggal: new Date().toLocaleDateString("id-ID"),
          durasi: durationStr || "60 Menit",
        },
        sertakan_jawaban: sertakanJawaban,
        sertakan_pembahasan: sertakanPembahasan,
      };

      const res = await fetch(`/api/export/${exportFormat}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal mengunduh dokumen");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedTitle = activeDoc.title.replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${sanitizedTitle}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Dokumen siap dicetak & berhasil diunduh!", { id: toastId });
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      toast.error("Gagal ekspor: " + err.message, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Bloom Summary Metrics for Active Document
  const activeDocMetrics = useMemo(() => {
    if (!activeDoc?.content?.soal) return null;
    const qs = activeDoc.content.soal;
    const total = qs.length;
    let hotsCount = 0;
    let pgCount = 0;
    let essayCount = 0;
    let isianCount = 0;

    qs.forEach((q: any) => {
      const lvl = (q.kesulitan || q.level_bloom || "").toUpperCase();
      if (lvl.includes("HOTS") || lvl.includes("C4") || lvl.includes("C5") || lvl.includes("C6")) {
        hotsCount++;
      }
      const t = (q.tipe || "").toLowerCase();
      if (t.includes("pg") || t.includes("pilihan")) pgCount++;
      else if (t.includes("essay") || t.includes("uraian")) essayCount++;
      else isianCount++;
    });

    const hotsPct = total > 0 ? Math.round((hotsCount / total) * 100) : 0;
    return {
      total,
      hotsCount,
      lotsCount: total - hotsCount,
      hotsPct,
      pgCount,
      essayCount,
      isianCount,
    };
  }, [activeDoc]);

  return (
    <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto pb-24">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
            <FileText size={12} /> Arsip Soal Ujian
          </div>
          <h1 className="text-2xl sm:text-4xl font-editorial font-bold text-black dark:text-white mb-1">
            Bank Soal
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Akses, pratinjau, edit, unduh siap cetak, dan hubungkan langsung ke koreksi lembar jawaban.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama soal atau folder..."
              className="pl-9 pr-3 py-2 sm:py-2.5 w-full border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium text-xs sm:text-sm transition-colors bg-white dark:bg-[#2a2a2a] dark:text-white"
            />
          </div>

          <button
            onClick={() => {
              setNewFolderName("");
              setIsFolderModalOpen(true);
            }}
            className="px-4 py-2 sm:py-2.5 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 text-black dark:text-white font-bold uppercase tracking-wider text-xs hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-all flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-0.5 cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} /> Buat Folder
          </button>
        </div>
      </div>

      {/* ── FOLDERS ROW FILTER ── */}
      <section className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Folder size={14} /> Filter Koleksi Folder
          </h2>
          {selectedFolder !== "all" && (
            <button
              onClick={() => setSelectedFolder("all")}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reset ke Semua Folder
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
          <button
            onClick={() => setSelectedFolder("all")}
            className={`px-3.5 py-2 border-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              selectedFolder === "all"
                ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white dark:bg-[#1e1e1e] border-black/15 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:border-black"
            }`}
          >
            <span>Semua Folder</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/10 dark:bg-white/20 rounded font-black">
              {documents.length}
            </span>
          </button>

          {dynamicFolders.map((folder) => {
            const isCurrent = selectedFolder.toLowerCase() === folder.name.toLowerCase();
            return (
              <button
                key={folder.name}
                onClick={() => setSelectedFolder(folder.name)}
                className={`px-3.5 py-2 border-2 text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isCurrent
                    ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : `${folder.color} hover:shadow-xs`
                }`}
              >
                <Folder size={13} />
                <span>{folder.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-black/10 dark:bg-white/20 rounded font-black">
                  {folder.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── DOCUMENTS SECTION ── */}
      <section>
        <div className="flex items-center justify-between mb-4 border-t-2 border-black/10 dark:border-white/10 pt-4 sm:pt-6">
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
            <FileText size={16} /> Daftar Set Soal Ujian
          </h2>
          <span className="text-xs text-gray-400 font-medium">
            Menampilkan {filteredDocuments.length} dari {documents.length} paket
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-400" size={32} />
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Memuat bank soal...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-white/15 bg-white/50 dark:bg-[#1e1e1e]/50 text-center p-6">
            <FileText className="text-gray-300 dark:text-gray-600" size={44} />
            <h3 className="font-editorial text-lg sm:text-xl font-bold text-black dark:text-white">
              {searchQuery || selectedFolder !== "all"
                ? "Tidak Ada Soal yang Sesuai"
                : "Bank Soal Masih Kosong"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm">
              {searchQuery || selectedFolder !== "all"
                ? "Coba ubah kata kunci pencarian atau pilih folder lain."
                : "Racik soal pertama Anda dengan AI sekarang, lalu simpan ke Bank Soal agar tersusun rapi."}
            </p>
            {documents.length === 0 && (
              <button
                onClick={() => router.push("/create")}
                className="mt-2 px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
              >
                + Mulai Racik Soal
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredDocuments.map((doc, i) => {
              const questionCount = doc.content?.soal?.length || 0;
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] transition-all flex flex-col justify-between"
                >
                  {/* Top Bar Header */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-gray-100 dark:bg-[#2a2a2a] border border-black/15 dark:border-white/15 text-gray-700 dark:text-gray-300 flex items-center gap-1 rounded-sm">
                        <Folder size={11} /> {doc.folder || "Umum"}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(doc.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h3
                      onClick={() => openViewModal(doc)}
                      className="font-bold text-base sm:text-lg text-black dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
                    >
                      {doc.title}
                    </h3>

                    <div className="mt-auto pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs text-gray-500">
                      <span className="font-bold text-black dark:text-white">
                        {questionCount} Butir Soal
                      </span>
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.title)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Hapus set soal ini"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Primary Bottom Actions */}
                  <div className="p-3 bg-gray-50 dark:bg-[#252525] border-t-2 border-black dark:border-white/20 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => openViewModal(doc)}
                      className="py-2 px-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 text-black dark:text-white font-bold text-xs hover:border-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Lihat Soal & Jawaban"
                    >
                      <Eye size={13} /> <span>Lihat</span>
                    </button>

                    <button
                      onClick={() => handleBridgeToKoreksi(doc)}
                      className="py-2 px-2 bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300 font-bold text-xs hover:bg-purple-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Gunakan kunci jawaban paket ini untuk Auto-Koreksi"
                    >
                      <ClipboardCheck size={13} /> <span>Koreksi</span>
                    </button>

                    <button
                      onClick={() => openDownloadModal(doc)}
                      className="py-2 px-2 bg-black text-white dark:bg-white dark:text-black font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      title="Unduh Word/PDF"
                    >
                      <Download size={13} /> <span>Unduh</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── MODAL 1: EDUVIEWER & STUDIO (KONSEP UNGGULAN) ── */}
      <AnimatePresence>
        {isViewModalOpen && activeDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b-2 border-black/10 dark:border-white/10 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-yellow-400 text-black border border-black rounded-xs">
                        {activeDoc.folder || "Umum"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(activeDoc.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-editorial font-bold text-black dark:text-white">
                      {activeDoc.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white"
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* 1. DUAL-VIEW SWITCHER + TAXONOMY METRICS */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#2a2a2a] p-1 border border-black/15 dark:border-white/15 self-start">
                    <button
                      onClick={() => setViewMode("guru")}
                      className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === "guru"
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                          : "text-gray-500 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      <BookOpen size={13} />
                      <span>Mode Guru (Kunci &amp; Pembahasan)</span>
                    </button>
                    <button
                      onClick={() => setViewMode("murid")}
                      className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === "murid"
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                          : "text-gray-500 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      <GraduationCap size={14} />
                      <span>Mode Murid (Lembar Ujian Bersih)</span>
                    </button>
                  </div>

                  {/* Taxonomy Metrics Bar */}
                  {activeDocMetrics && (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-950/60 text-yellow-900 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800 rounded">
                        {activeDocMetrics.hotsPct}% HOTS
                      </span>
                      <span>
                        {activeDocMetrics.pgCount} PG • {activeDocMetrics.essayCount} Essay
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Body: Question List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50 dark:bg-[#181818]">
                {editedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 bg-white dark:bg-[#202020] border-2 border-black/10 dark:border-white/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] space-y-3"
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-black text-white dark:bg-white dark:text-black font-black flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                          {q.tipe || "Pilihan Ganda"}
                        </span>
                      </div>
                      {viewMode === "guru" && q.kesulitan && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 rounded">
                          {q.kesulitan} • {q.level_bloom || "Bloom"}
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={q.teks}
                        onChange={(e) => {
                          const updated = [...editedQuestions];
                          updated[idx].teks = e.target.value;
                          setEditedQuestions(updated);
                        }}
                        className="w-full p-2.5 text-xs sm:text-sm font-bold border-2 border-black/20 dark:border-white/20 outline-none focus:border-black bg-white dark:bg-[#2a2a2a] dark:text-white"
                      />
                    ) : (
                      <p className="font-bold text-xs sm:text-sm text-black dark:text-white leading-relaxed">
                        {q.teks}
                      </p>
                    )}

                    {/* Options (Pilihan Ganda) */}
                    {q.opsi && Array.isArray(q.opsi) && q.opsi.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.opsi.map((op: any, oIdx: number) => {
                          const isCorrect =
                            viewMode === "guru" &&
                            (op.benar ||
                              op.label?.toUpperCase() === q.kunci_jawaban?.toUpperCase());

                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 border text-xs flex items-start gap-2.5 transition-colors ${
                                isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs"
                                  : "bg-gray-50 dark:bg-[#282828] border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-black/10 dark:bg-white/10"
                                }`}
                              >
                                {op.label}
                              </span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={op.teks}
                                  onChange={(e) => {
                                    const updated = [...editedQuestions];
                                    updated[idx].opsi[oIdx].teks = e.target.value;
                                    setEditedQuestions(updated);
                                  }}
                                  className="w-full bg-white dark:bg-[#1e1e1e] p-1 border outline-none font-normal"
                                />
                              ) : (
                                <span className="flex-1 leading-snug">{op.teks}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Guru Exclusive: Kunci Jawaban & Pembahasan */}
                    {viewMode === "guru" && (
                      <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                            Kunci Jawaban:
                          </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={q.kunci_jawaban || ""}
                              onChange={(e) => {
                                const updated = [...editedQuestions];
                                updated[idx].kunci_jawaban = e.target.value;
                                setEditedQuestions(updated);
                              }}
                              className="w-24 p-1 border text-xs font-bold uppercase"
                            />
                          ) : (
                            <span className="font-black text-black dark:text-white bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                              {q.kunci_jawaban || "Tidak ada rujukan"}
                            </span>
                          )}
                        </div>

                        {q.pembahasan && (
                          <div className="bg-yellow-50 dark:bg-yellow-950/20 border-l-2 border-yellow-400 p-2.5 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                            <strong>Pembahasan:</strong> {q.pembahasan}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-3.5 sm:p-5 border-t-2 border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Salin WA */}
                  <button
                    onClick={() => handleCopyWhatsApp(activeDoc)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedType === "wa" ? <Check size={14} /> : <Share2 size={14} />}
                    <span>Salin Format WA</span>
                  </button>

                  {/* Salin Lembar Bersih */}
                  <button
                    onClick={() => handleCopyClean(activeDoc)}
                    className="px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-black/20 dark:border-white/20 text-gray-700 dark:text-gray-200 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:border-black transition-colors cursor-pointer"
                  >
                    {copiedType === "clean" ? <Check size={14} /> : <Copy size={14} />}
                    <span>Salin Lembar Ujian</span>
                  </button>

                  {/* Quick Edit Toggle */}
                  <button
                    onClick={() => {
                      if (isEditing) handleSaveEdits();
                      else setIsEditing(true);
                    }}
                    disabled={isSavingEdits}
                    className="px-3 py-2 border border-black/20 dark:border-white/20 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:border-black transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isEditing ? (
                      <>
                        <Save size={14} /> Simpan Revisi
                      </>
                    ) : (
                      <>
                        <Edit3 size={14} /> Edit Butir
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Bridge to Koreksi */}
                  <button
                    onClick={() => handleBridgeToKoreksi(activeDoc)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <ClipboardCheck size={14} /> Koreksi Jawaban Murid
                  </button>

                  {/* Unduh */}
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      openDownloadModal(activeDoc);
                    }}
                    className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-colors cursor-pointer"
                  >
                    <Download size={14} /> Unduh Dokumen
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: EKSPOR & UNDUH DOKUMEN CETAK ── */}
      <AnimatePresence>
        {isDownloadModalOpen && activeDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-5 sm:p-7 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)]"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 dark:border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <FileDown size={20} />
                  <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black dark:text-white">
                    Unduh Dokumen Ujian
                  </h3>
                </div>
                <button
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* Format Switcher */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                    Format Dokumen
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportFormat("docx")}
                      className={`p-3 border-2 font-bold text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        exportFormat === "docx"
                          ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-xs"
                          : "bg-gray-50 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border-black/15"
                      }`}
                    >
                      <FileText size={16} /> Word (.docx)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat("pdf")}
                      className={`p-3 border-2 font-bold text-center flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        exportFormat === "pdf"
                          ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-xs"
                          : "bg-gray-50 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 border-black/15"
                      }`}
                    >
                      <FileDown size={16} /> PDF Siap Cetak
                    </button>
                  </div>
                </div>

                {/* Kop Ujian Customization */}
                <div className="space-y-2.5 pt-2 border-t border-black/10 dark:border-white/10">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                    Kop Dokumen Ujian
                  </span>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">Nama Lembaga / Sekolah</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Contoh: SMA NEGERI 1 JAKARTA"
                      className="w-full p-2 bg-gray-50 dark:bg-[#2a2a2a] border border-black/20 dark:border-white/20 text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Kelas</label>
                      <input
                        type="text"
                        value={classNameStr}
                        onChange={(e) => setClassNameStr(e.target.value)}
                        placeholder="Contoh: Kelas 10 MIPA"
                        className="w-full p-2 bg-gray-50 dark:bg-[#2a2a2a] border border-black/20 dark:border-white/20 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Durasi</label>
                      <input
                        type="text"
                        value={durationStr}
                        onChange={(e) => setDurationStr(e.target.value)}
                        placeholder="Contoh: 90 Menit"
                        className="w-full p-2 bg-gray-50 dark:bg-[#2a2a2a] border border-black/20 dark:border-white/20 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sertakanJawaban}
                      onChange={(e) => setSertakanJawaban(e.target.checked)}
                      className="rounded accent-black w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Sertakan Kunci Jawaban di Lembar Akhir
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sertakanPembahasan}
                      onChange={(e) => setSertakanPembahasan(e.target.checked)}
                      className="rounded accent-black w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Sertakan Pembahasan Lengkap
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t-2 border-black/10 dark:border-white/10 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsDownloadModalOpen(false)}
                    className="px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-gray-500 hover:text-black dark:hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportSubmit}
                    className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] disabled:opacity-50 flex items-center gap-2 cursor-pointer active:translate-y-0.5"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Mengunduh...
                      </>
                    ) : (
                      <>
                        <Download size={14} /> Unduh Sekarang
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: BUAT FOLDER BARU ── */}
      <AnimatePresence>
        {isFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-5 sm:p-7 max-w-sm w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)]"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 dark:border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Folder size={18} />
                  <h3 className="text-base font-bold uppercase tracking-wider text-black dark:text-white">
                    Buat Folder Baru
                  </h3>
                </div>
                <button
                  onClick={() => setIsFolderModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                    Nama Folder Baru
                  </label>
                  <input
                    type="text"
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Contoh: Ujian Tengah Semester, Biologi 10"
                    className="w-full p-2.5 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 font-bold outline-none focus:border-black"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Folder baru akan tersedia saat Anda meracik dan menyimpan soal berikutnya.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-gray-500"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newFolderName.trim()) {
                        toast.error("Nama folder tidak boleh kosong.");
                        return;
                      }
                      setSelectedFolder(newFolderName.trim());
                      setIsFolderModalOpen(false);
                      toast.success(`Filter folder "${newFolderName.trim()}" diaktifkan!`);
                    }}
                    className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Simpan &amp; Terapkan
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
