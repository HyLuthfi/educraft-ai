"use client";

import { useState } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { FileDown, ExternalLink } from "lucide-react";
import { createGoogleForm, updateFormAsQuiz, addQuestionsToForm } from "@/lib/google-forms";
import { toast } from "sonner";

interface Props {
  soalData: any;
  disabled?: boolean;
}

const ExportButtonInner = ({ soalData, disabled }: Props) => {
  const [isExporting, setIsExporting] = useState(false);
  const [formUrl, setFormUrl] = useState<string | null>(null);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsExporting(true);
        setFormUrl(null);
        toast.loading("Membuat Google Form...", { id: "gform" });

        const headerData = soalData.header || {};
        const title = headerData.nama_sekolah 
          ? `Kuis ${headerData.mata_pelajaran} - ${headerData.nama_sekolah}`
          : "Kuis EduCraft AI";

        const form = await createGoogleForm(title, tokenResponse.access_token);
        const formId = form.formId;

        toast.loading("Mengatur sebagai kuis...", { id: "gform" });
        await updateFormAsQuiz(formId, tokenResponse.access_token);

        toast.loading("Menambahkan soal dan kunci jawaban...", { id: "gform" });
        await addQuestionsToForm(formId, soalData.soal || [], tokenResponse.access_token);

        const editUrl = `https://docs.google.com/forms/d/${formId}/edit`;
        setFormUrl(editUrl);
        
        toast.success("Berhasil membuat Google Form!", { id: "gform" });
      } catch (error: any) {
        toast.error(`Gagal: ${error.message}`, { id: "gform" });
      } finally {
        setIsExporting(false);
      }
    },
    onError: () => {
      toast.error("Gagal login dengan Google");
    },
    scope: "https://www.googleapis.com/auth/forms.body",
  });

  if (formUrl) {
    return (
      <div className="p-3 sm:p-4 border-2 border-green-500 bg-green-50 dark:bg-green-950/30 transition-all flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-2.5 sm:gap-2 text-left sm:text-center group w-full h-full shadow-[2px_2px_0px_0px_rgba(34,197,94,0.2)]">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-green-200 text-green-700 flex items-center justify-center font-bold text-sm sm:text-lg shrink-0">
          ✓
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-xs sm:text-sm text-green-800 dark:text-green-300">
            Form Siap!
          </div>
          <a 
            href={formUrl} 
            target="_blank" 
            rel="noreferrer"
            className="mt-1 px-2.5 py-1 rounded text-[10px] sm:text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-85 transition-opacity"
            style={{ backgroundColor: "#16a34a", color: "white" }}
          >
            Buka Form <ExternalLink size={11} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => login()}
      disabled={disabled || isExporting}
      className="p-3 sm:p-4 border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] hover:border-[#673AB7] hover:bg-[#f9f5ff] dark:hover:bg-[#281e3a] transition-all flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-2.5 sm:gap-2 text-left sm:text-center group w-full h-full disabled:opacity-50 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)] active:translate-y-0.5"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-[#673AB7]/10 text-[#673AB7] flex items-center justify-center font-bold text-sm sm:text-lg shrink-0 border border-[#673AB7]/20">
        G
      </div>
      <div className="min-w-0">
        <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white group-hover:text-[#673AB7] truncate">
          {isExporting ? "Memproses..." : "Google Forms"}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wider truncate">
          {isExporting ? "Harap Tunggu" : "Auto-Import"}
        </div>
      </div>
    </button>
  );
};

export default function GoogleFormExportButton(props: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-client-id.apps.googleusercontent.com";
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ExportButtonInner {...props} />
    </GoogleOAuthProvider>
  );
}
