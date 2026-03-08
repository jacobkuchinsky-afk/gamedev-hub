"use client";

import { useEffect, useState, useCallback } from "react";
import {
  User,
  Palette,
  Database,
  Info,
  Save,
  Download,
  Upload,
  Trash2,
  ExternalLink,
  Check,
} from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { getProjects, getTasks, getDevlog } from "@/lib/store";

const SETTINGS_KEY = "gameforge_user_settings";
const VERSION = "1.0.0";

interface UserSettings {
  username: string;
  gameType: string;
  avatarColor: string;
  defaultView: "board" | "list";
  notifyBugReports: boolean;
  notifyTaskUpdates: boolean;
  notifyDevlogReminders: boolean;
}

const AVATAR_COLORS = [
  "#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6",
  "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#6366F1",
];

const GAME_TYPES = ["2D", "3D", "VR/AR", "Mobile", "Web", "Tabletop"];

function loadSettings(fallback: Partial<UserSettings>): UserSettings {
  if (typeof window === "undefined") {
    return {
      username: "",
      gameType: "2D",
      avatarColor: "#F59E0B",
      defaultView: "board",
      notifyBugReports: true,
      notifyTaskUpdates: true,
      notifyDevlogReminders: true,
      ...fallback,
    };
  }
  const raw = localStorage.getItem(SETTINGS_KEY);
  const defaults: UserSettings = {
    username: "",
    gameType: "2D",
    avatarColor: "#F59E0B",
    defaultView: "board",
    notifyBugReports: true,
    notifyTaskUpdates: true,
    notifyDevlogReminders: true,
    ...fallback,
  };
  if (!raw) return defaults;
  return { ...defaults, ...JSON.parse(raw) };
}

