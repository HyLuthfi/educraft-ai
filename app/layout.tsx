import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans, Playfair_Display } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

export const metadata: Metadata = {
  title: "EduCraft AI — Asisten Mengajar Ber-AI untuk Guru",
  description:
    "Satu platform AI untuk semua tugas mengajar: buat & koreksi soal, absensi murid, bagi kelompok, rapor, dan ranking siswa. Hemat waktu, guru pegang kendali penuh.",
  authors: [{ name: "EduCraft Team" }],
  keywords: [
    "asisten guru AI",
    "aplikasi guru",
    "generator soal",
    "koreksi otomatis",
    "absensi murid",
    "rapor siswa",
    "AI pendidikan",
    "guru Indonesia",
  ],
  openGraph: {
    title: "EduCraft AI — Asisten Mengajar Ber-AI untuk Guru",
    description:
      "Satu platform AI untuk semua tugas mengajar: soal, koreksi, absensi, kelompok, rapor, hingga ranking siswa.",
    type: "website",
    locale: "id_ID",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo-mark-v2.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo-mark-v2.png" },
    ],
  },
  manifest: "/manifest.json",
}

import { ThemeProvider } from "../components/theme-provider"
import { OfflineDetector } from "./components/OfflineDetector"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${plusJakarta.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0F0F11" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <OfflineDetector />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <div className="noise-overlay" />
          {children}
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
