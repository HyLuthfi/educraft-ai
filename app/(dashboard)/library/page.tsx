export default function LibraryPage() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-editorial font-bold text-black mb-2">Bank Soal</h1>
      <p className="text-gray-500 mb-8">Kumpulan soal yang telah Anda racik menggunakan AI.</p>
      
      <div className="border border-black/10 bg-white p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 className="text-lg font-bold">Belum ada soal</h3>
        <p className="text-gray-500 mt-2">Anda belum meracik soal apapun. Silakan buat soal pertama Anda!</p>
      </div>
    </div>
  )
}
