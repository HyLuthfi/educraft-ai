"use client";

import { useState } from "react";
import { downloadQuizizzExcel } from "@/lib/quizizz-export";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface Props {
  soalData: any;
  disabled?: boolean;
}

export default function QuizizzExportButton({ soalData, disabled }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.loading("Menyiapkan format Excel Quizizz...", { id: "quizizz" });
      
      const soalList = soalData?.soal || soalData || [];
      if (soalList.length === 0) {
        throw new Error("Tidak ada soal untuk diekspor");
      }

      // Beri jeda sedikit agar efek loading terlihat
      await new Promise(resolve => setTimeout(resolve, 800));
      
      downloadQuizizzExcel(soalList);
      
      toast.success("Berhasil mengunduh Excel Quizizz!", { id: "quizizz" });
      setIsSuccess(true);
      
      // Reset success state setelah 3 detik
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      toast.error(`Gagal: ${error.message}`, { id: "quizizz" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 border border-green-500 bg-green-50 flex flex-col items-center justify-center gap-3 text-center w-full h-full rounded transition-all">
        <div className="w-12 h-12 rounded-full bg-green-200 text-green-700 flex items-center justify-center font-bold mb-1">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <div className="font-bold text-green-800">
            Terunduh!
          </div>
          <div className="text-[10px] text-green-600 mt-1 uppercase tracking-wider">
            Buka di Quizizz
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="p-6 border border-black/10 bg-white hover:border-[#864CFF] hover:bg-[#f9f5ff] transition-all flex flex-col items-center justify-center gap-3 text-center group w-full h-full disabled:opacity-50"
    >
      <div className="w-12 h-12 rounded-full bg-[#864CFF]/10 text-[#864CFF] flex items-center justify-center font-bold text-xl mb-1">
        Q
      </div>
      <div>
        <div className="font-bold text-gray-900 group-hover:text-[#864CFF]">
          {isExporting ? "Memproses..." : "Quizizz"}
        </div>
        <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
          {isExporting ? "Mengunduh..." : "Format Excel"}
        </div>
      </div>
    </button>
  );
}
