export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-32">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-[#2A2A2A]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
      </div>
      <p className="text-sm text-neutral-500">Loading...</p>
    </div>
  );
}
