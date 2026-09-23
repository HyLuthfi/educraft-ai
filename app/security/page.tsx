import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, Lock, Server, KeyRound, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keamanan Data — EduCraft AI",
  description: "Standar keamanan data, enkripsi, dan perlindungan privasi pada sistem EduCraft AI.",
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] dark:bg-[#121212] text-[#1d1d1f] dark:text-gray-200 transition-colors">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-xl border-b border-black/10 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo-mark-v2.png"
              alt="EduCraft Logo"
              width={40}
              height={40}
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">
              EduCraft AI
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="border-b-2 border-black dark:border-white/20 pb-6 mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3">
            <ShieldCheck size={14} /> Standar Teknis Keamanan
          </div>
          <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-black dark:text-white mb-3">
            Keamanan Data & Privasi
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Bagaimana EduCraft AI melindungi data sekolah, guru, dan peserta didik Anda
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 text-sm sm:text-base leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Lock size={20} />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">Enkripsi Data Transit (TLS 1.3)</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Seluruh komunikasi data antara peramban Anda dan peladen kami dilindungi oleh enkripsi TLS/HTTPS modern dengan sertifikat Cloudflare berstandar tinggi.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <KeyRound size={20} />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">Row Level Security (RLS)</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Setiap data bank soal, absensi, dan rapor dilindungi oleh kebijakan RLS pada tingkat database PostgreSQL. Pengguna lain tidak memiliki akses fisik ke data kelas Anda.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="w-10 h-10 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Server size={20} />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">Isolasi API Engine AI</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Backend AI Engine berjalan dalam port privat terisolasi di balik reverse-proxy Next.js. Kunci API dan akses model tidak pernah diekspos ke sisi klien peramban.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="w-10 h-10 rounded bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">Privasi Pemrosesan AI</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Setiap dokumen atau teks yang diproses oleh AI semata-mata dianalisis untuk menghasilkan respons format soal, dan segera dibersihkan dari memori kerja setelah proses selesai.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 EduCraft AI. Seluruh hak cipta dilindungi undang-undang.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-black dark:hover:text-white underline">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-black dark:hover:text-white underline">Syarat & Ketentuan</Link>
            <Link href="/contact" className="hover:text-black dark:hover:text-white underline">Hubungi Kami</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
