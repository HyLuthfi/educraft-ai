"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { buatSupabaseClient } from "@/lib/supabase/client";

interface SesiMurid {
  nama: string;
  nomor_absen?: string;
  status?: string;
  keterangan?: string;
}

interface SesiAbsensi {
  id: string;
  judul: string;
  tanggal: string;
  total_murid: number;
  jumlah_hadir: number;
  jumlah_izin: number;
  jumlah_sakit: number;
  jumlah_alpa: number;
  jumlah_terlambat: number;
  data: SesiMurid[];
  created_at: string;
}

interface ImportAbsensiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (names: string[], sessionInfo?: { judul: string; tanggal: string }) => void;
  title?: string;
}

export function ImportAbsensiModal({
  isOpen,
  onClose,
  onImport,
  title = "Impor Murid dari Sesi Absensi",
}: ImportAbsensiModalProps) {
  const [sessions, setSessions] = useState<SesiAbsensi[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"hadir_only" | "all">("hadir_only");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadSessions = async () => {
      setLoading(true);
      try {
        const supabase = buatSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Silakan login untuk memuat riwayat absensi.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("sesi_absensi")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (isMounted) {
          const list = (data as SesiAbsensi[]) || [];
          setSessions(list);
          if (list.length > 0) {
            setSelectedId(list[0].id);
          }
        }
      } catch (err: any) {
        console.error("Gagal memuat sesi absensi:", err);
        toast.error("Gagal memuat sesi absensi: " + (err.message || "Error"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.judul?.toLowerCase().includes(q) ||
        s.tanggal?.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedId) || null;
  }, [sessions, selectedId]);

  const candidateNames = useMemo(() => {
    if (!activeSession || !Array.isArray(activeSession.data)) return [];

    if (filterMode === "hadir_only") {
      return activeSession.data
        .filter((m) => {
          const st = (m.status || "").toLowerCase();
          return st === "hadir" || st === "terlambat";
        })
        .map((m) => m.nama?.trim())
        .filter((n): n is string => Boolean(n && n.length > 0));
    }

    return activeSession.data
      .map((m) => m.nama?.trim())
      .filter((n): n is string => Boolean(n && n.length > 0));
  }, [activeSession, filterMode]);

  const handleApply = () => {
    if (!activeSession) {
      toast.error("Pilih salah satu sesi absensi terlebih dahulu.");
      return;
    }

    if (candidateNames.length === 0) {
      toast.error("Tidak ada murid yang memenuhi kriteria filter terpilih.");
      return;
    }

    onImport(candidateNames, {
      judul: activeSession.judul,
      tanggal: activeSession.tanggal,
    });

    toast.success(
      `Berhasil mengimpor ${candidateNames.length} murid dari "${activeSession.judul}"!`
    );
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
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
                {title}
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-black/70">
                Pilih riwayat kelas untuk memuat daftar murid secara otomatis
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
                Memuat riwayat absensi...
              </p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 px-4 border-2 border-dashed border-black/30 dark:border-white/30 text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-zinc-800 border-2 border-black dark:border-white flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-tight dark:text-white">
                Belum Ada Sesi Absensi Tersimpan
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Anda belum pernah menyimpan catatan kehadiran di modul Absensi Murid.
                Buka menu Absensi untuk mencatat kehadiran siswa terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom Kiri: Pilihan Sesi Absensi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Pilih Sesi Kelas ({filteredSessions.length})
                  </label>
                </div>

                {/* Input Pencarian */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari nama kelas atau tanggal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#222] border-2 border-black dark:border-white/30 font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* List Sesi */}
                <div className="max-h-56 sm:max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {filteredSessions.map((session) => {
                    const isSelected = session.id === selectedId;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedId(session.id)}
                        className={`w-full text-left p-2.5 border-2 transition-all flex flex-col gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-[2px_2px_0px_0px_#FACC15]"
                            : "bg-white dark:bg-[#252525] border-black/30 dark:border-white/20 hover:border-black dark:hover:border-white text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-xs uppercase truncate">
                            {session.judul || "Absensi Kelas"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                              isSelected
                                ? "bg-yellow-400 text-black border-black"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-black/20"
                            }`}
                          >
                            {session.total_murid || session.data?.length || 0} Murid
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] opacity-80">
                          <Calendar className="w-3 h-3" />
                          <span>{session.tanggal || "Tanpa tanggal"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kolom Kanan: Detail & Opsi Filter Kehadiran */}
              <div className="flex flex-col justify-between space-y-3 bg-gray-50 dark:bg-[#222] border-2 border-black dark:border-white/30 p-3 sm:p-3.5">
                {activeSession ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                        Detail Sesi Terpilih
                      </div>
                      <h4 className="text-sm font-black uppercase text-black dark:text-white mt-0.5">
                        {activeSession.judul}
                      </h4>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">
                        Tanggal: {activeSession.tanggal}
                      </p>
                    </div>

                    {/* Ringkasan Status Sesi */}
                    <div className="grid grid-cols-4 gap-1 text-center py-2 border-y-2 border-black/10 dark:border-white/10">
                      <div className="p-1 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-500">
                        <div className="text-[9px] font-black text-emerald-800 dark:text-emerald-300">
                          HADIR
                        </div>
                        <div className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                          {activeSession.jumlah_hadir || 0}
                        </div>
                      </div>
                      <div className="p-1 bg-amber-100 dark:bg-amber-950/40 border border-amber-500">
                        <div className="text-[9px] font-black text-amber-800 dark:text-amber-300">
                          SAKIT
                        </div>
                        <div className="text-xs font-black text-amber-900 dark:text-amber-200">
                          {activeSession.jumlah_sakit || 0}
                        </div>
                      </div>
                      <div className="p-1 bg-blue-100 dark:bg-blue-950/40 border border-blue-500">
                        <div className="text-[9px] font-black text-blue-800 dark:text-blue-300">
                          IZIN
                        </div>
                        <div className="text-xs font-black text-blue-900 dark:text-blue-200">
                          {activeSession.jumlah_izin || 0}
                        </div>
                      </div>
                      <div className="p-1 bg-red-100 dark:bg-red-950/40 border border-red-500">
                        <div className="text-[9px] font-black text-red-800 dark:text-red-300">
                          ALPA
                        </div>
                        <div className="text-xs font-black text-red-900 dark:text-red-200">
                          {activeSession.jumlah_alpa || 0}
                        </div>
                      </div>
                    </div>

                    {/* Filter Mode Switcher */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Filter Murid
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilterMode("hadir_only")}
                          className={`p-2 border-2 text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                            filterMode === "hadir_only"
                              ? "bg-emerald-400 text-black border-black shadow-[2px_2px_0px_0px_#000]"
                              : "bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border-black/30 dark:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase">
                              Hanya Hadir
                            </span>
                            {filterMode === "hadir_only" && (
                              <Check className="w-3.5 h-3.5 text-black" />
                            )}
                          </div>
                          <span className="text-[9px] opacity-80 leading-tight">
                            Tidak menyertakan siswa sakit/izin/alpa
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFilterMode("all")}
                          className={`p-2 border-2 text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                            filterMode === "all"
                              ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-[2px_2px_0px_0px_#FACC15]"
                              : "bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border-black/30 dark:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase">
                              Semua Siswa
                            </span>
                            {filterMode === "all" && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className="text-[9px] opacity-80 leading-tight">
                            Seluruh daftar siswa di kelas ini
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Pratinjau Nama Murid */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-gray-600 dark:text-gray-400 uppercase">
                          Pratinjau Murid:
                        </span>
                        <span className="font-black text-black dark:text-white bg-yellow-300 dark:bg-yellow-400 px-1.5 py-0.2 border border-black">
                          {candidateNames.length} Siswa
                        </span>
                      </div>
                      <div className="h-16 overflow-y-auto p-1.5 bg-white dark:bg-[#1a1a1a] border border-black/20 text-[10px] text-gray-600 dark:text-gray-400 font-mono leading-relaxed">
                        {candidateNames.length > 0
                          ? candidateNames.join(", ")
                          : "Tidak ada siswa dalam filter ini"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    Pilih sesi absensi di kolom sebelah kiri
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
            disabled={!activeSession || candidateNames.length === 0}
            className={`px-5 py-2 border-2 border-black dark:border-white text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              !activeSession || candidateNames.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            <span>Terapkan Murid ({candidateNames.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
