"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 flex flex-col items-center gap-6 animate-pulse">
        {/* Logo placeholder */}
        <div className="w-16 h-16 rounded-xl bg-[#2A2A2A]" />
        <div className="space-y-2 text-center">
          <div className="h-4 w-32 mx-auto rounded bg-[#2A2A2A]" />
          <p className="text-sm text-neutral-400 tracking-wide">Loading GameForge...</p>
        </div>
      </div>
    </div>
  );
}
