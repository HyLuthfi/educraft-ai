import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Shield, Lock, Eye, Database, FileText, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — EduCraft AI",
  description: "Kebijakan privasi dan perlindungan data pengguna platform EduCraft AI.",
};

export default function PrivacyPage() {
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
            <Shield size={14} /> Dokumen Resmi Privasi
          </div>
          <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-black dark:text-white mb-3">
            Kebijakan Privasi
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Terakhir diperbarui: <strong>23 September 2026</strong> • Berlaku untuk seluruh pengguna EduCraft AI
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 sm:space-y-12 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-300">1</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Pendahuluan & Komitmen Kami
              </h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              EduCraft AI (<strong>&quot;kami&quot;</strong>, <strong>&quot;platform kami&quot;</strong>) berkomitmen penuh untuk melindungi privasi guru, tenaga pengajar, dan siswa. Dokumen Kebijakan Privasi ini menerangkan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan menjaga informasi pribadi saat Anda mengakses dan menggunakan layanan EduCraft AI.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Dengan membuat akun atau menggunakan layanan kami, Anda menyetujui pengumpulan dan penggunaan informasi sesuai dengan kebijakan ini.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-300">2</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Data yang Kami Kumpulkan
              </h2>
            </div>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-bold text-black dark:text-white mb-1">A. Data Autentikasi Pengguna & Google OAuth</h3>
                <p>
                  Saat Anda mendaftar melalui Email atau Layanan Masuk Google (Google OAuth), kami hanya meminta izin untuk mengakses data profil dasar publik:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm pl-2">
                  <li><strong>Alamat Email:</strong> Digunakan sebagai identitas unik login akun Anda.</li>
                  <li><strong>Nama Lengkap:</strong> Digunakan untuk menampilkan profil guru pada kop soal dan dokumen ujian.</li>
                  <li><strong>Foto Profil (Avatar):</strong> Digunakan untuk visual identitas akun di dashboard.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-black dark:text-white mb-1">B. Konten Pendidikan yang Diunggah Pengguna</h3>
                <p>
                  Materi pembelajaran teks, dokumen kurikulum (PDF, DOCX, PPTX), atau foto soal yang Anda unggah untuk keperluan generate soal, koreksi otomatis, atau rencana ajar.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-black dark:text-white mb-1">C. Data Aktivitas Pembelajaran</h3>
                <p>
                  Daftar nama siswa dan rekap nilai yang Anda masukkan untuk modul Absensi Murid, Bagi Kelompok, atau Rapor Siswa.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-300">3</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Bagaimana Data Anda Digunakan
              </h2>
            </div>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Menyediakan, memelihara, dan memproses pembuatan soal berstandar Taksonomi Bloom.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Mengekspor berkas soal dalam format siap cetak (PDF, Word DOCX) dan ekspor digital (Google Forms, Quizizz).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Menyimpan arsip Bank Soal secara pribadi di database terisolasi untuk masing-masing guru.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Tidak untuk Melatih Model Publik:</strong> Materi yang Anda unggah diproses secara privat melalui API dan tidak digunakan untuk melatih model AI umum (foundation models).</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-300">4</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Berbagi Data & Pihak Ketiga
              </h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              <strong>Kami TIDAK AKAN PERNAH menjual, menyewakan, atau memperdagangkan data pribadi Anda kepada pihak mana pun untuk keperluan periklanan atau pemasaran.</strong>
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Data hanya diteruskan kepada penyedia infrastruktur tepercaya yang diperlukan untuk menjalankan sistem:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 dark:text-gray-300 pl-2">
              <li><strong>Supabase:</strong> Penyedia basis data PostgreSQL terenkripsi dan layanan manajemen sesi autentikasi.</li>
              <li><strong>Google Cloud (OAuth):</strong> Layanan verifikasi identitas login pengguna.</li>
              <li><strong>Cloudflare:</strong> Pengamanan jaringan dari serangan DDoS dan enkripsi SSL/TLS 1.3 selama transmisi data.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="bg-white dark:bg-[#1e1e1e] border-2 border-black/15 dark:border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-300">5</span>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-black dark:text-white">
                Hak Pengguna & Penghapusan Data
              </h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Anda memegang kendali penuh atas data Anda. Sebagai pengguna, Anda berhak untuk:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300 pl-2 mb-4">
              <li>Mengakses dan memperbarui informasi profil Anda kapan saja melalui menu Pengaturan.</li>
              <li>Menghapus kumpulan soal dan riwayat materi dari Bank Soal Anda.</li>
              <li>Meminta penghapusan akun beserta seluruh data terkait secara permanen dari server kami.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Untuk mengajukan penghapusan akun atau pertanyaan terkait privasi, hubungi kami di:{" "}
              <a href="mailto:support@saitech.co.id" className="font-bold underline text-blue-600 dark:text-blue-400">
                support@saitech.co.id
              </a>
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 EduCraft AI. Seluruh hak cipta dilindungi undang-undang.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-black dark:hover:text-white underline">Syarat & Ketentuan</Link>
            <Link href="/security" className="hover:text-black dark:hover:text-white underline">Keamanan Data</Link>
            <Link href="/contact" className="hover:text-black dark:hover:text-white underline">Hubungi Kami</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
