import Link from "next/link";
import { FileQuestion, ArrowLeft, Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#121212] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] p-6 sm:p-8 text-center space-y-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-300 border-2 border-black font-black uppercase text-xs tracking-wider text-black">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Halaman Tidak Ditemukan</span>
        </div>

        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-950/40 border-3 border-black dark:border-white flex items-center justify-center text-3xl font-black text-red-600 dark:text-red-400 shadow-[4px_4px_0px_0px_#000]">
          404
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white">
            Waduh, Tersesat?
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
            Halaman yang Anda tuju mungkin telah dipindahkan, dihapus, atau alamat URL yang Anda masukkan kurang tepat.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            href="/create"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Buat Soal</span>
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-[#2a2a2a] text-black dark:text-white border-2 border-black dark:border-white font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
