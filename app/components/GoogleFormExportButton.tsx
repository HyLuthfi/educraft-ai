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
      <div className="p-6 border border-green-500 bg-green-50 hover:bg-green-100 transition-all flex flex-col items-center justify-center gap-3 text-center group w-full h-full rounded">
        <div className="w-12 h-12 rounded-full bg-green-200 text-green-700 flex items-center justify-center font-bold text-xl mb-1">
          ✓
        </div>
        <div>
          <div className="font-bold text-green-800">
            Form Siap!
          </div>
        </div>
        <a 
          href={formUrl} 
          target="_blank" 
          rel="noreferrer"
          className="mt-2 px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 mx-auto hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "#16a34a", color: "white" }}
        >
          Buka Form <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return (
    <button
      onClick={() => login()}
      disabled={disabled || isExporting}
      className="p-6 border border-black/10 bg-white hover:border-[#673AB7] hover:bg-[#f9f5ff] transition-all flex flex-col items-center justify-center gap-3 text-center group w-full h-full disabled:opacity-50"
    >
      <div className="w-12 h-12 rounded-full bg-[#673AB7]/10 text-[#673AB7] flex items-center justify-center font-bold text-xl mb-1">
        G
      </div>
      <div>
        <div className="font-bold text-gray-900 group-hover:text-[#673AB7]">
          {isExporting ? "Memproses..." : "Google Forms"}
        </div>
        <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
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
