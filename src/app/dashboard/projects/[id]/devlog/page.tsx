"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  Sun,
  Cloud,
  Star,
  Cog,
} from "lucide-react";
import {
  getProject,
  getDevlog,
  addDevlogEntry,
  getMoodEmoji,
  type Project,
  type DevlogEntry,
} from "@/lib/store";

const MOODS: {
  key: DevlogEntry["mood"];
  label: string;
  icon: typeof Sun;
  color: string;
}[] = [
  { key: "productive", label: "Productive", icon: Sun, color: "#10B981" },
  { key: "struggling", label: "Struggling", icon: Cloud, color: "#EF4444" },
  { key: "breakthrough", label: "Breakthrough", icon: Star, color: "#F59E0B" },
  { key: "grinding", label: "Grinding", icon: Cog, color: "#9CA3AF" },
];

export default function DevlogPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<DevlogEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newMood, setNewMood] = useState<DevlogEntry["mood"]>("productive");

  const reload = useCallback(() => {
    const e = getDevlog(projectId);
    setEntries(
      [...e].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    );
  }, [projectId]);

  useEffect(() => {
    console.log("[DevlogPage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    addDevlogEntry({
      projectId,
      title: newTitle.trim(),
      content: newContent.trim(),
      mood: newMood,
      date: new Date().toISOString().split("T")[0],
    });
    console.log("[DevlogPage] entry added");
    setNewTitle("");
    setNewContent("");
    setNewMood("productive");
    setShowAddForm(false);
    reload();
  };

  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      let processed = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#F5F5F5] font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-[#D1D5DB]">$1</em>')
        .replace(/`(.*?)`/g, '<code class="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-xs text-[#F59E0B]">$1</code>');

      return (
        <p
          key={i}
          className="text-sm leading-relaxed text-[#D1D5DB]"
          dangerouslySetInnerHTML={{ __html: processed || "&nbsp;" }}
        />
      );
    });
  };

  if (!project) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
          {project.name}
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Development Log</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
          >
            <Plus className="h-4 w-4" />
            Write Entry
          </button>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Devlog Entry</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Entry title"
                required
                autoFocus
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />

              {/* Mood Selector */}
              <div>
                <label className="mb-2 block text-xs text-[#6B7280]">
                  How&apos;s it going?
                </label>
                <div className="flex gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood.key}
                      type="button"
                      onClick={() => setNewMood(mood.key)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                        newMood === mood.key
                          ? "border-[#F59E0B] bg-[#F59E0B]/5"
                          : "border-[#2A2A2A] hover:border-[#6B7280]"
                      }`}
                    >
                      <mood.icon
                        className="h-5 w-5"
                        style={{ color: mood.color }}
                      />
                      <span className="text-xs text-[#9CA3AF]">
                        {mood.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What happened today? Use **bold**, *italic*, `code`..."
                required
                rows={6}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
              />

              <button
                type="submit"
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90"
              >
                Publish Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16">
          <Star className="h-10 w-10 text-[#6B7280]" />
          <p className="mt-3 text-sm text-[#9CA3AF]">No devlog entries yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 flex items-center gap-1.5 text-sm text-[#F59E0B] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Write your first entry
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#2A2A2A]" />

          <div className="space-y-6">
            {entries.map((entry) => {
              const mood = MOODS.find((m) => m.key === entry.mood);
              const MoodIcon = mood?.icon || Sun;
              return (
                <div key={entry.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div
                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#2A2A2A] bg-[#1A1A1A]"
                  >
                    <MoodIcon
                      className="h-4 w-4"
                      style={{ color: mood?.color }}
                    />
                  </div>

                  {/* Entry card */}
                  <div className="flex-1 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-[#F5F5F5]">
                          {entry.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#6B7280]">
                          {new Date(entry.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="text-lg" title={mood?.label}>
                        {getMoodEmoji(entry.mood)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {renderContent(entry.content)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
