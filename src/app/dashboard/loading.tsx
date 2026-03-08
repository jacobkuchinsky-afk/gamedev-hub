"use client";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-[#1A1A1A] animate-pulse" />
          <div className="h-4 w-80 rounded bg-[#1A1A1A] animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-lg bg-[#1A1A1A] animate-pulse" />
          <div className="h-10 w-20 rounded-lg bg-[#1A1A1A] animate-pulse" />
        </div>
      </div>

      {/* Stat cards skeleton (4) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-[#2A2A2A]" />
              <div className="h-8 w-12 rounded bg-[#2A2A2A]" />
            </div>
            <div className="mt-3 h-4 w-24 rounded bg-[#2A2A2A]" />
          </div>
        ))}
      </div>

      {/* Project card skeleton row */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <div className="border-b border-[#2A2A2A] p-4">
          <div className="h-5 w-40 rounded bg-[#2A2A2A] animate-pulse" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 p-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 animate-pulse"
            >
              <div className="h-12 w-12 shrink-0 rounded-lg bg-[#2A2A2A]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-[#2A2A2A]" />
                <div className="h-3 w-1/2 rounded bg-[#2A2A2A]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content area skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 animate-pulse">
            <div className="h-5 w-32 rounded bg-[#2A2A2A] mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-[#2A2A2A]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full rounded bg-[#2A2A2A]" />
                    <div className="h-3 w-2/3 rounded bg-[#2A2A2A]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 animate-pulse">
            <div className="h-5 w-28 rounded bg-[#2A2A2A] mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-[#2A2A2A]" />
              <div className="h-4 w-4/5 rounded bg-[#2A2A2A]" />
              <div className="h-4 w-3/4 rounded bg-[#2A2A2A]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
