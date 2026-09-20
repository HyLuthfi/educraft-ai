import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthVisual from "./components/AuthVisual";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-[#121212]">
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-16 md:px-24 xl:px-32 py-16 sm:py-0 relative">
        <Link
          href="/"
          className="absolute top-5 left-4 sm:top-8 sm:left-16 md:left-24 xl:left-32 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Kembali</span>
        </Link>

        {children}
      </div>

      <AuthVisual />
    </div>
  );
}
