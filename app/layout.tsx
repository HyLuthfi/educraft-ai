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
  title: "EduCraft AI - Generator Soal Cerdas untuk Guru",
  description:
    "Ubah materi apapun menjadi soal berkualitas tinggi dalam hitungan menit. Didukung AI, siap cetak, siap pakai di platform apapun.",
  authors: [{ name: "EduCraft Team" }],
  keywords: [
    "generator soal",
    "AI pendidikan",
    "soal ujian otomatis",
    "soal HOTS",
    "Bloom Taxonomy",
    "guru Indonesia",
  ],
  openGraph: {
    title: "EduCraft AI - Generator Soal Cerdas untuk Guru",
    description:
      "Ubah materi apapun menjadi soal berkualitas tinggi dalam hitungan menit.",
    type: "website",
    locale: "id_ID",
  },
}

import { ThemeProvider } from "../components/theme-provider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${plusJakarta.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
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
