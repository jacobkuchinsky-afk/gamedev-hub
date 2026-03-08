"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Globe, Timer, Download, Keyboard, BarChart3, Bug } from "lucide-react";

const CURRENT_VERSION = "2.0.0";
const STORAGE_KEY = "gameforge_changelog_version";

const HIGHLIGHTS = [
  { icon: Sparkles, text: "200+ AI features across every tool" },
  { icon: Globe, text: "23 game dev tools" },
  { icon: BarChart3, text: "Sprint tracking and productivity analytics" },
  { icon: Timer, text: "Focus Timer / Pomodoro in the header" },
  { icon: Download, text: "Full project export (JSON + Markdown)" },
  { icon: Keyboard, text: "Keyboard shortcuts (press ? for help)" },
  { icon: Bug, text: "Weekly productivity summary on dashboard" },
];

export default function WhatsNew() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center" onClick={dismiss}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-[#2A2A2A] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10">
              <Sparkles className="h-4.5 w-4.5 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F5F5]">
                What&apos;s New in GameForge {CURRENT_VERSION}
              </h2>
              <p className="text-xs text-[#6B7280]">Latest updates and improvements</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F59E0B]/8">
                  <item.icon className="h-3.5 w-3.5 text-[#F59E0B]" />
                </div>
                <span className="text-sm leading-relaxed text-[#D1D5DB]">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[#2A2A2A] px-6 py-4">
          <button
            onClick={dismiss}
            className="w-full rounded-xl bg-[#F59E0B] py-2.5 text-sm font-semibold text-[#0F0F0F] transition-colors hover:bg-[#D97706]"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
