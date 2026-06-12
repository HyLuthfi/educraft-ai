"use client"

import { motion } from "framer-motion"
import {
  FilePlus,
  FileText,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import {
  ANIMASI_STAGGER_CONTAINER as ANIMASI_CONTAINER,
  ANIMASI_FADE_UP as ANIMASI_ITEM,
} from "@/lib/animasi"

const KARTU_STATISTIK = [
  {
    label: "Total Set Soal",
    nilai: "0",
    ikon: FileText,
    warna: "var(--color-primary)",
  },
  {
    label: "Total Soal",
    nilai: "0",
    ikon: BookOpen,
    warna: "var(--color-accent)",
  },
  {
    label: "Bank Materi",
    nilai: "0",
    ikon: TrendingUp,
    warna: "var(--color-success)",
  },
  {
    label: "Export Bulan Ini",
    nilai: "0",
    ikon: FilePlus,
    warna: "var(--color-warning)",
  },
]

export default function DashboardPage() {
  return (
    <motion.div
      variants={ANIMASI_CONTAINER}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div
        variants={ANIMASI_ITEM}
        className="glass-card p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div>
          <h1
            className="text-2xl md:text-3xl font-black tracking-tight mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Selamat datang, <span className="gradient-text">Guru!</span>
          </h1>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Siap membuat soal hari ini? Pilih materi dan biarkan AI bekerja.
          </p>
        </div>
        <Link href="/buat-soal" className="btn-primary shrink-0">
          <Sparkles size={18} />
          Buat Soal Baru
          <ArrowRight size={16} />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KARTU_STATISTIK.map((kartu) => (
          <motion.div
            key={kartu.label}
            variants={ANIMASI_ITEM}
            className="glass-card-hover p-6"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: `${kartu.warna}20`, color: kartu.warna }}
            >
              <kartu.ikon size={20} />
            </div>
            <div
              className="text-3xl font-black mb-1"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {kartu.nilai}
            </div>
            <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {kartu.label}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={ANIMASI_ITEM}>
        <h3
          className="text-lg font-bold mb-4"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Soal Terbaru
        </h3>
        <div
          className="glass-card p-12 flex flex-col items-center justify-center text-center"
        >
          <Clock size={48} className="mb-4" style={{ color: "var(--color-text-muted)" }} />
          <p
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Belum ada soal
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Mulai buat soal pertamamu dan soal terbaru akan muncul di sini
          </p>
          <Link href="/buat-soal" className="btn-secondary text-sm">
            Buat Soal Pertama
            <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}
