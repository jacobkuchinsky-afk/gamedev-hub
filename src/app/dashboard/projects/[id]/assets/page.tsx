"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  X,
  LayoutGrid,
  List,
  Columns3,
  ChevronDown,
  User,
  FileText,
  StickyNote,
  ArrowRight,
  Search,
  Image as ImageIcon,
  Box,
  Film,
  Music,
  Monitor,
  Map,
  Sparkles,
} from "lucide-react";
import {
  getProject,
  getAssets,
  addAsset,
  updateAsset,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_COLORS,
  ASSET_STATUS_LABELS,
  getPriorityColor,
  type Project,
  type GameAsset,
  type AssetType,
  type AssetStatus,
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

type ViewMode = "kanban" | "list" | "grid";

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

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AssetType>("sprite");
  const [newAssignee, setNewAssignee] = useState("JacobK");
  const [newPriority, setNewPriority] = useState<GameAsset["priority"]>("medium");
  const [newNotes, setNewNotes] = useState("");
  const [newFileRef, setNewFileRef] = useState("");

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

  const assignees = useMemo(() => {
    const set = new Set(assets.map((a) => a.assignee));
    return Array.from(set);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (filterType !== "all") result = result.filter((a) => a.type === filterType);
    if (filterStatus !== "all") result = result.filter((a) => a.status === filterStatus);
    if (filterAssignee !== "all") result = result.filter((a) => a.assignee === filterAssignee);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.notes.toLowerCase().includes(q)
      );
    }
    return result;
  }, [assets, filterType, filterStatus, filterAssignee, searchQuery]);

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
    });
    setNewName("");
    setNewNotes("");
    setNewFileRef("");
    setNewPriority("medium");
    setShowAddForm(false);
    reload();
  };

  const moveAsset = (assetId: string, newStatus: AssetStatus) => {
    console.log("[AssetPipelinePage] moving asset", assetId, "to", newStatus);
    updateAsset(assetId, { status: newStatus });
    reload();
    if (selectedAsset?.id === assetId) {
      setSelectedAsset({ ...selectedAsset, status: newStatus });
    }
  };

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
            placeholder="Search assets..."
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-9 pr-3 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
          />
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
                            <p className="text-sm font-medium leading-tight truncate">{asset.name}</p>
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
                            </div>
                            {asset.assignee && (
                              <div className="mt-1.5 flex items-center gap-1 text-xs text-[#6B7280]">
                                <User className="h-3 w-3" />
                                {asset.assignee}
                              </div>
                            )}
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
                        <span className="text-sm font-medium">{asset.name}</span>
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
                  <p className="text-sm font-medium truncate">{asset.name}</p>
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
                    onChange={(e) => setNewType(e.target.value as AssetType)}
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
                <label className="mb-1 block text-xs text-[#6B7280]">Assignee</label>
                <input
                  type="text"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">File Reference</label>
                <input
                  type="text"
                  value={newFileRef}
                  onChange={(e) => setNewFileRef(e.target.value)}
                  placeholder="e.g. sprites/player.png"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 font-mono text-xs"
                />
              </div>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
              />
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

              {/* Move buttons */}
              <div>
                <span className="text-xs text-[#6B7280]">Move to</span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
