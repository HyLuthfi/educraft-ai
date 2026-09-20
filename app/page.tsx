"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Brain,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Sparkles,
  CheckCircle,
  UserCheck,
  Users,
  TrendingUp,
  ClipboardCheck,
  CalendarRange,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  ANIMASI_FADE_UP,
  ANIMASI_STAGGER_CONTAINER,
  ANIMASI_BENTO_ITEM,
} from "@/lib/animasi";

const fiturMenu = [
  { icon: BookOpen, nama: "Pembuat Soal", desc: "Buat soal otomatis dari materi", href: "#features" },
  { icon: Sparkles, nama: "Penjawab Soal", desc: "AI penyelesai tugas instan", href: "#features" },
  { icon: ClipboardCheck, nama: "Koreksi Otomatis", desc: "Skor & pembahasan dari lembar jawaban", href: "#ekosistem" },
  { icon: UserCheck, nama: "Absensi Murid", desc: "Catat kehadiran manual atau via AI", href: "#ekosistem" },
  { icon: Users, nama: "Bagi Kelompok", desc: "Kelompok belajar seimbang otomatis", href: "#ekosistem" },
  { icon: TrendingUp, nama: "Rapor & Ranking", desc: "Rekap nilai jadi rapor & peringkat", href: "#ekosistem" },
  { icon: CalendarRange, nama: "Perencana Pembelajaran", desc: "Susun agenda kelas ber-AI", href: "#ekosistem" },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiturOpen, setMobileFiturOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-2xl z-50 border-b border-black/5 transition-all duration-300">
        <div className="container-main mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-4 group">
            <Image
              src="/logo-mark-v2.png"
              alt="EduCraft Logo"
              width={56}
              height={56}
              className="w-9 h-9 sm:w-12 sm:h-12 object-contain group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-600">
                EduCraft AI.
              </span>
              <span className="bg-black text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider hidden sm:block">
                Pro
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-black transition-colors py-2">
                Fitur
                <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
              </button>

              <div className="absolute top-full left-0 pt-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="p-2 bg-white rounded-2xl shadow-xl shadow-black/5 border border-black/5 flex flex-col gap-1">
                  {fiturMenu.map((f) => {
                    const Icon = f.icon;
                    return (
                      <Link
                        key={f.nama}
                        href={f.href}
                        className="px-4 py-3 hover:bg-[#f9f9f9] rounded-xl transition-colors flex items-center gap-4 group/item"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#f0f0f0] flex items-center justify-center group-hover/item:bg-black group-hover/item:text-white transition-colors shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-black text-sm">
                            {f.nama}
                          </span>
                          <span className="text-xs text-gray-500">
                            {f.desc}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <Link
              href="#ekosistem"
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Ekosistem
            </Link>
            <Link
              href="#cara-kerja"
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Cara Kerja
            </Link>
            <Link
              href="#format"
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Format
            </Link>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-900 hover:text-gray-500 transition-colors hidden md:block"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="btn-primary py-2 px-3.5 sm:py-2.5 sm:px-6 text-xs sm:text-sm shadow-lg shadow-black/5 rounded-none font-bold"
            >
              Mulai Gratis
            </Link>
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-black/5 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden bg-white/95 backdrop-blur-2xl border-b border-black/10 overflow-hidden px-5 py-4 shadow-xl"
            >
              <div className="flex flex-col gap-3">
                {/* Fitur Accordion */}
                <div className="border-b border-black/5 pb-2">
                  <button
                    onClick={() => setMobileFiturOpen(!mobileFiturOpen)}
                    className="flex items-center justify-between w-full py-2 text-sm font-bold text-gray-900"
                  >
                    <span>Fitur Unggulan</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                        mobileFiturOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {mobileFiturOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1 pt-1 pb-2 overflow-hidden"
                      >
                        {fiturMenu.map((f) => {
                          const Icon = f.icon;
                          return (
                            <Link
                              key={f.nama}
                              href={f.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-black shrink-0">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-semibold text-gray-800">
                                {f.nama}
                              </span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  href="#ekosistem"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-gray-800 py-1.5 hover:text-black"
                >
                  Ekosistem
                </Link>
                <Link
                  href="#cara-kerja"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-gray-800 py-1.5 hover:text-black"
                >
                  Cara Kerja
                </Link>
                <Link
                  href="#format"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-gray-800 py-1.5 hover:text-black"
                >
                  Format Ekspor
                </Link>

                <div className="pt-3 border-t border-black/10 flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 border-2 border-black font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
                  >
                    Masuk ke Akun
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    Daftar Sekarang
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <section className="pt-28 sm:pt-36 md:pt-48 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="container-main mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={ANIMASI_STAGGER_CONTAINER}
              className="lg:col-span-6 flex flex-col items-start text-left"
            >
              <motion.div variants={ANIMASI_FADE_UP} className="mb-4 sm:mb-6">
                <span className="text-black font-semibold tracking-widest uppercase text-[11px] sm:text-xs border-b-2 border-black pb-1">
                  Asisten Mengajar Ber-AI
                </span>
              </motion.div>

              <motion.h1
                variants={ANIMASI_FADE_UP}
                className="text-3xl sm:text-5xl md:text-7xl font-editorial font-medium tracking-tight text-black leading-[1.15] sm:leading-[1.1] mb-6"
              >
                Semua Tugas Mengajar. <br />
                <span className="text-gray-400">Satu Platform AI.</span> <br />
                Waktu Anda Kembali.
              </motion.h1>

              <motion.p
                variants={ANIMASI_FADE_UP}
                className="text-lg text-gray-600 font-light leading-relaxed mb-10 max-w-lg"
              >
                Dari membuat & mengoreksi soal, mencatat absensi, membagi
                kelompok, hingga menyusun rapor dan ranking siswa, EduCraft AI
                menangani beban administratif Anda. Ber-AI, siap cetak, dan Anda
                tetap memegang kendali penuh.
              </motion.p>

              <motion.div
                variants={ANIMASI_FADE_UP}
                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
              >
                <Link
                  href="/register"
                  className="btn-primary px-8 py-4 w-full sm:w-auto flex items-center justify-center gap-3 rounded-none bg-black hover:bg-gray-800 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all"
                >
                  Mulai Gratis Sekarang
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-4 sm:mt-0 px-4">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-black border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 border-2 border-white"></div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-900 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                      +
                    </div>
                  </div>
                  <span>Dipercaya para pendidik masa depan</span>
                </div>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-6 relative lg:h-[600px] flex items-center justify-center lg:justify-end"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full max-w-[500px] h-[500px] bg-[#f5f5f7] rounded-full blur-3xl opacity-50"></div>
              <div className="relative w-full max-w-md bg-white border-2 border-black p-6 flex flex-col gap-4 transform rotate-1 hover:rotate-0 transition-transform duration-500 z-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between border-b-2 border-black pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-black text-white flex items-center justify-center font-editorial text-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]">
                      PDF
                    </div>
                    <div>
                      <div className="text-sm font-bold text-black">
                        Modul_Biologi_Bab4.pdf
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Sedang diproses...
                      </div>
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-black animate-pulse" />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 w-5/6 animate-pulse"></div>
                </div>

                <div className="mt-4 p-4 bg-[#f5f5f7] border-l-4 border-black">
                  <span className="text-xs font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="bg-black text-white px-1.5 py-0.5">HOTS · C4</span>
                    Hasil AI
                  </span>
                  <p className="text-sm text-gray-700 font-serif italic mt-2">
                    "Jika mutasi genetik terjadi pada sel somatik, mengapa hal
                    tersebut tidak diturunkan ke generasi berikutnya?"
                  </p>
                </div>
              </div>
              <div
                className="absolute -bottom-6 md:bottom-24 left-2 md:-left-12 bg-black text-white p-4 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.25)] z-20 animate-bounce"
                style={{ animationDuration: "3s" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white text-black flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Beragam Format</div>
                    <div className="text-xs text-white/70">
                      Word, PDF, G-Form, Quizizz
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      <section id="format" className="py-12 border-y border-black/5 bg-white scroll-mt-24">
        <div className="container-main mx-auto px-6 text-center">
          <p className="text-sm font-medium text-gray-400 mb-8 uppercase tracking-widest">
            Mendukung Berbagai Format Evaluasi Pembelajaran
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-600">
                Pilihan Ganda
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-600">
                Isian Singkat
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-600">
                Esai Analisis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-600">
                Benar / Salah
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-600">
                Menjodohkan
              </span>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="py-32 px-6 scroll-mt-24">
        <div className="container-main mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-editorial font-medium text-black mb-6">
              Infrastruktur Kecerdasan Buatan untuk Pendidik.
            </h2>
            <p className="text-lg text-gray-500">
              Setiap fitur dirancang dengan ketelitian tingkat tinggi untuk
              mengurangi beban administratif Anda.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={ANIMASI_STAGGER_CONTAINER}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]"
          >
            <motion.div
              variants={ANIMASI_BENTO_ITEM}
              className="bento-card bento-card-hover col-span-1 md:col-span-2 p-10 flex flex-col justify-between bg-white border border-black/5"
            >
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-lg mb-6">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-black mb-3">
                  Ekstraksi Dokumen Cerdas
                </h3>
                <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                  Mesin pemroses bahasa alami kami dapat membaca PDF, Word, atau
                  presentasi Anda dan mengisolasi konsep-konsep kunci tanpa
                  merusak konteks aslinya.
                </p>
              </div>
            </motion.div>
            <motion.div
              variants={ANIMASI_BENTO_ITEM}
              className="bento-card bento-card-hover p-10 flex flex-col justify-between bg-black text-white"
            >
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-3">Taksonomi Bloom</h3>
                <p className="text-gray-400">
                  Hasilkan soal dengan tingkat kognitif presisi (C1 hingga C6).
                </p>
              </div>
            </motion.div>
            <motion.div
              variants={ANIMASI_BENTO_ITEM}
              className="bento-card bento-card-hover p-10 flex flex-col justify-between bg-white border border-black/5"
            >
              <div className="w-14 h-14 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-black" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-black mb-3">
                  Penjawab Soal AI
                </h3>
                <p className="text-gray-500">
                  Dapatkan kunci jawaban dan penjelasan mendalam secara instan.
                </p>
              </div>
            </motion.div>
            <motion.div
              variants={ANIMASI_BENTO_ITEM}
              className="bento-card bento-card-hover col-span-1 md:col-span-2 p-10 flex flex-col justify-between bg-[#f5f5f7] border-none"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
                <BookOpen className="w-7 h-7 text-black" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-black mb-3">
                  Generator Materi Super
                </h3>
                <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                  Tidak ada bahan ajar? Cukup masukkan topik atau silabus. AI
                  kami akan melakukan sintesis informasi dan menyusun materi
                  pembelajaran terstruktur secara otomatis.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <section id="cara-kerja" className="py-32 px-6 bg-white border-t border-black/5 scroll-mt-24">
        <div className="container-main mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-editorial font-medium text-black mb-6">
              Alur Kerja Tanpa Gesekan.
            </h2>
            <p className="text-lg text-gray-500">
              Tiga langkah sederhana menuju efisiensi waktu yang belum pernah
              Anda rasakan sebelumnya.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-[1px] bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
            <div className="relative text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6 relative z-10">
                <span className="font-editorial text-2xl font-bold text-black">
                  1
                </span>
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">
                Unggah Materi
              </h3>
              <p className="text-gray-500 leading-relaxed">
                Masukkan dokumen PDF, presentasi, atau ketikkan teks materi Anda
                ke dalam sistem.
              </p>
            </div>
            <div className="relative text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center mb-6 relative z-10 shadow-xl shadow-black/20">
                <span className="font-editorial text-2xl font-bold text-white">
                  2
                </span>
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">
                AI Menganalisis
              </h3>
              <p className="text-gray-500 leading-relaxed">
                Pilih tingkat kesulitan dan tipe soal. AI kami akan membedah
                materi dan merakit soal secara cerdas.
              </p>
            </div>
            <div className="relative text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6 relative z-10">
                <span className="font-editorial text-2xl font-bold text-black">
                  3
                </span>
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">
                Ekspor Bebas Gesekan
              </h3>
              <p className="text-gray-500 leading-relaxed">
                Unduh siap cetak sebagai Word/PDF, atau jadikan kuis interaktif
                langsung di Google Form dan Quizizz dengan 1 klik.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section id="ekosistem" className="py-32 px-6 bg-[#f5f5f7] border-t border-black/5 scroll-mt-24">
        <div className="container-main mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-black font-semibold tracking-widest uppercase text-xs border-b-2 border-black pb-1">
              Satu Platform, Semua Kebutuhan
            </span>
            <h2 className="text-4xl md:text-5xl font-editorial font-medium text-black mt-6 mb-6">
              Lebih dari Sekadar Soal.
            </h2>
            <p className="text-lg text-gray-500">
              EduCraft AI menemani seluruh alur mengajar Anda — dari kehadiran
              murid hingga rapor akhir semester.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-black/5 p-8 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-5">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Absensi Cerdas</h3>
              <p className="text-gray-500 leading-relaxed">
                Catat kehadiran murid manual atau biarkan AI membaca daftar
                hadir dari foto/file. Anda tetap pegang kendali penuh.
              </p>
            </div>
            <div className="bg-white border border-black/5 p-8 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Pembagian Kelompok</h3>
              <p className="text-gray-500 leading-relaxed">
                Bentuk kelompok belajar yang seimbang secara otomatis, adil, dan
                dalam sekejap.
              </p>
            </div>
            <div className="bg-white border border-black/5 p-8 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Rapor & Ranking</h3>
              <p className="text-gray-500 leading-relaxed">
                Rekap nilai jadi rapor siswa dan peringkat kelas secara
                otomatis, siap dibagikan.
              </p>
            </div>
            <div className="bg-white border border-black/5 p-8 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-5">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Koreksi Otomatis</h3>
              <p className="text-gray-500 leading-relaxed">
                Unggah lembar jawaban, AI mengoreksi dan memberi skor beserta
                pembahasan.
              </p>
            </div>
            <div className="bg-white border border-black/5 p-8 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-5">
                <CalendarRange className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Perencana Pembelajaran</h3>
              <p className="text-gray-500 leading-relaxed">
                Susun rencana pertemuan dan agenda kelas yang terstruktur dengan
                bantuan AI.
              </p>
            </div>
            <div className="bg-black text-white p-8 flex flex-col justify-center">
              <h3 className="text-xl font-semibold mb-2">Dan terus bertambah.</h3>
              <p className="text-gray-400 leading-relaxed mb-5">
                Fitur baru dirilis rutin untuk meringankan tugas Anda.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all"
              >
                Coba semuanya gratis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="py-32 px-6 bg-black text-white text-center">
        <div className="container-main mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-5xl md:text-7xl font-editorial font-medium mb-8">
              Siap untuk berevolusi?
            </h2>
            <p className="text-xl text-gray-400 font-light mb-12 max-w-xl mx-auto">
              Bergabunglah dengan ribuan pendidik yang telah mengubah cara
              mereka bekerja. Bebaskan diri Anda dari tugas administratif
              sekarang.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-black px-10 py-5 rounded-xl font-medium text-lg hover:bg-gray-100 transition-colors hover:scale-105 transform duration-200"
            >
              Mulai Secara Gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="pt-32 pb-12 bg-[#f9f9f9] border-t border-black/5 mt-12 overflow-hidden">
        <div className="container-main mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-20">
            <div className="col-span-1 md:col-span-2 pr-0 md:pr-12">
              <div className="flex items-center gap-4 mb-6">
                <Image
                  src="/logo-mark-v2.png"
                  alt="EduCraft Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                />
                <span className="font-editorial text-2xl font-semibold tracking-tight text-black">
                  EduCraft AI.
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                Infrastruktur kecerdasan buatan untuk pendidik modern. Membangun
                evaluasi dan materi kelas dunia.
              </p>
            </div>

            <div className="col-span-1">
              <h4 className="font-bold text-black mb-4 text-sm tracking-widest uppercase">
                Produk
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#features"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Generator Soal
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Ekstraksi Dokumen
                  </Link>
                </li>
                <li>
                  <Link
                    href="#format"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Bank Materi AI
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-1">
              <h4 className="font-bold text-black mb-4 text-sm tracking-widest uppercase">
                Legalitas
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Syarat & Ketentuan
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Kebijakan Privasi
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Keamanan Data
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-1">
              <h4 className="font-bold text-black mb-4 text-sm tracking-widest uppercase">
                Perusahaan
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Hubungi Kami
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-gray-500 hover:text-black text-sm transition-colors"
                  >
                    Pusat Bantuan
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 mt-12 border-t border-black/5 flex items-center justify-center text-center">
            <p className="text-sm text-gray-400">
              © 2026 EduCraft AI. Seluruh hak cipta dilindungi undang-undang.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
