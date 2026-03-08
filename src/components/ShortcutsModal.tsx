"use client";

import { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Tool Pages",
    shortcuts: [
      { keys: ["1", "-", "9"], description: "Select tile / color slot" },
      { keys: ["E"], description: "Eraser tool" },
      { keys: ["F"], description: "Fill tool" },
      { keys: ["G"], description: "Toggle grid" },
    ],
  },
];

export default function ShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60" />
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl"
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

        <div className="p-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                {group.title}
              </p>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[#0F0F0F]"
                  >
                    <span className="text-[#9CA3AF]">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) =>
                        key === "+" || key === "-" ? (
                          <span
                            key={i}
                            className="text-xs text-[#6B7280]"
                          >
                            {key === "-" ? "\u2013" : "+"}
                          </span>
                        ) : (
                          <kbd
                            key={i}
                            className="min-w-[24px] rounded bg-[#0F0F0F] px-1.5 py-0.5 text-center text-[11px] font-medium text-[#D1D5DB] ring-1 ring-[#2A2A2A]"
                          >
                            {key}
                          </kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#2A2A2A] px-5 py-3">
          <p className="text-center text-[11px] text-[#6B7280]">
            Press <kbd className="rounded bg-[#0F0F0F] px-1 py-0.5 text-[10px] ring-1 ring-[#2A2A2A]">?</kbd> or{" "}
            <kbd className="rounded bg-[#0F0F0F] px-1 py-0.5 text-[10px] ring-1 ring-[#2A2A2A]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
