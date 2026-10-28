"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Wallet,
  X,
  Sparkles,
  QrCode,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  onSuccess?: (newBalance: number) => void;
}

const TOPUP_OPTIONS = [
  { amount: 10000, label: "Rp 10.000", sessions: "10x Sesi AI", desc: "Uji Coba Santai" },
  { amount: 20000, label: "Rp 20.000", sessions: "20x Sesi AI", desc: "Kebutuhan Mingguan" },
  { amount: 50000, label: "Rp 50.000", sessions: "50x Sesi AI", desc: "Paling Populer", popular: true },
  { amount: 100000, label: "Rp 100.000", sessions: "100x Sesi AI", desc: "Semesteran Penuh" },
];

export function TopUpModal({
  isOpen,
  onClose,
  currentBalance = 0,
  onSuccess,
}: TopUpModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setActiveOrder(null);
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Listener untuk pesan postMessage dari kasir KenPay jika di-embed
  useEffect(() => {
    const handlePostMessage = (e: MessageEvent) => {
      const origin = e.origin || "";
      if (
        origin &&
        !origin.includes("saitech.uno") &&
        !origin.includes("saitech.co.id") &&
        !origin.includes("localhost") &&
        !origin.includes("127.0.0.1")
      ) {
        return;
      }

      if (e.data && e.data.event === "kenpay:success") {
        setIsSuccess(true);
        toast.success("Pembayaran berhasil diverifikasi!");
        window.dispatchEvent(new CustomEvent("educraft_wallet_updated"));
        if (onSuccess) onSuccess(e.data.data?.newBalance || currentBalance + selectedAmount);
      }
    };

    window.addEventListener("message", handlePostMessage);
    return () => window.removeEventListener("message", handlePostMessage);
  }, [selectedAmount, currentBalance, onSuccess]);

  // Background poller untuk memeriksa status order ke server
  useEffect(() => {
    if (!activeOrder || isSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/topup/status?order_id=${encodeURIComponent(activeOrder.orderId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.settled) {
            clearInterval(interval);
            setIsSuccess(true);
            toast.success("Saldo berhasil ditambahkan ke akun Anda!");
            window.dispatchEvent(new CustomEvent("educraft_wallet_updated"));
            if (onSuccess) onSuccess(json.newBalance);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrder, isSuccess, onSuccess]);

  const handleCreateOrder = async () => {
    setIsLoading(true);
    const toastId = toast.loading("Membuat invoice pembayaran via QRIS...");

    try {
      const res = await fetch("/api/topup/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selectedAmount }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat invoice");
      }

      const json = await res.json();
      setActiveOrder(json.data);
      toast.success("Invoice pembayaran siap! Silakan selesaikan pembayaran.", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menghubungi gateway pembayaran", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Nominal disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-[#1a1a1a] border-2 sm:border-4 border-black dark:border-white p-5 sm:p-7 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-[8px_8px_0px_#000] text-black dark:text-white space-y-5"
      >
        {/* 4 Corner Ornaments */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-black dark:border-white pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-black dark:border-white pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-black dark:border-white pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-black dark:border-white pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b-2 border-black dark:border-white/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Wallet size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider font-editorial">
                Isi Ulang Saldo AI
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Sistem Pay-As-You-Go 1:1 Rupiah tanpa biaya langganan bulanan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-black dark:border-white/30 text-black dark:text-white hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Stages */}
        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white flex items-center justify-center shadow-[4px_4px_0px_#000]">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-black font-editorial uppercase tracking-tight">
                Pembayaran Berhasil!
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Saldo Anda telah berhasil ditambahkan. Akun Anda kini aktif menyandang status{" "}
                <span className="font-bold underline">EduCraft PRO</span>!
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] active:translate-y-0.5 cursor-pointer"
            >
              Tutup &amp; Lanjutkan Mengajar
            </button>
          </div>
        ) : activeOrder ? (
          /* INVOICE & PAYMENT STATE */
          <div className="space-y-4">
            <div className="p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[3px_3px_0px_#000] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  Nomor Tagihan
                </span>
                <span className="font-mono font-bold">{activeOrder.orderId}</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-black/10 dark:border-white/10">
                <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  Total Pembayaran (Termasuk Kode Unik)
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black font-mono text-black dark:text-white">
                    Rp {activeOrder.totalAmount?.toLocaleString("id-ID")}
                  </span>
                  <button
                    onClick={() => copyToClipboard(String(activeOrder.totalAmount))}
                    className="p-1 border border-black dark:border-white/30 hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                    title="Salin Total Nominal"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed italic bg-white dark:bg-[#1a1a1a] p-2 border border-black/10 dark:border-white/10">
                *Penting: Transfer tepat hingga 3 digit terakhir (<strong>{activeOrder.uniqueCode}</strong>) agar sistem verifikasi otomatis dapat mencocokkan pembayaran Anda secara instan.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <a
                href={activeOrder.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode size={15} />
                <span>Buka QRIS &amp; Selesaikan Pembayaran</span>
                <ExternalLink size={13} />
              </a>

              <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-gray-500 dark:text-gray-400">
                <Loader2 size={13} className="animate-spin" />
                <span>Menunggu transfer masuk (otomatis terdeteksi)...</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="w-full py-2 bg-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white font-bold text-xs uppercase cursor-pointer"
              >
                ← Ganti Nominal Top Up
              </button>
            </div>
          </div>
        ) : (
          /* NOMINAL SELECTION STATE */
          <div className="space-y-4">
            {/* Sisa Saldo Sekarang */}
            <div className="p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">
                  Saldo Akun Anda Saat Ini
                </span>
                <span className="text-xl font-black text-black dark:text-white">
                  Rp {currentBalance.toLocaleString("id-ID")}
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-black text-white dark:bg-white dark:text-black border border-black">
                {Math.floor(currentBalance / 1000)}x Sesi AI
              </span>
            </div>

            {/* Grid Pilihan Nominal */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block mb-2">
                Pilih Nominal Pengisian Saldo:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {TOPUP_OPTIONS.map((opt) => {
                  const isSelected = selectedAmount === opt.amount;
                  return (
                    <button
                      key={opt.amount}
                      type="button"
                      onClick={() => setSelectedAmount(opt.amount)}
                      className={`p-3 border-2 text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[3px_3px_0px_#000] -translate-y-0.5"
                          : "bg-neutral-50 dark:bg-[#252525] text-black dark:text-white border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white"
                      }`}
                    >
                      {opt.popular && (
                        <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-neutral-200 text-black border border-black text-[9px] font-black uppercase tracking-wider">
                          Paling Dipilih
                        </span>
                      )}
                      <div className="text-base font-black font-mono">{opt.label}</div>
                      <div className={`text-[11px] font-bold mt-0.5 ${isSelected ? "text-neutral-300 dark:text-neutral-700" : "text-gray-500 dark:text-gray-400"}`}>
                        +{opt.sessions}
                      </div>
                      <div className={`text-[10px] mt-1 ${isSelected ? "text-neutral-400 dark:text-neutral-600" : "text-gray-400"}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info Transparansi Tarif */}
            <div className="p-2.5 bg-neutral-50 dark:bg-[#252525] border border-black/15 dark:border-white/15 text-[11px] text-gray-600 dark:text-gray-300 space-y-1">
              <div className="font-bold uppercase text-[10px] text-black dark:text-white flex items-center gap-1">
                <ShieldCheck size={12} /> Ketentuan Tarif Flat:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li><strong>Rp 1.000 / request:</strong> Buat Soal, Koreksi Jawaban, &amp; Rencana Ajar.</li>
                <li><strong>Rp 0 (Gratis):</strong> Regenerate Soal, Ekspor Word/PDF/Excel, &amp; Roda Undian.</li>
                <li>Saldo tidak pernah hangus (tanpa masa kedaluwarsa).</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleCreateOrder}
              className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider text-xs border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Menyiapkan Invoice...
                </>
              ) : (
                <>
                  <QrCode size={15} />
                  <span>Isi Saldo Rp {selectedAmount.toLocaleString("id-ID")} via QRIS</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
