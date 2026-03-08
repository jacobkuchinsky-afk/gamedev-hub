"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  HardDrive,
  AlertTriangle,
  FileJson,
  Merge,
  Replace,
  X,
} from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { getProjects, getTasks, getDevlog } from "@/lib/store";
import { changePassword } from "@/lib/auth";

const SETTINGS_KEY = "gameforge_user_settings";
const ACCENT_COLOR_KEY = "gameforge_accent_color";
const VERSION = "1.0.0";
const FIRST_LOGIN_KEY = "gameforge_first_login";
const LOGIN_COUNT_KEY = "gameforge_login_count";
const LIFETIME_PROJECTS_KEY = "gameforge_lifetime_projects";

const ACCENT_COLORS = [
  { name: "Amber", hex: "#F59E0B" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#10B981" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Cyan", hex: "#06B6D4" },
] as const;

interface ImportPreview {
  raw: Record<string, unknown>;
  keys: string[];
  projectCount: number;
  taskCount: number;
  devlogCount: number;
  settingsFound: boolean;
  totalKeys: number;
}

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

const AI_PREFS_KEY = "gameforge_ai_prefs";
const WRITING_STYLES = ["Professional", "Casual", "Technical", "Creative"] as const;
const RESPONSE_LENGTHS = ["Concise", "Standard", "Detailed"] as const;

interface AIPrefs {
  writingStyle: (typeof WRITING_STYLES)[number];
  responseLength: (typeof RESPONSE_LENGTHS)[number];
}

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [aiPrefs, setAiPrefs] = useState<AIPrefs>({ writingStyle: "Professional", responseLength: "Standard" });
  const [accentColor, setAccentColor] = useState("#F59E0B");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aboutStats, setAboutStats] = useState({
    firstLoginDate: "",
    timeSinceFirstLogin: "",
    loginCount: 0,
    lifetimeProjects: 0,
    storageMB: 0,
    storagePercent: 0,
  });

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
    const raw = localStorage.getItem(AI_PREFS_KEY);
    if (raw) {
      try { setAiPrefs({ writingStyle: "Professional", responseLength: "Standard", ...JSON.parse(raw) }); } catch {}
    }
    const savedAccent = localStorage.getItem(ACCENT_COLOR_KEY);
    if (savedAccent) setAccentColor(savedAccent);
  }, []);

  const updateAiPref = useCallback(<K extends keyof AIPrefs>(key: K, value: AIPrefs[K]) => {
    setAiPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(AI_PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const projects = getProjects();
    const tasks = getTasks();
    const devlogs = getDevlog();
    let gfBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("gameforge_")) {
        gfBytes += (localStorage.getItem(key) || "").length * 2;
      }
    }
    setStats({
      projects: projects.length,
      tasks: tasks.length,
      devlogs: devlogs.length,
      storageKB: Math.round((gfBytes / 1024) * 10) / 10,
    });

    let firstLogin = localStorage.getItem(FIRST_LOGIN_KEY);
    if (!firstLogin) {
      firstLogin = new Date().toISOString();
      localStorage.setItem(FIRST_LOGIN_KEY, firstLogin);
    }
    const msSince = Date.now() - new Date(firstLogin).getTime();
    const days = Math.floor(msSince / (1000 * 60 * 60 * 24));
    const hours = Math.floor((msSince % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const loginCount = parseInt(localStorage.getItem(LOGIN_COUNT_KEY) || "1", 10);
    const stored = parseInt(localStorage.getItem(LIFETIME_PROJECTS_KEY) || "0", 10);
    const lifetime = Math.max(projects.length, stored);
    localStorage.setItem(LIFETIME_PROJECTS_KEY, String(lifetime));

    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalBytes += (key.length + (localStorage.getItem(key) || "").length) * 2;
      }
    }
    const storageMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;

    setAboutStats({
      firstLoginDate: new Date(firstLogin).toLocaleDateString(),
      timeSinceFirstLogin: days > 0 ? `${days}d ${hours}h` : `${hours}h`,
      loginCount,
      lifetimeProjects: lifetime,
      storageMB,
      storagePercent: Math.min((storageMB / 5) * 100, 100),
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
    localStorage.setItem("gameforge_last_backup", new Date().toISOString());
    console.log("[Settings] exported data, keys:", Object.keys(allKeys).length);
  }, []);

  const handleSelectAccent = useCallback((hex: string) => {
    setAccentColor(hex);
    localStorage.setItem(ACCENT_COLOR_KEY, hex);
  }, []);

  const handleImportFile = useCallback(() => {
    setImportError(null);
    setImportSuccess(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (typeof data !== "object" || data === null || Array.isArray(data)) {
          setImportError("Invalid format — expected a JSON object with gameforge_ keys.");
          return;
        }

        const keys = Object.keys(data).filter((k) => k.startsWith("gameforge_"));
        if (keys.length === 0) {
          setImportError("No GameForge data found in this file. Keys must start with \"gameforge_\".");
          return;
        }

        let projectCount = 0;
        let taskCount = 0;
        let devlogCount = 0;
        let settingsFound = false;

        for (const key of keys) {
          if (key === SETTINGS_KEY) settingsFound = true;
          const val = data[key];
          if (key === "gameforge_projects" && Array.isArray(val)) projectCount = val.length;
          else if (key === "gameforge_tasks" && Array.isArray(val)) taskCount = val.length;
          else if (key === "gameforge_devlog" && Array.isArray(val)) devlogCount = val.length;
          else if (typeof val === "string") {
            try {
              const parsed = JSON.parse(val);
              if (key === "gameforge_projects" && Array.isArray(parsed)) projectCount = parsed.length;
              else if (key === "gameforge_tasks" && Array.isArray(parsed)) taskCount = parsed.length;
              else if (key === "gameforge_devlog" && Array.isArray(parsed)) devlogCount = parsed.length;
            } catch {}
          }
        }

        setImportPreview({
          raw: data,
          keys,
          projectCount,
          taskCount,
          devlogCount,
          settingsFound,
          totalKeys: keys.length,
        });
        setImportMode("merge");
        setShowImportModal(true);
      } catch {
        setImportError("Failed to parse JSON file. Make sure it's valid JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (!importPreview) return;
    const { raw, keys } = importPreview;

    if (importMode === "replace") {
      const existingKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("gameforge_")) existingKeys.push(key);
      }
      existingKeys.forEach((k) => localStorage.removeItem(k));
    }

    let count = 0;
    for (const key of keys) {
      const value = raw[key];
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      count++;
    }

    setShowImportModal(false);
    setImportPreview(null);
    setImportSuccess(`Successfully ${importMode === "merge" ? "merged" : "replaced"} ${count} data entries. Refreshing...`);
    setTimeout(() => window.location.reload(), 1500);
  }, [importPreview, importMode]);

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

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setChangingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setChangingPassword(false);

    if (result.success) {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } else {
      setPasswordError(result.error || "Failed to change password.");
    }
  }, [currentPassword, newPassword, confirmPassword]);

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

      {/* Profile Summary Card */}
      <div className="flex items-center gap-5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-[#0F0F0F]"
          style={{ backgroundColor: settings.avatarColor }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-[#F5F5F5]">{settings.username}</h2>
          <p className="truncate text-sm text-[#6B7280]">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-md bg-[#F59E0B]/10 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
              {settings.gameType} Developer
            </span>
            <span className="rounded-md bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#6B7280]">
              v{VERSION}
            </span>
          </div>
        </div>
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

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-[#D1D5DB]">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => handleSelectAccent(color.hex)}
                    className="group relative flex flex-col items-center gap-1.5"
                    title={color.name}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                        accentColor === color.hex
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1A] scale-110"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {accentColor === color.hex && (
                        <Check className="h-4.5 w-4.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                      )}
                    </div>
                    <span className={`text-[10px] transition-colors ${
                      accentColor === color.hex ? "text-[#F5F5F5]" : "text-[#6B7280] group-hover:text-[#9CA3AF]"
                    }`}>
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#6B7280]">
                Accent color affects buttons, highlights, and interactive elements
              </p>
            </div>

            <div className="mt-4 flex items-center gap-4 rounded-lg border border-[#2A2A2A] p-3">
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-8 w-8 rounded-md bg-[#0F0F0F] ring-1 ring-[#3A3A3A]" />
                <span className="text-[10px] text-[#6B7280]">BG</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-8 w-8 rounded-md bg-[#1A1A1A] ring-1 ring-[#3A3A3A]" />
                <span className="text-[10px] text-[#6B7280]">Cards</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-8 w-8 rounded-md" style={{ backgroundColor: accentColor }} />
                <span className="text-[10px] text-[#6B7280]">Accent</span>
              </div>
              <div className="ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ backgroundColor: `${accentColor}15` }}>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                <span className="text-xs font-medium" style={{ color: accentColor }}>
                  {ACCENT_COLORS.find((c) => c.hex === accentColor)?.name || "Custom"}
                </span>
              </div>
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

      {/* AI Preferences */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-4">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="font-semibold">AI Preferences</h2>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              Writing Style
            </label>
            <p className="mb-2.5 text-xs text-[#6B7280]">
              Controls the tone AI uses when generating text for you
            </p>
            <div className="flex flex-wrap gap-2">
              {WRITING_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => updateAiPref("writingStyle", style)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    aiPrefs.writingStyle === style
                      ? "bg-[#F59E0B] text-[#0F0F0F]"
                      : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              AI Response Length
            </label>
            <p className="mb-2.5 text-xs text-[#6B7280]">
              How detailed AI-generated content should be
            </p>
            <div className="flex flex-wrap gap-2">
              {RESPONSE_LENGTHS.map((len) => (
                <button
                  key={len}
                  onClick={() => updateAiPref("responseLength", len)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    aiPrefs.responseLength === len
                      ? "bg-[#F59E0B] text-[#0F0F0F]"
                      : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[#0F0F0F] p-3">
            <p className="text-xs leading-relaxed text-[#6B7280]">
              These preferences will be used by AI features across GameForge, including the idea generator, devlog assistant, and dialogue writer.
            </p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-4">
          <Lock className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="font-semibold">Change Password</h2>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 pr-10 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#9CA3AF]"
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 pr-10 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#9CA3AF]"
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
              placeholder="Confirm new password"
            />
          </div>
          {passwordError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="rounded-lg bg-[#10B981]/10 px-3 py-2 text-sm text-[#10B981]">
              Password updated successfully!
            </p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={!currentPassword || !newPassword || !confirmPassword || changingPassword}
            className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B]/10 px-4 py-2.5 text-sm font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Lock className="h-3.5 w-3.5" />
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
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

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            onClick={handleImportFile}
            className="flex w-full items-center gap-3 rounded-lg border border-[#2A2A2A] px-4 py-3 text-left transition-colors hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
          >
            <Upload className="h-4 w-4 shrink-0 text-[#10B981]" />
            <div>
              <p className="text-sm font-medium text-[#F5F5F5]">Import Data</p>
              <p className="text-xs text-[#6B7280]">Restore from a previously exported JSON file with preview</p>
            </div>
          </button>

          {importError && (
            <p className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {importError}
            </p>
          )}

          {importSuccess && (
            <p className="flex items-center gap-2 rounded-lg bg-[#10B981]/10 px-3 py-2 text-sm text-[#10B981]">
              <Check className="h-3.5 w-3.5 shrink-0" />
              {importSuccess}
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

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
            <Clock className="h-3.5 w-3.5" />
            Usage Stats
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Member Since</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">{aboutStats.firstLoginDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Time on Platform</span>
            <span className="text-sm tabular-nums text-[#F59E0B]">{aboutStats.timeSinceFirstLogin}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Total Logins</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">{aboutStats.loginCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Lifetime Projects</span>
            <span className="text-sm tabular-nums text-[#F5F5F5]">{aboutStats.lifetimeProjects}</span>
          </div>

          <div className="my-3 h-px bg-[#2A2A2A]" />

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
            <HardDrive className="h-3.5 w-3.5" />
            Current Data
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Active Projects</span>
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
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm text-[#9CA3AF]">Storage Used</span>
              <span className="text-sm tabular-nums text-[#F5F5F5]">
                {aboutStats.storageMB} MB <span className="text-[#6B7280]">/ 5 MB</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${aboutStats.storagePercent}%`,
                  backgroundColor:
                    aboutStats.storagePercent > 80
                      ? "#EF4444"
                      : aboutStats.storagePercent > 50
                        ? "#F59E0B"
                        : "#10B981",
                }}
              />
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              {aboutStats.storagePercent < 1 ? "<1" : Math.round(aboutStats.storagePercent)}% of browser storage limit
            </p>
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

      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#F59E0B]">
                <FileJson className="h-5 w-5" />
                <h3 className="text-lg font-bold text-[#F5F5F5]">Import Preview</h3>
              </div>
              <button
                onClick={() => { setShowImportModal(false); setImportPreview(null); }}
                className="rounded-lg p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 space-y-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#9CA3AF]">Total Data Keys</span>
                <span className="font-medium text-[#F5F5F5]">{importPreview.totalKeys}</span>
              </div>
              {importPreview.projectCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9CA3AF]">Projects</span>
                  <span className="font-medium text-[#F59E0B]">{importPreview.projectCount}</span>
                </div>
              )}
              {importPreview.taskCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9CA3AF]">Tasks</span>
                  <span className="font-medium text-[#3B82F6]">{importPreview.taskCount}</span>
                </div>
              )}
              {importPreview.devlogCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9CA3AF]">Devlog Entries</span>
                  <span className="font-medium text-[#10B981]">{importPreview.devlogCount}</span>
                </div>
              )}
              {importPreview.settingsFound && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9CA3AF]">User Settings</span>
                  <span className="font-medium text-[#8B5CF6]">Included</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-[#D1D5DB]">
                Import Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportMode("merge")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    importMode === "merge"
                      ? "bg-[#F59E0B] text-[#0F0F0F]"
                      : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                  }`}
                >
                  <Merge className="h-3.5 w-3.5" />
                  Merge
                </button>
                <button
                  onClick={() => setImportMode("replace")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    importMode === "replace"
                      ? "bg-red-500 text-white"
                      : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-red-500/30 hover:text-red-400"
                  }`}
                >
                  <Replace className="h-3.5 w-3.5" />
                  Replace
                </button>
              </div>
              <p className="mt-2 text-xs text-[#6B7280]">
                {importMode === "merge"
                  ? "Merge adds imported data on top of your existing data. Matching keys will be overwritten."
                  : "Replace deletes ALL existing GameForge data first, then imports the file."}
              </p>
            </div>

            {importMode === "replace" && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-xs leading-relaxed text-red-300">
                  This will permanently delete all your current data before importing. Make sure you have a backup.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportPreview(null); }}
                className="flex-1 rounded-lg border border-[#2A2A2A] px-4 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:bg-[#1F1F1F] hover:text-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                  importMode === "replace"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-[#F59E0B] text-[#0F0F0F] hover:bg-[#F59E0B]/90"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                {importMode === "merge" ? "Merge Data" : "Replace All Data"}
              </button>
            </div>
          </div>
        </div>
      )}

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
