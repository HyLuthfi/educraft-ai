"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { buatSupabaseClient } from "@/lib/supabase/client";
import { MathText } from "@/app/components/MathText";
import GoogleFormExportButton from "@/app/components/GoogleFormExportButton";
import QuizizzExportButton from "@/app/components/QuizizzExportButton";
import {
  Folder,
  FileText,
  Search,
  Plus,
  Download,
  Clock,
  Loader2,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Check,
  Share2,
  ClipboardCheck,
  X,
  Save,
  GraduationCap,
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
  const [sertakanJawaban, setSertakanJawaban] = useState(true);
  const [sertakanPembahasan, setSertakanPembahasan] = useState(true);
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

  // Derive folder list dynamically from documents (Clean Monokrom)
  const folderCounts = useMemo(() => {
    return documents.reduce((acc: any, doc) => {
      const folderName = doc.folder || "Umum";
      acc[folderName] = (acc[folderName] || 0) + 1;
      return acc;
    }, {});
  }, [documents]);

  const dynamicFolders = useMemo(() => {
    return Object.keys(folderCounts).map((name, i) => ({
      id: i,
      name,
      count: folderCounts[name],
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
      text += `\n`;
    });

    text += `_Dibuat otomatis via EduCraft AI • saitech.co.id_`;

    navigator.clipboard.writeText(text);
    setCopiedType("wa");
    toast.success("Naskah soal disalin ke format WhatsApp!");
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Copy Format Teks Bersih
  const handleCopyCleanText = (doc: any) => {
    const questions = isEditing ? editedQuestions : doc.content?.soal || [];
    let text = `${doc.title}\n\n`;

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
    toast.success("Naskah soal disalin ke clipboard!");
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Trigger Download API (Word & PDF)
  const handleExport = async (format: "docx" | "pdf") => {
    if (!activeDoc) return;
    const questions = activeDoc.content?.soal || [];
    if (questions.length === 0) {
      toast.error("Paket soal tidak memiliki butir pertanyaan.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading(`Menyiapkan berkas ${format.toUpperCase()}...`);

    try {
      const payload = {
        soal: questions,
        header: {
          nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
          mata_pelajaran: activeDoc.title,
          kelas: "Semua Kelas",
          tanggal: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          durasi: "60 Menit",
        },
        sertakan_jawaban: sertakanJawaban,
        sertakan_pembahasan: sertakanPembahasan,
      };

      const res = await fetch(`/api/export/${format}`, {
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
      const sanitizedTitle = activeDoc.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 35);
      a.download = `Naskah_Soal_${sanitizedTitle}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success(`Dokumen ${format.toUpperCase()} berhasil diunduh!`, { id: toastId });
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
    <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pb-24">
      {/* ── HEADER HALAMAN (STANDAR BUAT SOAL) ── */}
      <div className="mb-4 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
          <FileText size={12} /> Bank Soal &amp; Arsip Ujian
        </div>
        <h1 className="text-xl sm:text-3xl font-editorial font-bold text-black dark:text-white">
          Bank Soal
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Akses, pratinjau, edit butir soal, unduh siap cetak, dan hubungkan langsung ke koreksi lembar asesmen.
        </p>
      </div>

      {/* ── KONTAINER NEOBRUTALISME UTAMA (KIBLAT BUAT SOAL) ── */}
      <div className="relative bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-3.5 sm:p-6 md:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.12)]">
        {/* Sudut Neobrutalisme Khas Buat Soal */}
        <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-black dark:border-white/20 -mt-0.5 -ml-0.5"></div>
        <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-black dark:border-white/20 -mt-0.5 -mr-0.5"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-black dark:border-white/20 -mb-0.5 -ml-0.5"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-black dark:border-white/20 -mb-0.5 -mr-0.5"></div>

        {/* ── TOOLBAR PENCARIAN & BUAT FOLDER ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-5 border-b-2 border-black/10 dark:border-white/10 mb-5">
          {/* Search Box Neobrutal */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kuis, materi, atau nama folder..."
              className="pl-10 pr-3.5 py-2.5 w-full border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium text-xs sm:text-sm transition-colors bg-gray-50/50 dark:bg-[#252525] dark:text-white"
            />
          </div>

          <button
            onClick={() => {
              setNewFolderName("");
              setIsFolderModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white dark:bg-[#252525] border-2 border-black dark:border-white/30 text-black dark:text-white font-bold uppercase tracking-wider text-xs hover:bg-gray-100 dark:hover:bg-[#333] transition-all flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={15} /> Buat Folder
          </button>
        </div>

        {/* ── FILTER FOLDER (MONOKROM MURNI TANPA PELANGI) ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Folder size={13} /> Filter Koleksi Folder
            </span>
            {selectedFolder !== "all" && (
              <button
                onClick={() => setSelectedFolder("all")}
                className="text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white underline cursor-pointer"
              >
                Reset ke Semua Folder
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              onClick={() => setSelectedFolder("all")}
              className={`px-3 py-1.5 border-2 text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                selectedFolder === "all"
                  ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white dark:bg-[#252525] border-black/15 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:border-black dark:hover:border-white"
              }`}
            >
              <span>Semua Folder</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                selectedFolder === "all" ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-black/10 dark:bg-white/10"
              }`}>
                {documents.length}
              </span>
            </button>

            {dynamicFolders.map((folder) => {
              const isCurrent = selectedFolder.toLowerCase() === folder.name.toLowerCase();
              return (
                <button
                  key={folder.name}
                  onClick={() => setSelectedFolder(folder.name)}
                  className={`px-3 py-1.5 border-2 text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isCurrent
                      ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-white dark:bg-[#252525] border-black/15 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:border-black dark:hover:border-white"
                  }`}
                >
                  <Folder size={13} />
                  <span>{folder.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                    isCurrent ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-black/10 dark:bg-white/10"
                  }`}>
                    {folder.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── DAFTAR PAKET SOAL (GRID KARTU NEOBRUTAL) ── */}
        <div>
          <div className="flex items-center justify-between mb-4 border-t-2 border-black/10 dark:border-white/10 pt-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
              <FileText size={15} /> Daftar Paket Soal Ujian
            </h2>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Menampilkan {filteredDocuments.length} dari {documents.length} paket
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-gray-400" size={32} />
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Memuat bank soal...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-black/20 dark:border-white/15 bg-gray-50/50 dark:bg-[#252525]/30 text-center p-6">
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
                  className="mt-2 px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                >
                  + Mulai Racik Soal
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredDocuments.map((doc, i) => {
                const questionCount = doc.content?.soal?.length || 0;
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white dark:bg-[#202020] border-2 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between"
                  >
                    {/* Top Content */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-gray-100 dark:bg-[#2a2a2a] border border-black/15 dark:border-white/15 text-gray-700 dark:text-gray-300 flex items-center gap-1">
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
                        className="font-bold text-sm sm:text-base text-black dark:text-white line-clamp-2 leading-snug cursor-pointer hover:underline mb-2"
                      >
                        {doc.title}
                      </h3>

                      <div className="mt-auto pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs text-gray-500">
                        <span className="font-bold text-black dark:text-white">
                          {questionCount} Butir Soal
                        </span>
                        <button
                          onClick={() => handleDeleteDoc(doc.id, doc.title)}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                          title="Hapus set soal ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Action Bar (Monokrom Murni, Tanpa Ungu) */}
                    <div className="p-2.5 bg-gray-50 dark:bg-[#252525] border-t-2 border-black/15 dark:border-white/15 grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => openViewModal(doc)}
                        className="py-1.5 px-2 bg-white dark:bg-[#1e1e1e] border-2 border-black/20 dark:border-white/20 text-black dark:text-white font-bold text-xs hover:border-black dark:hover:border-white flex items-center justify-center gap-1 transition-colors cursor-pointer active:translate-y-0.5"
                        title="Lihat Soal & Jawaban"
                      >
                        <Eye size={13} /> <span>Lihat</span>
                      </button>

                      <button
                        onClick={() => handleBridgeToKoreksi(doc)}
                        className="py-1.5 px-2 bg-black text-white dark:bg-white dark:text-black font-bold text-xs hover:bg-gray-800 dark:hover:bg-gray-100 flex items-center justify-center gap-1 transition-colors cursor-pointer active:translate-y-0.5"
                        title="Gunakan kunci jawaban paket ini untuk Auto-Koreksi"
                      >
                        <ClipboardCheck size={13} /> <span>Koreksi</span>
                      </button>

                      <button
                        onClick={() => openDownloadModal(doc)}
                        className="py-1.5 px-2 bg-white dark:bg-[#1e1e1e] border-2 border-black/20 dark:border-white/20 text-black dark:text-white font-bold text-xs hover:border-black dark:hover:border-white flex items-center justify-center gap-1 transition-colors cursor-pointer active:translate-y-0.5"
                        title="Unduh Word / PDF"
                      >
                        <Download size={13} /> <span>Unduh</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL 1: EDUVIEWER & STUDIO (NEOBRUTALISME RESMI) ── */}
      <AnimatePresence>
        {isViewModalOpen && activeDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-3 border-black dark:border-white/20 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b-2 border-black/10 dark:border-white/10 flex flex-col gap-3 bg-gray-50/50 dark:bg-[#252525]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black">
                        {activeDoc.folder || "Umum"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activeDoc.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-editorial font-bold text-black dark:text-white">
                      {activeDoc.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Switcher & Metrics (Monokrom) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-1 bg-gray-200/60 dark:bg-[#2a2a2a] p-1 border border-black/15 dark:border-white/15 self-start">
                    <button
                      onClick={() => setViewMode("guru")}
                      className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === "guru"
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                          : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <BookOpen size={13} />
                      <span>Mode Guru (Kunci &amp; Pembahasan)</span>
                    </button>
                    <button
                      onClick={() => setViewMode("murid")}
                      className={`px-3 py-1 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewMode === "murid"
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                          : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <GraduationCap size={14} />
                      <span>Mode Murid (Lembar Soal Bersih)</span>
                    </button>
                  </div>

                  {activeDocMetrics && (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-[#333] border border-black/15 dark:border-white/15 text-black dark:text-white">
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
                        <span className="w-6 h-6 bg-black text-white dark:bg-white dark:text-black font-black flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                          {q.tipe || "Pilihan Ganda"}
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-gray-100 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-300">
                        {q.kesulitan || q.level_bloom || "Sedang"}
                      </span>
                    </div>

                    {/* Question Text */}
                    {isEditing ? (
                      <textarea
                        value={q.teks}
                        onChange={(e) => {
                          const updated = [...editedQuestions];
                          updated[idx].teks = e.target.value;
                          setEditedQuestions(updated);
                        }}
                        className="w-full bg-gray-50 dark:bg-[#2a2a2a] p-2.5 border-2 border-black/20 text-xs sm:text-sm font-medium outline-none focus:border-black"
                        rows={2}
                      />
                    ) : (
                      <div className="text-xs sm:text-sm font-medium text-black dark:text-white leading-relaxed">
                        <MathText content={q.teks} />
                      </div>
                    )}

                    {/* Options (Multiple Choice & True/False AKM) */}
                    {(() => {
                      const isBS =
                        q.tipe?.toLowerCase().includes("benar") ||
                        q.tipe?.toLowerCase().includes("true") ||
                        (q.opsi &&
                          q.opsi.length === 2 &&
                          q.opsi.some((o: any) => o.teks?.toLowerCase().trim() === "benar"));

                      if (isBS) {
                        const isBenarKey =
                          q.opsi?.find((o: any) => o.teks?.toLowerCase().trim() === "benar")?.benar ||
                          String(q.kunci_jawaban || "").toLowerCase().trim() === "benar" ||
                          String(q.kunci_jawaban || "").toUpperCase().trim() === "A";

                        return (
                          <div className="flex items-center gap-2.5 pt-1">
                            <div
                              className={`px-3.5 py-1.5 border-2 flex items-center gap-2 text-xs font-bold transition-colors ${
                                viewMode === "guru" && isBenarKey
                                  ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-xs"
                                  : "bg-gray-50 dark:bg-[#282828] border-black/15 dark:border-white/15 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <span className="font-mono text-sm">{viewMode === "guru" && isBenarKey ? "[✓]" : "[  ]"}</span>
                              <span>Benar</span>
                              {viewMode === "guru" && isBenarKey && (
                                <span className="text-[9px] bg-white/20 dark:bg-black/20 px-1.5 py-0.2 rounded font-bold uppercase">
                                  Kunci
                                </span>
                              )}
                            </div>
                            <div
                              className={`px-3.5 py-1.5 border-2 flex items-center gap-2 text-xs font-bold transition-colors ${
                                viewMode === "guru" && !isBenarKey
                                  ? "bg-black text-white border-black dark:bg-white dark:text-black shadow-xs"
                                  : "bg-gray-50 dark:bg-[#282828] border-black/15 dark:border-white/15 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <span className="font-mono text-sm">{viewMode === "guru" && !isBenarKey ? "[✓]" : "[  ]"}</span>
                              <span>Salah</span>
                              {viewMode === "guru" && !isBenarKey && (
                                <span className="text-[9px] bg-white/20 dark:bg-black/20 px-1.5 py-0.2 rounded font-bold uppercase">
                                  Kunci
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (q.opsi && Array.isArray(q.opsi) && q.opsi.length > 0) {
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.opsi.map((op: any, oIdx: number) => {
                              const isCorrect =
                                viewMode === "guru" &&
                                (op.benar ||
                                  op.label?.toUpperCase() === q.kunci_jawaban?.toUpperCase());

                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2.5 border-2 text-xs flex items-start gap-2.5 transition-colors ${
                                    isCorrect
                                      ? "bg-black text-white border-black dark:bg-white dark:text-black font-bold shadow-xs"
                                      : "bg-gray-50 dark:bg-[#282828] border-black/15 dark:border-white/15 text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 flex items-center justify-center font-black text-[10px] shrink-0 ${
                                      isCorrect
                                        ? "bg-white text-black dark:bg-black dark:text-white"
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
                                      className="w-full bg-white dark:bg-[#1e1e1e] p-1 border outline-none font-normal text-black dark:text-white"
                                    />
                                  ) : (
                                    <span className="flex-1 leading-snug">
                                      <MathText content={op.teks} inline />
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      return null;
                    })()}

                    {/* Guru Exclusive: Kunci Jawaban & Pembahasan */}
                    {viewMode === "guru" && (
                      <div className="pt-2.5 border-t border-black/10 dark:border-white/10 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[11px]">
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
                              className="w-32 p-1 border-2 border-black text-xs font-bold uppercase"
                            />
                          ) : (
                            <span className="font-black text-black dark:text-white bg-gray-100 dark:bg-[#2a2a2a] px-2 py-0.5 border border-black/15 dark:border-white/15">
                              <MathText content={q.kunci_jawaban || "Tidak ada rujukan"} inline />
                            </span>
                          )}
                        </div>

                        {q.pembahasan && (
                          <div className="p-2.5 bg-gray-50 dark:bg-[#252525] border-l-2 border-black dark:border-white/40 text-[11px] text-gray-600 dark:text-gray-300">
                            <span className="font-bold block mb-0.5">Pembahasan:</span>
                            <MathText content={q.pembahasan} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-[#202020] border-t-2 border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyWhatsApp(activeDoc)}
                    className="px-3 py-1.5 border-2 border-black/15 dark:border-white/15 font-bold text-xs hover:border-black flex items-center gap-1.5 cursor-pointer active:translate-y-0.5"
                    title="Salin untuk WhatsApp"
                  >
                    {copiedType === "wa" ? <Check size={13} /> : <Share2 size={13} />}
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleCopyCleanText(activeDoc)}
                    className="px-3 py-1.5 border-2 border-black/15 dark:border-white/15 font-bold text-xs hover:border-black flex items-center gap-1.5 cursor-pointer active:translate-y-0.5"
                    title="Salin Teks Bersih"
                  >
                    {copiedType === "clean" ? <Check size={13} /> : <Copy size={13} />}
                    <span>Salin</span>
                  </button>

                  <button
                    onClick={() => {
                      if (isEditing) handleSaveEdits();
                      else setIsEditing(true);
                    }}
                    disabled={isSavingEdits}
                    className={`px-3 py-1.5 border-2 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:translate-y-0.5 ${
                      isEditing
                        ? "bg-black text-white border-black dark:bg-white dark:text-black"
                        : "border-black/15 dark:border-white/15 hover:border-black"
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Save size={13} /> Simpan Revisi
                      </>
                    ) : (
                      <>
                        <Edit3 size={13} /> Edit Butir
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Bridge to Koreksi (Clean Neobrutal Primary Button, NO PURPLE) */}
                  <button
                    onClick={() => handleBridgeToKoreksi(activeDoc)}
                    className="px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer active:translate-y-0.5"
                  >
                    <ClipboardCheck size={14} /> Koreksi Jawaban Murid
                  </button>

                  {/* Unduh */}
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      openDownloadModal(activeDoc);
                    }}
                    className="px-3.5 py-1.5 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/30 text-black dark:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:bg-gray-100 transition-colors cursor-pointer active:translate-y-0.5"
                  >
                    <Download size={14} /> Unduh
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: DOWNLOAD HUB TERPADU (1:1 DENGAN BUAT SOAL) ── */}
      <AnimatePresence>
        {isDownloadModalOpen && activeDoc && (
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
              className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] border-2 sm:border-3 border-black dark:border-white/20 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#252525]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-black dark:text-white">
                    <Download size={18} className="text-gray-500 dark:text-gray-400" /> Download Hub
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs mt-0.5">
                    Pilih format ekspor sesuai kebutuhan Anda.
                  </p>
                </div>
                <button
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
                      Dokumen Cetak
                    </h4>
                  </div>

                  {/* Dokumen PDF */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleExport("pdf")}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded flex items-center justify-center font-bold text-xs shrink-0 border border-red-300 dark:border-red-800">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white">
                          Dokumen PDF (.pdf)
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Format identik Word siap cetak
                        </div>
                      </div>
                    </div>
                    <Download size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>

                  {/* Microsoft Word */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleExport("docx")}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded flex items-center justify-center font-bold text-sm shrink-0 border border-blue-300 dark:border-blue-800">
                        W
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white">
                          Microsoft Word (.docx)
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Dokumen resmi dapat diedit di Word &amp; Docs
                        </div>
                      </div>
                    </div>
                    <Download size={16} className="text-gray-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-2" />
                  </button>
                </div>

                {/* Konfigurasi Kunci & Pembahasan */}
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
                        soal: activeDoc.content?.soal || [],
                      }}
                    />

                    <GoogleFormExportButton
                      soalData={{
                        header: {
                          nama_sekolah: "SMA / SMK / MADRASAH PENDIDIKAN NASIONAL",
                          mata_pelajaran: activeDoc.title,
                          kelas: "Semua Kelas",
                          durasi: "60 Menit",
                        },
                        soal: activeDoc.content?.soal || [],
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: BUAT FOLDER BARU (NEOBRUTALISME) ── */}
      <AnimatePresence>
        {isFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-3 border-black dark:border-white/20 p-5 sm:p-6 max-w-sm w-full shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)]"
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
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
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
                    placeholder="Contoh: UTS Semester 1, Biologi X"
                    className="w-full p-2.5 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 font-bold outline-none focus:border-black dark:focus:border-white"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Folder baru akan tersedia saat Anda meracik dan menyimpan soal berikutnya.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    Batal
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
                    className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
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
