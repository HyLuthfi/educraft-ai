"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ImportAbsensiModal } from "@/app/components/ImportAbsensiModal";
import {
  Dice5,
  Play,
  RotateCcw,
  Trash2,
  Trophy,
  Repeat,
  X,
  Sparkles,
  Type,
  ChevronDown,
  Users,
} from "lucide-react";

// Palet monokrom neobrutal selang-seling (anti-rainbow/pastel)
const CARD_STYLES = [
  "bg-white dark:bg-[#1e1e1e] text-black dark:text-white border-2 sm:border-4 border-black dark:border-white/30",
  "bg-neutral-100 dark:bg-[#282828] text-black dark:text-white border-2 sm:border-4 border-black dark:border-white/30",
];

const STORAGE_KEY = "educraft_roda_undian_siswa";

// Dimensi kartu pada rol acak horizontal
const CARD_WIDTH = 200;
const CARD_GAP = 16;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;

export default function RodaUndianPage() {
  const [rawStudents, setRawStudents] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [noRepeat, setNoRepeat] = useState(true);
  const [pickedNames, setPickedNames] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [reelItems, setReelItems] = useState<{ name: string; styleClass: string }[]>([]);
  const [offset, setOffset] = useState(0);
  const [spinKey, setSpinKey] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRawStudents(saved);
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, rawStudents);
  }, [rawStudents, hydrated]);

  const allNames = useMemo(
    () =>
      rawStudents
        .split("\n")
        .map((n) => n.trim())
        .filter((n) => n.length > 0),
    [rawStudents]
  );

  const activeNames = useMemo(() => {
    if (!noRepeat) return allNames;
    return allNames.filter((n) => !pickedNames.includes(n));
  }, [allNames, noRepeat, pickedNames]);

  // Preview strip saat idle
  const previewItems = useMemo(() => {
    const base = activeNames.length > 0 ? activeNames : ["Tambah nama"];
    const items: { name: string; styleClass: string }[] = [];
    for (let i = 0; i < Math.max(12, base.length * 2); i++) {
      items.push({
        name: base[i % base.length],
        styleClass: CARD_STYLES[i % CARD_STYLES.length],
      });
    }
    return items;
  }, [activeNames]);

  const handleSpin = () => {
    if (isSpinning) return;
    if (activeNames.length === 0) {
      if (noRepeat && allNames.length > 0) {
        toast.info("Semua siswa sudah terpilih! Reset untuk mulai lagi.");
      } else {
        toast.error("Masukkan minimal 1 nama siswa dulu.");
      }
      return;
    }
    if (activeNames.length === 1) {
      finalizeWinner(activeNames[0]);
      return;
    }

    const winnerName =
      activeNames[Math.floor(Math.random() * activeNames.length)];

    const REPEATS = 20;
    const strip: { name: string; styleClass: string }[] = [];
    for (let i = 0; i < activeNames.length * REPEATS; i++) {
      const name = activeNames[i % activeNames.length];
      strip.push({
        name,
        styleClass: CARD_STYLES[i % CARD_STYLES.length],
      });
    }

    const minIndex = activeNames.length * (REPEATS - 3);
    let landingIndex = minIndex;
    for (let i = minIndex; i < strip.length; i++) {
      if (strip[i].name === winnerName) {
        landingIndex = i;
        break;
      }
    }

    const targetOffset = -(landingIndex * CARD_STRIDE);

    setReelItems(strip);
    setOffset(0);
    setSpinKey((k) => k + 1);
    setIsSpinning(true);
    setWinner(null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOffset(targetOffset));
    });

    setTimeout(() => {
      setIsSpinning(false);
      finalizeWinner(winnerName);
    }, 4300);
  };

  const finalizeWinner = (name: string) => {
    setWinner(name);
    setShowWinnerModal(true);
    if (noRepeat && !pickedNames.includes(name)) {
      setPickedNames((prev) => [...prev, name]);
    }
  };

  const handleReset = () => {
    setPickedNames([]);
    setWinner(null);
    toast.success("Riwayat pilihan berhasil direset.");
  };

  const handleClearNames = () => {
    setRawStudents("");
    setPickedNames([]);
    setWinner(null);
    setReelItems([]);
    toast.success("Daftar nama berhasil dibersihkan.");
  };

  const displayItems = isSpinning || reelItems.length > 0 ? reelItems : previewItems;

  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#121212] p-3 sm:p-6 md:p-10 pb-24 font-sans text-black dark:text-white">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Title & Breadcrumb (1:1 Kiblat Buat Soal) */}
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black font-mono text-[10px] uppercase font-bold tracking-widest w-fit shadow-[2px_2px_0px_#000]">
            <Dice5 size={12} /> Modul Penunjuk Acak
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-editorial tracking-tight text-black dark:text-white mt-1">
            Penunjuk Random
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-sans max-w-xl">
            Tunjuk siswa secara acak & adil saat pembelajaran di kelas. Cocok diproyeksikan langsung ke layar kelas.
          </p>
        </div>

        {/* ── Kontainer Neobrutalisme Utama (Unified Master Container) ── */}
        <div className="relative border-2 border-black dark:border-white/30 bg-white dark:bg-[#1e1e1e] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.12)] p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* 4 Corner Ornaments */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

          {/* Grid: Kiri (Input & Opsi) & Kanan (Reel Acak) */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 sm:gap-6 items-start">
            {/* ── KIRI: Input Nama & Pengaturan ── */}
            <div className="space-y-4">
              {/* Box Daftar Nama */}
              <div className="border-2 border-black dark:border-white/20 p-3.5 sm:p-4 bg-neutral-50 dark:bg-[#252525] shadow-[3px_3px_0px_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs dark:text-white">
                    <Type size={14} />
                    <span>Daftar Siswa</span>
                  </div>
                  <span className="px-2 py-0.5 border border-black dark:border-white/30 bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold">
                    {allNames.length} Siswa
                  </span>
                </div>

                <textarea
                  value={rawStudents}
                  onChange={(e) => setRawStudents(e.target.value)}
                  placeholder={"Tulis 1 nama per baris:\nAndi\nBudi\nCitra\nDewi"}
                  rows={6}
                  className="w-full p-2.5 text-xs sm:text-sm border-2 border-black dark:border-white/30 bg-white dark:bg-[#1a1a1a] dark:text-white font-mono resize-none focus:outline-none focus:border-black dark:focus:border-white shadow-inner"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white dark:bg-[#1e1e1e] text-black dark:text-white border-2 border-black dark:border-white/30 font-bold uppercase text-[11px] tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <Users size={13} />
                    <span>Impor Absen</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearNames}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white dark:bg-[#1e1e1e] text-black dark:text-white hover:text-red-600 border-2 border-black dark:border-white/30 font-bold uppercase text-[11px] tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Bersihkan</span>
                  </button>
                </div>
              </div>

              {/* Box Opsi Pengulangan */}
              <div className="border-2 border-black dark:border-white/20 p-3.5 sm:p-4 bg-neutral-50 dark:bg-[#252525] shadow-[3px_3px_0px_#000] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs uppercase tracking-tight text-black dark:text-white flex items-center gap-1.5">
                    <Repeat size={14} />
                    <span>Tanpa Pengulangan</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNoRepeat((v) => !v)}
                    className={`w-11 h-6 border-2 border-black dark:border-white/30 relative transition-colors cursor-pointer ${
                      noRepeat ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-[#333]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 transition-all ${
                        noRepeat ? "left-[22px] bg-white dark:bg-black" : "left-0.5 bg-black dark:bg-white"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                  Siswa yang sudah terpilih tidak akan muncul lagi sampai direset.
                </p>

                {noRepeat && pickedNames.length > 0 && (
                  <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Sudah Terpilih ({pickedNames.length})
                      </span>
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1 text-[11px] font-bold text-black dark:text-white hover:underline cursor-pointer"
                      >
                        <RotateCcw size={11} />
                        Reset
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {pickedNames.map((n, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold bg-white dark:bg-[#1a1a1a] text-gray-500 border border-black/20 dark:border-white/20 px-1.5 py-0.5 line-through decoration-black/60"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── KANAN: Arena Rol Acak (Horizontal Reel) ── */}
            <div className="border-2 border-black dark:border-white/20 p-4 sm:p-6 bg-white dark:bg-[#1a1a1a] shadow-[4px_4px_0px_#000] flex flex-col items-center justify-center min-h-[340px] sm:min-h-[400px]">
              {/* Reel Viewport */}
              <div className="relative w-full max-w-2xl">
                {/* Top Pointer */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 z-30">
                  <ChevronDown size={32} className="sm:w-10 sm:h-10 text-black dark:text-white" strokeWidth={3} />
                </div>

                {/* Center Highlight Frame */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none border-2 sm:border-4 border-black dark:border-white shadow-[0px_0px_0px_2px_rgba(0,0,0,0.15)]"
                  style={{ width: CARD_WIDTH + 8, height: 154 }}
                />

                {/* Track Kartu */}
                <div
                  className="relative overflow-hidden border-2 sm:border-4 border-black dark:border-white/20 bg-neutral-100 dark:bg-[#161616] py-4 sm:py-6"
                  style={{ height: 176 }}
                >
                  {/* Gradasi Fade di Kiri & Kanan */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 z-10 bg-gradient-to-r from-neutral-100 dark:from-[#161616] to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 z-10 bg-gradient-to-l from-neutral-100 dark:from-[#161616] to-transparent" />

                  <motion.div
                    key={spinKey}
                    className="flex items-center h-full"
                    style={{
                      gap: CARD_GAP,
                      paddingLeft: `calc(50% - ${CARD_WIDTH / 2}px)`,
                    }}
                    initial={false}
                    animate={{ x: offset }}
                    transition={{
                      duration: isSpinning ? 4.2 : 0,
                      ease: [0.12, 0.7, 0.1, 1],
                    }}
                  >
                    {displayItems.map((item, i) => (
                      <div
                        key={i}
                        className={`shrink-0 flex items-center justify-center p-3 shadow-[3px_3px_0px_#000] ${item.styleClass}`}
                        style={{ width: CARD_WIDTH, height: 126 }}
                      >
                        <span className="text-center font-black uppercase tracking-tight text-base sm:text-lg break-words leading-tight">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>

              {/* Action Button: Undi Sekarang */}
              <div className="mt-6 sm:mt-8 flex flex-col items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 sm:px-12 py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase text-xs sm:text-sm tracking-wider border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Play size={16} fill="currentColor" />
                  <span>{isSpinning ? "Mengundi Siswa..." : "Undi Sekarang"}</span>
                </button>
                {activeNames.length > 0 && (
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {activeNames.length} nama siswa siap diundi
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Winner Modal (Monokrom Neobrutal Bersih) ── */}
      <AnimatePresence>
        {showWinnerModal && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
            onClick={() => setShowWinnerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white dark:bg-[#1a1a1a] border-2 sm:border-4 border-black dark:border-white p-6 sm:p-10 max-w-sm w-full text-center shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]"
            >
              {/* 4 Corner Ornaments */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

              <button
                onClick={() => setShowWinnerModal(false)}
                aria-label="Tutup"
                className="absolute top-3 right-3 p-1.5 border border-black dark:border-white/30 bg-white dark:bg-[#252525] text-black dark:text-white hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center border-2 border-black dark:border-white shadow-[2px_2px_0px_#000]">
                <Trophy size={28} />
              </div>

              <p className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">
                Siswa Terpilih
              </p>

              <h2 className="text-2xl sm:text-3xl font-black font-editorial uppercase tracking-tight text-black dark:text-white break-words py-1">
                {winner}
              </h2>

              <button
                onClick={() => {
                  setShowWinnerModal(false);
                  setTimeout(handleSpin, 300);
                }}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs sm:text-sm border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                <Sparkles size={15} />
                <span>Undi Lagi</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImportAbsensiModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(names) => {
          setRawStudents(names.join("\n"));
          setPickedNames([]);
        }}
      />
    </div>
  );
}
