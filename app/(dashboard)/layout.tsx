"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FileText,
  Settings,
  LogOut,
  LayoutDashboard,
  Gamepad2,
  ClipboardCheck,
  UserCheck,
  TrendingUp,
  Trophy,
  Users,
  MousePointerClick,
  CalendarRange,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    plan: string;
    initial: string;
  }>({
    full_name: "Memuat...",
    plan: "Pro Plan",
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
        let plan = "Pro Plan";
        
        if (profile?.full_name) {
          name = profile.full_name;
        } else if (user.user_metadata?.full_name) {
          name = user.user_metadata.full_name;
        } else if (user.email) {
          name = user.email.split('@')[0];
        }

        if (profile?.plan && profile.plan !== "Free Plan") {
          plan = profile.plan;
        } else {
          plan = "Pro Plan";
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
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}
    window.location.href = "/login";
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const navGroups = [
    {
      label: "Soal & Penilaian",
      items: [
        { name: "Buat Soal", href: "/create", icon: Sparkles },
        { name: "Jawab Soal", href: "/play", icon: Gamepad2 },
        { name: "Koreksi Jawaban", href: "/koreksi", icon: ClipboardCheck },
      ],
    },
    {
      label: "Laporan",
      items: [
        { name: "Rapor Siswa", href: "/rapor", icon: TrendingUp },
        { name: "Ranking Siswa", href: "/ranking", icon: Trophy },
      ],
    },
    {
      label: "Kelas",
      items: [
        { name: "Absensi Murid", href: "/absensi", icon: UserCheck },
        { name: "Buat Kelompok", href: "/kelompok", icon: Users },
        { name: "Perencana Pembelajaran", href: "/perencana", icon: CalendarRange },
        { name: "Penunjuk Random", href: "/roda-undian", icon: MousePointerClick },
      ],
    },
    {
      label: "Materi",
      items: [{ name: "Bank Soal", href: "/library", icon: FileText }],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#121212] flex transition-colors">
      <aside className="w-64 bg-white dark:bg-[#1e1e1e] border-r border-black/10 dark:border-white/10 flex flex-col hidden md:flex sticky top-0 h-screen transition-colors">
        <div className="h-20 flex items-center px-8 border-b border-black/10 dark:border-white/10">
          <Link href="/create" className="flex items-center gap-3">
            <img
              src="/logo-light.png"
              alt="EduCraft Logo"
              className="h-12 w-auto object-contain dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="EduCraft Logo"
              className="h-12 w-auto object-contain hidden dark:block"
            />
            <div className="flex items-center gap-2">
              <span className="font-bold font-editorial text-lg tracking-tight dark:text-white">
                EduCraft AI
              </span>
              <span className="bg-black dark:bg-yellow-500 text-white dark:text-black text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                Pro
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3 px-4 uppercase tracking-widest">
                {group.label}
              </div>
              {group.items.map((item) => {
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
                        ? "bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] -translate-y-[2px] -translate-x-[2px]"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:text-black dark:hover:text-white hover:translate-x-1"
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-4 pb-2">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-none font-medium transition-all ${
              pathname === "/settings"
                ? "bg-black dark:bg-white text-white dark:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] -translate-y-[2px] -translate-x-[2px]"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:text-black dark:hover:text-white hover:translate-x-1"
            }`}
          >
            <Settings size={18} />
            Pengaturan
          </Link>
        </div>

        <div className="p-4 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded bg-gray-200 dark:bg-[#2a2a2a] flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
              {userProfile.initial}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate dark:text-white">{userProfile.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-yellow-400 text-black border border-black/10 rounded shadow-sm">
                  ★ {userProfile.plan}
                </span>
              </div>
            </div>
            <button onClick={handleLogoutClick} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Mobile Sticky Header */}
        <header className="h-16 bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-md border-b border-black/10 dark:border-white/10 flex items-center justify-between px-4 sm:px-6 md:hidden sticky top-0 z-30 transition-colors">
          <Link href="/create" className="flex items-center gap-2.5">
            <img
              src="/logo-light.png"
              alt="EduCraft Logo"
              className="h-8 w-auto object-contain dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="EduCraft Logo"
              className="h-8 w-auto object-contain hidden dark:block"
            />
            <div className="flex items-center gap-1.5">
              <span className="font-bold font-editorial text-lg tracking-tight dark:text-white">
                EduCraft AI
              </span>
              <span className="bg-black dark:bg-yellow-500 text-white dark:text-black text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                Pro
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/create"
              className="py-1.5 px-3 rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Sparkles size={14} className="text-yellow-400 dark:text-black" />
              <span>Buat</span>
            </Link>
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 border border-black/10 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
              aria-label="Buka Menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Content with safe-area padding for mobile bottom bar */}
        <div className="flex-1 relative pb-24 md:pb-8">{children}</div>
      </main>

      {/* Floating Bottom Navigation Bar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-black/10 dark:border-white/10 px-2 py-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Bank Soal */}
          <Link
            href="/library"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/library"
                ? "text-black dark:text-white font-bold"
                : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${pathname === "/library" ? "bg-black/5 dark:bg-white/10" : ""}`}>
              <FileText size={19} />
            </div>
            <span className="text-[10px] mt-0.5">Bank Soal</span>
          </Link>

          {/* Koreksi */}
          <Link
            href="/koreksi"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/koreksi"
                ? "text-black dark:text-white font-bold"
                : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${pathname === "/koreksi" ? "bg-black/5 dark:bg-white/10" : ""}`}>
              <ClipboardCheck size={19} />
            </div>
            <span className="text-[10px] mt-0.5">Koreksi</span>
          </Link>

          {/* Center Elevated Action: Buat Soal */}
          <Link
            href="/create"
            className="flex flex-col items-center justify-center group -mt-5"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              pathname?.startsWith("/create")
                ? "bg-black text-white dark:bg-white dark:text-black shadow-black/25 ring-4 ring-black/10 dark:ring-white/20"
                : "bg-black text-white dark:bg-white dark:text-black shadow-black/20 hover:scale-105"
            }`}>
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <span className="text-[10px] font-bold text-black dark:text-white mt-1">Buat Soal</span>
          </Link>

          {/* Absensi */}
          <Link
            href="/absensi"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/absensi"
                ? "text-black dark:text-white font-bold"
                : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${pathname === "/absensi" ? "bg-black/5 dark:bg-white/10" : ""}`}>
              <UserCheck size={19} />
            </div>
            <span className="text-[10px] mt-0.5">Absensi</span>
          </Link>

          {/* Menu Lainnya */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              isMobileDrawerOpen
                ? "text-black dark:text-white font-bold"
                : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${isMobileDrawerOpen ? "bg-black/5 dark:bg-white/10" : ""}`}>
              <Menu size={19} />
            </div>
            <span className="text-[10px] mt-0.5">Menu</span>
          </button>
        </div>
      </nav>

      {/* Slide-Over Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer Container */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="relative w-4/5 max-w-sm bg-white dark:bg-[#1e1e1e] h-full shadow-2xl flex flex-col z-10 overflow-hidden border-r border-black/10 dark:border-white/10"
            >
              {/* Drawer Header */}
              <div className="h-16 flex items-center justify-between px-5 border-b border-black/10 dark:border-white/10">
                <Link
                  href="/create"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <img
                    src="/logo-light.png"
                    alt="EduCraft Logo"
                    className="h-8 w-auto object-contain dark:hidden"
                  />
                  <img
                    src="/logo-dark.png"
                    alt="EduCraft Logo"
                    className="h-8 w-auto object-contain hidden dark:block"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold font-editorial text-base tracking-tight dark:text-white">
                      EduCraft AI
                    </span>
                    <span className="bg-black dark:bg-yellow-500 text-white dark:text-black text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                      Pro
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 rounded-lg text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                  aria-label="Tutup Menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Profile Mini Banner */}
              <div className="p-4 bg-gray-50 dark:bg-[#262626] border-b border-black/10 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm">
                    {userProfile.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate dark:text-white">
                      {userProfile.full_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-yellow-400 text-black border border-black/10 rounded shadow-sm">
                        ★ {userProfile.plan}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">

                {navGroups.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 px-3.5 uppercase tracking-wider">
                      {group.label}
                    </div>
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (pathname?.startsWith("/create") && item.href === "/create");
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                            isActive
                              ? "bg-black dark:bg-white text-white dark:text-black font-bold shadow-sm"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon size={18} />
                            <span>{item.name}</span>
                          </div>
                          <ChevronRight size={15} className="opacity-40" />
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] space-y-1.5">
                <Link
                  href="/settings"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    pathname === "/settings"
                      ? "bg-black dark:bg-white text-white dark:text-black font-bold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
                  }`}
                >
                  <Settings size={18} />
                  <span>Pengaturan</span>
                </Link>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleLogoutClick();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                >
                  <LogOut size={18} />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e1e] border-4 border-black dark:border-white/20 p-8 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
            <h3 className="text-xl font-black uppercase tracking-wider mb-2 dark:text-white">Konfirmasi Keluar</h3>
            <p className="font-medium text-gray-600 dark:text-gray-400 mb-6">Apakah Anda yakin ingin keluar dari akun EduCraft AI?</p>
            <div className="flex gap-4">
              <button
                onClick={cancelLogout}
                className="flex-1 py-3 bg-white dark:bg-[#2a2a2a] dark:text-white border-2 border-black dark:border-white/20 font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-[#333] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-500 border-2 border-black dark:border-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-600 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(220,38,38,0.3)] active:translate-y-1 active:translate-x-1 active:shadow-none"
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
