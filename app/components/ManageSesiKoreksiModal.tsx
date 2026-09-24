"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Trash2,
  Search,
  Calendar,
  GraduationCap,
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { buatSupabaseClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

interface HasilSiswaItem {
  nama_siswa: string;
  nilai_akhir: number | string;
  status_kelulusan: "tuntas" | "belum_tuntas";
  rekomendasi?: string;
  detail_koreksi?: any[];
}

export interface SesiKoreksiItem {
  id: string;
  title: string;
  created_at: string;
  skala: string;
  kkm: number;
  jumlah_siswa?: number;
  rata_rata?: number | string;
  tingkat_ketuntasan?: number | string;
  hasil: { hasil: HasilSiswaItem[]; analitik_kelas?: string } | null;
}

interface ManageSesiKoreksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSesiDeleted?: (id: string) => void;
}

export function ManageSesiKoreksiModal({
  isOpen,
  onClose,
  onSesiDeleted,
}: ManageSesiKoreksiModalProps) {
  const [sessions, setSessions] = useState<SesiKoreksiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const supabase = buatSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Silakan login untuk mengelola sesi.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("sesi_koreksi")
        .select("id, title, created_at, skala, kkm, jumlah_siswa, rata_rata, tingkat_ketuntasan, hasil")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSessions((data as SesiKoreksiItem[]) || []);
    } catch (err: any) {
      console.error("Gagal memuat sesi koreksi:", err);
      toast.error("Gagal memuat sesi koreksi: " + (err.message || "Error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => {
      const titleMatch = s.title?.toLowerCase().includes(q);
      const studentMatch = (s.hasil?.hasil || []).some((item) =>
        item.nama_siswa?.toLowerCase().includes(q)
      );
      return titleMatch || studentMatch;
    });
  }, [sessions, searchQuery]);

  const handleDelete = async (session: SesiKoreksiItem) => {
    const studentCount = session.hasil?.hasil?.length || session.jumlah_siswa || 0;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus sesi "${session.title}" (${studentCount} siswa)?\n\nData nilai siswa pada sesi ini akan otomatis terhapus dari perhitungan grafik Rapor dan podium Ranking.`
    );

    if (!confirmDelete) return;

    setDeletingId(session.id);
    const toastId = toast.loading(`Menghapus sesi "${session.title}"...`);

    try {
      const supabase = buatSupabaseClient();
      const { error } = await supabase.from("sesi_koreksi").delete().eq("id", session.id);

      if (error) throw error;

      toast.success("Sesi koreksi berhasil dihapus!", { id: toastId });
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      onSesiDeleted?.(session.id);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menghapus sesi: " + (err.message || "Error tidak diketahui"), {
        id: toastId,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportSingleExcel = (session: SesiKoreksiItem) => {
    const students = session.hasil?.hasil || [];
    if (students.length === 0) {
      toast.error("Sesi ini tidak memiliki data siswa.");
      return;
    }

    const rows: any[] = [];
    rows.push(["LAPORAN NILAI KOREKSI UJIAN"]);
    rows.push(["JUDUL SESI", session.title]);
    rows.push(["TANGGAL", new Date(session.created_at).toLocaleString("id-ID")]);
    rows.push(["SKALA NILAI", session.skala]);
    rows.push(["KKM", session.kkm]);
    rows.push([]);

    rows.push(["No", "Nama Siswa", "Nilai Akhir", "Status Kelulusan", "Saran Tindak Lanjut"]);

    students.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.nama_siswa,
        s.nilai_akhir,
        s.status_kelulusan === "tuntas" ? "TUNTAS" : "REMEDIAL",
        s.rekomendasi || "-",
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 14 },
      { wch: 18 },
      { wch: 45 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai_Koreksi");

    const cleanTitle = (session.title || "Koreksi").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(workbook, `Nilai_${cleanTitle}.xlsx`);
    toast.success("File Excel nilai berhasil diunduh!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a1a1a] border-3 sm:border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_#000] sm:shadow-[10px_10px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-3 sm:border-b-4 border-black dark:border-white bg-yellow-300 dark:bg-yellow-400">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 bg-black text-white">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
                Kelola Sesi Koreksi & Ujian
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-black/70">
                Tinjau riwayat penilaian dan hapus sesi uji coba / tidak valid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white border-2 border-black text-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="p-3.5 sm:p-5 border-b-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#222] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul sesi atau nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border-2 border-black dark:border-white/30 font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
              {sessions.length} Sesi Tersimpan
            </span>
            <button
              onClick={fetchSessions}
              className="p-1.5 bg-white dark:bg-[#2a2a2a] text-black dark:text-white border border-black dark:border-white/20 hover:bg-gray-100 transition-colors"
              title="Segarkan data"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* List Sesi */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Memuat riwayat sesi koreksi...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 px-4 border-2 border-dashed border-black/30 dark:border-white/30 text-center space-y-2">
              <GraduationCap className="w-8 h-8 mx-auto text-gray-400" />
              <h3 className="font-black text-sm uppercase tracking-tight text-black dark:text-white">
                {sessions.length === 0 ? "Belum Ada Sesi Tersimpan" : "Tidak Ditemukan"}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {sessions.length === 0
                  ? "Sesi ujian akan muncul di sini setelah Anda mengoreksi dan menyimpan penilaian di halaman Koreksi."
                  : `Tidak ada sesi yang cocok dengan "${searchQuery}".`}
              </p>
            </div>
          ) : (
            filtered.map((s) => {
              const dateStr = new Date(s.created_at).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              const students = s.hasil?.hasil || [];
              const count = students.length || s.jumlah_siswa || 0;
              const isExpanded = expandedId === s.id;
              const isDeletingThis = deletingId === s.id;

              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-[#202020] border-2 border-black dark:border-white/30 p-3 sm:p-4 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] flex flex-col gap-2.5"
                >
                  {/* Header Item */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <h4 className="font-black text-sm uppercase tracking-tight text-black dark:text-white">
                        {s.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {dateStr}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-black dark:text-white">{count} Siswa</span>
                        <span>•</span>
                        <span>KKM: {s.kkm}</span>
                        <span>•</span>
                        <span className="uppercase font-bold">Skala {s.skala}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        onClick={() => handleExportSingleExcel(s)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1 transition-colors"
                        title="Unduh Excel (.xlsx)"
                      >
                        <FileSpreadsheet size={13} />
                        <span className="hidden sm:inline">Excel</span>
                      </button>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-black dark:text-white border border-black/20 text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-gray-200 transition-colors"
                      >
                        <span>{isExpanded ? "Tutup" : "Pratinjau"}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      <button
                        onClick={() => handleDelete(s)}
                        disabled={isDeletingThis}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-500 font-bold text-[10px] uppercase flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Hapus Sesi"
                      >
                        {isDeletingThis ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Preview: Daftar Siswa & Skor */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
                      <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                        Daftar Siswa Pada Sesi Ini ({students.length})
                      </div>

                      {students.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">
                          Tidak ada rincian data siswa.
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto border border-black/15 dark:border-white/15 bg-gray-50 dark:bg-[#1a1a1a]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100 dark:bg-zinc-800 text-[10px] uppercase font-black border-b border-black/10">
                              <tr>
                                <th className="p-1.5 w-8 text-center">#</th>
                                <th className="p-1.5">Nama Siswa</th>
                                <th className="p-1.5 w-16 text-right">Nilai</th>
                                <th className="p-1.5 w-20 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                              {students.map((item, idx) => {
                                const isTuntas = item.status_kelulusan === "tuntas";
                                return (
                                  <tr key={idx} className="hover:bg-white dark:hover:bg-zinc-900">
                                    <td className="p-1.5 text-center text-gray-400 font-mono text-[10px]">
                                      {idx + 1}
                                    </td>
                                    <td className="p-1.5 font-bold text-black dark:text-white">
                                      {item.nama_siswa}
                                    </td>
                                    <td className="p-1.5 text-right font-black">
                                      {item.nilai_akhir}
                                    </td>
                                    <td className="p-1.5 text-center">
                                      <span
                                        className={`inline-block px-1.5 py-0.2 text-[9px] font-black uppercase ${
                                          isTuntas
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-500"
                                            : "bg-rose-100 text-rose-800 border border-rose-500"
                                        }`}
                                      >
                                        {isTuntas ? "Tuntas" : "Remedial"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-3.5 sm:p-5 border-t-3 sm:border-t-4 border-black dark:border-white bg-gray-100 dark:bg-[#222] flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-medium">
            Perubahan penghapusan sesi langsung memutakhirkan grafik Rapor & Podium.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-black uppercase text-xs tracking-wider border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
