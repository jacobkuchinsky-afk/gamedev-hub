"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-14 h-14 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
        <span className="text-2xl text-amber-500">!</span>
      </div>

      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
        <p className="text-sm text-neutral-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>

      <button
        onClick={reset}
        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg transition-colors cursor-pointer"
      >
        Try Again
      </button>

      <p className="text-xs text-neutral-600">GameForge</p>
    </div>
  );
}
