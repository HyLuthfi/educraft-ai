"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  BookOpen,
  Search,
  Check,
  Loader2,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { buatSupabaseClient } from "@/lib/supabase/client";

interface BankMateriItem {
  id: string;
  judul: string;
  jenis_sumber: string;
  konten_mentah: string;
  created_at: string;
}

interface SelectBankMateriModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: { judul: string; konten: string }) => void;
  title?: string;
}

export function SelectBankMateriModal({
  isOpen,
  onClose,
  onSelect,
  title = "Pilih Bahan Ajar dari Bank Materi",
}: SelectBankMateriModalProps) {
  const [materials, setMaterials] = useState<BankMateriItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("all");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadMaterials = async () => {
      setLoading(true);
      try {
        const supabase = buatSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Silakan login untuk memuat bahan ajar.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("bank_materi")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (isMounted) {
          const list = (data as BankMateriItem[]) || [];
          setMaterials(list);
          if (list.length > 0) {
            setSelectedId(list[0].id);
          }
        }
      } catch (err: any) {
        console.error("Gagal memuat bank materi:", err);
        toast.error("Gagal memuat bahan ajar: " + (err.message || "Error"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMaterials();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        m.judul?.toLowerCase().includes(q) ||
        m.konten_mentah?.toLowerCase().includes(q);

      const src = (m.jenis_sumber || "teks").toLowerCase();
      const matchesSource =
        selectedSource === "all" ||
        (selectedSource === "teks" && src === "teks") ||
        (selectedSource === "berkas" && (src === "berkas" || src === "file")) ||
        (selectedSource === "foto" && (src === "foto" || src === "image")) ||
        (selectedSource === "rencana" && src === "rencana_ajar");

      return matchesSearch && matchesSource;
    });
  }, [materials, searchQuery, selectedSource]);

  const activeMaterial = useMemo(() => {
    return materials.find((m) => m.id === selectedId) || null;
  }, [materials, selectedId]);

  const handleApply = () => {
    if (!activeMaterial) {
      toast.error("Pilih salah satu materi terlebih dahulu.");
      return;
    }

    onSelect({
      judul: activeMaterial.judul,
      konten: activeMaterial.konten_mentah || "",
    });

    toast.success(`Materi "${activeMaterial.judul}" berhasil dimuat!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a1a1a] border-3 sm:border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_#000] sm:shadow-[10px_10px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-3 sm:border-b-4 border-black dark:border-white bg-yellow-300 dark:bg-yellow-400">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 bg-black text-white">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
                {title}
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-black/70">
                Gunakan modul atau silabus yang pernah Anda simpan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white border-2 border-black text-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Memuat bank materi...
              </p>
            </div>
          ) : materials.length === 0 ? (
            <div className="py-12 px-4 border-2 border-dashed border-black/30 dark:border-white/30 text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-zinc-800 border-2 border-black dark:border-white flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-tight dark:text-white">
                Belum Ada Bahan Ajar di Bank Materi
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Anda belum pernah menyimpan bahan ajar. Anda bisa menambahkan rangkuman atau modul di halaman Bank Materi terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom Kiri: Daftar Materi */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Pilih Bahan Ajar ({filteredMaterials.length})
                </label>

                {/* Input Pencarian */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari judul materi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#222] border-2 border-black dark:border-white/30 font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Filter Sumber */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {[
                    { id: "all", label: "Semua" },
                    { id: "teks", label: "Teks" },
                    { id: "berkas", label: "Berkas" },
                    { id: "foto", label: "Foto" },
                    { id: "rencana", label: "Rencana Ajar" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSource(s.id)}
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase border transition-colors whitespace-nowrap ${
                        selectedSource === s.id
                          ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                          : "bg-white dark:bg-[#252525] border-black/20 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* List Materi */}
                <div className="max-h-56 sm:max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {filteredMaterials.map((item) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full text-left p-2.5 border-2 transition-all flex flex-col gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-[2px_2px_0px_0px_#FACC15]"
                            : "bg-white dark:bg-[#252525] border-black/30 dark:border-white/20 hover:border-black dark:hover:border-white text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-xs uppercase truncate">
                            {item.judul || "Bahan Ajar"}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 border uppercase ${
                              isSelected
                                ? "bg-yellow-400 text-black border-black"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-black/20"
                            }`}
                          >
                            {item.jenis_sumber || "teks"}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-70 line-clamp-1">
                          {item.konten_mentah || "Tidak ada konten"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kolom Kanan: Pratinjau Materi Terpilih */}
              <div className="flex flex-col justify-between space-y-3 bg-gray-50 dark:bg-[#222] border-2 border-black dark:border-white/30 p-3 sm:p-3.5">
                {activeMaterial ? (
                  <div className="space-y-2.5 flex-1 flex flex-col">
                    <div>
                      <div className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                        Pratinjau Materi
                      </div>
                      <h4 className="text-sm font-black uppercase text-black dark:text-white mt-0.5">
                        {activeMaterial.judul}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <span className="font-bold uppercase bg-yellow-200 dark:bg-yellow-950 px-1.5 py-0.2 border border-black/20 text-black dark:text-yellow-200">
                          {activeMaterial.jenis_sumber || "teks"}
                        </span>
                        <span>•</span>
                        <span>{activeMaterial.konten_mentah?.length || 0} Karakter</span>
                      </div>
                    </div>

                    <div className="flex-1 min-h-[140px] max-h-52 overflow-y-auto p-2 bg-white dark:bg-[#1a1a1a] border border-black/20 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {activeMaterial.konten_mentah || "Tidak ada teks"}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    Pilih salah satu materi di kolom sebelah kiri
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t-3 sm:border-t-4 border-black dark:border-white bg-gray-100 dark:bg-[#222] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-[#333] border-2 border-black dark:border-white text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#444] transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!activeMaterial}
            className={`px-5 py-2 border-2 border-black dark:border-white text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              !activeMaterial
                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            <span>Terapkan Materi Ini</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
