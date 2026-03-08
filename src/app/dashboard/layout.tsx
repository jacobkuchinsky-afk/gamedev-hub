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
  Clock,
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
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  AlertTriangle,
  Pin,
} from "lucide-react";
import { AuthProvider, useAuthContext } from "@/components/AuthProvider";
import { getProjects, getStatusColor, getTasks, getBugs, getDevlog, validateStorage, type Project, type Task, type Bug, type DevlogEntry } from "@/lib/store";
import ShortcutsModal from "@/components/ShortcutsModal";
import WhatsNew from "@/components/WhatsNew";
import { ToastProvider } from "@/components/Toast";
import NotificationCenter from "@/components/NotificationCenter";

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

const TIMER_PRESETS = [
  { label: "Pomodoro", minutes: 25 },
  { label: "Deep Work", minutes: 50 },
  { label: "Break", minutes: 15 },
];

function FocusTimer() {
  const [open, setOpen] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (!notifiedRef.current) {
            notifiedRef.current = true;
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification("Focus Timer", { body: "Time's up! Take a break." });
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectPreset = (minutes: number) => {
    setTotalSeconds(minutes * 60);
    setRemaining(minutes * 60);
    setRunning(false);
    notifiedRef.current = false;
  };

  const toggleRunning = () => {
    if (remaining === 0) return;
    notifiedRef.current = false;
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(totalSeconds);
    notifiedRef.current = false;
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const isActive = running || remaining < totalSeconds;
  const isFinished = remaining === 0 && totalSeconds > 0 && remaining < totalSeconds;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-sm text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#9CA3AF]"
      >
        <Timer className="h-3.5 w-3.5" />
        {isActive && (
          <>
            <span className="hidden tabular-nums text-[#F59E0B] sm:inline">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center">
              {running ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F59E0B] opacity-40" />
              ) : null}
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: isFinished ? "#10B981" : "#F59E0B" }}
              />
            </span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl">
          <div className="border-b border-[#2A2A2A] px-4 py-3">
            <p className="text-xs font-semibold text-[#9CA3AF]">Focus Timer</p>
          </div>

          <div className="flex flex-col items-center gap-3 px-4 py-5">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg className="absolute inset-0" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" fill="none" stroke="#2A2A2A" strokeWidth="4" />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke={isFinished ? "#10B981" : "#F59E0B"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - progress)}
                  transform="rotate(-90 48 48)"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className={`text-xl font-bold tabular-nums ${isFinished ? "text-[#10B981]" : "text-[#F5F5F5]"}`}>
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
            </div>

            {isFinished && (
              <p className="text-xs font-medium text-[#10B981]">Time&apos;s up! Take a break.</p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={toggleRunning}
                disabled={isFinished}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B] text-[#0F0F0F] transition-colors hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={reset}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A2A2A] text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Presets</p>
            <div className="flex gap-2">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => selectPreset(preset.minutes)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                    totalSeconds === preset.minutes * 60 && !isActive
                      ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {preset.minutes}m
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PinnedPage { href: string; label: string }

function CommandPalette({ open, onClose, pinnedPages, onTogglePin }: {
  open: boolean;
  onClose: () => void;
  pinnedPages: PinnedPage[];
  onTogglePin: (href: string, label: string) => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allBugs, setAllBugs] = useState<Bug[]>([]);
  const [allDevlogs, setAllDevlogs] = useState<DevlogEntry[]>([]);
  const [recentPages, setRecentPages] = useState<Array<{ href: string; label: string; ts: number }>>([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setProjects(getProjects());
      setAllTasks(getTasks());
      setAllBugs(getBugs());
      setAllDevlogs(getDevlog());
      try {
        setRecentPages(JSON.parse(localStorage.getItem("gameforge_recent_pages") || "[]"));
      } catch { setRecentPages([]); }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const lq = query.toLowerCase();
  const MAX = 3;

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || "Unknown";

  const filteredStatic = CMD_ITEMS.filter(
    (item) => !query || item.label.toLowerCase().includes(lq)
  );

  const sections = filteredStatic.reduce<Record<string, typeof CMD_ITEMS>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  if (query) {
    for (const key of Object.keys(sections)) {
      sections[key] = sections[key].slice(0, MAX);
    }
  }

  const filteredProjects = projects.filter(
    (p) => !query || p.name.toLowerCase().includes(lq) || p.engine.toLowerCase().includes(lq) || p.genre.toLowerCase().includes(lq)
  );
  const limitedProjects = query ? filteredProjects.slice(0, MAX) : filteredProjects;

  const filteredTasks = query
    ? allTasks.filter((t) => t.title.toLowerCase().includes(lq)).slice(0, MAX)
    : [];
  const filteredBugs = query
    ? allBugs.filter((b) => b.title.toLowerCase().includes(lq)).slice(0, MAX)
    : [];
  const filteredDevlogs = query
    ? allDevlogs.filter((d) => d.title.toLowerCase().includes(lq)).slice(0, MAX)
    : [];

  const showRecent = !query && recentPages.length > 0;

  const navCount = Object.values(sections).reduce((s, items) => s + items.length, 0);
  const totalResults = navCount + limitedProjects.length + filteredTasks.length + filteredBugs.length + filteredDevlogs.length;
  const allEmpty = query.length > 0 && totalResults === 0;

  const allItems = [
    ...(showRecent ? recentPages.map((p) => p.href) : []),
    ...limitedProjects.map((p) => `/dashboard/projects/${p.id}`),
    ...Object.values(sections).flat().map((i) => i.href),
    ...filteredTasks.map((t) => `/dashboard/projects/${t.projectId}/tasks`),
    ...filteredBugs.map((b) => `/dashboard/projects/${b.projectId}/bugs`),
    ...filteredDevlogs.map((d) => `/dashboard/projects/${d.projectId}/devlog`),
  ];

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  const isPinned = (href: string) => pinnedPages.some((p) => p.href === href);

  const PinBtn = ({ href, label }: { href: string; label: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onTogglePin(href, label); }}
      className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 transition-all ${
        isPinned(href)
          ? "text-[#F59E0B] opacity-100"
          : "text-[#6B7280] opacity-0 group-hover/row:opacity-100"
      } hover:text-[#F59E0B]`}
      title={isPinned(href) ? "Unpin" : "Pin"}
    >
      <Pin className="h-3 w-3" />
    </button>
  );

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
              if (e.key === "Enter" && allItems.length > 0) go(allItems[0]);
            }}
            placeholder="Search everything..."
            className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none"
          />
          <kbd className="rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] text-[#6B7280]">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {allEmpty && (
            <p className="px-3 py-6 text-center text-sm text-[#6B7280]">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {showRecent && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Recent
              </p>
              {recentPages.slice(0, MAX).map((page) => (
                <div key={page.href} className="group/row relative">
                  <button
                    onClick={() => go(page.href)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-8 text-sm text-[#9CA3AF] transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="flex-1 truncate text-left">{page.label}</span>
                  </button>
                  <PinBtn href={page.href} label={page.label} />
                </div>
              ))}
            </div>
          )}

          {limitedProjects.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Projects
              </p>
              {limitedProjects.map((project) => (
                <div key={project.id} className="group/row relative">
                  <button
                    onClick={() => go(`/dashboard/projects/${project.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-8 text-sm text-[#9CA3AF] transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getStatusColor(project.status) }}
                    />
                    <span className="flex-1 truncate text-left">{project.name}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] capitalize text-[#6B7280]">
                      {project.status}
                    </span>
                  </button>
                  <PinBtn href={`/dashboard/projects/${project.id}`} label={project.name} />
                </div>
              ))}
            </div>
          )}

          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                {section}
              </p>
              {items.map((item) => (
                <div key={item.href} className="group/row relative">
                  <button
                    onClick={() => go(item.href)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-8 text-sm text-[#9CA3AF] transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                  <PinBtn href={item.href} label={item.label} />
                </div>
              ))}
            </div>
          ))}

          {filteredTasks.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Tasks
              </p>
              {filteredTasks.map((task) => (
                <div key={task.id} className="group/row relative">
                  <button
                    onClick={() => go(`/dashboard/projects/${task.projectId}/tasks`)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-8 text-sm text-[#9CA3AF] transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                  >
                    <CheckSquare className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">
                      <span className="text-[#6B7280]">Task:</span> {task.title}
                    </span>
                    <span className="shrink-0 rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] text-[#6B7280]">
                      {projectName(task.projectId)}
                    </span>
                  </button>
                  <PinBtn href={`/dashboard/projects/${task.projectId}/tasks`} label={`Task: ${task.title}`} />
                </div>
              ))}
            </div>
          )}

          {filteredBugs.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Bugs
              </p>
              {filteredBugs.map((bug) => (
                <div key={bug.id} className="group/row relative">
                  <button
                    onClick={() => go(`/dashboard/projects/${bug.projectId}/bugs`)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-8 text-sm text-[#9CA3AF] transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">
                      <span className="text-[#6B7280]">Bug:</span> {bug.title}
                    </span>
                    <span className="shrink-0 rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] text-[#6B7280]">
                      {projectName(bug.projectId)}
                    </span>
                  </button>
                  <PinBtn href={`/dashboard/projects/${bug.projectId}/bugs`} label={`Bug: ${bug.title}`} />
                </div>
              ))}
            </div>
          )}

          {filteredDevlogs.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Devlogs
              </p>
              {filteredDevlogs.map((entry) => (
                <div key={entry.id} className="group/row relative">
                  <button
                    onClick={() => go(`/dashboard/projects/${entry.projectId}/devlog`)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-8 text-sm text-[#9CA3AF] transition-colors hover:bg-[#F59E0B]/10 hover:text-[#F59E0B]"
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">
                      <span className="text-[#6B7280]">Devlog:</span> {entry.title}
                    </span>
                    <span className="shrink-0 rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] text-[#6B7280]">
                      {projectName(entry.projectId)}
                    </span>
                  </button>
                  <PinBtn href={`/dashboard/projects/${entry.projectId}/devlog`} label={`Devlog: ${entry.title}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {query && (
          <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-2">
            <span className="text-[11px] text-[#6B7280]">
              {totalResults} result{totalResults !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-[#6B7280]">
              <kbd className="rounded bg-[#0F0F0F] px-1 py-0.5 text-[10px]">Enter</kbd> to select
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function KeyboardShortcutsHint() {
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem("gameforge_shortcuts_hint_seen");
    if (dismissed) return;

    setVisible(true);
    const raf = requestAnimationFrame(() => setShow(true));

    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => {
        setVisible(false);
        localStorage.setItem("gameforge_shortcuts_hint_seen", "1");
      }, 300);
    }, 10000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem("gameforge_shortcuts_hint_seen", "1");
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      className={`fixed bottom-5 right-5 z-50 cursor-pointer transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]/95 px-3.5 py-2.5 text-xs text-[#9CA3AF] shadow-lg backdrop-blur-sm transition-colors hover:border-[#F59E0B]/30 hover:text-[#F5F5F5]">
        Press{" "}
        <kbd className="rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]">?</kbd>{" "}
        for keyboard shortcuts
      </div>
    </div>
  );
}

const VIM_NAV: Record<string, string> = {
  d: "/dashboard",
  p: "/dashboard/projects",
  t: "/dashboard/tools",
  l: "/dashboard/devlog",
  s: "/dashboard/settings",
};

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pinnedPages, setPinnedPages] = useState<PinnedPage[]>([]);
  const pendingKeyRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log("[DashboardLayout] rendered");
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      validateStorage();
      setProjects(getProjects());
      const openTasks = getTasks().filter((t) => t.status !== "done").length;
      const openBugs = getBugs().filter((b) => b.status !== "closed").length;
      setPendingCount(openTasks + openBugs);
      try {
        setPinnedPages(JSON.parse(localStorage.getItem("gameforge_pinned_pages") || "[]"));
      } catch { setPinnedPages([]); }
    }
  }, [user]);

  const togglePin = useCallback((href: string, label: string) => {
    setPinnedPages((prev) => {
      const exists = prev.some((p) => p.href === href);
      const next = exists
        ? prev.filter((p) => p.href !== href)
        : prev.length >= 5 ? prev : [...prev, { href, label }];
      localStorage.setItem("gameforge_pinned_pages", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    try {
      const label =
        CMD_ITEMS.find((i) => i.href === pathname)?.label ||
        pathname.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
        "Page";
      const stored: Array<{ href: string; label: string; ts: number }> =
        JSON.parse(localStorage.getItem("gameforge_recent_pages") || "[]");
      const filtered = stored.filter((p) => p.href !== pathname);
      filtered.unshift({ href: pathname, label, ts: Date.now() });
      localStorage.setItem("gameforge_recent_pages", JSON.stringify(filtered.slice(0, 5)));
    } catch {}
  }, [pathname]);

  const clearPending = useCallback(() => {
    pendingKeyRef.current = null;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen((prev) => !prev);
      clearPending();
      return;
    }
    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;
    if (isTyping) return;

    if (e.key === "?" && !cmdOpen) {
      e.preventDefault();
      setShortcutsOpen((prev) => !prev);
      clearPending();
      return;
    }

    if (pendingKeyRef.current === "g") {
      const lower = e.key.toLowerCase();
      const dest = VIM_NAV[lower];
      if (dest) {
        e.preventDefault();
        router.push(dest);
      }
      clearPending();
      return;
    }

    if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      pendingKeyRef.current = "g";
      pendingTimerRef.current = setTimeout(clearPending, 500);
      return;
    }

    if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !cmdOpen) {
      e.preventDefault();
      router.push("/dashboard/projects/new");
      return;
    }
  }, [cmdOpen, router, clearPending]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

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
      {/* Skip to content */}
      <a
        href="#main-content"
        className="fixed left-2 top-2 z-[200] -translate-y-16 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0F0F0F] transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:ring-offset-2 focus:ring-offset-[#0F0F0F]"
      >
        Skip to content
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#2A2A2A] bg-[#0F0F0F] transition-transform duration-300 ease-out md:relative md:translate-x-0 ${
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
        <nav aria-label="Sidebar" className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <div key={item.href} className="group/tip relative">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "text-[#9CA3AF] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {item.label === "Dashboard" && pendingCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold leading-none text-[#0F0F0F]">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#2A2A2A] px-2.5 py-1.5 text-xs font-medium text-[#F5F5F5] opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100">
                    {item.label}
                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#2A2A2A]" />
                  </span>
                </div>
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
            {projects.length > 0 && (
              <p className="mt-2 px-3 text-[11px] text-[#6B7280]">
                {projects.filter((p) => p.status !== "released").length} active
              </p>
            )}
          </div>

          {/* Pinned */}
          {pinnedPages.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Pinned
              </p>
              <div className="space-y-0.5">
                {pinnedPages.map((page) => {
                  const active = pathname === page.href;
                  return (
                    <div key={page.href} className="group/pin flex items-center">
                      <Link
                        href={page.href}
                        className={`flex flex-1 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                            : "text-[#9CA3AF] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
                        }`}
                      >
                        <Pin className="h-3 w-3 shrink-0 text-[#F59E0B]/50" />
                        <span className="truncate">{page.label}</span>
                      </Link>
                      <button
                        onClick={() => togglePin(page.href, page.label)}
                        className="mr-1 rounded p-1 text-[#6B7280] opacity-0 transition-all hover:text-[#EF4444] group-hover/pin:opacity-100"
                        title="Unpin"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 px-3 text-[10px] text-[#6B7280]">
                {pinnedPages.length}/5 pinned
              </p>
            </div>
          )}
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
        <header aria-label="Top bar" className="flex h-16 items-center gap-4 border-b border-[#2A2A2A] px-6">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center gap-[5px] rounded-lg p-2 text-[#9CA3AF] hover:bg-[#1A1A1A] hover:text-[#F5F5F5] md:hidden ${sidebarOpen ? "hamburger-open" : ""}`}
            aria-label="Toggle menu"
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <FocusTimer />
            <NotificationCenter />
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-sm text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#9CA3AF]"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] sm:inline">
                <Command className="inline h-2.5 w-2.5" />K
              </kbd>
            </button>
          </div>
        </header>

        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} pinnedPages={pinnedPages} onTogglePin={togglePin} />
        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} currentPath={pathname} />
        <WhatsNew />
        <KeyboardShortcutsHint />

        {/* Content */}
        <main id="main-content" aria-label="Page content" className="flex-1 overflow-y-auto p-6">{children}</main>
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
