"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  Bug,
  Timer,
  CalendarDays,
  CheckCheck,
  X,
} from "lucide-react";
import { getTasks, getBugs, getSprints, type Task, type Bug as BugType, type Sprint } from "@/lib/store";

interface Notification {
  id: string;
  type: "overdue" | "due-soon" | "critical-bug" | "sprint-ending";
  icon: typeof AlertTriangle;
  message: string;
  detail?: string;
  link: string;
  timestamp: number;
  sourceId: string;
}

const NOTIF_STORAGE_KEY = "gameforge_notifications_read";

function getReadIds(): Set<string> {
  try {
    const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify([...ids]));
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function generateNotifications(): Notification[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const nowMs = now.getTime();
  const twoDaysMs = 2 * 86400000;
  const notifications: Notification[] = [];

  const tasks = getTasks();
  tasks.forEach((task: Task) => {
    if (task.status === "done" || !task.dueDate) return;
    const due = new Date(task.dueDate + "T00:00:00");
    const diffMs = due.getTime() - nowMs;

    if (diffMs < 0) {
      const days = Math.abs(Math.round(diffMs / 86400000));
      notifications.push({
        id: `overdue_${task.id}`,
        type: "overdue",
        icon: AlertTriangle,
        message: `"${task.title}" is overdue by ${days} day${days !== 1 ? "s" : ""}`,
        link: `/dashboard/projects/${task.projectId}/tasks`,
        timestamp: due.getTime(),
        sourceId: task.id,
      });
    } else if (diffMs <= twoDaysMs) {
      const days = Math.round(diffMs / 86400000);
      const label = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      notifications.push({
        id: `duesoon_${task.id}`,
        type: "due-soon",
        icon: CalendarDays,
        message: `"${task.title}" is due ${label}`,
        link: `/dashboard/projects/${task.projectId}/tasks`,
        timestamp: Date.now() - diffMs,
        sourceId: task.id,
      });
    }
  });

  const bugs = getBugs();
  bugs.forEach((bug: BugType) => {
    if (bug.status === "closed") return;
    if (bug.severity === "blocker" || bug.severity === "critical") {
      notifications.push({
        id: `critbug_${bug.id}`,
        type: "critical-bug",
        icon: Bug,
        message: `${bug.severity === "blocker" ? "Blocker" : "Critical"} bug: "${bug.title}"`,
        detail: bug.status === "open" ? "Still open" : `Status: ${bug.status}`,
        link: `/dashboard/projects/${bug.projectId}/bugs`,
        timestamp: new Date(bug.created_at).getTime(),
        sourceId: bug.id,
      });
    }
  });

  const sprints = getSprints();
  sprints.forEach((sprint: Sprint) => {
    if (sprint.status !== "active") return;
    const end = new Date(sprint.endDate + "T00:00:00");
    const diffMs = end.getTime() - nowMs;
    if (diffMs >= 0 && diffMs <= twoDaysMs) {
      const days = Math.round(diffMs / 86400000);
      const label = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      notifications.push({
        id: `sprint_${sprint.id}`,
        type: "sprint-ending",
        icon: Timer,
        message: `"${sprint.name}" ends ${label}`,
        link: `/dashboard/projects/${sprint.projectId}/tasks`,
        timestamp: Date.now() - diffMs,
        sourceId: sprint.id,
      });
    }
  });

  notifications.sort((a, b) => {
    const priority: Record<Notification["type"], number> = {
      overdue: 0,
      "critical-bug": 1,
      "sprint-ending": 2,
      "due-soon": 3,
    };
    return priority[a.type] - priority[b.type];
  });

  return notifications;
}

const TYPE_STYLES: Record<Notification["type"], { bg: string; text: string; border: string }> = {
  overdue: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/20" },
  "due-soon": { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/20" },
  "critical-bug": { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/20" },
  "sprint-ending": { bg: "bg-[#8B5CF6]/10", text: "text-[#8B5CF6]", border: "border-[#8B5CF6]/20" },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const refresh = useCallback(() => {
    setNotifications(generateNotifications());
    setReadIds(getReadIds());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const allIds = new Set([...readIds, ...notifications.map((n) => n.id)]);
    setReadIds(allIds);
    saveReadIds(allIds);
  };

  const markRead = (id: string) => {
    const next = new Set([...readIds, id]);
    setReadIds(next);
    saveReadIds(next);
  };

  const handleClick = (notif: Notification) => {
    markRead(notif.id);
    router.push(notif.link);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen((p) => !p); if (!open) refresh(); }}
        className="relative flex items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-2.5 py-1.5 text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#9CA3AF]"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-[#9CA3AF]">Notifications</p>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#EF4444]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#EF4444]">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Bell className="mb-2 h-6 w-6 text-[#2A2A2A]" />
                <p className="text-xs text-[#6B7280]">All clear — no notifications</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notif) => {
                  const isRead = readIds.has(notif.id);
                  const style = TYPE_STYLES[notif.type];
                  const Icon = notif.icon;
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#222222] ${
                        !isRead ? "bg-[#F59E0B]/[0.03]" : ""
                      }`}
                    >
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${style.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-relaxed ${isRead ? "text-[#6B7280]" : "text-[#D1D5DB]"}`}>
                          {notif.message}
                        </p>
                        {notif.detail && (
                          <p className="mt-0.5 text-[10px] text-[#4B5563]">{notif.detail}</p>
                        )}
                        <p className="mt-1 text-[10px] text-[#4B5563]">{relativeTime(notif.timestamp)}</p>
                      </div>
                      {!isRead && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#F59E0B]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
