import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0F0F] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F59E0B]/10">
        <Gamepad2 className="h-8 w-8 text-[#F59E0B]" />
      </div>

      <h1 className="mt-8 text-4xl font-bold text-[#F5F5F5]">Page Not Found</h1>

      <p className="mt-3 max-w-sm text-[#9CA3AF]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <Link
        href="/dashboard"
        className="mt-8 rounded-lg bg-[#F59E0B] px-6 py-2.5 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#D97706]"
      >
        Go to Dashboard
      </Link>

      <p className="mt-12 text-xs text-[#6B7280]">
        GameForge &middot; Game Dev Productivity Platform
      </p>
    </div>
  );
}
