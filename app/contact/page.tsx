import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, MessageSquare, HelpCircle, Send, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hubungi Kami — EduCraft AI",
  description: "Layanan dukungan dan pusat bantuan pengguna platform EduCraft AI.",
};

export default function ContactPage() {
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
            <HelpCircle size={14} /> Layanan Bantuan Guru
          </div>
          <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-black dark:text-white mb-3">
            Hubungi Kami & Dukungan
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Ada pertanyaan, kendala teknis, atau saran pengembangan fitur? Tim EduCraft AI siap membantu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Kontak Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <h2 className="text-lg font-bold uppercase tracking-wide text-black dark:text-white mb-4 flex items-center gap-2">
                <Mail size={18} className="text-blue-600 dark:text-blue-400" />
                Surel Dukungan Resmi
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Untuk pertanyaan seputar autentikasi Google, permintaan data, atau kerjasama institusi sekolah:
              </p>
              <div className="p-3 bg-gray-50 dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 font-mono text-sm font-bold text-black dark:text-white">
                support@mahya.uno
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <h2 className="text-lg font-bold uppercase tracking-wide text-black dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-600 dark:text-emerald-400" />
                Komunitas Pendidik
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Bergabung dengan komunitas guru pengguna EduCraft AI untuk berbagi kiat prompt kurikulum, template ujian, dan berdiskusi seputar Taksonomi Bloom.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded">
                <CheckCircle2 size={14} /> Terbuka untuk seluruh guru di Indonesia
              </span>
            </div>
          </div>

          {/* Form Kirim Pesan */}
          <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <h2 className="text-lg font-bold uppercase tracking-wide text-black dark:text-white mb-4">
              Kirim Pesan Langsung
            </h2>
            <form action="mailto:support@mahya.uno" method="GET" className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  placeholder="Nama Bapak/Ibu Guru"
                  className="w-full p-2.5 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 outline-none focus:border-black dark:focus:border-white transition-colors dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] mb-1">
                  Topik Pertanyaan
                </label>
                <select
                  className="w-full p-2.5 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 outline-none focus:border-black dark:focus:border-white transition-colors dark:text-white"
                >
                  <option value="login">Kendala Akun &amp; Login Google</option>
                  <option value="generate">Fitur Pembuat Soal AI</option>
                  <option value="koreksi">Modul Koreksi Jawaban</option>
                  <option value="saran">Saran &amp; Masukan Fitur Baru</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] mb-1">
                  Pesan Anda
                </label>
                <textarea
                  name="body"
                  rows={4}
                  required
                  placeholder="Tuliskan detail pertanyaan atau kendala yang dihadapi..."
                  className="w-full p-2.5 bg-gray-50 dark:bg-[#2a2a2a] border-2 border-black/20 dark:border-white/20 outline-none focus:border-black dark:focus:border-white transition-colors dark:text-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-0.5 active:translate-x-0.5"
              >
                <Send size={16} /> Kirim ke Tim Dukungan
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 EduCraft AI. Seluruh hak cipta dilindungi undang-undang.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-black dark:hover:text-white underline">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-black dark:hover:text-white underline">Syarat & Ketentuan</Link>
            <Link href="/security" className="hover:text-black dark:hover:text-white underline">Keamanan Data</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
