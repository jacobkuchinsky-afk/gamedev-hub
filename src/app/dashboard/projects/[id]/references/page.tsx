"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  ExternalLink,
  Trash2,
  Link as LinkIcon,
  X,
  Image,
} from "lucide-react";
import {
  getProject,
  getReferences,
  addReference,
  deleteReference,
  REFERENCE_CATEGORY_COLORS,
  type Project,
  type Reference,
  type ReferenceCategory,
} from "@/lib/store";

const CATEGORIES: ReferenceCategory[] = ["Art", "Gameplay", "UI", "Audio", "Story", "Marketing"];

const COLOR_OPTIONS = ["#F59E0B", "#3B82F6", "#EC4899", "#10B981", "#8B5CF6", "#F97316", "#EF4444", "#06B6D4"];

export default function ReferenceBoardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [filterCategory, setFilterCategory] = useState<ReferenceCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [quickUrl, setQuickUrl] = useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState<ReferenceCategory>("Art");
  const [formNotes, setFormNotes] = useState("");
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    const p = getProject(projectId);
    setProject(p || null);
    setReferences(getReferences(projectId));
  }, [projectId]);

  if (!project) return null;

  const filtered = filterCategory === "all"
    ? references
    : references.filter((r) => r.category === filterCategory);

  function handleAdd() {
    if (!formTitle.trim() || !formUrl.trim()) return;
    const ref = addReference({
      projectId,
      title: formTitle.trim(),
      url: formUrl.trim(),
      category: formCategory,
      notes: formNotes.trim(),
      colorLabel: formColor,
    });
    setReferences((prev) => [...prev, ref]);
    setFormTitle("");
    setFormUrl("");
    setFormCategory("Art");
    setFormNotes("");
    setFormColor(COLOR_OPTIONS[0]);
    setShowForm(false);
  }

  function handleQuickAdd() {
    if (!quickUrl.trim()) return;
    let title = quickUrl.trim();
    try {
      const u = new URL(quickUrl.trim());
      title = u.hostname.replace("www.", "");
    } catch {}
    const ref = addReference({
      projectId,
      title,
      url: quickUrl.trim(),
      category: "Art",
      notes: "",
      colorLabel: COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)],
    });
    setReferences((prev) => [...prev, ref]);
    setQuickUrl("");
  }

  function handleDelete(id: string) {
    deleteReference(id);
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = references.filter((r) => r.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
              <Image className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reference Board</h1>
              <p className="text-sm text-[#6B7280]">{references.length} references collected</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#F59E0B]/90"
          >
            <Plus className="h-4 w-4" />
            Add Reference
          </button>
        </div>
      </div>

      {/* Quick Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Paste a URL to quick-add a reference..."
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
          />
        </div>
        <button
          onClick={handleQuickAdd}
          className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
        >
          Add
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filterCategory === "all"
              ? "bg-[#F59E0B]/10 text-[#F59E0B]"
              : "bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#F5F5F5]"
          }`}
        >
          All ({references.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterCategory === cat
                ? `text-[${REFERENCE_CATEGORY_COLORS[cat]}]`
                : "bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#F5F5F5]"
            }`}
            style={
              filterCategory === cat
                ? { backgroundColor: `${REFERENCE_CATEGORY_COLORS[cat]}15`, color: REFERENCE_CATEGORY_COLORS[cat] }
                : undefined
            }
          >
            {cat} ({categoryCounts[cat] || 0})
          </button>
        ))}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Reference</h2>
              <button onClick={() => setShowForm(false)} className="text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="FTL Art Style Reference"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">URL</label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFormCategory(cat)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: formCategory === cat ? `${REFERENCE_CATEGORY_COLORS[cat]}20` : "#0F0F0F",
                        color: formCategory === cat ? REFERENCE_CATEGORY_COLORS[cat] : "#9CA3AF",
                        border: `1px solid ${formCategory === cat ? REFERENCE_CATEGORY_COLORS[cat] + "40" : "#2A2A2A"}`,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="What to focus on, why this is relevant..."
                  rows={3}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#9CA3AF]">Color Label</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFormColor(c)}
                      className="h-6 w-6 rounded-full transition-transform"
                      style={{
                        backgroundColor: c,
                        transform: formColor === c ? "scale(1.3)" : "scale(1)",
                        boxShadow: formColor === c ? `0 0 0 2px #0F0F0F, 0 0 0 4px ${c}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={!formTitle.trim() || !formUrl.trim()}
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-40"
              >
                Add Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16 text-center">
          <Image className="mx-auto h-10 w-10 text-[#6B7280]" />
          <p className="mt-3 text-sm text-[#6B7280]">
            {filterCategory === "all" ? "No references yet" : `No ${filterCategory} references`}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-[#F59E0B] hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add your first reference
          </button>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {filtered.map((ref, i) => {
            const hasLongNotes = ref.notes.length > 80;
            return (
              <div
                key={ref.id}
                className="mb-4 break-inside-avoid rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-colors hover:border-[#3A3A3A]"
                style={{ borderTopColor: ref.colorLabel, borderTopWidth: "3px" }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug">{ref.title}</h3>
                    <button
                      onClick={() => handleDelete(ref.id)}
                      className="shrink-0 rounded p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span
                    className="mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${REFERENCE_CATEGORY_COLORS[ref.category]}15`,
                      color: REFERENCE_CATEGORY_COLORS[ref.category],
                    }}
                  >
                    {ref.category}
                  </span>

                  {ref.notes && (
                    <p className={`mt-3 text-xs leading-relaxed text-[#9CA3AF] ${hasLongNotes ? "" : ""}`}>
                      {ref.notes}
                    </p>
                  )}

                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-[#F59E0B] transition-colors hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {(() => {
                      try { return new URL(ref.url).hostname.replace("www.", ""); } catch { return "Open link"; }
                    })()}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
