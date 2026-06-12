"use client"

import { motion } from "framer-motion"
import {
  FileText,
  Brain,
  Download,
  ArrowRight,
  BookOpen,
  Zap,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import {
  ANIMASI_FADE_UP,
  ANIMASI_STAGGER_CONTAINER,
  ANIMASI_BENTO_ITEM,
} from "@/lib/animasi"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <nav className="fixed top-0 w-full bg-white/60 backdrop-blur-2xl z-50 border-b border-black/5 transition-all duration-300">
        <div className="container-main mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-4 group">
              <Image src="/logo.png" alt="EduCraft Logo" width={72} height={72} className="object-contain group-hover:scale-105 transition-transform" />
              <span className="font-editorial text-3xl font-semibold tracking-tight text-black">EduCraft AI.</span>
            </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-black transition-colors py-2">
                Fitur
                <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
              </button>
              
              <div className="absolute top-full left-0 pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="p-2 bg-white rounded-2xl shadow-xl shadow-black/5 border border-black/5 flex flex-col gap-1">
                  
                  <Link href="#pembuat-soal" className="px-4 py-3 hover:bg-[#f9f9f9] rounded-xl transition-colors flex items-center gap-4 group/item">
                    <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center group-hover/item:bg-black group-hover/item:text-white transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-black text-sm">Pembuat Soal</span>
                      <span className="text-xs text-gray-500">Buat soal otomatis dari materi</span>
                    </div>
                  </Link>

                  <Link href="#penjawab-soal" className="px-4 py-3 hover:bg-[#f9f9f9] rounded-xl transition-colors flex items-center gap-4 group/item">
                    <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center group-hover/item:bg-black group-hover/item:text-white transition-colors">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-black text-sm">Penjawab Soal</span>
                      <span className="text-xs text-gray-500">AI penyelesai tugas instan</span>
                    </div>
                  </Link>

                  <Link href="#ekstraksi-dokumen" className="px-4 py-3 hover:bg-[#f9f9f9] rounded-xl transition-colors flex items-center gap-4 group/item">
                    <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center group-hover/item:bg-black group-hover/item:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-black text-sm">Ekstraksi Dokumen</span>
                      <span className="text-xs text-gray-500">Analisis PDF & Word pintar</span>
                    </div>
                  </Link>

                </div>
              </div>
            </div>

            <Link href="#chatbot" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">ChatBot AI</Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Harga</Link>
            <Link href="#tutorial" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Tutorial</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-900 hover:text-gray-500 transition-colors hidden md:block">
              Masuk
            </Link>
            <Link href="/register" className="btn-primary py-2.5 px-6 text-sm shadow-lg shadow-black/5">
              Mulai Gratis
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-grow py-32"></div>

      <footer className="pt-32 pb-12 bg-[#f9f9f9] border-t border-black/5 mt-12 overflow-hidden">
        <div className="container-main mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-20">
            <div className="col-span-1 md:col-span-2 pr-0 md:pr-12">
              <div className="flex items-center gap-4 mb-6">
                <Image src="/logo.png" alt="EduCraft Logo" width={64} height={64} className="object-contain" />
                <span className="font-editorial text-2xl font-semibold tracking-tight text-black">EduCraft AI.</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                Infrastruktur kecerdasan buatan untuk pendidik modern. Membangun evaluasi dan materi kelas dunia.
              </p>
            </div>
            
            <div className="col-span-1">
              <h4 className="font-bold text-black mb-4 text-sm tracking-widest uppercase">Produk</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Generator Soal</Link></li>
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Ekstraksi Dokumen</Link></li>
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Bank Materi AI</Link></li>
              </ul>
            </div>

            <div className="col-span-1">
              <h4 className="font-bold text-black mb-4 text-sm tracking-widest uppercase">Legalitas</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Syarat & Ketentuan</Link></li>
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Kebijakan Privasi</Link></li>
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Keamanan Data</Link></li>
              </ul>
            </div>

            <div className="col-span-1">
              <h4 className="font-bold text-black mb-4 text-sm tracking-widest uppercase">Perusahaan</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Tentang Kami</Link></li>
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Hubungi Kami</Link></li>
                <li><Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">Pusat Bantuan</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 mt-12 border-t border-black/5 flex items-center justify-center text-center">
            <p className="text-sm text-gray-400">© 2026 EduCraft AI. Seluruh hak cipta dilindungi undang-undang.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