function saveSettings(settings: UserSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function SettingsPage() {
  const { user } = useAuthContext();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [stats, setStats] = useState({ projects: 0, tasks: 0, devlogs: 0, storageKB: 0 });

  useEffect(() => {
    console.log("[SettingsPage] rendered");
    if (user) {
      setSettings(
        loadSettings({
          username: user.username,
          gameType: user.gameType || "2D",
        })
      );
    }
  }, [user]);

  useEffect(() => {
    const projects = getProjects();
    const tasks = getTasks();
    const devlogs = getDevlog();
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("gameforge_")) {
        totalBytes += (localStorage.getItem(key) || "").length * 2;
      }
    }
    setStats({
      projects: projects.length,
      tasks: tasks.length,
      devlogs: devlogs.length,
      storageKB: Math.round((totalBytes / 1024) * 10) / 10,
    });
  }, []);

  const updateField = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setSettings((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: value };
      });
      setDirty(true);
      setSaved(false);
    },
    []
  );

  const handleSave = useCallback(() => {
    if (!settings) return;
    saveSettings(settings);
    setSaved(true);
    setDirty(false);
    console.log("[Settings] saved:", settings);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleExport = useCallback(() => {
    const allKeys: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("gameforge_")) {
        try {
          allKeys[key] = JSON.parse(localStorage.getItem(key)!);
        } catch {
          allKeys[key] = localStorage.getItem(key);
        }
      }
    }
    const blob = new Blob([JSON.stringify(allKeys, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gameforge-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log("[Settings] exported data, keys:", Object.keys(allKeys).length);
  }, []);

  const handleImport = useCallback(() => {
    setImportError(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (typeof data !== "object" || data === null) {
            setImportError("Invalid file format — expected a JSON object.");
            return;
          }
          let count = 0;
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("gameforge_")) {
              localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
              count++;
            }
          }
          console.log("[Settings] imported", count, "keys");
          alert(`Imported ${count} data entries. Refresh to see changes.`);
        } catch {
          setImportError("Failed to parse JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleClearAll = useCallback(() => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("gameforge_")) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    console.log("[Settings] cleared", keysToRemove.length, "keys");
    window.location.reload();
  }, []);

  if (!settings || !user) return null;

  const initials = settings.username.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage your profile and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            saved
              ? "bg-[#10B981] text-white"
              : dirty
              ? "bg-[#F59E0B] text-[#0F0F0F] hover:bg-[#F59E0B]/90"
              : "bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20"
          }`}
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? "Saved!" : dirty ? "Save Changes" : "Save"}
        </button>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-4">
          <User className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="font-semibold">Profile</h2>
        </div>
        <div className="space-y-5 p-5">
          {/* Avatar Preview + Color Picker */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#D1D5DB]">Avatar</label>
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-[#0F0F0F]"
                style={{ backgroundColor: settings.avatarColor }}
              >
                {initials}
              </div>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateField("avatarColor", color)}
                    className={`h-8 w-8 rounded-full transition-all ${
                      settings.avatarColor === color
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1A]"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              Username
            </label>
            <input
              type="text"
              value={settings.username}
              onChange={(e) => updateField("username", e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
            />
          </div>

          {/* Email (readonly) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-[#2A2A2A] bg-[#0F0F0F]/50 px-3 py-2.5 text-sm text-[#6B7280]"
            />
            <p className="mt-1 text-xs text-[#6B7280]">Email cannot be changed</p>
          </div>

          {/* Game Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              Game Type
            </label>
            <div className="flex flex-wrap gap-2">
              {GAME_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => updateField("gameType", type)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    settings.gameType === type
                      ? "bg-[#F59E0B] text-[#0F0F0F]"
                      : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-4">
          <Palette className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="font-semibold">Preferences</h2>
        </div>
        <div className="space-y-5 p-5">
          {/* Default View */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              Default View
            </label>
            <div className="flex gap-2">
              {(["board", "list"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => updateField("defaultView", view)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    settings.defaultView === view
                      ? "bg-[#F59E0B] text-[#0F0F0F]"
                      : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              Theme
            </label>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-[#0F0F0F]">
                Dark
              </div>
              <span className="text-xs text-[#6B7280]">More themes coming soon</span>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#D1D5DB]">
              Notifications
            </label>
            <div className="space-y-2">
              {([
                { key: "notifyBugReports" as const, label: "Bug report updates" },
                { key: "notifyTaskUpdates" as const, label: "Task status changes" },
                { key: "notifyDevlogReminders" as const, label: "Devlog reminders" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => updateField(key, !settings[key])}
                  className="flex w-full items-center justify-between rounded-lg border border-[#2A2A2A] px-4 py-3 transition-colors hover:bg-[#1F1F1F]"
                >
                  <span className="text-sm text-[#D1D5DB]">{label}</span>
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      settings[key] ? "bg-[#F59E0B]" : "bg-[#2A2A2A]"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        settings[key] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-4">
          <Database className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="font-semibold">Data Management</h2>
        </div>
        <div className="space-y-3 p-5">
          <button
            onClick={handleExport}
            className="flex w-full items-center gap-3 rounded-lg border border-[#2A2A2A] px-4 py-3 text-left transition-colors hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
          >
            <Download className="h-4 w-4 shrink-0 text-[#3B82F6]" />
            <div>
              <p className="text-sm font-medium text-[#F5F5F5]">Export All Data</p>
              <p className="text-xs text-[#6B7280]">Download a JSON backup of all your GameForge data</p>
            </div>
          </button>

          <button
            onClick={handleImport}
            className="flex w-full items-center gap-3 rounded-lg border border-[#2A2A2A] px-4 py-3 text-left transition-colors hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
          >
            <Upload className="h-4 w-4 shrink-0 text-[#10B981]" />
            <div>
              <p className="text-sm font-medium text-[#F5F5F5]">Import Data</p>
              <p className="text-xs text-[#6B7280]">Restore from a previously exported JSON file</p>
            </div>
          </button>

          {importError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {importError}
            </p>
          )}

          <button
            onClick={() => { setShowClearModal(true); setClearConfirmText(""); }}
            className="flex w-full items-center gap-3 rounded-lg border border-red-500/20 px-4 py-3 text-left transition-colors hover:border-red-500/40 hover:bg-red-500/5"
          >
            <Trash2 className="h-4 w-4 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Clear All Data</p>
              <p className="text-xs text-[#6B7280]">Permanently delete all GameForge data from this browser</p>
            </div>
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-4">
          <Info className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="font-semibold">About</h2>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Version</span>
            <span className="rounded-md bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
              v{VERSION}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Made by</span>
            <span className="text-sm text-[#F5F5F5]">CursorClaw</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Source</span>
            <a
              href="https://github.com/jacobkuchinsky-afk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-[#F59E0B] transition-colors hover:text-[#F59E0B]/80"
              onClick={() => console.log("[Settings] opened GitHub link")}
            >
              GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="my-3 h-px bg-[#2A2A2A]" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Total Projects</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">{stats.projects}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Total Tasks</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">{stats.tasks}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Devlog Entries</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">{stats.devlogs}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Storage Used</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">{stats.storageKB} KB</span>
          </div>
          <div className="mt-2 rounded-lg bg-[#0F0F0F] p-3">
            <p className="text-xs leading-relaxed text-[#6B7280]">
              GameForge is a game development productivity platform built to help indie devs
              organize projects, track bugs, manage tasks, and ship games. All data is stored
              locally in your browser — nothing is sent to any server.
            </p>
          </div>
        </div>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              <h3 className="text-lg font-bold">Delete All Data</h3>
            </div>
            <p className="mb-2 text-sm text-[#D1D5DB]">
              This will permanently delete all projects, tasks, bugs, devlogs, and tool data. This cannot be undone.
            </p>
            <p className="mb-4 text-sm text-[#9CA3AF]">
              Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="mb-4 w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-red-500/50 focus:outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 rounded-lg border border-[#2A2A2A] px-4 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:bg-[#1F1F1F] hover:text-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (clearConfirmText === "DELETE") {
                    handleClearAll();
                  }
                }}
                disabled={clearConfirmText !== "DELETE"}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
