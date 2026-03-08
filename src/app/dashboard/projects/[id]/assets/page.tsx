"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  X,
  LayoutGrid,
  List,
  Columns3,
  ChevronDown,
  ChevronRight,
  User,
  FileText,
  StickyNote,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Search,
  Image as ImageIcon,
  Box,
  Film,
  Music,
  Monitor,
  Map,
  Sparkles,
  Loader2,
  FolderOpen,
  GitBranch,
  Clock,
  ChevronUp,
  Download,
  Printer,
} from "lucide-react";
import {
  getProject,
  getAssets,
  addAsset,
  updateAsset,
  swapAssetOrder,
  bumpAssetVersion,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  ASSET_STATUS_LABELS,
  ASSET_FOLDERS,
  ASSET_FOLDER_COLORS,
  TYPE_TO_DEFAULT_FOLDER,
  getPriorityColor,
  type Project,
  type GameAsset,
  type AssetType,
  type AssetStatus,
  type AssetFolder,
  type AssetVersionEntry,
} from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

const PIPELINE_COLUMNS: { key: AssetStatus; label: string; color: string }[] = [
  { key: "concept", label: "Concept", color: "#9CA3AF" },
  { key: "wip", label: "WIP", color: "#F59E0B" },
  { key: "review", label: "Review", color: "#8B5CF6" },
  { key: "approved", label: "Approved", color: "#3B82F6" },
  { key: "integrated", label: "Integrated", color: "#10B981" },
];

const ASSET_TYPES: AssetType[] = ["sprite", "model", "animation", "audio", "ui", "level", "vfx"];
const PRIORITIES: GameAsset["priority"][] = ["critical", "high", "medium", "low"];

const ASSET_TYPE_ICONS: Record<AssetType, React.ElementType> = {
  sprite: ImageIcon,
  model: Box,
  animation: Film,
  audio: Music,
  ui: Monitor,
  level: Map,
  vfx: Sparkles,
};

type ViewMode = "kanban" | "list" | "grid" | "folders";

