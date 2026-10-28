"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { buatSupabaseClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Sparkles,
  Plus,
  Search,
  FileText,
  CalendarRange,
  Trash2,
  Copy,
  Check,
  Clock,
  Layers,
  FileUp,
  Image as ImageIcon,
  Edit3,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface BankMateriItem {
  id: string;
  user_id: string;
  judul: string;
  jenis_sumber: string;
  konten_mentah: string;
  created_at: string;
}

export default function BankMateriPage() {
  const router = useRouter();
  const [items, setItems] = useState<BankMateriItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<BankMateriItem | null>(null);

  // Form State (Tambah & Edit)
  const [formJudul, setFormJudul] = useState("");
  const [formKonten, setFormKonten] = useState("");
  const [formSumber, setFormSumber] = useState("teks");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const supabase = buatSupabaseClient();

  const fetchMateri = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bank_materi")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat bank materi: " + (err.message || "Error server"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMateri();
  }, []);

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.konten_mentah.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedFilter === "all") return true;
      if (selectedFilter === "teks") return item.jenis_sumber === "teks";
      if (selectedFilter === "dokumen")
        return ["pdf", "docx", "pptx"].includes(item.jenis_sumber?.toLowerCase());
      if (selectedFilter === "gambar")
        return ["gambar", "image", "image/png", "image/jpeg"].includes(
          item.jenis_sumber?.toLowerCase()
        );
      return true;
    });
  }, [items, searchQuery, selectedFilter]);

  // Quick Action Handlers
  const handleUseForCreateSoal = (konten: string) => {
    sessionStorage.setItem("educraft_selected_materi", konten);
    toast.success("Materi dialihkan ke peracik soal!");
    router.push("/create");
  };

  const handleUseForPerencana = (konten: string) => {
    sessionStorage.setItem("educraft_selected_materi", konten);
    toast.success("Materi dialihkan ke perencana pembelajaran!");
    router.push("/perencana");
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Materi berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, judul: string) => {
    if (!confirm(`Hapus materi "${judul}" dari Bank Materi?`)) return;

    try {
      const { error } = await supabase.from("bank_materi").delete().eq("id", id);
      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== id));
      if (activeItem?.id === id) {
        setIsDetailModalOpen(false);
        setActiveItem(null);
      }
      toast.success("Materi berhasil dihapus");
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
  };

  // Upload Handlers for Add Form
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(`Mengekstrak ${file.name}...`);

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
        setFormKonten((prev) => (prev ? prev + "\n\n" + data.teks_hasil : data.teks_hasil));
        if (!formJudul) {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          setFormJudul(fileNameWithoutExt);
        }
        setFormSumber(data.tipe_file || "dokumen");
        toast.success(`Ekstraksi selesai (${data.jumlah_halaman || 1} halaman)!`, { id: toastId });
      }
    } catch (err: any) {
      toast.error("Gagal ekstrak berkas: " + err.message, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Membaca teks dari gambar via OCR AI...");

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
        setFormKonten((prev) => (prev ? prev + "\n\n" + data.teks_hasil : data.teks_hasil));
        if (!formJudul) {
          setFormJudul("Materi Foto/Scan: " + file.name.replace(/\.[^/.]+$/, ""));
        }
        setFormSumber("gambar");
        toast.success("OCR Berhasil membaca gambar materi!", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Gagal OCR gambar: " + err.message, { id: toastId });
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  // Submit Tambah Materi
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formKonten.trim()) {
      toast.error("Judul dan konten materi tidak boleh kosong");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi login berakhir. Silakan login kembali.");

      const { data, error } = await supabase
        .from("bank_materi")
        .insert({
          user_id: user.id,
          judul: formJudul.trim(),
          jenis_sumber: formSumber,
          konten_mentah: formKonten.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) setItems((prev) => [data, ...prev]);
      toast.success("Materi berhasil disimpan ke Bank Materi!");
      setIsAddModalOpen(false);
      setFormJudul("");
      setFormKonten("");
      setFormSumber("teks");
    } catch (err: any) {
      toast.error("Gagal menyimpan materi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Materi
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!formJudul.trim() || !formKonten.trim()) {
      toast.error("Judul dan konten tidak boleh kosong");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("bank_materi")
        .update({
          judul: formJudul.trim(),
          konten_mentah: formKonten.trim(),
        })
        .eq("id", activeItem.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((it) =>
          it.id === activeItem.id
            ? { ...it, judul: formJudul.trim(), konten_mentah: formKonten.trim() }
            : it
        )
      );

      if (activeItem.id === activeItem?.id) {
        setActiveItem({
          ...activeItem,
          judul: formJudul.trim(),
          konten_mentah: formKonten.trim(),
        });
      }

      toast.success("Materi berhasil diperbarui!");
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error("Gagal memperbarui: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item: BankMateriItem) => {
    setActiveItem(item);
    setFormJudul(item.judul);
    setFormKonten(item.konten_mentah);
    setIsEditModalOpen(true);
  };

  const openDetailModal = (item: BankMateriItem) => {
    setActiveItem(item);
    setIsDetailModalOpen(true);
  };

  // Stats Calculator
  const totalKata = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.konten_mentah?.split(/\s+/).filter(Boolean).length || 0), 0);
  }, [items]);

  // Badge Monokrom Neobrutalisme Murni (Zero Pastel / AI Rainbow)
  const badgeConfig = (sumber: string) => {
    const s = sumber?.toLowerCase() || "teks";
    if (s.includes("pdf")) return { label: "PDF" };
    if (s.includes("docx") || s.includes("word")) return { label: "DOCX" };
    if (s.includes("pptx") || s.includes("ppt")) return { label: "PPTX" };
    if (s.includes("gambar") || s.includes("image")) return { label: "GAMBAR (OCR)" };
    return { label: "TEKS MATERI" };
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#121212] p-3 sm:p-6 md:p-10 pb-24 font-sans text-black dark:text-white">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Title & Breadcrumb (1:1 Kiblat Buat Soal) */}
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] uppercase font-bold tracking-widest w-fit shadow-[2px_2px_0px_#000]">
            <BookOpen size={12} /> Modul Repositori Bahan Ajar
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-editorial tracking-tight text-black dark:text-white mt-1">
            Bank Materi
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-sans max-w-xl">
            Simpan, kelola, dan gunakan kembali bahan ajar kurikulum Anda untuk membuat soal ujian atau susunan rencana ajar ber-AI dalam satu klik.
          </p>
        </div>

        {/* ── Kontainer Neobrutalisme Utama (Unified Master Container) ── */}
        <div className="relative border-2 border-black dark:border-white/30 bg-white dark:bg-[#1e1e1e] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* 4 Corner Ornaments */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

          {/* Top Bar: Tambah Materi Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Koleksi Bahan Ajar Terdaftar ({items.length})
            </span>
            <button
              onClick={() => {
                setFormJudul("");
                setFormKonten("");
                setFormSumber("teks");
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Tambah Materi</span>
            </button>
          </div>

          {/* 3 Metric Cards Ringkas (Landscape 2:1, Monokrom Murni 1:1 Rapor & Absensi) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000] flex flex-col justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider truncate">
                Total Materi
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-black dark:text-white font-sans">{items.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">Bahan</span>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000] flex flex-col justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider truncate">
                Estimasi Kata
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-black dark:text-white font-sans">{totalKata.toLocaleString("id-ID")}</span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">Kata</span>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000] flex flex-col justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider truncate">
                Integrasi AI
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-black dark:text-white font-sans">Siap</span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">Olah</span>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar Neobrutal */}
          <div className="p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Buttons Monokrom */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { key: "all", label: "Semua" },
                { key: "teks", label: "Teks Langsung" },
                { key: "dokumen", label: "Dokumen (PDF/Word)" },
                { key: "gambar", label: "Gambar (Scan)" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFilter(f.key)}
                  className={`px-3 py-1.5 border-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedFilter === f.key
                      ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_#000] -translate-y-0.5"
                      : "bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-300 border-black/30 dark:border-white/20 hover:border-black dark:hover:border-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari materi..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border-2 border-black dark:border-white/30 font-bold dark:text-white focus:outline-none shadow-[2px_2px_0px_#000]"
              />
            </div>
          </div>

          {/* Grid Koleksi Materi */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-black dark:text-white" size={32} />
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Memuat koleksi materi ajar...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 border-2 border-dashed border-black/30 dark:border-white/30 p-8 text-center space-y-3 bg-neutral-50 dark:bg-[#252525]">
              <div className="w-12 h-12 mx-auto bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-white flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="font-editorial text-lg font-bold text-black dark:text-white">
                {searchQuery ? "Materi Tidak Ditemukan" : "Bank Materi Masih Kosong"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {searchQuery
                  ? "Tidak ada materi yang sesuai dengan kata kunci pencarian. Coba kata kunci lain."
                  : "Simpan bahan ajar atau silabus Anda di sini agar bisa langsung dipakai untuk membuat soal atau rencana ajar secara instan."}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    setFormJudul("");
                    setFormKonten("");
                    setFormSumber("teks");
                    setIsAddModalOpen(true);
                  }}
                  className="mt-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  + Tambah Materi Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item, index) => {
                const badge = badgeConfig(item.jenis_sumber);
                const wordCount = item.konten_mentah.split(/\s+/).filter(Boolean).length;
                const charCount = item.konten_mentah.length;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-2 border-black dark:border-white/30 p-4 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_#000] flex flex-col justify-between hover:-translate-y-0.5 transition-all"
                  >
                    <div>
                      {/* Top Bar: Badge & Date */}
                      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-black/10 dark:border-white/10">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-black dark:border-white/30 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white">
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(item.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => openDetailModal(item)}
                        className="font-bold text-sm sm:text-base text-black dark:text-white line-clamp-2 leading-snug cursor-pointer hover:underline mb-2"
                      >
                        {item.judul}
                      </h3>

                      {/* Snippet */}
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed mb-3 bg-neutral-50 dark:bg-[#252525] p-2 border border-black/10 dark:border-white/10 font-sans">
                        {item.konten_mentah}
                      </p>
                    </div>

                    <div>
                      {/* Stats & Actions */}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-3 pt-2 border-t border-black/10 dark:border-white/10">
                        <span>{wordCount} Kata</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyText(item.id, item.konten_mentah)}
                            title="Salin Isi Materi"
                            className="p-1 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white cursor-pointer"
                          >
                            {copiedId === item.id ? <Check size={13} className="text-black dark:text-white" /> : <Copy size={13} />}
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Materi"
                            className="p-1 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.judul)}
                            title="Hapus Materi"
                            className="p-1 text-gray-500 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons: Buat Soal & Rencana Ajar */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleUseForCreateSoal(item.konten_mentah)}
                          className="py-1.5 px-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-[10px] border border-black dark:border-white flex items-center justify-center gap-1 shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 cursor-pointer"
                        >
                          <Sparkles size={11} />
                          <span>Buat Soal</span>
                        </button>
                        <button
                          onClick={() => handleUseForPerencana(item.konten_mentah)}
                          className="py-1.5 px-2 bg-white dark:bg-[#252525] text-black dark:text-white font-bold uppercase tracking-wider text-[10px] border border-black dark:border-white/30 flex items-center justify-center gap-1 shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 cursor-pointer"
                        >
                          <CalendarRange size={11} />
                          <span>Rencana</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: Tambah Materi Baru (Monokrom Neobrutal 4 Siku) ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-[#1a1a1a] border-2 sm:border-4 border-black dark:border-white p-5 sm:p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_#000] space-y-4"
            >
              {/* 4 Corner Ornaments */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                    <Plus size={16} />
                  </div>
                  <h2 className="text-base font-bold uppercase tracking-wider text-black dark:text-white">
                    Tambah Bahan Ajar
                  </h2>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 border border-black dark:border-white/30 text-black dark:text-white hover:bg-black hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Upload Helper Tools */}
              <div className="p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-2">
                  Impor Berkas Cepat (Otomatis Ekstrak AI):
                </span>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.pptx"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/30 text-xs font-bold text-black dark:text-white flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileUp size={13} /> Dokumen (PDF, Word, PPT)
                  </button>

                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => imageInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/30 text-xs font-bold text-black dark:text-white flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    <ImageIcon size={13} /> Gambar / Scan (OCR)
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
                    Judul Bahan Ajar *
                  </label>
                  <input
                    type="text"
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    placeholder="Contoh: Biologi Kelas 10 - Fotosintesis & Metabolisme Sel"
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 font-bold focus:outline-none dark:text-white shadow-inner"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                      Isi Teks Materi Pembelajaran *
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {formKonten.length} Karakter • {formKonten.split(/\s+/).filter(Boolean).length} Kata
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    required
                    value={formKonten}
                    onChange={(e) => setFormKonten(e.target.value)}
                    placeholder="Tempelkan seluruh isi bab, rangkuman materi, atau silabus di sini..."
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 font-mono leading-relaxed focus:outline-none dark:text-white resize-y shadow-inner"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 hover:underline cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase text-xs border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      "Simpan ke Bank Materi"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Detail / Baca Lengkap Materi (Monokrom Neobrutal 4 Siku) ── */}
      <AnimatePresence>
        {isDetailModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-[#1a1a1a] border-2 sm:border-4 border-black dark:border-white p-5 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_#000] flex flex-col justify-between space-y-4"
            >
              {/* 4 Corner Ornaments */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

              <div>
                {/* Header Modal */}
                <div className="flex items-start justify-between pb-3 border-b-2 border-black dark:border-white/20">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-black dark:border-white/30 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white">
                        {badgeConfig(activeItem.jenis_sumber).label}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {new Date(activeItem.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold font-editorial text-black dark:text-white leading-tight">
                      {activeItem.judul}
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="p-1 border border-black dark:border-white/30 text-black dark:text-white hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Content Reader */}
                <div className="my-3 p-3 sm:p-4 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/20 max-h-[48vh] overflow-y-auto">
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-black dark:text-gray-200">
                    {activeItem.konten_mentah}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyText(activeItem.id, activeItem.konten_mentah)}
                    className="px-3 py-1.5 border border-black dark:border-white/30 text-xs font-bold text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-[#333] flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === activeItem.id ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedId === activeItem.id ? "Tersalin!" : "Salin Teks"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openEditModal(activeItem);
                    }}
                    className="px-3 py-1.5 border border-black dark:border-white/30 text-xs font-bold text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-[#333] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUseForPerencana(activeItem.konten_mentah)}
                    className="px-3 py-1.5 bg-white dark:bg-[#252525] text-black dark:text-white font-bold uppercase text-xs border border-black dark:border-white/30 flex items-center gap-1 shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                  >
                    <CalendarRange size={13} />
                    <span>Rencana Ajar</span>
                  </button>
                  <button
                    onClick={() => handleUseForCreateSoal(activeItem.konten_mentah)}
                    className="px-4 py-1.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase text-xs border-2 border-black dark:border-white flex items-center gap-1 shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Buat Soal</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Edit Materi (Monokrom Neobrutal 4 Siku) ── */}
      <AnimatePresence>
        {isEditModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-[#1a1a1a] border-2 sm:border-4 border-black dark:border-white p-5 sm:p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_#000] space-y-4"
            >
              {/* 4 Corner Ornaments */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                    <Edit3 size={15} />
                  </div>
                  <h2 className="text-base font-bold uppercase tracking-wider text-black dark:text-white">
                    Edit Bahan Ajar
                  </h2>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 border border-black dark:border-white/30 text-black dark:text-white hover:bg-black hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
                    Judul Bahan Ajar *
                  </label>
                  <input
                    type="text"
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 font-bold focus:outline-none dark:text-white shadow-inner"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                      Isi Teks Materi Pembelajaran *
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {formKonten.length} Karakter • {formKonten.split(/\s+/).filter(Boolean).length} Kata
                    </span>
                  </div>
                  <textarea
                    rows={10}
                    required
                    value={formKonten}
                    onChange={(e) => setFormKonten(e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 font-mono leading-relaxed focus:outline-none dark:text-white resize-y shadow-inner"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 hover:underline cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase text-xs border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      "Simpan Perubahan"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
