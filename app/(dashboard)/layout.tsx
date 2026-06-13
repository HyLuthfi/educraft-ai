"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Sparkles,
  FileText,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    plan: string;
    initial: string;
  }>({
    full_name: "Memuat...",
    plan: "...",
    initial: "-"
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, plan')
          .eq('id', user.id)
          .single();
          
        let name = "Pengguna";
        let plan = "Free Plan";
        
        if (profile?.full_name) {
          name = profile.full_name;
          plan = profile.plan || "Free Plan";
        } else if (user.user_metadata?.full_name) {
          name = user.user_metadata.full_name;
        } else if (user.email) {
          name = user.email.split('@')[0];
        }

        setUserProfile({
          full_name: name,
          plan: plan,
          initial: name.charAt(0).toUpperCase()
        });
      }
    }
    fetchUser();
  }, [supabase]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const navItems = [
    { name: "Buat Soal", href: "/create", icon: Sparkles },
    { name: "Bank Soal", href: "/library", icon: FileText },
    { name: "Pengaturan", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex">
      <aside className="w-64 bg-white border-r border-black/10 flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="h-20 flex items-center px-8 border-b border-black/10">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="EduCraft Logo"
              className="h-8 w-auto object-contain"
            />
            <div className="flex items-center gap-2">
              <span className="font-bold font-editorial text-lg tracking-tight">
                EduCraft AI
              </span>
              <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                Pro
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          <div className="text-xs font-semibold text-gray-400 mb-4 px-4 uppercase tracking-widest">
            Menu Utama
          </div>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith("/create") && item.href === "/create");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-none font-medium transition-all ${
                  isActive
                    ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] -translate-y-[2px] -translate-x-[2px]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black hover:translate-x-1"
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-black/10">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center font-bold text-gray-600">
              {userProfile.initial}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{userProfile.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{userProfile.plan}</p>
            </div>
            <button onClick={handleLogoutClick} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
        <header className="h-16 bg-white border-b border-black/10 flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="EduCraft Logo"
              className="h-6 w-auto object-contain"
            />
            <span className="font-bold font-editorial text-lg tracking-tight">
              EduCraft AI
            </span>
          </div>
          <button className="p-2 border border-black/10 rounded">
            <LayoutDashboard size={20} />
          </button>
        </header>

        <div className="flex-1 relative">{children}</div>
      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border-4 border-black p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black uppercase tracking-wider mb-2">Konfirmasi Keluar</h3>
            <p className="font-medium text-gray-600 mb-6">Apakah Anda yakin ingin keluar dari akun EduCraft AI?</p>
            <div className="flex gap-4">
              <button
                onClick={cancelLogout}
                className="flex-1 py-3 bg-white border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-500 border-2 border-black text-white font-bold uppercase tracking-wider hover:bg-red-600 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
