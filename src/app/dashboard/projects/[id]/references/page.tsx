"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  ExternalLink,
  Trash2,
  Link as LinkIcon,
  X,
  Image,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Loader2,
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
import Breadcrumbs from "@/components/Breadcrumbs";

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
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState<ReferenceCategory>("Art");
  const [formNotes, setFormNotes] = useState("");
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAiSuggestions = async () => {
    if (!project) return;
    setAiLoading(true);
    try {
      const prompt = `Suggest 5 game references for a ${project.genre || "general"} game described as: '${project.description || project.name}'. For each, provide: game title, what to study from it (art style, gameplay mechanic, etc.), and a category (Art, Gameplay, UI, Audio, Story). Format as JSON array of objects: [{title, studyFocus, category}].`;
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 256,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return;
      const suggestions: { title: string; studyFocus: string; category: string }[] = JSON.parse(jsonMatch[0]);
      for (const s of suggestions) {
        const cat = CATEGORIES.includes(s.category as ReferenceCategory)
          ? (s.category as ReferenceCategory)
          : "Art";
        const ref = addReference({
          projectId,
          title: s.title,
          url: `https://www.google.com/search?q=${encodeURIComponent(s.title + " game")}`,
          category: cat,
          notes: s.studyFocus,
          colorLabel: COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)],
        });
        setReferences((prev) => [...prev, ref]);
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  };

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

  function moveReference(id: string, direction: "up" | "down") {
    setReferences((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function toggleNoteExpand(id: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "Open link";
    }
  }

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = references.filter((r) => r.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "References" },
          ]}
        />
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
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAiSuggestions}
              disabled={aiLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20 disabled:opacity-50"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiLoading ? "Suggesting..." : "AI Suggest"}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#F59E0B]/90"
            >
              <Plus className="h-4 w-4" />
              Add Reference
            </button>
          </div>
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
                ? ""
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ref) => {
            const isExpanded = expandedNotes.has(ref.id);
            const hasLongNotes = ref.notes.length > 50;
            const domain = extractDomain(ref.url);

            return (
              <div
                key={ref.id}
                className="group rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-colors hover:border-[#3A3A3A] overflow-hidden flex"
              >
                {/* Color label strip */}
                <div
                  className="w-1.5 shrink-0"
                  style={{ backgroundColor: ref.colorLabel }}
                />

                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug">{ref.title}</h3>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Reorder buttons */}
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveReference(ref.id, "up")}
                          className="p-0.5 text-[#6B7280] hover:text-[#F59E0B] transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveReference(ref.id, "down")}
                          className="p-0.5 text-[#6B7280] hover:text-[#F59E0B] transition-colors"
                          title="Move down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleDelete(ref.id)}
                        className="shrink-0 rounded p-1 text-[#6B7280] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#2A2A2A] hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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

                  {/* Notes with preview/expand */}
                  {ref.notes && (
                    <div className="mt-3">
                      <p className="text-xs leading-relaxed text-[#9CA3AF]">
                        {isExpanded || !hasLongNotes
                          ? ref.notes
                          : ref.notes.slice(0, 50) + "..."}
                      </p>
                      {hasLongNotes && (
                        <button
                          onClick={() => toggleNoteExpand(ref.id)}
                          className="mt-1 text-[10px] text-[#F59E0B] hover:underline"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* URL with colored dot + domain */}
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ref.colorLabel }}
                    />
                    <span className="truncate max-w-[180px]">{domain}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
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
