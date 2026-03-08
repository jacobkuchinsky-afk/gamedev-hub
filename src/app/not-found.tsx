"use client";

import Link from "next/link";
import { Gamepad2, LayoutDashboard, Wrench, FolderKanban, Plus } from "lucide-react";

const POPULAR_PAGES = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tools", label: "Tools", icon: Wrench },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/projects/new", label: "New Project", icon: Plus },
];

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

      <div className="mt-10 w-full max-w-xs">
        <p className="mb-3 text-xs font-medium text-[#9CA3AF]">Popular Pages</p>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_PAGES.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs text-[#F5F5F5] transition-colors hover:border-[#F59E0B]/50 hover:text-[#F59E0B]"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-[#6B7280]">
        Try searching with <kbd className="rounded border border-[#2A2A2A] bg-[#1A1A1A] px-1.5 py-0.5 font-mono text-[#9CA3AF]">Ctrl+K</kbd>
      </p>

      <p className="mt-12 text-xs text-[#6B7280]">
        GameForge &middot; Game Dev Productivity Platform
      </p>
    </div>
  );
}
