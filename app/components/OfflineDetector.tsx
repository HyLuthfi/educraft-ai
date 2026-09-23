"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // Daftarkan Service Worker untuk caching offline
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.warn("SW registration skipped:", err);
        });
      });
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3500);
      return () => clearTimeout(timer);
    };

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("online", handleOnline);
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-[#EF4444] text-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-center gap-2 text-xs font-bold"
        >
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Mode Offline — Beberapa fitur AI memerlukan koneksi.</span>
        </motion.div>
      )}

      {showRestored && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-[#10B981] text-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-center gap-2 text-xs font-bold"
        >
          <Wifi className="w-4 h-4" />
          <span>Koneksi internet terhubung kembali!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
