import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, AlertCircle, FileCheck, HelpCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — EduCraft AI",
  description: "Syarat dan ketentuan layanan penggunaan platform EduCraft AI bagi pendidik.",
};

export default function TermsPage() {
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
        {/* Header Title */}
        <div className="border-b-2 border-black dark:border-white/20 pb-6 mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3">
            <BookOpen size={14} /> Ketentuan Layanan
          </div>
          <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-black dark:text-white mb-3">
            Syarat & Ketentuan Layanan
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Terakhir diperbarui: <strong>23 September 2026</strong> • Berlaku efektif sejak tanggal pendaftaran akun Anda
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 sm:space-y-12 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center border border-purple-300">1</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Penerimaan Ketentuan
              </h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Selamat datang di EduCraft AI. Dengan mengakses atau menggunakan aplikasi web kami di <strong>https://educraft.mahya.uno</strong>, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui ketentuan ini, Anda tidak diperkenankan menggunakan layanan kami.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center border border-purple-300">2</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Deskripsi Layanan & Peran Pendidik
              </h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              EduCraft AI adalah platform alat bantu kecerdasan buatan yang dirancang untuk membantu para guru dan tenaga pengajar di Indonesia mengotomatisasi pembuatan soal ujian, kunci jawaban, rubrik penilaian, modul koreksi, absensi, dan pembagian kelompok belajar.
            </p>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
              <p className="font-bold flex items-center gap-2 mb-1">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                Prinsip Guru Memegang Kendali (Human-in-the-Loop):
              </p>
              <p>
                Kecerdasan Buatan (AI) bertindak sebagai asisten draf awal. Guru tetap bertanggung jawab penuh untuk menelaah, memverifikasi ketepatan materi, dan mengedit soal sebelum disajikan kepada peserta didik di ruang kelas.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center border border-purple-300">3</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Hak Kekayaan Intelektual & Kepemilikan Materi
              </h2>
            </div>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>
                <strong>Hak Milik Anda:</strong> Anda memegang kepemilikan penuh atas seluruh teks materi pelajaran, berkas dokumen, dan butir soal yang Anda simpan atau ekspor dari EduCraft AI. Kami tidak mengklaim hak cipta atas materi kurikulum yang Anda buat.
              </p>
              <p>
                <strong>Hak Milik EduCraft AI:</strong> Desain antarmuka, logo merek, kode program, sistem prompt, dan arsitektur platform adalah milik eksklusif EduCraft AI dan dilindungi hukum hak cipta yang berlaku.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center border border-purple-300">4</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Batasan Penggunaan yang Wajar
              </h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Dalam menggunakan platform ini, Anda setuju untuk TIDAK:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 dark:text-gray-300 pl-2">
              <li>Mengunggah materi yang melanggar hukum, mengandung ujaran kebencian, pornografi, atau hak cipta pihak ketiga tanpa izin.</li>
              <li>Menyerang, membobol, atau melakukan reverse engineering terhadap API backend maupun sistem keamanan platform.</li>
              <li>Melakukan scraping otomatis massal yang dapat mengganggu ketersediaan layanan bagi guru lainnya.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center border border-purple-300">5</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Penafian (Disclaimer) Hasil AI
              </h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Layanan disediakan <em>&quot;sebagaimana adanya&quot;</em> (as-is). EduCraft AI berupaya maksimal mengoptimalkan akurasi model AI, namun tidak menjamin bahwa seluruh keluaran bebas dari kesalahan fakta (halusinasi AI). EduCraft AI tidak bertanggung jawab atas kerugian atau kekeliruan nilai yang timbul akibat penggunaan soal tanpa penelaahan oleh pengajar.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 EduCraft AI. Seluruh hak cipta dilindungi undang-undang.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-black dark:hover:text-white underline">Kebijakan Privasi</Link>
            <Link href="/security" className="hover:text-black dark:hover:text-white underline">Keamanan Data</Link>
            <Link href="/contact" className="hover:text-black dark:hover:text-white underline">Hubungi Kami</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
