"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  FileText,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import {
  getProject,
  getChangelog,
  addChangelogEntry,
  deleteChangelogEntry,
  VERSION_TYPE_COLORS,
  CHANGE_CATEGORY_COLORS,
  type Project,
  type ChangelogEntry,
  type VersionType,
  type ChangeCategory,
} from "@/lib/store";

const VERSION_TYPES: VersionType[] = ["Major", "Minor", "Patch", "Hotfix"];
const CHANGE_CATEGORIES: ChangeCategory[] = ["Added", "Changed", "Fixed", "Removed", "Known Issues"];

export default function ChangelogPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);

  const [formVersion, setFormVersion] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formType, setFormType] = useState<VersionType>("Patch");
  const [formChanges, setFormChanges] = useState<Record<ChangeCategory, string>>({
    Added: "",
    Changed: "",
    Fixed: "",
    Removed: "",
    "Known Issues": "",
  });

  useEffect(() => {
    const p = getProject(projectId);
    setProject(p || null);
    const cl = getChangelog(projectId);
    setEntries(cl.sort((a, b) => b.date.localeCompare(a.date)));
    if (cl.length > 0) {
      setExpanded({ [cl.sort((a, b) => b.date.localeCompare(a.date))[0].id]: true });
    }
  }, [projectId]);

  if (!project) return null;

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleAdd() {
    if (!formVersion.trim() || !formTitle.trim()) return;

    const changes: Record<ChangeCategory, string[]> = {
      Added: [],
      Changed: [],
      Fixed: [],
      Removed: [],
      "Known Issues": [],
    };

    for (const cat of CHANGE_CATEGORIES) {
      changes[cat] = formChanges[cat]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    }

    const entry = addChangelogEntry({
      projectId,
      version: formVersion.trim(),
      title: formTitle.trim(),
      date: formDate,
      type: formType,
      changes,
    });

    setEntries((prev) => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setExpanded((prev) => ({ ...prev, [entry.id]: true }));
    setFormVersion("");
    setFormTitle("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormType("Patch");
    setFormChanges({ Added: "", Changed: "", Fixed: "", Removed: "", "Known Issues": "" });
    setShowForm(false);
  }

  function handleDelete(id: string) {
    deleteChangelogEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function exportMarkdown() {
    const lines: string[] = [`# ${project!.name} — Changelog\n`];

    for (const entry of entries) {
      lines.push(`## [${entry.version}] — ${entry.date}`);
      lines.push(`**${entry.title}** (${entry.type})\n`);

      for (const cat of CHANGE_CATEGORIES) {
        const items = entry.changes[cat];
        if (items && items.length > 0) {
          lines.push(`### ${cat}`);
          for (const item of items) {
            lines.push(`- ${item}`);
          }
          lines.push("");
        }
      }
      lines.push("---\n");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project!.name.toLowerCase().replace(/\s+/g, "-")}-changelog.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalChanges = entries.reduce((sum, e) => {
    return sum + CHANGE_CATEGORIES.reduce((s, cat) => s + (e.changes[cat]?.length || 0), 0);
  }, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
          {project.name}
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <FileText className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Changelog</h1>
              <p className="text-sm text-[#6B7280]">
                {entries.length} versions &middot; {totalChanges} changes tracked
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportMarkdown}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Download className="h-4 w-4" />
              Export .md
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#F59E0B]/90"
            >
              <Plus className="h-4 w-4" />
              New Version
            </button>
          </div>
        </div>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Version</h2>
              <button onClick={() => setShowForm(false)} className="text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-[#9CA3AF]">Version</label>
                  <input
                    type="text"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    placeholder="0.9.3-beta"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#9CA3AF]">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50 [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="What's the theme of this release?"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">Type</label>
                <div className="flex gap-2">
                  {VERSION_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setFormType(t)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: formType === t ? `${VERSION_TYPE_COLORS[t]}20` : "#0F0F0F",
                        color: formType === t ? VERSION_TYPE_COLORS[t] : "#9CA3AF",
                        border: `1px solid ${formType === t ? VERSION_TYPE_COLORS[t] + "40" : "#2A2A2A"}`,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[#9CA3AF]">Changes (one per line)</p>
                {CHANGE_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium" style={{ color: CHANGE_CATEGORY_COLORS[cat] }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHANGE_CATEGORY_COLORS[cat] }} />
                      {cat}
                    </label>
                    <textarea
                      value={formChanges[cat]}
                      onChange={(e) => setFormChanges((prev) => ({ ...prev, [cat]: e.target.value }))}
                      placeholder={`${cat} items...`}
                      rows={2}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleAdd}
                disabled={!formVersion.trim() || !formTitle.trim()}
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-40"
              >
                Publish Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Changelog Timeline */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-[#6B7280]" />
          <p className="mt-3 text-sm text-[#6B7280]">No changelog entries yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-[#F59E0B] hover:underline"
          >
            <Plus className="h-3 w-3" />
            Create your first version
          </button>
        </div>
      ) : (
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute bottom-0 left-[19px] top-0 w-px bg-[#2A2A2A]" />

          {entries.map((entry) => {
            const isOpen = expanded[entry.id];
            const nonEmptyCategories = CHANGE_CATEGORIES.filter(
              (cat) => entry.changes[cat] && entry.changes[cat].length > 0
            );
            const changeCount = nonEmptyCategories.reduce(
              (s, cat) => s + entry.changes[cat].length, 0
            );

            return (
              <div key={entry.id} className="relative pl-12">
                {/* Timeline dot */}
                <div
                  className="absolute left-3 top-5 h-3.5 w-3.5 rounded-full border-2 border-[#1A1A1A]"
                  style={{ backgroundColor: VERSION_TYPE_COLORS[entry.type] }}
                />

                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-colors hover:border-[#3A3A3A]">
                  {/* Version Header */}
                  <button
                    onClick={() => toggleExpanded(entry.id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[#F5F5F5]">
                        v{entry.version}
                      </span>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${VERSION_TYPE_COLORS[entry.type]}15`,
                          color: VERSION_TYPE_COLORS[entry.type],
                        }}
                      >
                        {entry.type}
                      </span>
                      <span className="hidden text-sm text-[#9CA3AF] sm:inline">
                        {entry.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#6B7280]">{entry.date}</span>
                      <span className="text-xs text-[#6B7280]">{changeCount} changes</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          className="rounded p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#EF4444]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-[#6B7280]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#6B7280]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Version Details */}
                  {isOpen && (
                    <div className="border-t border-[#2A2A2A] px-5 py-4">
                      <p className="mb-4 text-sm text-[#9CA3AF] sm:hidden">{entry.title}</p>
                      <div className="space-y-4">
                        {nonEmptyCategories.map((cat) => (
                          <div key={cat}>
                            <div className="mb-2 flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: CHANGE_CATEGORY_COLORS[cat] }}
                              />
                              <span
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: CHANGE_CATEGORY_COLORS[cat] }}
                              >
                                {cat}
                              </span>
                            </div>
                            <ul className="space-y-1.5 pl-4">
                              {entry.changes[cat].map((item, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-[#D1D5DB]"
                                >
                                  <span
                                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: CHANGE_CATEGORY_COLORS[cat] }}
                                  />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
