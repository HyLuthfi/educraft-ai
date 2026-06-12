export default function SettingsPage() {
  return (
    <div className="p-10 max-w-3xl">
      <h1 className="text-3xl font-editorial font-bold text-black mb-2">Pengaturan</h1>
      <p className="text-gray-500 mb-8">Kelola preferensi akun dan profil Anda.</p>
      
      <div className="space-y-6">
        <div className="border border-black/10 bg-white p-6">
          <h3 className="font-bold border-b border-black/10 pb-4 mb-4">Profil Akun</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nama Lengkap</label>
              <input type="text" defaultValue="Guru Cerdas" className="w-full p-3 border border-black/20 focus:border-black outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Email</label>
              <input type="email" defaultValue="guru@sekolah.id" disabled className="w-full p-3 border border-black/10 bg-gray-50 text-gray-500 outline-none" />
            </div>
            <button className="bg-black text-white px-6 py-2 font-medium hover:bg-gray-800 transition-colors">Simpan Perubahan</button>
          </div>
        </div>
      </div>
    </div>
  )
}
