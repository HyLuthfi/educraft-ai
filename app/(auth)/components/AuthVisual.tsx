"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CheckCircle, Sparkles, BookOpen } from "lucide-react";

export default function AuthVisual() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/auth-bg.png"
          alt="Modern teacher workspace"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/40 mix-blend-multiply pointer-events-none"></div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] right-[10%] w-64 bg-white/20 backdrop-blur-md border border-white/40 shadow-2xl rounded-2xl p-4 transform rotate-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-semibold text-white drop-shadow-md">
              HOTS C4-C6
            </div>
          </div>
          <div className="h-2 w-3/4 bg-white/30 rounded-full mb-2"></div>
          <div className="h-2 w-1/2 bg-white/30 rounded-full"></div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-[20%] left-[10%] w-72 bg-white/20 backdrop-blur-lg border border-white/50 shadow-2xl rounded-2xl p-4 transform -rotate-3"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="text-sm font-bold text-white drop-shadow-md">
                Modul Selesai
              </div>
              <div className="text-xs text-white/80">20 Soal Pilihan Ganda</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-white bg-white/20 p-2 rounded-lg border border-white/30 backdrop-blur-sm">
            <CheckCircle className="w-4 h-4 text-green-400" /> Siap Diekspor ke
            PDF
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 max-w-lg text-center bg-black/30 backdrop-blur-md border border-white/20 p-10 rounded-3xl shadow-2xl">
        <h2 className="text-4xl font-editorial font-medium text-white mb-4 leading-tight drop-shadow-md">
          "Lebih dari sekadar alat. Ini adalah{" "}
          <span className="italic text-white/80">asisten pribadi</span> Anda."
        </h2>
        <p className="text-white/80 font-light text-base drop-shadow-sm">
          Ribuan pendidik telah menghemat ratusan jam kerja dengan bantuan AI
          kami.
        </p>
      </div>
    </div>
  );
}
