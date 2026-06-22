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
      "bg-green-100 border-green-300",
      "bg-blue-100 border-blue-300",
      "bg-yellow-100 border-yellow-300",
      "bg-pink-100 border-pink-300",
      "bg-purple-100 border-purple-300"
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
    <div className="p-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-editorial font-bold text-black mb-2">
            Bank Soal
          </h1>
          <p className="text-gray-500">
            Akses, kelola, dan organisir semua soal yang telah Anda racik.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama soal atau tag..."
              className="pl-10 pr-4 py-3 w-full md:w-64 border-2 border-black/20 focus:border-black outline-none font-medium transition-colors bg-white"
            />
          </div>
          <button className="px-5 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:translate-x-1 active:shadow-none flex items-center gap-2 whitespace-nowrap">
            <Plus size={18} /> Buat Folder
          </button>
        </div>
      </div>

      {/* Folders Section */}
      <section className="mb-12">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Folder size={20} /> Koleksi Folder
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {dynamicFolders.map((folder, i) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-5 border-2 ${folder.color} cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all group bg-white`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-white border-2 border-black/10 flex items-center justify-center group-hover:border-black transition-colors">
                  <Folder size={20} className="text-gray-700" />
                </div>
                <button className="text-gray-400 hover:text-black">
                  <MoreVertical size={18} />
                </button>
              </div>
              <h3 className="font-bold text-black text-lg mb-1 line-clamp-1">
                {folder.name}
              </h3>
              <p className="text-sm font-medium text-gray-500">
                {folder.count} Set Dokumen
              </p>
            </motion.div>
          ))}
          {dynamicFolders.length === 0 && !isLoading && (
            <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-300">
              <p className="text-gray-500">Belum ada folder</p>
            </div>
          )}
        </div>
      </section>

      {/* Documents Section */}
      <section>
        <h2 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2 border-t-2 border-black/10 pt-8">
          <FileText size={20} /> Semua Dokumen Soal
        </h2>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-gray-400" size={32} />
            <p className="text-gray-500 font-medium">Memuat bank soal...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-300">
            <FileText className="text-gray-300" size={48} />
            <p className="text-gray-500 font-medium">Belum ada soal yang tersimpan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.2 }}
                className="bg-white border-2 border-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col h-full"
              >
                {/* Card Header */}
                <div className="h-24 bg-gray-50 border-b-2 border-black relative overflow-hidden flex items-center justify-center">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)",
                      backgroundPosition: "0 0, 10px 10px",
                      backgroundSize: "20px 20px",
                    }}
                  ></div>
                  <div className="bg-white border-2 border-black px-4 py-2 z-10 font-bold uppercase tracking-wider text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    Kuis
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h3 className="font-bold text-lg line-clamp-2 leading-tight">
                      {doc.title}
                    </h3>
                    <button className="text-gray-400 hover:text-black shrink-0 mt-1">
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4 mt-auto pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-black/20 text-gray-600 flex items-center gap-1">
                      <Folder size={10} /> {doc.folder || "Umum"}
                    </span>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-black/10 mt-auto">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Clock size={12} /> {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs font-bold text-black">
                        {doc.content?.soal?.length || 0} Soal
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="p-2 bg-gray-100 hover:bg-gray-200 border border-black/10 transition-colors"
                        title="Lihat/Edit"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        className="p-2 bg-black text-white hover:bg-gray-800 transition-colors"
                        title="Unduh"
                      >
                        <Download size={16} />
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
