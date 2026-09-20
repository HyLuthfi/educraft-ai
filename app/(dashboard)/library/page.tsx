"use client";

import { motion } from "framer-motion";
import {
  Folder,
  FileText,
  Search,
  Plus,
  MoreVertical,
  Download,
  Clock,
  Tag,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { buatSupabaseClient } from "@/lib/supabase/client";

export default function LibraryPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const supabase = buatSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bank_soal')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive folders dynamically from documents
  const folderCounts = documents.reduce((acc: any, doc) => {
    const folderName = doc.folder || "Umum";
    acc[folderName] = (acc[folderName] || 0) + 1;
    return acc;
  }, {});

  const dynamicFolders = Object.keys(folderCounts).map((name, i) => {
    const colors = [
      "bg-green-100 dark:bg-green-500/10 border-green-300 dark:border-green-500/40",
      "bg-blue-100 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40",
      "bg-yellow-100 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/40",
      "bg-pink-100 dark:bg-pink-500/10 border-pink-300 dark:border-pink-500/40",
      "bg-purple-100 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40"
    ];
    return {
      id: i,
      name,
      count: folderCounts[name],
      color: colors[i % colors.length]
    };
  });

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.folder || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 mb-4 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-editorial font-bold text-black dark:text-white mb-1 sm:mb-2">
            Bank Soal
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Akses, kelola, dan organisir semua soal yang telah Anda racik.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama soal atau tag..."
              className="pl-9 pr-3 py-2 sm:py-3 w-full md:w-64 border-2 border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-medium text-xs sm:text-sm transition-colors bg-white dark:bg-[#2a2a2a] dark:text-white"
            />
          </div>
          <button className="px-3.5 sm:px-5 py-2 sm:py-3 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:translate-x-1 active:shadow-none flex items-center justify-center gap-1.5 whitespace-nowrap">
            <Plus size={16} /> Buat Folder
          </button>
        </div>
      </div>

      {/* Folders Section */}
      <section className="mb-6 sm:mb-12">
        <h2 className="text-sm sm:text-lg font-bold uppercase tracking-wider mb-2.5 sm:mb-4 flex items-center gap-2 dark:text-white">
          <Folder size={18} /> Koleksi Folder
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-6">
          {dynamicFolders.map((folder, i) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-3 sm:p-5 border-2 ${folder.color} cursor-pointer hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 transition-all group`}
            >
              <div className="flex justify-between items-start mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-[#1e1e1e] border-2 border-black/10 dark:border-white/10 flex items-center justify-center group-hover:border-black dark:group-hover:border-white transition-colors">
                  <Folder size={16} className="text-gray-700 dark:text-gray-300 sm:w-5 sm:h-5" />
                </div>
                <button className="text-gray-400 hover:text-black dark:hover:text-white">
                  <MoreVertical size={16} />
                </button>
              </div>
              <h3 className="font-bold text-black dark:text-white text-sm sm:text-lg mb-0.5 sm:mb-1 line-clamp-1">
                {folder.name}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                {folder.count} Set Dokumen
              </p>
            </motion.div>
          ))}
          {dynamicFolders.length === 0 && !isLoading && (
            <div className="col-span-full py-6 sm:py-8 text-center border-2 border-dashed border-gray-300 dark:border-white/15">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Belum ada folder</p>
            </div>
          )}
        </div>
      </section>

      {/* Documents Section */}
      <section>
        <h2 className="text-sm sm:text-lg font-bold uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2 border-t-2 border-black/10 dark:border-white/10 pt-4 sm:pt-8 dark:text-white">
          <FileText size={18} /> Semua Dokumen Soal
        </h2>

        {isLoading ? (
          <div className="py-12 sm:py-20 flex flex-col items-center justify-center gap-3 sm:gap-4">
            <Loader2 className="animate-spin text-gray-400" size={28} />
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Memuat bank soal...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-12 sm:py-20 flex flex-col items-center justify-center gap-3 sm:gap-4 border-2 border-dashed border-gray-300 dark:border-white/15">
            <FileText className="text-gray-300 dark:text-gray-600" size={36} />
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Belum ada soal yang tersimpan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {filteredDocuments.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.2 }}
                className="bg-white dark:bg-[#1e1e1e] border-2 border-black dark:border-white/20 p-0 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.15)] transition-all flex flex-col h-full"
              >
                {/* Card Header */}
                <div className="h-14 sm:h-24 bg-gray-50 dark:bg-[#2a2a2a] border-b-2 border-black dark:border-white/20 relative overflow-hidden flex items-center justify-center">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)",
                      backgroundPosition: "0 0, 10px 10px",
                      backgroundSize: "20px 20px",
                    }}
                  ></div>
                  <div className="bg-white dark:bg-[#1e1e1e] dark:text-white border-2 border-black dark:border-white/20 px-3 py-1 sm:px-4 sm:py-2 z-10 font-bold uppercase tracking-wider text-[10px] sm:text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]">
                    Kuis
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 sm:p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-3 sm:gap-4 mb-2 sm:mb-3">
                    <h3 className="font-bold text-sm sm:text-lg line-clamp-2 leading-tight dark:text-white">
                      {doc.title}
                    </h3>
                    <button className="text-gray-400 hover:text-black dark:hover:text-white shrink-0 mt-0.5">
                      <MoreVertical size={16} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 mt-auto pt-2 sm:pt-4">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 sm:py-1 border border-black/20 dark:border-white/20 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                      <Folder size={10} /> {doc.folder || "Umum"}
                    </span>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-2.5 sm:pt-4 border-t-2 border-black/10 dark:border-white/10 mt-auto">
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <div className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={11} className="sm:w-3 sm:h-3" /> {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs font-bold text-black dark:text-white">
                        {doc.content?.soal?.length || 0} Soal
                      </div>
                    </div>

                    <div className="flex gap-1.5 sm:gap-2">
                      <button
                        className="p-1.5 sm:p-2 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] border border-black/10 dark:border-white/10 dark:text-white transition-colors"
                        title="Lihat/Edit"
                      >
                        <FileText size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        className="p-1.5 sm:p-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                        title="Unduh"
                      >
                        <Download size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
