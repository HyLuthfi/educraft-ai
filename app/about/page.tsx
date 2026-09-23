import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles, Heart, Target, Award, Users, BookOpen, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang Kami — EduCraft AI",
  description: "Misi dan komitmen EduCraft AI dalam memberdayakan guru dan pendidik di seluruh Indonesia.",
};

export default function AboutPage() {
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
            <Heart size={14} className="text-red-400" /> Misi Pendidikan Indonesia
          </div>
          <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-black dark:text-white mb-3">
            Tentang EduCraft AI
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Mengembalikan waktu berharga para guru agar dapat fokus mendidik dengan sepenuh hati.
          </p>
        </div>

        {/* Story Section */}
        <div className="space-y-8 sm:space-y-12 text-sm sm:text-base leading-relaxed">
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <h2 className="text-xl sm:text-2xl font-bold font-editorial text-black dark:text-white mb-4">
              Kenapa EduCraft AI Lahir?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Guru di Indonesia menghabiskan ratusan jam setiap semester hanya untuk pekerjaan administratif: meracik soal dari nol, membuat kisi-kisi dan rubrik penilaian, menyusun absensi, membagi kelompok belajar, hingga merekap nilai ke dalam rapor.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Waktu berharga yang seharusnya dicurahkan untuk membimbing siswa, memfasilitasi diskusi kritis, dan mendampingi tumbuh kembang anak didik seringkali habis di depan layar spreadsheet yang melelahkan. <strong>EduCraft AI hadir untuk mengakhiri hal tersebut.</strong>
            </p>
          </section>

          {/* 3 Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Target size={20} />
              </div>
              <h3 className="text-base font-bold text-black dark:text-white mb-2">Taksonomi Bloom Presisi</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Bukan sekadar soal acak, tapi soal yang terkalibrasi dari tingkat kognitif C1 hingga HOTS (C4–C6) sesuai standar kurikulum nasional.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Users size={20} />
              </div>
              <h3 className="text-base font-bold text-black dark:text-white mb-2">Guru Tetap Berkuasa</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                AI adalah asisten juru ketik dan analis draf awal Anda. Setiap butir soal, nilai, dan rencana pembelajaran selalu berada di bawah kendali penuh guru.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
              <div className="w-10 h-10 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Award size={20} />
              </div>
              <h3 className="text-base font-bold text-black dark:text-white mb-2">Ekosistem Kelas Lengkap</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Mulai dari Bank Materi, Buat Soal, Jawab Soal, Koreksi AI, Absensi, Rapor, hingga Pembagi Kelompok — semua terhubung dalam satu dasbor.
              </p>
            </div>
          </div>

          {/* CTA Box */}
          <section className="bg-black text-white p-6 sm:p-10 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-editorial font-bold mb-2">
                Siap Menghemat Waktu Mengajar Anda?
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-md">
                Daftar sekarang secara gratis tanpa kartu kredit. Mulai racik materi dan kuis kelas Anda dalam hitungan detik.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 font-bold uppercase tracking-wider text-xs whitespace-nowrap hover:bg-gray-100 transition-colors"
            >
              Mulai Gratis <ArrowRight size={14} />
            </Link>
          </section>
        </div>

        {/* Footer info */}
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
