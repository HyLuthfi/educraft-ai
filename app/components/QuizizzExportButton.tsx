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
  const [showTutorial, setShowTutorial] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.loading("Menyiapkan format Excel Quizizz...", { id: "quizizz" });
      
      const soalList = soalData?.soal || soalData || [];
      if (soalList.length === 0) {
        throw new Error("Tidak ada soal untuk diekspor");
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      
      downloadQuizizzExcel(soalList);
      
      toast.success("Berhasil mengunduh Excel Quizizz!", { id: "quizizz" });
      setShowTutorial(true);
      
    } catch (error: any) {
      toast.error(`Gagal: ${error.message}`, { id: "quizizz" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={disabled || isExporting}
        className="p-3 sm:p-4 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-[#864CFF] hover:bg-[#f9f5ff] dark:hover:bg-[#281e3a] transition-all flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-2.5 sm:gap-2 text-left sm:text-center group w-full h-full disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-[#864CFF]/10 text-[#864CFF] flex items-center justify-center font-bold text-sm sm:text-lg shrink-0 border border-[#864CFF]/20">
          Q
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white group-hover:text-[#864CFF] truncate">
            {isExporting ? "Memproses..." : "Quizizz"}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wider truncate">
            {isExporting ? "Mengunduh..." : "Format Excel"}
          </div>
        </div>
      </button>

      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-white text-center" style={{ backgroundColor: "#111827" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <CheckCircle2 size={32} color="white" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold font-editorial">File Terunduh!</h3>
              <p className="text-white/80 text-sm mt-1">File Quizizz_EduCraft.xlsx siap digunakan.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <h4 className="font-bold text-gray-900">Cara Import ke Quizizz:</h4>
              
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#864CFF]/10 text-[#864CFF] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-gray-600">Buka web <a href="https://quizizz.com" target="_blank" rel="noreferrer" className="text-[#864CFF] font-semibold hover:underline">quizizz.com</a> dan buat kuis baru (Create &gt; Quiz).</p>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#864CFF]/10 text-[#864CFF] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <p className="text-sm text-gray-600">Pilih menu <strong>Import from Spreadsheet</strong> di layar pembuatan kuis.</p>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#864CFF]/10 text-[#864CFF] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <p className="text-sm text-gray-600">Seret atau upload file Excel yang baru saja Anda unduh.</p>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#864CFF]/10 text-[#864CFF] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                  <p className="text-sm text-gray-600">Simpan, dan kuis Anda siap dimainkan oleh siswa!</p>
                </div>
              </div>

              <button 
                onClick={() => setShowTutorial(false)}
                className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

