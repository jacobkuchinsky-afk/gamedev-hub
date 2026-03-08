"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Gamepad2,
  LayoutDashboard,
  FolderKanban,
  Wrench,
  BookOpen,
  Settings,
  LogOut,
  X,
  ChevronRight,
  Search,
  Paintbrush,
  Music,
  Palette,
  ScrollText,
  Calculator,
  MessageSquare,
  Lightbulb,
  Map,
  Sparkles,
  Film,
  Activity,
  Command,
} from "lucide-react";
import { AuthProvider, useAuthContext } from "@/components/AuthProvider";
import { getProjects, getStatusColor, type Project } from "@/lib/store";
import ShortcutsModal from "@/components/ShortcutsModal";
import { ToastProvider } from "@/components/Toast";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/projects", icon: FolderKanban, label: "Projects" },
  { href: "/dashboard/tools", icon: Wrench, label: "Tools" },
  { href: "/dashboard/devlog", icon: BookOpen, label: "Devlog" },
];

const CMD_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", section: "Navigation" },
  { href: "/dashboard/projects", icon: FolderKanban, label: "Projects", section: "Navigation" },
  { href: "/dashboard/tools", icon: Wrench, label: "Tools", section: "Navigation" },
  { href: "/dashboard/devlog", icon: BookOpen, label: "Devlog", section: "Navigation" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings", section: "Navigation" },
  { href: "/dashboard/tools/sprites", icon: Paintbrush, label: "Sprite Editor", section: "Tools" },
  { href: "/dashboard/tools/sounds", icon: Music, label: "Sound Generator", section: "Tools" },
  { href: "/dashboard/tools/colors", icon: Palette, label: "Color Palettes", section: "Tools" },
  { href: "/dashboard/tools/names", icon: ScrollText, label: "Name Generator", section: "Tools" },
  { href: "/dashboard/tools/balance", icon: Calculator, label: "Balance Calculator", section: "Tools" },
  { href: "/dashboard/tools/dialogue", icon: MessageSquare, label: "Dialogue Trees", section: "Tools" },
  { href: "/dashboard/tools/ideas", icon: Lightbulb, label: "AI Idea Generator", section: "Tools" },
  { href: "/dashboard/tools/tilemap", icon: Map, label: "Tilemap Painter", section: "Tools" },
  { href: "/dashboard/tools/effects", icon: Sparkles, label: "Screen Effects", section: "Tools" },
  { href: "/dashboard/tools/animation", icon: Film, label: "Animation Frames", section: "Tools" },
  { href: "/dashboard/tools/easing", icon: Activity, label: "Easing Visualizer", section: "Tools" },
];

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = CMD_ITEMS.filter(
    (item) =>
      !query || item.label.toLowerCase().includes(query.toLowerCase())
  );

  const sections = filtered.reduce<Record<string, typeof CMD_ITEMS>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#2A2A2A] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[#6B7280]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered.length > 0) go(filtered[0].href);
            }}
            placeholder="Search pages and tools..."
            className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none"
          />
          <kbd className="rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] text-[#6B7280]">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-[#6B7280]">No results</p>
          )}
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                {section}
              </p>
              {items.map((item) => (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    console.log("[DashboardLayout] rendered");
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setProjects(getProjects());
    }
  }, [user]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen((prev) => !prev);
      return;
    }
    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;
    if (e.key === "?" && !isTyping && !cmdOpen) {
      e.preventDefault();
      setShortcutsOpen((prev) => !prev);
    }
  }, [cmdOpen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F0F0F]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2A2A2A] border-t-[#F59E0B]" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-[#0F0F0F]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#2A2A2A] bg-[#0F0F0F] transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-[#2A2A2A] px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Gamepad2 className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <span className="text-base font-bold tracking-tight">GameForge</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5] md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "text-[#9CA3AF] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Projects */}
          <div className="mt-8">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Projects
            </p>
            <div className="space-y-0.5">
              {projects.map((project) => {
                const projectPath = `/dashboard/projects/${project.id}`;
                const active = pathname === projectPath;
                return (
                  <Link
                    key={project.id}
                    href={projectPath}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-[#1A1A1A] text-[#F5F5F5]"
                        : "text-[#9CA3AF] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
                    }`}
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getStatusColor(project.status) }}
                    />
                    <span className="truncate">{project.name}</span>
                    <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-[#6B7280]" />
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-[#2A2A2A] p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/15 text-xs font-bold text-[#F59E0B]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.username}</p>
              <p className="truncate text-xs text-[#6B7280]">{user.email}</p>
            </div>
          </div>
          <div className="mt-1 flex gap-1">
            <Link
              href="/dashboard/settings"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-[#9CA3AF] transition-colors hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-[#9CA3AF] transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-[#2A2A2A] px-6">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center gap-[5px] rounded-lg p-2 text-[#9CA3AF] hover:bg-[#1A1A1A] hover:text-[#F5F5F5] md:hidden ${sidebarOpen ? "hamburger-open" : ""}`}
            aria-label="Toggle menu"
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
          <button
            onClick={() => setCmdOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-sm text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#9CA3AF]"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] sm:inline">
              <Command className="inline h-2.5 w-2.5" />K
            </kbd>
          </button>
        </header>

        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardShell>{children}</DashboardShell>
      </ToastProvider>
    </AuthProvider>
  );
}
