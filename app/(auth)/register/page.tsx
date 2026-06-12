"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { ANIMASI_FADE_UP as ANIMASI_ITEM } from "@/lib/animasi"

export default function RegisterPage() {
  const [tampilPassword, setTampilPassword] = useState(false)
  const [sedangProses, setSedangProses] = useState(false)
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    password: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSedangProses(true)
    setTimeout(() => setSedangProses(false), 2000)
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.1 }}
    >
      <motion.div variants={ANIMASI_ITEM} className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <span
            className="font-bold text-xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            EduCraft AI
          </span>
        </Link>
        <h1
          className="text-3xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Buat Akun Baru
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Gratis selamanya untuk guru Indonesia
        </p>
      </motion.div>

      <motion.form
        variants={ANIMASI_ITEM}
        onSubmit={handleSubmit}
        className="glass-card p-8 space-y-5"
      >
        <div>
          <label
            htmlFor="nama-register"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Nama Lengkap
          </label>
          <div className="relative">
            <User
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              id="nama-register"
              type="text"
              required
              value={formData.nama}
              onChange={(e) =>
                setFormData({ ...formData, nama: e.target.value })
              }
              placeholder="Nama lengkap Anda"
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email-register"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Email
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              id="email-register"
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="guru@sekolah.sch.id"
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password-register"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Password
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              id="password-register"
              type={tampilPassword ? "text" : "password"}
              required
              minLength={8}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Minimal 8 karakter"
              className="w-full pl-12 pr-12 py-3 rounded-xl text-sm outline-none transition-all duration-300"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setTampilPassword(!tampilPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
            >
              {tampilPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={sedangProses}
          className="btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sedangProses ? "Membuat akun..." : "Daftar Sekarang"}
          {!sedangProses && <ArrowRight size={18} />}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: "var(--color-border)" }} />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span
              className="px-3"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-text-muted)",
              }}
            >
              atau
            </span>
          </div>
        </div>

        <button type="button" className="btn-secondary w-full py-4 text-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Daftar dengan Google
        </button>
      </motion.form>

      <motion.p
        variants={ANIMASI_ITEM}
        className="text-center mt-6 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold transition-colors hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          Masuk di sini
        </Link>
      </motion.p>
    </motion.div>
  )
}
