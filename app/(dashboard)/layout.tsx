"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sparkles,
  LayoutDashboard,
  FilePlus,
  BookOpen,
  Database,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react"
import { EASE_SPRING } from "@/lib/animasi"

const easeSpring = EASE_SPRING as unknown as [number, number, number, number]

const MENU_ITEMS = [
  { href: "/dashboard", label: "Dashboard", ikon: LayoutDashboard },
  { href: "/buat-soal", label: "Buat Soal", ikon: FilePlus },
  { href: "/bank-materi", label: "Bank Materi", ikon: BookOpen },
  { href: "/bank-soal", label: "Bank Soal", ikon: Database },
  { href: "/profil", label: "Profil", ikon: User },
]

function Sidebar({
  terbuka,
  onToggle,
}: {
  terbuka: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      <AnimatePresence>
        {terbuka && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className="fixed left-0 top-0 h-full z-50 flex flex-col border-r"
        style={{
          width: terbuka ? 260 : 72,
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
          transition: "width 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="flex items-center justify-between p-4 h-16">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              }}
            >
              <Sparkles size={18} className="text-white" />
            </div>
            {terbuka && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold text-lg whitespace-nowrap"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                EduCraft AI
              </motion.span>
            )}
          </Link>
          <button
            onClick={onToggle}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            {terbuka ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {MENU_ITEMS.map((item) => {
            const aktif = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: aktif
                    ? "rgba(99, 102, 241, 0.15)"
                    : "transparent",
                  color: aktif
                    ? "var(--color-primary-hover)"
                    : "var(--color-text-secondary)",
                  fontWeight: aktif ? 600 : 400,
                }}
                title={item.label}
              >
                <item.ikon size={20} className="shrink-0" />
                {terbuka && (
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                )}
                {aktif && terbuka && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--color-primary)" }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          <button
            className="flex items-center gap-3 px-3 py-3 rounded-xl w-full transition-all duration-200 cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            <LogOut size={20} className="shrink-0" />
            {terbuka && <span className="text-sm">Keluar</span>}
          </button>
        </div>
      </motion.aside>
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarTerbuka, setSidebarTerbuka] = useState(true)
  const pathname = usePathname()

  return (
    <div className="min-h-screen">
      <Sidebar
        terbuka={sidebarTerbuka}
        onToggle={() => setSidebarTerbuka(!sidebarTerbuka)}
      />

      <div
        style={{
          marginLeft: sidebarTerbuka ? 260 : 72,
          transition: "margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <header
          className="sticky top-0 z-30 h-16 flex items-center px-6 border-b backdrop-blur-xl"
          style={{
            background: "rgba(10, 10, 15, 0.8)",
            borderColor: "var(--color-border)",
          }}
        >
          <button
            onClick={() => setSidebarTerbuka(!sidebarTerbuka)}
            className="lg:hidden mr-4 cursor-pointer"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {sidebarTerbuka ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {MENU_ITEMS.find(
              (item) =>
                pathname === item.href || pathname.startsWith(item.href + "/")
            )?.label || "Dashboard"}
          </h2>
        </header>

        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: easeSpring }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
