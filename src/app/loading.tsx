export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#2A2A2A]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
      </div>
      <p className="text-sm text-neutral-400 tracking-wide">Loading GameForge...</p>
    </div>
  );
}
