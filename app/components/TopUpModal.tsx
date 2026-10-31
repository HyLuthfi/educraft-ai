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
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Clock,
  RefreshCw,
} from "lucide-react";
import { WalletLogItem } from "@/lib/wallet";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  onSuccess?: (newBalance: number) => void;
  initialTab?: "topup" | "logs";
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
  initialTab = "topup",
}: TopUpModalProps) {
  const [activeTab, setActiveTab] = useState<"topup" | "logs">(initialTab);
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Transaction Logs State
  const [logs, setLogs] = useState<WalletLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data?.logs || []);
      }
    } catch (err) {
      console.error("Gagal mengambil log saldo:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setActiveOrder(null);
      setIsSuccess(false);
      setActiveTab(initialTab);
      fetchLogs();
    }
  }, [isOpen, initialTab]);

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
        fetchLogs();
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
            fetchLogs();
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
        className="relative bg-white dark:bg-[#1a1a1a] border-2 sm:border-4 border-black dark:border-white p-5 sm:p-7 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-[8px_8px_0px_#000] text-black dark:text-white space-y-4"
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
                Dompet Saldo EduCraft
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

        {/* Tab Switcher: Isi Saldo vs Riwayat Mutasi */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-[#252525] border-2 border-black dark:border-white/30 shadow-[2px_2px_0px_#000]">
          <button
            type="button"
            onClick={() => setActiveTab("topup")}
            className={`py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-2 transition-all ${
              activeTab === "topup"
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[1px_1px_0px_#000]"
                : "bg-transparent text-gray-600 dark:text-gray-400 border-transparent hover:text-black dark:hover:text-white"
            }`}
          >
            <QrCode size={13} />
            <span>Isi Saldo QRIS</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("logs");
              fetchLogs();
            }}
            className={`py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-2 transition-all ${
              activeTab === "logs"
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[1px_1px_0px_#000]"
                : "bg-transparent text-gray-600 dark:text-gray-400 border-transparent hover:text-black dark:hover:text-white"
            }`}
          >
            <History size={13} />
            <span>Riwayat Saldo ({logs.length})</span>
          </button>
        </div>

        {/* TAB 1: ISI SALDO */}
        {activeTab === "topup" && (
          <div>
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
              /* INVOICE & PAYMENT STATE: EMBEDDED KASIR KENPAY (QRIS & TRANSFER BANK) */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-1">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-gray-600 dark:text-gray-300">
                    <span className="text-[10px] text-gray-400 uppercase">Tagihan:</span>
                    <span>{activeOrder.orderId}</span>
                  </div>
                  <a
                    href={activeOrder.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold underline hover:opacity-80 text-black dark:text-white"
                  >
                    <span>Buka Tab Baru</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                {/* Kasir KenPay Iframe Responsif (Clean Light Theme & Non-Scrollable) */}
                <div className="relative w-full h-[510px] border-2 border-black dark:border-white/30 shadow-[3px_3px_0px_#000] overflow-hidden bg-white">
                  <iframe
                    src={activeOrder.paymentUrl}
                    className="w-full h-full border-none"
                    scrolling="no"
                    title="Kasir KenPay QRIS & Transfer Bank"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveOrder(null)}
                    className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white cursor-pointer hover:underline"
                  >
                    ← Ganti Nominal Top Up
                  </button>

                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    <Loader2 size={11} className="animate-spin text-black dark:text-white" />
                    <span>Verifikasi otomatis aktif</span>
                  </div>
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
          </div>
        )}

        {/* TAB 2: RIWAYAT MUTASI SALDO */}
        {activeTab === "logs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Catatan Mutasi Saldo AI
              </span>
              <button
                type="button"
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="text-[10px] font-bold uppercase flex items-center gap-1 hover:underline cursor-pointer text-gray-600 dark:text-gray-300"
              >
                <RefreshCw size={11} className={isLoadingLogs ? "animate-spin" : ""} />
                <span>Segarkan</span>
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-black dark:text-white" />
                <p className="text-xs text-gray-500">Memuat riwayat transaksi...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-black/20 dark:border-white/20 p-4">
                <p className="text-xs text-gray-500">Belum ada riwayat mutasi saldo.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {logs.map((log) => {
                  const isIncoming = log.type === "IN";
                  return (
                    <div
                      key={log.id}
                      className="p-2.5 sm:p-3 bg-neutral-50 dark:bg-[#252525] border-2 border-black/20 dark:border-white/20 shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 border-2 border-black flex items-center justify-center shrink-0 ${
                            isIncoming
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "bg-white text-black dark:bg-[#1a1a1a] dark:text-white"
                          }`}
                        >
                          {isIncoming ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-black dark:text-white truncate">
                            {log.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Clock size={10} />
                              {new Date(log.createdAt).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                            {log.description && (
                              <span className="truncate hidden sm:inline">• {log.description}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-xs sm:text-sm font-black ${
                            isIncoming ? "text-emerald-600 dark:text-emerald-400" : "text-black dark:text-white"
                          }`}
                        >
                          {isIncoming ? "+" : "-"}Rp {log.amount.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                          Sisa: Rp {log.balanceAfter?.toLocaleString("id-ID") || 0}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
