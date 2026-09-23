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
  ExternalLink,
  Clock,
  Layers,
  FileUp,
  Image as ImageIcon,
  Edit3,
  X,
  Loader2,
  FileCode,
  FileSpreadsheet,
  AlertCircle,
  FileCheck,
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
    toast.success("Materi berhasil disalin ke papan klip!");
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
    return items.reduce((acc, it) => acc + (it.konten_mentah?.split(/\s+/).length || 0), 0);
  }, [items]);

  const badgeConfig = (sumber: string) => {
    const s = sumber?.toLowerCase() || "teks";
    if (s.includes("pdf"))
      return {
        label: "PDF",
        color: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-300 dark:border-red-800",
      };
    if (s.includes("docx") || s.includes("word"))
      return {
        label: "DOCX",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800",
      };
    if (s.includes("pptx") || s.includes("ppt"))
      return {
        label: "PPTX",
        color: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border-orange-300 dark:border-orange-800",
      };
    if (s.includes("gambar") || s.includes("image"))
      return {
        label: "GAMBAR (OCR)",
        color: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-300 dark:border-purple-800",
      };
    return {
      label: "TEKS MATERI",
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    };
  };

  return (
    <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
            <BookOpen size={12} /> Modul Repositori Bahan Ajar
          </div>
          <h1 className="text-2xl sm:text-4xl font-editorial font-bold text-black dark:text-white mb-1 sm:mb-2">
            Bank Materi
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Simpan, kelola, dan gunakan kembali bahan ajar kurikulum Anda untuk membuat soal ujian
            atau susunan rencana belajar ber-AI hanya dalam satu klik.
          </p>
        </div>

        {/* Action Button: Tambah Materi */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormJudul("");
              setFormKonten("");
              setFormSumber("teks");
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:translate-y-0.5 active:translate-x-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} /> Tambah Materi
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
            Total Bahan Ajar
          </span>
          <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
            {items.length} <span className="text-xs font-normal text-gray-500">Materi</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
            Estimasi Kata
          </span>
          <div className="text-2xl sm:text-3xl font-black text-black dark:text-white">
            {totalKata.toLocaleString("id-ID")}{" "}
            <span className="text-xs font-normal text-gray-500">Kata</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
            Integrasi AI
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
            <CheckCircle2 size={18} /> Siap Diolah
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
            Terakhir Disimpan
          </span>
          <div className="text-xs sm:text-sm font-bold text-black dark:text-white mt-2 truncate">
            {items[0]
              ? new Date(items[0].created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Belum Ada"}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-3 sm:p-4 mb-6 sm:mb-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: "all", label: "Semua" },
            { key: "teks", label: "Teks Langsung" },
            { key: "dokumen", label: "Dokumen (PDF/Word)" },
            { key: "gambar", label: "Gambar (Scan)" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedFilter(f.key)}
              className={`px-3 py-1.5 rounded-none text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === f.key
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                  : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul atau isi materi..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 outline-none focus:border-black dark:focus:border-white transition-colors dark:text-white"
          />
        </div>
      </div>

      {/* Grid Materi Items */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-gray-500" size={32} />
          <p className="text-xs sm:text-sm font-bold text-gray-500">Memuat koleksi materi ajar...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 sm:py-24 border-2 border-dashed border-black/20 dark:border-white/20 bg-white/50 dark:bg-[#1e1e1e]/50 p-6 text-center">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-3" />
          <h3 className="font-editorial text-xl sm:text-2xl font-bold text-black dark:text-white mb-2">
            {searchQuery ? "Materi Tidak Ditemukan" : "Bank Materi Masih Kosong"}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            {searchQuery
              ? "Tidak ada materi yang sesuai dengan kata kunci pencarian Anda. Coba kata kunci lain."
              : "Setiap materi yang Anda masukkan di form Buat Soal akan tersimpan di sini secara otomatis, atau Anda dapat menambahkannya manual sekarang."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                setFormJudul("");
                setFormKonten("");
                setFormSumber("teks");
                setIsAddModalOpen(true);
              }}
              className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]"
            >
              + Tambah Materi Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredItems.map((item, index) => {
            const badge = badgeConfig(item.jenis_sumber);
            const wordCount = item.konten_mentah.split(/\s+/).filter(Boolean).length;
            const charCount = item.konten_mentah.length;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col justify-between hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] transition-all"
              >
                <div>
                  {/* Top Bar: Badge & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-black/10 dark:border-white/10">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-sm ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                      <Clock size={12} />
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
                    className="font-bold text-base sm:text-lg text-black dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
                  >
                    {item.judul}
                  </h3>

                  {/* Snippet */}
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4 bg-gray-50 dark:bg-[#262626] p-2.5 border border-black/5 dark:border-white/5 font-sans">
                    {item.konten_mentah}
                  </p>
                </div>

                <div>
                  {/* Stats & Mini Actions */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold mb-4 pt-2 border-t border-black/10 dark:border-white/10">
                    <span>
                      {wordCount} Kata • {charCount} Karakter
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyText(item.id, item.konten_mentah)}
                        title="Salin Isi Materi"
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                      >
                        {copiedId === item.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        title="Edit Judul/Isi"
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.judul)}
                        title="Hapus Materi"
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Primary AI Pipeline Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUseForCreateSoal(item.konten_mentah)}
                      className="w-full py-2 px-2.5 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-[11px] hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-0.5"
                    >
                      <Sparkles size={12} className="text-yellow-400 dark:text-black" />
                      Buat Soal
                    </button>
                    <button
                      onClick={() => handleUseForPerencana(item.konten_mentah)}
                      className="w-full py-2 px-2.5 bg-gray-100 dark:bg-[#2a2a2a] text-black dark:text-white font-bold uppercase tracking-wider text-[11px] hover:bg-gray-200 dark:hover:bg-[#333] transition-colors flex items-center justify-center gap-1.5 border border-black/10 dark:border-white/10"
                    >
                      <CalendarRange size={12} />
                      Rencana Ajar
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: Tambah Materi Baru ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-5 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)]"
            >
              <div className="flex items-center justify-between pb-4 border-b-2 border-black/10 dark:border-white/10 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                    <Plus size={18} />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black dark:text-white">
                    Tambah Bahan Ajar Baru
                  </h2>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Upload Helper Tools */}
              <div className="mb-5 p-3.5 bg-gray-50 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-2">
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
                    className="px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 hover:border-black text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileUp size={14} /> Dokumen (PDF, Word, PPT)
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
                    className="px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 hover:border-black text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ImageIcon size={14} /> Gambar / Scan (OCR)
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                    Judul Materi Pembelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    placeholder="Contoh: Biologi Kelas 10 - Fotosintesis & Metabolisme Sel"
                    className="w-full p-2.5 sm:p-3 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 outline-none focus:border-black dark:focus:border-white font-bold transition-colors dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                      Isi Teks Materi Pembelajaran *
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {formKonten.length} Karakter •{" "}
                      {formKonten.split(/\s+/).filter(Boolean).length} Kata
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    required
                    value={formKonten}
                    onChange={(e) => setFormKonten(e.target.value)}
                    placeholder="Tempelkan seluruh isi bab, rangkuman materi, atau silabus di sini..."
                    className="w-full p-3 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 outline-none focus:border-black dark:focus:border-white font-mono leading-relaxed transition-colors dark:text-white resize-y"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black dark:hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Menyimpan...
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

      {/* ── MODAL: Detail / Baca Lengkap Materi ── */}
      <AnimatePresence>
        {isDetailModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-5 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] flex flex-col justify-between"
            >
              <div>
                {/* Header Modal */}
                <div className="flex items-start justify-between pb-4 border-b-2 border-black/10 dark:border-white/10 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-sm ${
                          badgeConfig(activeItem.jenis_sumber).color
                        }`}
                      >
                        {badgeConfig(activeItem.jenis_sumber).label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(activeItem.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-editorial text-black dark:text-white leading-tight">
                      {activeItem.judul}
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="p-1 text-gray-400 hover:text-black dark:hover:text-white"
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* Content Reader */}
                <div className="my-4 p-4 sm:p-6 bg-gray-50 dark:bg-[#252525] border border-black/10 dark:border-white/10 max-h-[50vh] overflow-y-auto">
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                    {activeItem.konten_mentah}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t-2 border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleCopyText(activeItem.id, activeItem.konten_mentah)}
                    className="px-3.5 py-2 border border-black/20 dark:border-white/20 text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-black flex items-center gap-1.5"
                  >
                    {copiedId === activeItem.id ? (
                      <>
                        <Check size={14} className="text-emerald-500" /> Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Salin Seluruh Teks
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openEditModal(activeItem);
                    }}
                    className="px-3.5 py-2 border border-black/20 dark:border-white/20 text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-black flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> Edit Teks
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleUseForPerencana(activeItem.konten_mentah)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-gray-100 dark:bg-[#2a2a2a] text-black dark:text-white font-bold uppercase tracking-wider text-xs border border-black/10 dark:border-white/10 flex items-center justify-center gap-1.5"
                  >
                    <CalendarRange size={14} /> Rencana Ajar
                  </button>
                  <button
                    onClick={() => handleUseForCreateSoal(activeItem.konten_mentah)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                  >
                    <Sparkles size={14} className="text-yellow-400 dark:text-black" /> Buat Soal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Edit Materi ── */}
      <AnimatePresence>
        {isEditModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-5 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)]"
            >
              <div className="flex items-center justify-between pb-4 border-b-2 border-black/10 dark:border-white/10 mb-5">
                <div className="flex items-center gap-2.5">
                  <Edit3 size={18} />
                  <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-black dark:text-white">
                    Edit Bahan Ajar
                  </h2>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white"
                >
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                    Judul Materi Pembelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    className="w-full p-2.5 sm:p-3 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 outline-none focus:border-black dark:focus:border-white font-bold transition-colors dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                      Isi Teks Materi Pembelajaran *
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {formKonten.length} Karakter •{" "}
                      {formKonten.split(/\s+/).filter(Boolean).length} Kata
                    </span>
                  </div>
                  <textarea
                    rows={10}
                    required
                    value={formKonten}
                    onChange={(e) => setFormKonten(e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 outline-none focus:border-black dark:focus:border-white font-mono leading-relaxed transition-colors dark:text-white resize-y"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black dark:hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Menyimpan...
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
