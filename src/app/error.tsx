"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard, Mail } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0F0F] px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <AlertTriangle className="h-7 w-7 text-[#F59E0B]" />
          </div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Something went wrong</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-[#6B7280]">Error: {error.digest}</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8">
          <h2 className="mb-4 text-sm font-medium text-[#9CA3AF]">What you can do</h2>
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-3 text-sm font-bold text-[#0F0F0F] transition-colors hover:bg-[#D97706]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 text-sm font-medium text-[#F5F5F5] transition-colors hover:border-[#F59E0B] hover:text-[#F59E0B]"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
            <a
              href="mailto:support@gamedev-hub.vercel.app"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] py-3 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B] hover:text-[#F59E0B]"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#6B7280]">GameForge</p>
      </div>
    </div>
  );
}
