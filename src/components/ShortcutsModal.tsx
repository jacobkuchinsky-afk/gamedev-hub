"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { X, Keyboard, Search } from "lucide-react";

type ShortcutContext = "global" | "sprite" | "tilemap" | "tasks";

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  id: ShortcutContext;
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "global",
    title: "Global",
    shortcuts: [
      { keys: ["Ctrl", "+", "K"], description: "Open command palette" },
      { keys: ["Ctrl", "+", "P"], description: "Print" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["N"], description: "New project" },
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "P"], description: "Go to Projects" },
      { keys: ["G", "T"], description: "Go to Tools" },
      { keys: ["G", "L"], description: "Go to Devlog" },
      { keys: ["G", "S"], description: "Go to Settings" },
      { keys: ["G", "W"], description: "Quick launch last used tool" },
    ],
  },
  {
    id: "sprite",
    title: "Sprite Editor",
    shortcuts: [
      { keys: ["1", "\u2013", "9"], description: "Select color slot" },
      { keys: ["E"], description: "Eraser tool" },
      { keys: ["F"], description: "Fill tool" },
      { keys: ["G"], description: "Toggle grid" },
      { keys: ["M"], description: "Toggle mirror" },
    ],
  },
  {
    id: "tilemap",
    title: "Tilemap Painter",
    shortcuts: [
      { keys: ["1", "\u2013", "9"], description: "Select tile" },
      { keys: ["E"], description: "Eraser tool" },
      { keys: ["F"], description: "Fill tool" },
      { keys: ["G"], description: "Toggle grid" },
      { keys: ["S"], description: "Stamp tool" },
      { keys: ["Ctrl", "+", "Z"], description: "Undo" },
      { keys: ["Ctrl", "+", "Y"], description: "Redo" },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    shortcuts: [
      { keys: ["Delete"], description: "Remove selected task" },
      { keys: ["Escape"], description: "Deselect" },
    ],
  },
];

function detectContext(pathname: string): ShortcutContext {
  if (pathname.includes("/tools/sprites")) return "sprite";
  if (pathname.includes("/tools/tilemap")) return "tilemap";
  if (pathname.includes("/tasks")) return "tasks";
  return "global";
}

function KeyBadge({ keyLabel }: { keyLabel: string }) {
  if (keyLabel === "+" || keyLabel === "\u2013") {
    return <span className="text-xs text-[#6B7280]">{keyLabel}</span>;
  }
  return (
    <kbd className="min-w-[24px] rounded bg-[#0F0F0F] px-1.5 py-0.5 text-center text-[11px] font-medium text-[#D1D5DB] ring-1 ring-[#2A2A2A]">
      {keyLabel}
    </kbd>
  );
}

export default function ShortcutsModal({
  open,
  onClose,
  currentPath = "",
}: {
  open: boolean;
  onClose: () => void;
  currentPath?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const activeContext = detectContext(currentPath);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTimeout(() => searchRef.current?.focus(), 50);
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return SHORTCUT_GROUPS;
    const lq = query.toLowerCase();
    return SHORTCUT_GROUPS.map((group) => ({
      ...group,
      shortcuts: group.shortcuts.filter(
        (s) =>
          s.description.toLowerCase().includes(lq) ||
          s.keys.some((k) => k.toLowerCase().includes(lq))
      ),
    })).filter((g) => g.shortcuts.length > 0);
  }, [query]);

  const totalResults = filtered.reduce((sum, g) => sum + g.shortcuts.length, 0);

  if (!open) return null;

  const sortedGroups = [...filtered].sort((a, b) => {
    if (a.id === activeContext) return -1;
    if (b.id === activeContext) return 1;
    return 0;
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60" />
      <div
        ref={panelRef}
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-4 w-4 text-[#F59E0B]" />
            <h2 className="text-sm font-semibold text-[#F5F5F5]">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter shortcuts..."
            className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none"
          />
          {query && (
            <span className="text-[10px] text-[#6B7280]">
              {totalResults} match{totalResults !== 1 ? "es" : ""}
            </span>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4">
          {sortedGroups.length === 0 && (
            <p className="py-6 text-center text-sm text-[#6B7280]">
              No shortcuts matching &ldquo;{query}&rdquo;
            </p>
          )}

          {sortedGroups.map((group) => {
            const isActive = group.id === activeContext;
            return (
              <div
                key={group.id}
                className={`rounded-lg transition-colors ${
                  isActive ? "bg-[#F59E0B]/5 ring-1 ring-[#F59E0B]/20" : ""
                }`}
              >
                <div className={`flex items-center gap-2 px-3 pt-3 pb-2`}>
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isActive ? "text-[#F59E0B]" : "text-[#6B7280]"
                    }`}
                  >
                    {group.title}
                  </p>
                  {isActive && (
                    <span className="rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#F59E0B]">
                      Current
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 px-1 pb-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[#0F0F0F]"
                    >
                      <span className="text-[#9CA3AF]">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <KeyBadge key={i} keyLabel={key} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#2A2A2A] px-5 py-3">
          <p className="text-center text-[11px] text-[#6B7280]">
            Press{" "}
            <kbd className="rounded bg-[#0F0F0F] px-1 py-0.5 text-[10px] ring-1 ring-[#2A2A2A]">
              ?
            </kbd>{" "}
            or{" "}
            <kbd className="rounded bg-[#0F0F0F] px-1 py-0.5 text-[10px] ring-1 ring-[#2A2A2A]">
              Esc
            </kbd>{" "}
            to close
          </p>
        </div>
      </div>
    </div>
  );
}
