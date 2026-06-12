"use client"

import { motion } from "framer-motion"
import { Construction } from "lucide-react"

export default function BankSoalPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[60vh]"
    >
      <Construction size={48} className="mb-4" style={{ color: "var(--color-success)" }} />
      <h2
        className="text-2xl font-black mb-2"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Bank Soal
      </h2>
      <p style={{ color: "var(--color-text-muted)" }}>
        Fitur ini akan dibangun di Sprint 4
      </p>
    </motion.div>
  )
}