export default function AssetPipelinePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<GameAsset[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<GameAsset | null>(null);
  const [filterType, setFilterType] = useState<AssetType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AssetStatus | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<AssetFolder>>(new Set());

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AssetType>("sprite");
  const [newAssignee, setNewAssignee] = useState("JacobK");
  const [newPriority, setNewPriority] = useState<GameAsset["priority"]>("medium");
  const [newNotes, setNewNotes] = useState("");
  const [newFileRef, setNewFileRef] = useState("");
  const [newFolder, setNewFolder] = useState<AssetFolder>(TYPE_TO_DEFAULT_FOLDER["sprite"]);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiFileNameLoading, setAiFileNameLoading] = useState(false);
  const [aiFileName, setAiFileName] = useState("");
  const [aiPriorityLoading, setAiPriorityLoading] = useState<string | null>(null);
  const [aiPriorities, setAiPriorities] = useState<Record<string, string>>({});
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [bumpNotes, setBumpNotes] = useState("");
  const [aiStatusLoading, setAiStatusLoading] = useState(false);
  const [aiStatusResult, setAiStatusResult] = useState("");

  const reload = useCallback(() => {
    console.log("[AssetPipelinePage] reloading assets for", projectId);
    setAssets(getAssets(projectId));
  }, [projectId]);

  useEffect(() => {
    console.log("[AssetPipelinePage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const assignees = useMemo(() => {
    const set = new Set(assets.map((a) => a.assignee));
    return Array.from(set);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (filterType !== "all") result = result.filter((a) => a.type === filterType);
    if (filterStatus !== "all") result = result.filter((a) => a.status === filterStatus);
    if (filterAssignee !== "all") result = result.filter((a) => a.assignee === filterAssignee);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((a) => {
        const typeLabel = ASSET_TYPE_LABELS[a.type]?.toLowerCase() || "";
        const statusLabel = ASSET_STATUS_LABELS[a.status]?.toLowerCase() || "";
        const folder = (a.folder || TYPE_TO_DEFAULT_FOLDER[a.type] || "").toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.notes.toLowerCase().includes(q) ||
          typeLabel.includes(q) ||
          statusLabel.includes(q) ||
          folder.includes(q) ||
          a.assignee.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [assets, filterType, filterStatus, filterAssignee, debouncedSearch]);

  const stats = useMemo(() => {
    const byStatus: Record<AssetStatus, number> = { concept: 0, wip: 0, review: 0, approved: 0, integrated: 0 };
    const byType: Partial<Record<AssetType, number>> = {};
    assets.forEach((a) => {
      byStatus[a.status]++;
      byType[a.type] = (byType[a.type] || 0) + 1;
    });
    const total = assets.length;
    const completed = byStatus.integrated;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const SIZE_EST: Record<AssetType, number> = { sprite: 2, model: 15, animation: 5, audio: 3, ui: 1, level: 25, vfx: 8 };
    let estSizeMB = 0;
    for (const [type, count] of Object.entries(byType)) {
      estSizeMB += (count || 0) * (SIZE_EST[type as AssetType] || 5);
    }
    return { byStatus, byType, total, completed, pct, estSizeMB };
  }, [assets]);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    console.log("[AssetPipelinePage] adding asset:", newName);
    addAsset({
      projectId,
      name: newName.trim(),
      type: newType,
      status: "concept",
      assignee: newAssignee,
      priority: newPriority,
      fileRef: newFileRef,
      notes: newNotes,
      folder: newFolder,
    });
    setNewName("");
    setNewNotes("");
    setNewFileRef("");
    setNewPriority("medium");
    setShowAddForm(false);
    setAiSuggestion("");
    reload();
  };

  const handleAiFileName = async () => {
    if (!newName.trim() || aiFileNameLoading) return;
    setAiFileNameLoading(true);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Suggest a file name for a game asset: name='${newName.trim()}', type='${newType}'. Use snake_case. Just the filename.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim().replace(/^["']|["']$/g, "");
      if (content) { setAiFileName(content); setNewFileRef(content); }
    } catch { /* silently fail */ }
    finally { setAiFileNameLoading(false); }
  };

  const handleAiSuggest = async () => {
    if (!newName.trim()) return;
    setAiSuggestLoading(true);
    setAiSuggestion("");
    try {
      const prompt = `I'm organizing assets for a game. I have an asset: name='${newName.trim()}', type='${newType}'. Suggest: a good file naming convention, recommended format (e.g., PNG for sprites, WAV for sounds), and one organizational tip. Be brief (3 lines max).`;
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
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      setAiSuggestion(content || "No suggestion available.");
    } catch {
      setAiSuggestion("Failed to get suggestion. Try again.");
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const handleAiAssetPriority = async (asset: typeof assets[0]) => {
    if (aiPriorityLoading) return;
    setAiPriorityLoading(asset.id);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Should asset '${asset.name}' (${asset.type}) be priority: low/medium/high/critical? Just the word.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
      });
      const data = await response.json();
      setAiPriorities((prev) => ({ ...prev, [asset.id]: (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim() }));
    } catch { /* silently fail */ }
    finally { setAiPriorityLoading(null); }
  };

  const handleAiDescribe = async () => {
    if (!newName.trim()) return;
    setAiDescLoading(true);
    try {
      const prompt = `Write a brief asset description for a game asset named '${newName.trim()}' of type '${ASSET_TYPE_LABELS[newType]}'. 1-2 sentences about its purpose and usage.`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      if (content) setNewNotes(content.trim());
    } catch { /* silently fail */ }
    finally { setAiDescLoading(false); }
  };

  const handleAiStatusSuggest = async () => {
    if (!newName.trim() || aiStatusLoading) return;
    setAiStatusLoading(true);
    setAiStatusResult("");
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `What status should asset '${newName.trim()}' (${ASSET_TYPE_LABELS[newType]}) be: concept/in-progress/review/approved/integrated? Just the status.` }], stream: false, max_tokens: 32, temperature: 0.7 }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim().toLowerCase();
      const statusMap: Record<string, AssetStatus> = { concept: "concept", "in-progress": "wip", wip: "wip", review: "review", approved: "approved", integrated: "integrated" };
      const matched = Object.entries(statusMap).find(([k]) => content.includes(k));
      setAiStatusResult(matched ? `Suggested: ${ASSET_STATUS_LABELS[matched[1]]}` : content);
    } catch { /* silently fail */ }
    finally { setAiStatusLoading(false); }
  };

  const moveAsset = (assetId: string, newStatus: AssetStatus) => {
    console.log("[AssetPipelinePage] moving asset", assetId, "to", newStatus);
    updateAsset(assetId, { status: newStatus });
    reload();
    if (selectedAsset?.id === assetId) {
      setSelectedAsset({ ...selectedAsset, status: newStatus });
    }
  };

  const toggleFolder = (folder: AssetFolder) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const handleReorder = (folderAssets: GameAsset[], idx: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= folderAssets.length) return;
    swapAssetOrder(folderAssets[idx].id, folderAssets[swapIdx].id);
    reload();
  };

  const handleMoveToFolder = (assetId: string, folder: AssetFolder) => {
    updateAsset(assetId, { folder });
    reload();
    if (selectedAsset?.id === assetId) {
      setSelectedAsset({ ...selectedAsset, folder });
    }
  };

  const handleBumpVersion = (assetId: string) => {
    const notes = bumpNotes.trim() || "Version bump";
    const updated = bumpAssetVersion(assetId, notes);
    if (updated) {
      setSelectedAsset(updated);
      setBumpNotes("");
    }
    reload();
  };

  const highlightMatch = useCallback((text: string) => {
    if (!debouncedSearch.trim()) return text;
    const q = debouncedSearch.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="rounded-sm bg-[#F59E0B]/25 text-[#F59E0B]">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }, [debouncedSearch]);

  if (!project) return null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "Assets" },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Asset Pipeline</h1>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
              {([
                { key: "kanban" as ViewMode, icon: Columns3, label: "Kanban" },
                { key: "list" as ViewMode, icon: List, label: "List" },
                { key: "grid" as ViewMode, icon: LayoutGrid, label: "Grid" },
                { key: "folders" as ViewMode, icon: FolderOpen, label: "Folders" },
              ]).map((v) => (
                <button
                  key={v.key}
                  onClick={() => {
                    console.log("[AssetPipelinePage] view mode:", v.key);
                    setViewMode(v.key);
                  }}
                  title={v.label}
                  className={`px-3 py-2 text-sm transition-colors ${
                    viewMode === v.key
                      ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "text-[#6B7280] hover:text-[#9CA3AF]"
                  }`}
                >
                  <v.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            {assets.length > 0 && (
              <button
                onClick={() => {
                  const escCsv = (v: string) => {
                    if (v.includes(",") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
                    return v;
                  };
                  const rows = [["Name", "Type", "Status", "Folder", "Version", "File Reference", "Notes"].join(",")];
                  assets.forEach((a) => {
                    rows.push([
                      escCsv(a.name),
                      escCsv(ASSET_TYPE_LABELS[a.type] || a.type),
                      escCsv(ASSET_STATUS_LABELS[a.status] || a.status),
                      escCsv(a.folder || TYPE_TO_DEFAULT_FOLDER[a.type] || ""),
                      String(a.version || 1),
                      escCsv(a.fileRef || ""),
                      escCsv(a.notes || ""),
                    ].join(","));
                  });
                  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const el = document.createElement("a");
                  el.href = url;
                  el.download = `${(project.name || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-assets.csv`;
                  el.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
            >
              <Plus className="h-4 w-4" />
              Add Asset
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Total Assets</p>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-2xl font-bold text-[#10B981]">{stats.completed}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Integrated</p>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <p className="text-2xl font-bold text-[#F59E0B]">~{stats.estSizeMB >= 1000 ? `${(stats.estSizeMB / 1000).toFixed(1)} GB` : `${stats.estSizeMB} MB`}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Est. Total Size</p>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.byType).map(([type, count]) => (
              <span
                key={type}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `${ASSET_TYPE_COLORS[type as AssetType]}15`,
                  color: ASSET_TYPE_COLORS[type as AssetType],
                }}
              >
                {count} {ASSET_TYPE_LABELS[type as AssetType]}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-[#9CA3AF]">By Type</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Pipeline Progress</span>
          <span className="text-sm text-[#9CA3AF]">
            {stats.completed}/{stats.total} integrated ({stats.pct}%)
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-[#2A2A2A]">
          {PIPELINE_COLUMNS.map((col) => {
            const count = stats.byStatus[col.key];
            const width = stats.total > 0 ? (count / stats.total) * 100 : 0;
            if (width === 0) return null;
            return (
              <div
                key={col.key}
                title={`${col.label}: ${count}`}
                className="transition-all duration-300"
                style={{ width: `${width}%`, backgroundColor: col.color }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {PIPELINE_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-xs text-[#9CA3AF]">
                {col.label}: {stats.byStatus[col.key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, type, status, folder..."
            className={`w-full rounded-lg border bg-[#1A1A1A] py-2 pl-9 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none ${
              debouncedSearch.trim() ? "border-[#F59E0B]/40 pr-16" : "border-[#2A2A2A] pr-3"
            } focus:border-[#F59E0B]/50`}
          />
          {debouncedSearch.trim() && (
            <>
              <span className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                {filteredAssets.length}
              </span>
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#6B7280] hover:text-[#F5F5F5]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AssetType | "all")}
            className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-3 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
          >
            <option value="all">All Types</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AssetStatus | "all")}
            className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-3 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
          >
            <option value="all">All Stages</option>
            {PIPELINE_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
        </div>
        {assignees.length > 1 && (
          <div className="relative">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="appearance-none rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-3 pr-8 text-sm text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
            >
              <option value="all">All Assignees</option>
              {assignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          </div>
        )}
      </div>

      {/* ─── KANBAN VIEW ─── */}
      {viewMode === "kanban" && (
        <div className="grid gap-4 lg:grid-cols-5">
          {PIPELINE_COLUMNS.map((column) => {
            const columnAssets = filteredAssets.filter((a) => a.status === column.key);
            return (
              <div key={column.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                  <span className="text-sm font-semibold">{column.label}</span>
                  <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#9CA3AF]">
                    {columnAssets.length}
                  </span>
                </div>
                <div className="min-h-[200px] space-y-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]/50 p-2">
                  {columnAssets.map((asset) => {
                    const TypeIcon = ASSET_TYPE_ICONS[asset.type];
                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          console.log("[AssetPipelinePage] selected asset:", asset.name);
                          setSelectedAsset(asset);
                        }}
                        className="cursor-pointer rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3 transition-all hover:border-[#F59E0B]/20"
                      >
                        <div className="flex items-start gap-2">
                          <TypeIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ASSET_TYPE_COLORS[asset.type] }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight truncate">{highlightMatch(asset.name)}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${ASSET_TYPE_COLORS[asset.type]}15`,
                                  color: ASSET_TYPE_COLORS[asset.type],
                                }}
                              >
                                {ASSET_TYPE_LABELS[asset.type]}
                              </span>
                              <span
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${getPriorityColor(asset.priority)}15`,
                                  color: getPriorityColor(asset.priority),
                                }}
                              >
                                {asset.priority}
                              </span>
                              {asset.version && (
                                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#F59E0B]/10 text-[#F59E0B]">
                                  v{asset.version}
                                </span>
                              )}
                            </div>
                            {asset.assignee && (
                              <div className="mt-1.5 flex items-center gap-1 text-xs text-[#6B7280]">
                                <User className="h-3 w-3" />
                                {asset.assignee}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <button onClick={(e) => { e.stopPropagation(); handleAiAssetPriority(asset); }} disabled={aiPriorityLoading === asset.id} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-40">
                                {aiPriorityLoading === asset.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                Priority
                              </button>
                              {aiPriorities[asset.id] && <span className="text-[10px] text-[#F59E0B]/80">{aiPriorities[asset.id]}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {columnAssets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-xs text-[#6B7280]">No assets</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── LIST VIEW ─── */}
      {viewMode === "list" && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-left text-xs text-[#6B7280]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {filteredAssets.map((asset) => {
                const TypeIcon = ASSET_TYPE_ICONS[asset.type];
                const statusCol = PIPELINE_COLUMNS.find((c) => c.key === asset.status);
                return (
                  <tr
                    key={asset.id}
                    onClick={() => {
                      console.log("[AssetPipelinePage] list click:", asset.name);
                      setSelectedAsset(asset);
                    }}
                    className="cursor-pointer transition-colors hover:bg-[#1F1F1F]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 shrink-0" style={{ color: ASSET_TYPE_COLORS[asset.type] }} />
                        <span className="text-sm font-medium">{highlightMatch(asset.name)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${ASSET_TYPE_COLORS[asset.type]}15`,
                          color: ASSET_TYPE_COLORS[asset.type],
                        }}
                      >
                        {ASSET_TYPE_LABELS[asset.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${statusCol?.color || "#9CA3AF"}15`,
                          color: statusCol?.color || "#9CA3AF",
                        }}
                      >
                        {ASSET_STATUS_LABELS[asset.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${getPriorityColor(asset.priority)}15`,
                          color: getPriorityColor(asset.priority),
                        }}
                      >
                        {asset.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#9CA3AF]">{asset.assignee}</span>
                    </td>
                    <td className="px-4 py-3">
                      {asset.version ? (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B]">
                          v{asset.version}
                        </span>
                      ) : (
                        <span className="text-xs text-[#6B7280]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="max-w-[150px] truncate block text-xs text-[#6B7280] font-mono">
                        {asset.fileRef || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredAssets.length === 0 && (
            <div className="py-12 text-center text-sm text-[#6B7280]">No assets match filters</div>
          )}
        </div>
      )}

      {/* ─── GRID VIEW ─── */}
      {viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAssets.map((asset) => {
            const TypeIcon = ASSET_TYPE_ICONS[asset.type];
            const statusCol = PIPELINE_COLUMNS.find((c) => c.key === asset.status);
            return (
              <div
                key={asset.id}
                onClick={() => {
                  console.log("[AssetPipelinePage] grid click:", asset.name);
                  setSelectedAsset(asset);
                }}
                className="cursor-pointer rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden transition-all hover:border-[#F59E0B]/20"
              >
                <div
                  className="flex h-28 items-center justify-center"
                  style={{ backgroundColor: `${ASSET_TYPE_COLORS[asset.type]}08` }}
                >
                  <TypeIcon className="h-10 w-10" style={{ color: `${ASSET_TYPE_COLORS[asset.type]}60` }} />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate">{highlightMatch(asset.name)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${ASSET_TYPE_COLORS[asset.type]}15`,
                        color: ASSET_TYPE_COLORS[asset.type],
                      }}
                    >
                      {ASSET_TYPE_LABELS[asset.type]}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${statusCol?.color || "#9CA3AF"}15`,
                        color: statusCol?.color || "#9CA3AF",
                      }}
                    >
                      {ASSET_STATUS_LABELS[asset.status]}
                    </span>
                    {asset.version && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#F59E0B]/10 text-[#F59E0B]">
                        v{asset.version}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                    <User className="h-3 w-3" />
                    {asset.assignee}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredAssets.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-[#6B7280]">No assets match filters</div>
          )}
        </div>
      )}

      {/* ─── FOLDER VIEW ─── */}
      {viewMode === "folders" && (
        <div className="space-y-3">
          {ASSET_FOLDERS.map((folder) => {
            const folderAssets = filteredAssets.filter(
              a => (a.folder || TYPE_TO_DEFAULT_FOLDER[a.type]) === folder
            );
            const SIZE_EST: Record<AssetType, number> = {
              sprite: 2, model: 15, animation: 5, audio: 3, ui: 1, level: 25, vfx: 8,
            };
            const totalSize = folderAssets.reduce((sum, a) => sum + (SIZE_EST[a.type] || 5), 0);
            const isCollapsed = collapsedFolders.has(folder);

            return (
              <div
                key={folder}
                className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden"
              >
                <button
                  onClick={() => toggleFolder(folder)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1F1F1F] transition-colors"
                >
                  <ChevronRight
                    className={`h-4 w-4 text-[#6B7280] transition-transform duration-200 ${
                      !isCollapsed ? "rotate-90" : ""
                    }`}
                  />
                  <FolderOpen
                    className="h-4 w-4"
                    style={{ color: ASSET_FOLDER_COLORS[folder] }}
                  />
                  <span className="text-sm font-semibold flex-1 text-left">{folder}</span>
                  <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#9CA3AF]">
                    {folderAssets.length}
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    ~{totalSize >= 1000
                      ? `${(totalSize / 1000).toFixed(1)} GB`
                      : `${totalSize} MB`}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="border-t border-[#2A2A2A] divide-y divide-[#2A2A2A]/50">
                    {folderAssets.map((asset, idx) => {
                      const TypeIcon = ASSET_TYPE_ICONS[asset.type];
                      const statusCol = PIPELINE_COLUMNS.find(c => c.key === asset.status);
                      return (
                        <div
                          key={asset.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1F1F1F] transition-colors"
                        >
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleReorder(folderAssets, idx, "up")}
                              disabled={idx === 0}
                              className="rounded p-0.5 text-[#6B7280] hover:text-[#F59E0B] disabled:opacity-20 disabled:hover:text-[#6B7280]"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleReorder(folderAssets, idx, "down")}
                              disabled={idx === folderAssets.length - 1}
                              className="rounded p-0.5 text-[#6B7280] hover:text-[#F59E0B] disabled:opacity-20 disabled:hover:text-[#6B7280]"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                          <TypeIcon
                            className="h-4 w-4 shrink-0"
                            style={{ color: ASSET_TYPE_COLORS[asset.type] }}
                          />
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => setSelectedAsset(asset)}
                          >
                            <p className="text-sm font-medium truncate">{highlightMatch(asset.name)}</p>
                            <p className="text-xs text-[#6B7280] font-mono truncate">
                              {asset.fileRef || "No file reference"}
                            </p>
                          </div>
                          <span
                            className="hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${ASSET_TYPE_COLORS[asset.type]}15`,
                              color: ASSET_TYPE_COLORS[asset.type],
                            }}
                          >
                            {ASSET_TYPE_LABELS[asset.type]}
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${statusCol?.color || "#9CA3AF"}15`,
                              color: statusCol?.color || "#9CA3AF",
                            }}
                          >
                            {ASSET_STATUS_LABELS[asset.status]}
                          </span>
                          <div className="relative hidden sm:block">
                            <select
                              value={asset.folder || TYPE_TO_DEFAULT_FOLDER[asset.type]}
                              onChange={(e) =>
                                handleMoveToFolder(asset.id, e.target.value as AssetFolder)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="appearance-none rounded border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1 pr-6 text-xs text-[#9CA3AF] outline-none focus:border-[#F59E0B]/50"
                            >
                              {ASSET_FOLDERS.map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6B7280]" />
                          </div>
                        </div>
                      );
                    })}
                    {folderAssets.length === 0 && (
                      <div className="py-6 text-center text-xs text-[#6B7280]">
                        No assets in this folder
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ADD ASSET MODAL ─── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Asset</h3>
              <button onClick={() => setShowAddForm(false)} className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Asset name"
                required
                autoFocus
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as AssetType;
                      setNewType(t);
                      setNewFolder(TYPE_TO_DEFAULT_FOLDER[t]);
                    }}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as GameAsset["priority"])}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">Folder</label>
                <select
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value as AssetFolder)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                >
                  {ASSET_FOLDERS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              {newName.trim() && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAiSuggest}
                      disabled={aiSuggestLoading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 py-2 text-sm text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50"
                    >
                      {aiSuggestLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {aiSuggestLoading ? "Thinking..." : "AI Details"}
                    </button>
                    <button
                      type="button"
                      onClick={handleAiStatusSuggest}
                      disabled={aiStatusLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 px-3 py-2 text-sm text-[#10B981] transition-colors hover:bg-[#10B981]/10 disabled:opacity-50"
                    >
                      {aiStatusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Status
                    </button>
                  </div>
                  {aiStatusResult && <p className="text-[10px] text-[#10B981]/80">{aiStatusResult}</p>}
                  {aiSuggestion && (
                    <div className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-3 text-xs leading-relaxed text-[#D1D5DB] whitespace-pre-line">
                      {aiSuggestion}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">Assignee</label>
                <input
                  type="text"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs text-[#6B7280]">File Reference</label>
                  <button type="button" onClick={handleAiFileName} disabled={!newName.trim() || aiFileNameLoading} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                    {aiFileNameLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    AI Name
                  </button>
                </div>
                <input
                  type="text"
                  value={newFileRef}
                  onChange={(e) => setNewFileRef(e.target.value)}
                  placeholder="e.g. sprites/player.png"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 font-mono text-xs"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs text-[#6B7280]">Notes</label>
                  {newName.trim() && (
                    <button
                      type="button"
                      onClick={handleAiDescribe}
                      disabled={aiDescLoading}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {aiDescLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Describe
                    </button>
                  )}
                </div>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90"
              >
                Add Asset
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── ASSET DETAIL PANEL ─── */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = ASSET_TYPE_ICONS[selectedAsset.type];
                  return <Icon className="h-5 w-5" style={{ color: ASSET_TYPE_COLORS[selectedAsset.type] }} />;
                })()}
                <h3 className="text-lg font-semibold">{selectedAsset.name}</h3>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `${ASSET_TYPE_COLORS[selectedAsset.type]}15`,
                    color: ASSET_TYPE_COLORS[selectedAsset.type],
                  }}
                >
                  {ASSET_TYPE_LABELS[selectedAsset.type]}
                </span>
                <span
                  className="rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `${PIPELINE_COLUMNS.find((c) => c.key === selectedAsset.status)?.color || "#9CA3AF"}15`,
                    color: PIPELINE_COLUMNS.find((c) => c.key === selectedAsset.status)?.color || "#9CA3AF",
                  }}
                >
                  {ASSET_STATUS_LABELS[selectedAsset.status]}
                </span>
                <span
                  className="rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `${getPriorityColor(selectedAsset.priority)}15`,
                    color: getPriorityColor(selectedAsset.priority),
                  }}
                >
                  {selectedAsset.priority}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-[#6B7280]">Assignee</span>
                  <div className="mt-1 flex items-center gap-1.5 text-[#D1D5DB]">
                    <User className="h-3.5 w-3.5" />
                    {selectedAsset.assignee}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-[#6B7280]">Created</span>
                  <p className="mt-1 text-[#D1D5DB]">
                    {new Date(selectedAsset.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedAsset.fileRef && (
                <div>
                  <span className="text-xs text-[#6B7280]">File Reference</span>
                  <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-[#0F0F0F] px-3 py-2 font-mono text-xs text-[#D1D5DB]">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                    {selectedAsset.fileRef}
                  </div>
                </div>
              )}

              {selectedAsset.notes && (
                <div>
                  <span className="text-xs text-[#6B7280]">Notes</span>
                  <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-[#0F0F0F] px-3 py-2 text-sm text-[#D1D5DB] leading-relaxed">
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                    {selectedAsset.notes}
                  </div>
                </div>
              )}

              {/* Version */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">Version</span>
                  <button
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="flex items-center gap-1 text-[10px] text-[#F59E0B] hover:text-[#F59E0B]/80"
                  >
                    <Clock className="h-3 w-3" />
                    {showVersionHistory ? "Hide" : "Show"} History
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-[#F59E0B]" />
                    <span className="text-lg font-bold text-[#F59E0B]">
                      v{selectedAsset.version || 1}
                    </span>
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={bumpNotes}
                      onChange={(e) => setBumpNotes(e.target.value)}
                      placeholder="Version notes..."
                      className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleBumpVersion(selectedAsset.id);
                      }}
                    />
                    <button
                      onClick={() => handleBumpVersion(selectedAsset.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
                    >
                      <ChevronUp className="h-3 w-3" />
                      Bump
                    </button>
                  </div>
                </div>

                {showVersionHistory && (
                  <div className="mt-3 space-y-1.5">
                    {(selectedAsset.versionHistory && selectedAsset.versionHistory.length > 0
                      ? [...selectedAsset.versionHistory].reverse()
                      : [{ version: selectedAsset.version || 1, timestamp: selectedAsset.created_at, notes: "Initial version" }]
                    ).map((entry: AssetVersionEntry, i: number) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-xs ${
                          i === 0
                            ? "border border-[#F59E0B]/20 bg-[#F59E0B]/5"
                            : "bg-[#0F0F0F]"
                        }`}
                      >
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono font-medium ${
                            i === 0
                              ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                              : "bg-[#2A2A2A] text-[#9CA3AF]"
                          }`}
                        >
                          v{entry.version}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[#D1D5DB]">{entry.notes}</p>
                          <p className="mt-0.5 text-[#6B7280]">
                            {new Date(entry.timestamp).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Move buttons */}
              <div>
                <span className="text-xs text-[#6B7280]">Move to Stage</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PIPELINE_COLUMNS.filter((c) => c.key !== selectedAsset.status).map((c) => (
                    <button
                      key={c.key}
                      onClick={() => moveAsset(selectedAsset.id, c.key)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Folder */}
              <div>
                <span className="text-xs text-[#6B7280]">Folder</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ASSET_FOLDERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => handleMoveToFolder(selectedAsset.id, f)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                        (selectedAsset.folder || TYPE_TO_DEFAULT_FOLDER[selectedAsset.type]) === f
                          ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                          : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                      }`}
                    >
                      <FolderOpen className="h-3 w-3" />
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
