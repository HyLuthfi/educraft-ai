"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
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
} from "lucide-react";

const CARD_COLORS = [
  "bg-yellow-300",
  "bg-pink-300",
  "bg-cyan-300",
  "bg-lime-300",
  "bg-orange-300",
  "bg-violet-300",
  "bg-emerald-300",
  "bg-rose-300",
];

const STORAGE_KEY = "educraft_roda_undian_siswa";

// Card sizing (px) for the horizontal reel
const CARD_WIDTH = 200;
const CARD_GAP = 16;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP; // distance between card centers

export default function RodaUndianPage() {
  const [rawStudents, setRawStudents] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [noRepeat, setNoRepeat] = useState(true);
  const [pickedNames, setPickedNames] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // The long strip of names used for the reel animation, and the offset to land on
  const [reelItems, setReelItems] = useState<{ name: string; color: string }[]>([]);
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

  // Idle preview strip (so the reel isn't empty before spinning)
  const previewItems = useMemo(() => {
    const base = activeNames.length > 0 ? activeNames : ["Tambah nama"];
    const items: { name: string; color: string }[] = [];
    for (let i = 0; i < Math.max(12, base.length * 2); i++) {
      items.push({
        name: base[i % base.length],
        color: CARD_COLORS[i % CARD_COLORS.length],
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

    // Build a long strip that ends near the chosen winner so it lands in center.
    const REPEATS = 20; // long enough for a fast->slow feel
    const strip: { name: string; color: string }[] = [];
    for (let i = 0; i < activeNames.length * REPEATS; i++) {
      const name = activeNames[i % activeNames.length];
      strip.push({
        name,
        color: CARD_COLORS[i % CARD_COLORS.length],
      });
    }

    // Choose a landing index deep in the strip, matching the winner
    const minIndex = activeNames.length * (REPEATS - 3);
    let landingIndex = minIndex;
    for (let i = minIndex; i < strip.length; i++) {
      if (strip[i].name === winnerName) {
        landingIndex = i;
        break;
      }
    }

    // Offset so that landingIndex card is centered under the pointer.
    // The viewport centers via translateX; we shift the strip left by
    // (landingIndex * stride) minus half a card so its center aligns.
    const targetOffset = -(landingIndex * CARD_STRIDE);

    setReelItems(strip);
    setOffset(0);
    setSpinKey((k) => k + 1);
    setIsSpinning(true);
    setWinner(null);

    // Kick off the animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOffset(targetOffset));
    });

    // Finalize after the animation duration
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
    toast.success("Riwayat pilihan direset.");
  };

  const handleClearNames = () => {
    setRawStudents("");
    setPickedNames([]);
    setWinner(null);
    setReelItems([]);
    toast.success("Daftar nama dibersihkan.");
  };

  const displayItems = isSpinning || reelItems.length > 0 ? reelItems : previewItems;

  return (
    <div className="min-h-full p-3.5 sm:p-6 md:p-10 max-w-7xl mx-auto bg-[#f9f9f9] dark:bg-[#121212] pb-24">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-black dark:bg-white text-white dark:text-black px-2.5 py-1 mb-2 sm:mb-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
          <Dice5 size={13} />
          Mode Kelas
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight dark:text-white">
          Penunjuk Random
        </h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-base md:text-lg text-gray-600 dark:text-gray-400 font-medium max-w-2xl">
          Tunjuk siswa secara acak & adil saat mengajar. Cocok diproyeksikan ke
          layar kelas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 sm:gap-8">
        {/* LEFT: Input Panel */}
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs sm:text-sm dark:text-white">
                <Type size={16} />
                Daftar Nama
              </div>
              <span className="bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1">
                {allNames.length} siswa
              </span>
            </div>
            <textarea
              value={rawStudents}
              onChange={(e) => setRawStudents(e.target.value)}
              placeholder={"Tulis 1 nama per baris:\nAndi\nBudi\nCitra\nDewi"}
              rows={5}
              className="w-full p-2.5 sm:p-3 text-xs sm:text-sm border-2 border-black dark:border-white/20 bg-[#f9f9f9] dark:bg-[#121212] dark:text-white font-medium resize-none focus:outline-none focus:ring-0 focus:border-black"
            />
            <button
              onClick={handleClearNames}
              className="mt-2.5 sm:mt-3 w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase text-xs sm:text-sm tracking-wider hover:bg-red-50 dark:hover:bg-[#333] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] sm:dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
            >
              <Trash2 size={14} />
              Bersihkan
            </button>
          </div>

          {/* Options */}
          <div className="bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-3.5 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
            <button
              type="button"
              onClick={() => setNoRepeat((v) => !v)}
              aria-pressed={noRepeat}
              className="w-full flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs sm:text-sm dark:text-white">
                <Repeat size={15} />
                Tanpa Pengulangan
              </div>
              <div
                className={`relative shrink-0 w-12 h-6 sm:w-14 sm:h-7 border-2 border-black dark:border-white/40 p-0.5 flex items-center transition-colors duration-200 ${
                  noRepeat ? "bg-lime-300" : "bg-gray-200 dark:bg-[#2a2a2a]"
                }`}
              >
                <div
                  className="h-4 w-4 sm:h-5 sm:w-5 bg-black dark:bg-white transition-transform duration-200 ease-out"
                  style={{
                    transform: noRepeat ? "translateX(24px)" : "translateX(0px)",
                  }}
                />
              </div>
            </button>
            <p className="mt-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
              Siswa yang sudah terpilih tidak akan muncul lagi sampai direset.
            </p>

            {noRepeat && pickedNames.length > 0 && (
              <div className="mt-3 sm:mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Sudah terpilih ({pickedNames.length})
                  </span>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-red-500 hover:text-red-600"
                  >
                    <RotateCcw size={11} />
                    Reset
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pickedNames.map((n, i) => (
                    <span
                      key={i}
                      className="text-[10px] sm:text-xs font-bold bg-gray-100 dark:bg-[#2a2a2a] dark:text-gray-300 border border-black/10 dark:border-white/10 px-1.5 py-0.5 line-through decoration-2"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Horizontal Reel */}
        <div className="flex flex-col items-center justify-center bg-white dark:bg-[#1e1e1e] border-2 sm:border-4 border-black dark:border-white/20 p-4 sm:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] min-h-[340px] sm:min-h-[600px]">
          {/* Reel viewport */}
          <div className="relative w-full max-w-3xl">
            {/* Top pointer */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-30">
              <ChevronDown size={32} className="sm:w-10 sm:h-10 text-black dark:text-white" strokeWidth={3} />
            </div>
            {/* Center highlight column */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none border-2 sm:border-4 border-black dark:border-white"
              style={{ width: CARD_WIDTH + 8, height: 158 }}
            />

            {/* Masked track */}
            <div
              className="relative overflow-hidden border-2 sm:border-4 border-black dark:border-white/20 bg-[#f0f0f0] dark:bg-[#161616] py-4 sm:py-6"
              style={{ height: 180 }}
            >
              {/* edge fade */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-[#f0f0f0] dark:from-[#161616] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-[#f0f0f0] dark:from-[#161616] to-transparent" />

              <motion.div
                key={spinKey}
                className="flex items-center h-full"
                style={{
                  gap: CARD_GAP,
                  // center the first card under the pointer initially:
                  paddingLeft: `calc(50% - ${CARD_WIDTH / 2}px)`,
                }}
                initial={false}
                animate={{ x: offset }}
                transition={{
                  duration: isSpinning ? 4.2 : 0,
                  ease: [0.12, 0.7, 0.1, 1], // fast start, long slow tail
                }}
              >
                {displayItems.map((item, i) => (
                  <div
                    key={i}
                    className={`shrink-0 flex items-center justify-center border-2 sm:border-4 border-black ${item.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
                    style={{ width: CARD_WIDTH, height: 130 }}
                  >
                    <span className="px-3 text-center font-black uppercase tracking-tight text-black text-lg sm:text-xl break-words leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Spin button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="mt-6 sm:mt-10 w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-12 py-3.5 sm:py-5 whitespace-nowrap bg-black dark:bg-white text-white dark:text-black font-black uppercase text-base sm:text-xl tracking-wider border-2 sm:border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:translate-x-0"
          >
            <Play size={20} className="sm:w-6 sm:h-6" fill="currentColor" />
            {isSpinning ? "Mengundi..." : "Undi Sekarang"}
          </button>
          {activeNames.length > 0 && (
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">
              {activeNames.length} nama siap diundi
            </p>
          )}
        </div>
      </div>

      {/* Winner Modal */}
      <AnimatePresence>
        {showWinnerModal && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 dark:bg-black/90 backdrop-blur-sm"
            onClick={() => setShowWinnerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -6, y: 40 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0.5, y: 40 }}
              transition={{ type: "spring", damping: 14, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-yellow-300 border-2 sm:border-4 border-black p-6 sm:p-10 max-w-md w-full text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              <button
                onClick={() => setShowWinnerModal(false)}
                aria-label="Tutup"
                className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-black text-yellow-300 border-2 border-black hover:bg-gray-900 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X size={18} strokeWidth={3} />
              </button>
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-black flex items-center justify-center">
                  <Trophy size={28} className="sm:w-10 sm:h-10 text-yellow-300" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-black/60 mb-1 sm:mb-2">
                Terpilih!
              </p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black break-words">
                {winner}
              </h2>
              <button
                onClick={() => {
                  setShowWinnerModal(false);
                  setTimeout(handleSpin, 300);
                }}
                className="mt-6 sm:mt-8 w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-black text-white font-black uppercase tracking-widest text-xs sm:text-sm border-2 border-black hover:bg-gray-900 transition-colors active:translate-y-1"
              >
                <Sparkles size={18} />
                Undi Lagi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
