import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthVisual from "./components/AuthVisual";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-white">
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative">
        <Link
          href="/"
          className="absolute top-8 left-8 sm:left-16 md:left-24 xl:left-32 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>

        {children}
      </div>

      <AuthVisual />
    </div>
  );
}
