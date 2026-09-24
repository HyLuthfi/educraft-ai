"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, Check, X, Share, PlusSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface InstallAppButtonProps {
  className?: string;
  variant?: "navbar" | "sidebar" | "banner" | "button";
}

export function InstallAppButton({
  className = "",
  variant = "button",
}: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah berjalan di mode standalone (sudah diinstall)
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }

      // 2. Deteksi iOS Safari
      const ua = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
      setIsIOS(isIosDevice);

      // 3. Listener sebelum instalasi PWA di Chromium (Android / Desktop Chrome / Edge)
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        toast.success("EduCraft AI berhasil dipasang di perangkat Anda!");
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) {
      toast.info("EduCraft AI sudah terpasang di perangkat ini.");
      return;
    }

    // Jika di iOS Safari, tampilkan panduan modal
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Jika Chromium prompt tersedia
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("Memasang EduCraft AI...");
      }
      setDeferredPrompt(null);
    } else {
      // Jika browser belum menangkap event, beri panduan ringkas
      toast.info("Gunakan menu browser Anda (titik 3 di Chrome) lalu pilih 'Tambahkan ke Layar Utama' / 'Install Aplikasi'.");
    }
  };

  if (isInstalled && variant !== "sidebar") {
    return null;
  }

  return (
    <>
      {variant === "navbar" && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black font-black uppercase text-xs tracking-wider shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${className}`}
        >
          <Smartphone size={14} className="animate-bounce" />
          <span>Pasang Aplikasi</span>
        </button>
      )}

      {variant === "sidebar" && (
        <div className={`p-3 bg-yellow-300/20 dark:bg-yellow-400/10 border-2 border-black dark:border-white/20 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-none ${className}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 bg-black text-white dark:bg-white dark:text-black">
              {isInstalled ? <Check size={12} /> : <Download size={12} />}
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white">
              {isInstalled ? "Aplikasi Terpasang" : "Aplikasi EduCraft"}
            </span>
          </div>
          <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight mb-2.5">
            {isInstalled
              ? "EduCraft AI berjalan mandiri di perangkat Anda."
              : "Pasang ke layar utama HP / Laptop untuk akses instan layar penuh."}
          </p>
          {!isInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-1.5 bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black font-black uppercase text-[10px] tracking-wider border border-black dark:border-white flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#FACC15] active:translate-y-0.5 cursor-pointer transition-all"
            >
              <Smartphone size={12} />
              <span>Unduh / Pasang</span>
            </button>
          )}
        </div>
      )}

      {variant === "button" && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black border-2 border-black dark:border-white font-black uppercase text-xs sm:text-sm tracking-wider shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${className}`}
        >
          <Smartphone size={16} />
          <span>{isInstalled ? "Aplikasi Sudah Terpasang ✓" : "Unduh Aplikasi Mobile"}</span>
        </button>
      )}

      {/* Modal Panduan Khusus iOS Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1e1e1e] border-4 border-black dark:border-white p-5 sm:p-7 max-w-sm w-full shadow-[8px_8px_0px_0px_#000] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone size={20} />
                <h3 className="text-base font-black uppercase tracking-tight text-black dark:text-white">
                  Pasang di iPhone / iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              Safari di iOS tidak mengizinkan pemasangan otomatis satu klik. Ikuti 2 langkah mudah berikut:
            </p>

            <div className="space-y-3 bg-gray-50 dark:bg-[#252525] p-3 border-2 border-black/10 dark:border-white/10 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  Ketuk tombol <strong>Bagikan (Share)</strong>{" "}
                  <Share size={13} className="inline-block text-blue-500 mx-1" /> di bilah bawah Safari.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  Gulir ke bawah dan pilih{" "}
                  <strong className="text-black dark:text-white">"Tambahkan ke Layar Utama"</strong>{" "}
                  <PlusSquare size={13} className="inline-block text-gray-700 dark:text-gray-300 mx-1" /> (*Add to Home Screen*).
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
