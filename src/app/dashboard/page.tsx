"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  ListTodo,
  Bug,
  BookOpen,
  Plus,
  ArrowRight,
  Wrench,
  AlertTriangle,
  Lightbulb,
  Clock,
  CheckCircle2,
  FileText,
  Rocket,
  Hammer,
  PenLine,
  Sparkles,
  X,
  ChevronRight,
  HardDrive,
  TrendingUp,
  Flame,
  CalendarDays,
  Target,
  Loader2,
  ExternalLink,
  Gauge,
  ArrowUpRight,
  Copy,
  MessageSquare,
  Trophy,
  Search,
  Zap,
  Award,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Activity,
  History,
  Settings,
  Paintbrush,
  Music,
  Palette,
  ScrollText,
  Calculator,
  Map,
  Film,
  LayoutDashboard,
  Download,
} from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import {
  getProjects,
  getTasks,
  getBugs,
  getDevlog,
  getSprints,
  getReferences,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  getMoodEmoji,
  addProject,
  addTask,
  addBug,
  type Project,
  type Task,
  type Bug as BugType,
  type DevlogEntry,
  type Sprint,
  type Reference,
} from "@/lib/store";

const RECENT_PAGE_ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/projects": FolderKanban,
  "/dashboard/tools": Wrench,
  "/dashboard/devlog": BookOpen,
  "/dashboard/settings": Settings,
  "/dashboard/tools/sprites": Paintbrush,
  "/dashboard/tools/sounds": Music,
  "/dashboard/tools/colors": Palette,
  "/dashboard/tools/names": ScrollText,
  "/dashboard/tools/balance": Calculator,
  "/dashboard/tools/dialogue": MessageSquare,
  "/dashboard/tools/ideas": Lightbulb,
  "/dashboard/tools/tilemap": Map,
  "/dashboard/tools/effects": Sparkles,
  "/dashboard/tools/animation": Film,
  "/dashboard/tools/easing": Activity,
};

interface Stats {
  activeProjects: number;
  openTasks: number;
  openBugs: number;
  devlogThisWeek: number;
}

type ActivityType = "task-created" | "task-completed" | "bug-filed" | "bug-fixed" | "devlog" | "sprint-started" | "sprint-completed";

interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  projectName: string;
  projectColor: string;
  timestamp: string;
}

interface ProjectHealth {
  id: string;
  name: string;
  color: string;
  status: Project["status"];
  openBugs: number;
  totalTasks: number;
  doneTasks: number;
  sprintName: string;
  sprintStatus: "active" | "planned" | "completed" | "none";
}

interface FocusItem {
  type: "task" | "bug" | "launch";
  title: string;
  subtitle: string;
  href: string;
  color: string;
  icon: typeof ListTodo;
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_RANK: Record<string, number> = { blocker: 0, critical: 1, major: 2, minor: 3, trivial: 4 };

const QC_ENGINES = ["Unity", "Unreal", "Godot", "GameMaker", "Custom"];
const QC_GENRES = ["RPG", "Platformer", "FPS", "Puzzle", "Strategy", "Simulation", "Horror", "Racing", "Other"];
const QC_COLORS = ["#EF4444", "#F97316", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899"];

const TIPS_GENERAL = [
  "Playtest early and often — don't wait until it's \"ready.\"",
  "Your first idea is rarely your best. Iterate ruthlessly.",
  "Polish the first 5 minutes of your game before anything else.",
  "Make the controls feel good before adding content.",
  "Scope down. Then scope down again. Ship something small and complete.",
  "Juice it up: screen shake, particles, and sound make everything feel better.",
  "Write your game's store description before you build it. Clarity comes from constraints.",
  "If a mechanic isn't fun in a gray-box prototype, art won't save it.",
  "Sound design is 50% of the experience. Don't leave it for last.",
  "Build the game you want to play, not the game you think will sell.",
  "Deadlines create decisions. Set one, even if it's arbitrary.",
  "Every feature you add is a feature you have to debug, balance, and support.",
  "Reward the player constantly. Micro-feedback loops keep people hooked.",
  "If your tutorial is boring, players will never see the fun parts.",
  "Accessibility isn't optional. Rebindable keys and subtitles go a long way.",
  "Version control isn't just for teams. Solo devs need git too.",
  "Take breaks. Your subconscious solves design problems while you rest.",
  "Consistent art style beats expensive art. Cohesion is king.",
  "Test on the lowest-spec machine you can find. Not everyone has a gaming rig.",
  "Make failing fun. The best games make you want to try again immediately.",
  "Color palette and lighting set the mood more than detailed textures.",
  "If you can't explain your game in one sentence, simplify it.",
  "Back up your project. Right now. Today. Seriously.",
  "Steal mechanics, not aesthetics. Combine ideas from different genres.",
  "Finish something. An okay finished game teaches more than a perfect unfinished one.",
  "Analytics are your friend — track where players quit to find your weak spots.",
];

const TIPS_BUGS = [
  "Reproduce the bug before you fix it. If you can't trigger it, you can't verify the fix.",
  "Fix bugs in batches. Context-switching between features and bugs kills momentum.",
  "The best bug reports include steps to reproduce, expected behavior, and actual behavior.",
  "Prioritize blocker bugs ruthlessly. A crash bug matters more than a typo.",
  "Write a test case for every bug you fix. Regressions are the worst kind of bug.",
  "If a bug keeps coming back, the fix is architectural, not a patch.",
  "Rubber duck debugging works. Explain the bug out loud — you'll find it faster.",
  "Check the console first. Most bugs leave breadcrumbs in error logs.",
];

const TIPS_DEVLOG = [
  "Keep a devlog — future you will thank present you.",
  "Your devlog is your marketing. Share progress, not just polish.",
  "Write devlogs the same day you make progress. Memory fades fast.",
  "Screenshot everything. Visual progress posts get 10x the engagement.",
  "A short devlog is better than no devlog. Three sentences count.",
  "Document your failures too. Other devs learn more from your struggles.",
  "Ship your \"embarrassing\" prototype. The feedback is worth more than your pride.",
  "Don't wait for something impressive. Post the mundane stuff too.",
];

function getContextualTip(openBugs: number, devlogThisWeek: number, offset: number): { tip: string; category: string } {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const hasManyBugs = openBugs >= 3;
  const hasLowDevlog = devlogThisWeek === 0;

  let pool: string[];
  let category: string;

  if (hasManyBugs && hasLowDevlog) {
    pool = [...TIPS_BUGS, ...TIPS_DEVLOG];
    category = "Based on your bugs & devlog";
  } else if (hasManyBugs) {
    pool = TIPS_BUGS;
    category = "You have " + openBugs + " open bugs";
  } else if (hasLowDevlog) {
    pool = TIPS_DEVLOG;
    category = "No devlogs this week";
  } else {
    pool = TIPS_GENERAL;
    category = "Tip of the Day";
  }

  const idx = ((dayIndex + offset) % pool.length + pool.length) % pool.length;
  return { tip: pool[idx], category };
}


interface GameForgeBadge {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: typeof Trophy;
  color: string;
  check: (ctx: { projects: number; bugs: number; devlogs: number; completedSprints: number; toolsUsed: number; aiUses: number }) => boolean;
}

const GAMEFORGE_BADGES: GameForgeBadge[] = [
  { id: "first_project", name: "First Project", description: "Created your first game project", hint: "Create a project to unlock", icon: Rocket, color: "#F59E0B", check: (c) => c.projects >= 1 },
  { id: "bug_hunter", name: "Bug Hunter", description: "Filed 10+ bugs across all projects", hint: "File 10 bugs to unlock", icon: Bug, color: "#EF4444", check: (c) => c.bugs >= 10 },
  { id: "prolific_writer", name: "Prolific Writer", description: "Wrote 10+ devlog entries", hint: "Write 10 devlog entries to unlock", icon: PenLine, color: "#10B981", check: (c) => c.devlogs >= 10 },
  { id: "sprint_champion", name: "Sprint Champion", description: "Completed 3+ sprints", hint: "Complete 3 sprints to unlock", icon: Flame, color: "#F97316", check: (c) => c.completedSprints >= 3 },
  { id: "tool_explorer", name: "Tool Explorer", description: "Used 10+ different tools", hint: "Try 10 different tools to unlock", icon: Search, color: "#8B5CF6", check: (c) => c.toolsUsed >= 10 },
  { id: "ai_power_user", name: "AI Power User", description: "Used AI features 20+ times", hint: "Use AI features 20 times to unlock", icon: Zap, color: "#3B82F6", check: (c) => c.aiUses >= 20 },
];

function getGamificationStats() {
  if (typeof window === "undefined") return { projects: 0, bugs: 0, devlogs: 0, completedSprints: 0, toolsUsed: 0, aiUses: 0 };

  const projects = getProjects().length;
  const bugs = getBugs().length;
  const devlogs = getDevlog().length;
  const completedSprints = getSprints().filter((s) => s.status === "completed").length;

  const toolsRaw = localStorage.getItem("gameforge_tools_used");
  const toolsUsed = toolsRaw ? (JSON.parse(toolsRaw) as string[]).length : 0;

  const aiRaw = localStorage.getItem("gameforge_ai_uses");
  const aiUses = aiRaw ? parseInt(aiRaw, 10) : 0;

  return { projects, bugs, devlogs, completedSprints, toolsUsed, aiUses };
}

interface StreakData {
  lastActiveDate: string;
  currentStreak: number;
  longestStreak: number;
}

function getStreakData(): StreakData {
  if (typeof window === "undefined") return { lastActiveDate: "", currentStreak: 0, longestStreak: 0 };
  const raw = localStorage.getItem("gameforge_dev_streak");
  if (raw) return JSON.parse(raw);
  return { lastActiveDate: "", currentStreak: 0, longestStreak: 0 };
}

function updateStreak(): StreakData {
  const today = new Date().toISOString().split("T")[0];
  const data = getStreakData();

  if (data.lastActiveDate === today) return data;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newStreak = data.lastActiveDate === yesterday ? data.currentStreak + 1 : 1;
  const newLongest = Math.max(data.longestStreak, newStreak);

  const updated: StreakData = { lastActiveDate: today, currentStreak: newStreak, longestStreak: newLongest };
  localStorage.setItem("gameforge_dev_streak", JSON.stringify(updated));
  return updated;
}

function getStreakMessage(streak: number): string {
  if (streak >= 30) return "Legendary! A full month of shipping!";
  if (streak >= 14) return "Two weeks strong. Unstoppable!";
  if (streak >= 7) return "One week streak! Keep the momentum!";
  if (streak >= 3) return "Nice streak! Don't break the chain!";
  if (streak >= 1) return "Every day counts. Keep it going!";
  return "Start your streak today!";
}

const LAUNCH_ITEMS = [
  { id: "sp_title", label: "Finalize game title" },
  { id: "sp_desc", label: "Write store description" },
  { id: "sp_screenshots", label: "Prepare store screenshots" },
  { id: "sp_trailer", label: "Upload trailer" },
  { id: "sp_capsule", label: "Design capsule art" },
  { id: "sp_tags", label: "Set tags & categories" },
  { id: "sp_sysreq", label: "List system requirements" },
  { id: "b_release", label: "Test release build" },
  { id: "b_nodebug", label: "Remove debug code" },
  { id: "b_perf", label: "Profile performance" },
  { id: "b_crash", label: "Enable crash reporting" },
  { id: "b_install", label: "Test install/uninstall" },
  { id: "b_saves", label: "Save/load regression test" },
  { id: "m_presskit", label: "Prepare press kit" },
  { id: "m_influencers", label: "Compile influencer list" },
  { id: "m_social", label: "Schedule social posts" },
  { id: "m_landing", label: "Launch landing page" },
  { id: "m_devlog", label: "Write launch devlog" },
  { id: "l_eula", label: "Draft EULA / ToS" },
  { id: "l_privacy", label: "Publish privacy policy" },
  { id: "l_rating", label: "Obtain age rating" },
  { id: "l_credits", label: "Complete credits screen" },
  { id: "l_licenses", label: "Review third-party licenses" },
  { id: "c_discord", label: "Set up Discord server" },
  { id: "c_guidelines", label: "Post community guidelines" },
  { id: "c_bugreport", label: "Prepare bug report form" },
  { id: "c_feedback", label: "Create feedback channel" },
  { id: "c_faq", label: "Write FAQ page" },
  { id: "pl_dayone", label: "Document day-1 patch plan" },
  { id: "pl_monitoring", label: "Set up monitoring dashboard" },
  { id: "pl_hotfix", label: "Establish hotfix process" },
  { id: "pl_roadmap", label: "Publish roadmap" },
  { id: "pl_support", label: "Set up support system" },
];

interface GameJamState {
  active: boolean;
  projectId: string | null;
  startTime: number;
  durationMs: number;
  theme: string;
  phase: "start-coding" | "first-playable" | "polish" | "submit" | "done";
}

const JAM_PHASES = [
  { id: "start-coding" as const, label: "Start Coding", pct: 0 },
  { id: "first-playable" as const, label: "First Playable", pct: 33 },
  { id: "polish" as const, label: "Polish", pct: 66 },
  { id: "submit" as const, label: "Submit", pct: 100 },
] as const;

const JAM_DURATIONS = [
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "48 hours", ms: 48 * 60 * 60 * 1000 },
  { label: "72 hours", ms: 72 * 60 * 60 * 1000 },
] as const;

function getJamState(): GameJamState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("gameforge_game_jam");
  if (!raw) return null;
  return JSON.parse(raw);
}

function saveJamState(state: GameJamState | null) {
  if (!state) {
    localStorage.removeItem("gameforge_game_jam");
    return;
  }
  localStorage.setItem("gameforge_game_jam", JSON.stringify(state));
}

function formatJamTime(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export default function DashboardPage() {
  const { user } = useAuthContext();
  const router = useRouter();

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [qcName, setQcName] = useState("");
  const [qcGenre, setQcGenre] = useState(QC_GENRES[0]);
  const [qcEngine, setQcEngine] = useState(QC_ENGINES[0]);
  const [qcCreating, setQcCreating] = useState(false);

  const handleQuickCreate = useCallback(() => {
    if (!qcName.trim()) return;
    setQcCreating(true);
    const color = QC_COLORS[Math.floor(Math.random() * QC_COLORS.length)];
    const created = addProject({
      name: qcName.trim(),
      description: "",
      engine: qcEngine,
      genre: qcGenre,
      status: "concept",
      coverColor: color,
    });
    router.push(`/dashboard/projects/${created.id}`);
  }, [qcName, qcEngine, qcGenre, router]);

  const [stats, setStats] = useState<Stats>({
    activeProjects: 0,
    openTasks: 0,
    openBugs: 0,
    devlogThisWeek: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentBugs, setRecentBugs] = useState<BugType[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([]);
  const [allProjects, setAllProjects] = useState<(Project & { taskPct: number })[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupLoaded, setBackupLoaded] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [tipOffset, setTipOffset] = useState(0);
  const [tipFeedback, setTipFeedback] = useState<"knew" | "learned" | null>(null);
  const [tipCopied, setTipCopied] = useState(false);
  const [showStandup, setShowStandup] = useState(false);
  const [standupLoading, setStandupLoading] = useState(false);
  const [standupText, setStandupText] = useState("");
  const [standupCopied, setStandupCopied] = useState(false);
  const [devlogCalendar, setDevlogCalendar] = useState<{ date: string; count: number; label: string }[]>([]);
  const [aiWeeklySummary, setAiWeeklySummary] = useState("");
  const [aiWeeklyLoading, setAiWeeklyLoading] = useState(false);

  const [tipsCategory, setTipsCategory] = useState("motivation");
  const [tipsResult, setTipsResult] = useState<Record<string, string>>({});
  const [tipsLoading, setTipsLoading] = useState(false);

  const [badgeStats, setBadgeStats] = useState<ReturnType<typeof getGamificationStats>>({ projects: 0, bugs: 0, devlogs: 0, completedSprints: 0, toolsUsed: 0, aiUses: 0 });
  const [streak, setStreak] = useState<StreakData>({ lastActiveDate: "", currentStreak: 0, longestStreak: 0 });

  const [showJamSetup, setShowJamSetup] = useState(false);
  const [jamState, setJamState] = useState<GameJamState | null>(null);
  const [jamTimeLeft, setJamTimeLeft] = useState("");
  const [jamPct, setJamPct] = useState(0);
  const [jamCustomHours, setJamCustomHours] = useState(48);
  const [jamDurationMs, setJamDurationMs] = useState(48 * 60 * 60 * 1000);
  const [jamThemeLoading, setJamThemeLoading] = useState(false);
  const [jamTheme, setJamTheme] = useState("");

  const [weeklySummary, setWeeklySummary] = useState<{
    tasksCompleted: Task[];
    bugsClosed: BugType[];
    devlogsWritten: DevlogEntry[];
    activeSprint: Sprint | null;
    sprintProgress: number;
    message: string;
  }>({
    tasksCompleted: [],
    bugsClosed: [],
    devlogsWritten: [],
    activeSprint: null,
    sprintProgress: 0,
    message: "",
  });

  const [quickTaskName, setQuickTaskName] = useState("");
  const [quickTaskProjectId, setQuickTaskProjectId] = useState("");
  const [quickTaskConfirm, setQuickTaskConfirm] = useState<string | null>(null);

  const [quickBugTitle, setQuickBugTitle] = useState("");
  const [quickBugProjectId, setQuickBugProjectId] = useState("");
  const [quickBugSeverity, setQuickBugSeverity] = useState<"blocker" | "critical" | "major" | "minor" | "trivial">("major");
  const [quickBugConfirm, setQuickBugConfirm] = useState<string | null>(null);

  const [lifetimeStats, setLifetimeStats] = useState({
    totalTasks: 0,
    totalBugs: 0,
    totalDevlogWords: 0,
    totalAiRequests: 0,
    platformDays: 0,
  });

  const [timeTracking, setTimeTracking] = useState<{
    totalHours: number;
    avgDailyHours: number;
    perProject: { name: string; hours: number; color: string }[];
  }>({ totalHours: 0, avgDailyHours: 0, perProject: [] });

  const [recentlyVisited, setRecentlyVisited] = useState<Array<{ href: string; label: string; ts: number }>>([]);
  const [allRefs, setAllRefs] = useState<Reference[]>([]);
  const [linksCopied, setLinksCopied] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("gameforge_welcome_dismissed") === "true";
    setWelcomeDismissed(dismissed);
    const ts = localStorage.getItem("gameforge_last_backup");
    setLastBackup(ts);
    setBackupLoaded(true);
    setStreak(updateStreak());
    setJamState(getJamState());
    try {
      const stored = JSON.parse(localStorage.getItem("gameforge_recent_pages") || "[]");
      setRecentlyVisited(stored.filter((p: { href: string }) => p.href !== "/dashboard").slice(0, 4));
    } catch { setRecentlyVisited([]); }
  }, []);

  const handleDismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem("gameforge_welcome_dismissed", "true");
  };

  useEffect(() => {
    if (!jamState?.active) return;
    const tick = () => {
      const elapsed = Date.now() - jamState.startTime;
      const remaining = Math.max(0, jamState.durationMs - elapsed);
      setJamTimeLeft(formatJamTime(remaining));
      setJamPct(Math.min(100, Math.round((elapsed / jamState.durationMs) * 100)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [jamState]);

  const generateJamTheme = useCallback(async () => {
    setJamThemeLoading(true);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: "Generate one creative, unique game jam theme. Just the theme, 2-5 words max. Examples: 'Reverse Gravity', 'Only One Bullet', 'Unstable Ground'. Be creative and original. Return ONLY the theme, nothing else." }],
          stream: false,
          max_tokens: 32,
          temperature: 1.0,
        }),
      });
      const d = await response.json();
      const content = d.choices?.[0]?.message?.content || d.choices?.[0]?.message?.reasoning || "Unexpected Connections";
      setJamTheme(content.trim().replace(/^["']|["']$/g, ""));
    } catch {
      setJamTheme("Unexpected Connections");
    } finally {
      setJamThemeLoading(false);
    }
  }, []);

  const startGameJam = useCallback(() => {
    const color = QC_COLORS[Math.floor(Math.random() * QC_COLORS.length)];
    const created = addProject({
      name: `Jam: ${jamTheme || "Untitled Jam"}`,
      description: `Game Jam project. Theme: ${jamTheme || "None"}. Duration: ${Math.round(jamDurationMs / 3600000)}h.`,
      engine: "Unity",
      genre: "Other",
      status: "prototype",
      coverColor: color,
    });

    const state: GameJamState = {
      active: true,
      projectId: created.id,
      startTime: Date.now(),
      durationMs: jamDurationMs,
      theme: jamTheme || "Freestyle",
      phase: "start-coding",
    };
    saveJamState(state);
    setJamState(state);
    setShowJamSetup(false);
  }, [jamTheme, jamDurationMs]);

  const advanceJamPhase = useCallback((phase: GameJamState["phase"]) => {
    if (!jamState) return;
    const updated = { ...jamState, phase };
    saveJamState(updated);
    setJamState(updated);
  }, [jamState]);

  const endGameJam = useCallback(() => {
    saveJamState(null);
    setJamState(null);
    setJamTheme("");
  }, []);

  const handleAiWeeklySummary = async () => {
    setAiWeeklyLoading(true);
    setAiWeeklySummary("");
    try {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const projects = getProjects();
      let tasksDone = 0;
      let bugsFixed = 0;
      let devlogsWritten = 0;
      projects.forEach((p) => {
        tasksDone += getTasks(p.id).filter((t) => t.status === "done" && new Date(t.created_at).getTime() > oneWeekAgo).length;
        bugsFixed += getBugs(p.id).filter((b) => (b.status === "fixed" || b.status === "closed") && new Date(b.created_at).getTime() > oneWeekAgo).length;
        devlogsWritten += getDevlog(p.id).filter((d) => new Date(d.date).getTime() > oneWeekAgo).length;
      });
      const prompt = `Summarize my week of game development across all projects. Tasks done: ${tasksDone}. Bugs fixed: ${bugsFixed}. Devlogs written: ${devlogsWritten}. Write a brief 2-sentence weekly recap.`;
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
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setAiWeeklySummary(content || "No summary available.");
    } catch {
      setAiWeeklySummary("Failed to generate summary.");
    } finally {
      setAiWeeklyLoading(false);
    }
  };

  const tipsMap: Record<string, string> = {
    motivation: "Give a game dev motivational quote. 1 sentence.",
    project_idea: "Suggest a quick game project idea I could build this weekend. 1 sentence.",
    learning: "Suggest one game dev skill to learn today. 1 sentence.",
    productivity: "Give a productivity tip for game developers. 1 sentence.",
    creative_block: "I'm stuck on game dev. Suggest a creative exercise. 1 sentence.",
    bug_hunting: "Give a tip for finding game bugs efficiently. 1 sentence.",
    performance: "Give a game performance optimization tip. 1 sentence.",
    art_direction: "Give a pixel art/game art tip. 1 sentence.",
    sound_design: "Give a game sound design tip. 1 sentence.",
    marketing: "Give an indie game marketing tip. 1 sentence.",
    community: "Give a tip for building a game dev community. 1 sentence.",
    testing: "Suggest a testing strategy for game devs. 1 sentence.",
    time_mgmt: "Give a time management tip for solo game devs. 1 sentence.",
    code_quality: "Give a code quality tip for game programming. 1 sentence.",
    design_pattern: "Suggest a game design pattern to learn. 1 sentence.",
    genre_insight: "Give an interesting insight about game genres. 1 sentence.",
    player_psych: "Share a player psychology insight for game design. 1 sentence.",
    monetization: "Give a monetization insight for indie games. 1 sentence.",
    polish: "Give a game polish tip. 1 sentence.",
    launch: "Give a tip for launching an indie game. 1 sentence.",
  };
  const tipsLabels: Record<string, string> = {
    motivation: "Daily Motivation",
    project_idea: "Project Idea",
    learning: "Learning Suggestion",
    productivity: "Productivity Tip",
    creative_block: "Creative Block Breaker",
    bug_hunting: "Bug Hunting Tip",
    performance: "Performance Tip",
    art_direction: "Art Direction Tip",
    sound_design: "Sound Design Tip",
    marketing: "Marketing Tip",
    community: "Community Building",
    testing: "Testing Strategy",
    time_mgmt: "Time Management",
    code_quality: "Code Quality",
    design_pattern: "Design Pattern",
    genre_insight: "Genre Insight",
    player_psych: "Player Psychology",
    monetization: "Monetization Insight",
    polish: "Polish Tip",
    launch: "Launch Tip",
  };
  const handleGetTip = async () => {
    setTipsLoading(true);
    try {
      const prompt = tipsMap[tipsCategory] || tipsMap.motivation;
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: prompt }], stream: false, max_tokens: 128, temperature: 0.7 }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setTipsResult((prev) => ({ ...prev, [tipsCategory]: content || "No tip available." }));
    } catch {
      setTipsResult((prev) => ({ ...prev, [tipsCategory]: "Failed to generate tip." }));
    } finally {
      setTipsLoading(false);
    }
  };

  const generateStandup = async () => {
    setStandupLoading(true);
    setStandupCopied(false);
    setShowStandup(true);

    const allTasks = getTasks();
    const allBugs = getBugs();

    const doneTasks = allTasks.filter((t) => t.status === "done").slice(0, 10);
    const inProgressTasks = allTasks.filter((t) => t.status === "in-progress");
    const blockerBugs = allBugs.filter(
      (b) => b.status !== "closed" && (b.severity === "blocker" || b.severity === "critical")
    );
    const overdueTasks = allTasks.filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    });

    const doneStr =
      doneTasks.length > 0 ? doneTasks.map((t) => t.title).join(", ") : "No tasks completed recently";
    const inProgressStr =
      inProgressTasks.length > 0 ? inProgressTasks.map((t) => t.title).join(", ") : "No tasks in progress";
    const blockersArr = [
      ...overdueTasks.map((t) => `Overdue: ${t.title}`),
      ...blockerBugs.map((b) => `Bug: ${b.title} (${b.severity})`),
    ];
    const blockersStr = blockersArr.length > 0 ? blockersArr.join(", ") : "None";

    const prompt = `Generate a brief daily standup report for a game developer. Yesterday: ${doneStr}. Today: ${inProgressStr}. Blockers: ${blockersStr}. Format as: Yesterday, Today, Blockers. Keep it concise.`;

    try {
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
      const content =
        data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Failed to generate standup.";
      setStandupText(content);
    } catch {
      setStandupText("Failed to generate standup. Please try again.");
    }

    setStandupLoading(false);
  };

  const handleQuickTask = useCallback(() => {
    if (!quickTaskName.trim() || !quickTaskProjectId) return;
    const projects = getProjects();
    const proj = projects.find((p) => p.id === quickTaskProjectId);
    if (!proj) return;

    addTask({
      projectId: quickTaskProjectId,
      title: quickTaskName.trim(),
      description: "",
      status: "todo",
      priority: "medium",
      sprint: "",
      assignee: "",
    });

    setQuickTaskName("");
    setQuickTaskConfirm(proj.name);
    setTimeout(() => setQuickTaskConfirm(null), 2500);
  }, [quickTaskName, quickTaskProjectId]);

  const handleQuickBug = useCallback(() => {
    if (!quickBugTitle.trim() || !quickBugProjectId) return;
    const projects = getProjects();
    const proj = projects.find((p) => p.id === quickBugProjectId);
    if (!proj) return;

    addBug({
      projectId: quickBugProjectId,
      title: quickBugTitle.trim(),
      description: "",
      severity: quickBugSeverity,
      status: "open",
      platform: "",
      reproSteps: "",
    });

    setQuickBugTitle("");
    setQuickBugConfirm(proj.name);
    setTimeout(() => setQuickBugConfirm(null), 2500);
  }, [quickBugTitle, quickBugProjectId, quickBugSeverity]);

  useEffect(() => {
    const projects = getProjects();
    const tasks = getTasks();
    const bugs = getBugs();
    const devlog = getDevlog();

    setAllRefs(getReferences());

    setTotalProjects(projects.length);
    if (projects.length > 0 && !quickTaskProjectId) {
      setQuickTaskProjectId(projects[0].id);
    }
    if (projects.length > 0 && !quickBugProjectId) {
      setQuickBugProjectId(projects[0].id);
    }
    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

    setAllProjects(
      projects.map((p) => {
        const pTasks = tasks.filter((t) => t.projectId === p.id);
        const done = pTasks.filter((t) => t.status === "done").length;
        return { ...p, taskPct: pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0 };
      })
    );

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    setStats({
      activeProjects: projects.filter(
        (p) => p.status !== "released" && p.status !== "concept"
      ).length,
      openTasks: tasks.filter((t) => t.status !== "done").length,
      openBugs: bugs.filter((b) => b.status !== "closed").length,
      devlogThisWeek: devlog.filter((d) => new Date(d.date) >= weekAgo).length,
    });

    setRecentTasks(
      [...tasks]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5)
    );

    setRecentBugs(
      [...bugs]
        .filter((b) => b.status !== "closed")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 3)
    );

    const sprints = getSprints();
    const projectColorMap = Object.fromEntries(projects.map((p) => [p.id, p.coverColor || "#F59E0B"]));

    const events: ActivityEvent[] = [
      ...tasks.map((t) => ({
        id: `t-${t.id}`,
        type: (t.status === "done" ? "task-completed" : "task-created") as ActivityType,
        title: t.title,
        description: t.status === "done" ? "Completed task" : `Created task \u00b7 ${t.priority} priority`,
        projectName: projectMap[t.projectId] || "Unknown",
        projectColor: projectColorMap[t.projectId] || "#F59E0B",
        timestamp: t.created_at,
      })),
      ...bugs.map((b) => ({
        id: `b-${b.id}`,
        type: (b.status === "closed" ? "bug-fixed" : "bug-filed") as ActivityType,
        title: b.title,
        description: b.status === "closed" ? "Fixed bug" : `Filed bug \u00b7 ${b.severity}`,
        projectName: projectMap[b.projectId] || "Unknown",
        projectColor: projectColorMap[b.projectId] || "#F59E0B",
        timestamp: b.created_at,
      })),
      ...devlog.map((d) => ({
        id: `d-${d.id}`,
        type: "devlog" as ActivityType,
        title: d.title,
        description: `Wrote devlog \u00b7 ${getMoodEmoji(d.mood)} ${d.mood}`,
        projectName: projectMap[d.projectId] || "Unknown",
        projectColor: projectColorMap[d.projectId] || "#F59E0B",
        timestamp: new Date(d.date).toISOString(),
      })),
      ...sprints.map((s) => ({
        id: `s-${s.id}`,
        type: (s.status === "completed" ? "sprint-completed" : "sprint-started") as ActivityType,
        title: s.name,
        description: s.status === "completed" ? "Completed sprint" : s.status === "active" ? "Started sprint" : "Planned sprint",
        projectName: projectMap[s.projectId] || "Unknown",
        projectColor: projectColorMap[s.projectId] || "#F59E0B",
        timestamp: s.created_at,
      })),
    ];

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setActivity(events);

    setProjectHealth(
      projects.map((p) => {
        const pTasks = tasks.filter((t) => t.projectId === p.id);
        const pBugs = bugs.filter(
          (b) => b.projectId === p.id && b.status !== "closed"
        );
        const pSprints = sprints.filter((s) => s.projectId === p.id);
        const activeSprint = pSprints.find((s) => s.status === "active");
        const plannedSprint = pSprints.find((s) => s.status === "planned");
        return {
          id: p.id,
          name: p.name,
          color: p.coverColor || "#F59E0B",
          status: p.status,
          openBugs: pBugs.length,
          totalTasks: pTasks.length,
          doneTasks: pTasks.filter((t) => t.status === "done").length,
          sprintName: activeSprint?.name || plannedSprint?.name || "",
          sprintStatus: activeSprint ? "active" : plannedSprint ? "planned" : pSprints.some((s) => s.status === "completed") ? "completed" : "none" as const,
        };
      })
    );

    const computedFocus: FocusItem[] = [];
    const openTasksSorted = tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99));
    if (openTasksSorted.length > 0) {
      const t = openTasksSorted[0];
      computedFocus.push({
        type: "task",
        title: t.title,
        subtitle: `${t.priority} priority \u00b7 ${projectMap[t.projectId] || "Unknown"}`,
        href: `/dashboard/projects/${t.projectId}/tasks`,
        color: getPriorityColor(t.priority),
        icon: ListTodo,
      });
    }
    const openBugsSorted = bugs
      .filter((b) => b.status !== "closed")
      .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99));
    if (openBugsSorted.length > 0) {
      const b = openBugsSorted[0];
      computedFocus.push({
        type: "bug",
        title: b.title,
        subtitle: `${b.severity} \u00b7 ${projectMap[b.projectId] || "Unknown"}`,
        href: `/dashboard/projects/${b.projectId}/bugs`,
        color: getSeverityColor(b.severity),
        icon: Bug,
      });
    }
    const activeProj = projects.find((p) => p.status !== "concept" && p.status !== "released") || projects[0];
    if (activeProj) {
      const launchRaw = localStorage.getItem(`gameforge_launch_${activeProj.id}`);
      const launchChecked: Record<string, boolean> = launchRaw ? JSON.parse(launchRaw) : {};
      const firstUnchecked = LAUNCH_ITEMS.find((item) => !launchChecked[item.id]);
      if (firstUnchecked) {
        computedFocus.push({
          type: "launch",
          title: firstUnchecked.label,
          subtitle: `Launch checklist \u00b7 ${activeProj.name}`,
          href: `/dashboard/projects/${activeProj.id}/launch`,
          color: "#F59E0B",
          icon: Rocket,
        });
      }
    }
    setFocusItems(computedFocus);

    const weeklyTasksCompleted = tasks.filter(
      (t) => t.status === "done" && new Date(t.created_at) >= weekAgo
    );
    const weeklyBugsClosed = bugs.filter(
      (b) => b.status === "closed" && new Date(b.created_at) >= weekAgo
    );
    const weeklyDevlogs = devlog.filter((d) => new Date(d.date) >= weekAgo);
    const activeSprint = sprints.find((s) => s.status === "active") || null;
    let sprintProg = 0;
    if (activeSprint) {
      const sprintTasks = tasks.filter((t) => t.sprint === activeSprint.name);
      const sprintDone = sprintTasks.filter((t) => t.status === "done").length;
      sprintProg = sprintTasks.length > 0 ? Math.round((sprintDone / sprintTasks.length) * 100) : 0;
    }

    const totalActivity = weeklyTasksCompleted.length + weeklyBugsClosed.length + weeklyDevlogs.length;
    let motivational = "Just getting started. You got this!";
    if (totalActivity >= 10) motivational = "Unstoppable week. Keep that energy!";
    else if (totalActivity >= 5) motivational = "Great week! Solid momentum.";
    else if (totalActivity >= 2) motivational = "Good progress. Keep pushing!";
    else if (totalActivity >= 1) motivational = "Nice start. Let's build on it!";

    setWeeklySummary({
      tasksCompleted: weeklyTasksCompleted,
      bugsClosed: weeklyBugsClosed,
      devlogsWritten: weeklyDevlogs,
      activeSprint,
      sprintProgress: sprintProg,
      message: motivational,
    });

    setBadgeStats(getGamificationStats());

    const totalDevlogWords = devlog.reduce((sum, d) => {
      const text = `${d.title || ""} ${d.content || ""}`;
      return sum + text.split(/\s+/).filter(Boolean).length;
    }, 0);
    const aiRequestsRaw = localStorage.getItem("gameforge_ai_uses");
    const totalAiReqs = aiRequestsRaw ? parseInt(aiRequestsRaw, 10) : 0;
    let firstVisit = localStorage.getItem("gameforge_first_visit");
    if (!firstVisit) {
      firstVisit = new Date().toISOString();
      localStorage.setItem("gameforge_first_visit", firstVisit);
    }
    const platformDays = Math.max(1, Math.floor((Date.now() - new Date(firstVisit).getTime()) / 86400000));
    setLifetimeStats({
      totalTasks: tasks.length,
      totalBugs: bugs.length,
      totalDevlogWords,
      totalAiRequests: totalAiReqs,
      platformDays,
    });

    const perProjectHours: Record<string, { name: string; hours: number; color: string }> = {};
    tasks.forEach((t) => {
      if (!t.loggedHours) return;
      const pid = t.projectId;
      if (!perProjectHours[pid]) {
        const proj = projects.find((p) => p.id === pid);
        perProjectHours[pid] = {
          name: proj?.name || "Unknown",
          hours: 0,
          color: proj?.coverColor || "#F59E0B",
        };
      }
      perProjectHours[pid].hours += t.loggedHours;
    });
    const perProjectArr = Object.values(perProjectHours)
      .filter((p) => p.hours > 0)
      .sort((a, b) => b.hours - a.hours);
    const totalLoggedHours = perProjectArr.reduce((s, p) => s + p.hours, 0);
    setTimeTracking({
      totalHours: totalLoggedHours,
      avgDailyHours: totalLoggedHours > 0 ? Math.round((totalLoggedHours / 7) * 10) / 10 : 0,
      perProject: perProjectArr,
    });

    const calendarData: { date: string; count: number; label: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dayStr = d.toISOString().split("T")[0];
      const count = devlog.filter((entry) => {
        const entryDate = new Date(entry.date).toISOString().split("T")[0];
        return entryDate === dayStr;
      }).length;
      calendarData.push({
        date: dayStr,
        count,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    setDevlogCalendar(calendarData);
  }, []);

  const statCards = [
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: FolderKanban,
      color: "#F59E0B",
      href: "/dashboard/projects",
    },
    {
      label: "Open Tasks",
      value: stats.openTasks,
      icon: ListTodo,
      color: "#3B82F6",
      href: "/dashboard/projects",
    },
    {
      label: "Open Bugs",
      value: stats.openBugs,
      icon: Bug,
      color: "#EF4444",
      href: "/dashboard/projects",
    },
    {
      label: "Devlog This Week",
      value: stats.devlogThisWeek,
      icon: BookOpen,
      color: "#10B981",
      href: "/dashboard/devlog",
    },
  ];

  const quickActions = [
    {
      label: "Write Devlog",
      desc: "Log your progress",
      icon: FileText,
      color: "#10B981",
      href: "/dashboard/devlog",
    },
    {
      label: "Open Tools",
      desc: "Sprite, sound, more",
      icon: Wrench,
      color: "#8B5CF6",
      href: "/dashboard/tools",
    },
    {
      label: "Generate Ideas",
      desc: "Brainstorm concepts",
      icon: Lightbulb,
      color: "#F97316",
      href: "/dashboard/tools/ideas",
    },
  ];

  const taskStatusStyles: Record<string, string> = {
    todo: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
    "in-progress": "bg-[#F59E0B]/10 text-[#F59E0B]",
    testing: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    done: "bg-[#10B981]/10 text-[#10B981]",
  };

  const statusBadge: Record<Project["status"], string> = {
    concept: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
    prototype: "bg-[#3B82F6]/10 text-[#3B82F6]",
    alpha: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    beta: "bg-[#F59E0B]/10 text-[#F59E0B]",
    gold: "bg-[#10B981]/10 text-[#10B981]",
    released: "bg-[#22C55E]/10 text-[#22C55E]",
  };

  const activityConfig: Record<ActivityType, { icon: typeof ListTodo; color: string }> = {
    "task-created": { icon: ListTodo, color: "#3B82F6" },
    "task-completed": { icon: CheckCircle2, color: "#10B981" },
    "bug-filed": { icon: Bug, color: "#EF4444" },
    "bug-fixed": { icon: CheckCircle2, color: "#10B981" },
    "devlog": { icon: PenLine, color: "#F59E0B" },
    "sprint-started": { icon: Rocket, color: "#3B82F6" },
    "sprint-completed": { icon: CheckCircle2, color: "#10B981" },
  };

  const onboardingCards = [
    {
      label: "Create Your First Project",
      desc: "Set up your game, define the genre, pick an engine, and start building.",
      icon: Rocket,
      color: "#F59E0B",
      href: "/dashboard/projects/new",
    },
    {
      label: "Explore Tools",
      desc: "Sprite generators, sound design, color palettes — all the tools you need.",
      icon: Hammer,
      color: "#8B5CF6",
      href: "/dashboard/tools",
    },
    {
      label: "Write a Devlog",
      desc: "Track your progress, mood, and wins. Your future self will thank you.",
      icon: PenLine,
      color: "#10B981",
      href: "/dashboard/devlog",
    },
    {
      label: "Generate Game Ideas",
      desc: "Stuck on what to make? Let AI brainstorm wild concepts for you.",
      icon: Sparkles,
      color: "#F97316",
      href: "/dashboard/tools/ideas",
    },
  ];

  const showWelcomeBanner = totalProjects === 0 && !welcomeDismissed;

  const backupDaysAgo = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)
    : null;
  const backupLabel = !lastBackup
    ? "Never"
    : backupDaysAgo === 0
      ? "Today"
      : backupDaysAgo === 1
        ? "Yesterday"
        : `${backupDaysAgo} days ago`;
  const backupStale = !lastBackup || (backupDaysAgo !== null && backupDaysAgo > 7);

  const exportDashboard = useCallback(() => {
    const projects = getProjects();
    const tasks = getTasks();
    const bugs = getBugs();
    const devlog = getDevlog();
    const sprints = getSprints();

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const totalBugs = bugs.length;
    const closedBugs = bugs.filter((b) => b.status === "closed").length;
    const totalHoursLogged = tasks.reduce((s, t) => s + (t.loggedHours || 0), 0);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTasksDone = tasks.filter((t) => t.status === "done" && new Date(t.created_at) >= weekAgo).length;
    const recentBugsClosed = bugs.filter((b) => b.status === "closed" && new Date(b.created_at) >= weekAgo).length;
    const recentDevlogs = devlog.filter((d) => new Date(d.date) >= weekAgo).length;

    const weeklyActivity = recentTasksDone + recentBugsClosed + recentDevlogs;
    let prodScore = 0;
    if (weeklyActivity >= 10) prodScore = 100;
    else if (weeklyActivity >= 7) prodScore = 85;
    else if (weeklyActivity >= 4) prodScore = 65;
    else if (weeklyActivity >= 2) prodScore = 40;
    else if (weeklyActivity >= 1) prodScore = 20;

    const streakInfo = getStreakData();

    const lines: string[] = [
      `# GameForge Dashboard Report`,
      ``,
      `**Exported:** ${now.toLocaleString()}`,
      `**User:** ${user?.username || "Unknown"}`,
      ``,
      `---`,
      ``,
      `## Overall Stats`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Projects | ${projects.length} |`,
      `| Total Tasks | ${totalTasks} (${doneTasks} done) |`,
      `| Total Bugs | ${totalBugs} (${closedBugs} closed) |`,
      `| Devlog Entries | ${devlog.length} |`,
      `| Hours Logged | ${Math.round(totalHoursLogged * 10) / 10}h |`,
      `| Sprints | ${sprints.length} (${sprints.filter((s) => s.status === "completed").length} completed) |`,
      ``,
      `## Dev Streak`,
      ``,
      `- **Current Streak:** ${streakInfo.currentStreak} day${streakInfo.currentStreak !== 1 ? "s" : ""}`,
      `- **Longest Streak:** ${streakInfo.longestStreak} day${streakInfo.longestStreak !== 1 ? "s" : ""}`,
      ``,
      `## Productivity Score`,
      ``,
      `**${prodScore}/100** — Based on ${weeklyActivity} actions this week (${recentTasksDone} tasks completed, ${recentBugsClosed} bugs closed, ${recentDevlogs} devlogs written)`,
      ``,
      `---`,
      ``,
      `## Projects`,
      ``,
    ];

    if (projects.length === 0) {
      lines.push(`_No projects yet._`, ``);
    } else {
      projects.forEach((p) => {
        const pTasks = tasks.filter((t) => t.projectId === p.id);
        const pDone = pTasks.filter((t) => t.status === "done").length;
        const pBugs = bugs.filter((b) => b.projectId === p.id);
        const pOpenBugs = pBugs.filter((b) => b.status !== "closed").length;
        const pSprints = sprints.filter((s) => s.projectId === p.id);
        const pDevlogs = devlog.filter((d) => d.projectId === p.id);
        const pHours = pTasks.reduce((s, t) => s + (t.loggedHours || 0), 0);

        lines.push(`### ${p.name}`);
        lines.push(``);
        lines.push(`- **Status:** ${p.status}`);
        lines.push(`- **Engine:** ${p.engine} | **Genre:** ${p.genre}`);
        if (p.description) lines.push(`- **Description:** ${p.description}`);
        lines.push(`- **Tasks:** ${pDone}/${pTasks.length} done`);
        lines.push(`- **Open Bugs:** ${pOpenBugs}/${pBugs.length}`);
        lines.push(`- **Devlog Entries:** ${pDevlogs.length}`);
        lines.push(`- **Sprints:** ${pSprints.length}`);
        if (pHours > 0) lines.push(`- **Hours Logged:** ${Math.round(pHours * 10) / 10}h`);
        lines.push(``);
      });
    }

    lines.push(`---`, ``);
    lines.push(`## Recent Activity (Last 7 Days)`, ``);

    if (weeklyActivity === 0) {
      lines.push(`_No activity this week._`, ``);
    } else {
      if (recentTasksDone > 0) lines.push(`- ${recentTasksDone} task${recentTasksDone !== 1 ? "s" : ""} completed`);
      if (recentBugsClosed > 0) lines.push(`- ${recentBugsClosed} bug${recentBugsClosed !== 1 ? "s" : ""} closed`);
      if (recentDevlogs > 0) lines.push(`- ${recentDevlogs} devlog${recentDevlogs !== 1 ? "s" : ""} written`);
      lines.push(``);
    }

    lines.push(`---`, ``);
    lines.push(`*Generated by GameForge*`);

    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gameforge-dashboard-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {showWelcomeBanner ? (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-[#F59E0B]/20 bg-gradient-to-br from-[#F59E0B]/5 via-[#1A1A1A] to-[#1A1A1A] p-8">
            <button
              onClick={handleDismissWelcome}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/10">
                <Rocket className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <h1 className="text-2xl font-bold">
                Welcome to <span className="text-[#F59E0B]">GameForge</span>!
              </h1>
            </div>
            <p className="text-[#9CA3AF] max-w-lg">
              Your all-in-one game development hub. Create projects, track bugs, write devlogs, and use AI-powered tools to ship your game faster.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6B7280] mb-3">Get Started</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {onboardingCards.map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className="group flex items-start gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-all hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
                >
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <card.icon className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm group-hover:text-[#F59E0B] transition-colors">{card.label}</p>
                    <p className="mt-1 text-xs text-[#6B7280] leading-relaxed">{card.desc}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#6B7280] transition-transform group-hover:translate-x-0.5 group-hover:text-[#F59E0B]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Welcome */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back,{" "}
                <span className="text-[#F59E0B]">{user?.username}</span>
              </h1>
              <p className="mt-1 text-[#9CA3AF]">
                Here&apos;s what&apos;s happening with your games.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!jamState?.active && (
                <button
                  onClick={() => {
                    setShowJamSetup(true);
                    if (!jamTheme) generateJamTheme();
                  }}
                  className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-2.5 text-sm font-medium text-[#F59E0B] transition-all hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10"
                >
                  <Timer className="h-4 w-4" />
                  Game Jam Mode
                </button>
              )}
              <button
                onClick={exportDashboard}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
              >
                <Download className="h-4 w-4 text-[#F59E0B]" />
                Export
              </button>
              <button
                onClick={generateStandup}
                disabled={standupLoading}
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F] disabled:opacity-50"
              >
                {standupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-[#F59E0B]" />
                )}
                AI Standup
              </button>
            </div>
          </div>
        </>
      )}

      {/* Active Game Jam Banner */}
      {jamState?.active && (
        <div className="rounded-2xl border-2 border-[#F59E0B]/40 bg-gradient-to-br from-[#F59E0B]/10 via-[#1A1A1A] to-[#1A1A1A] overflow-hidden">
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-[#F59E0B]/15 animate-pulse" />
                  <Timer className="relative h-8 w-8 text-[#F59E0B]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#F59E0B]">Game Jam Mode</h2>
                    <span className="rounded-full bg-[#F59E0B]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] animate-pulse">
                      LIVE
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-[#9CA3AF]">
                    Theme: <span className="font-semibold text-[#F5F5F5]">{jamState.theme}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="font-mono text-3xl font-extrabold tabular-nums text-[#F59E0B]">
                  {jamTimeLeft}
                </div>
                <button
                  onClick={endGameJam}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <X className="h-3 w-3" />
                  End Jam
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#9CA3AF]">Time Elapsed</span>
                <span className="font-medium tabular-nums text-[#F59E0B]">{jamPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] transition-all duration-1000"
                  style={{ width: `${jamPct}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {JAM_PHASES.map((phase) => {
                const isCurrent = jamState.phase === phase.id;
                const phaseIndex = JAM_PHASES.findIndex((p) => p.id === phase.id);
                const currentIndex = JAM_PHASES.findIndex((p) => p.id === jamState.phase);
                const isDone = phaseIndex < currentIndex;
                return (
                  <button
                    key={phase.id}
                    onClick={() => advanceJamPhase(phase.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                      isCurrent
                        ? "border-[#F59E0B] bg-[#F59E0B] text-black"
                        : isDone
                          ? "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"
                          : "border-[#2A2A2A] bg-[#0F0F0F] text-[#6B7280] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                    }`}
                  >
                    {isDone && <CheckCircle2 className="h-3 w-3" />}
                    {isCurrent && <Play className="h-3 w-3" />}
                    {phase.label}
                  </button>
                );
              })}
            </div>

            {jamState.projectId && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-[#6B7280]">
                  Project created for this jam
                </p>
                <Link
                  href={`/dashboard/projects/${jamState.projectId}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:text-[#FBBF24]"
                >
                  Open Project <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 transition-all hover:border-[#F59E0B]/20"
          >
            <div className="flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon
                  className="h-5 w-5"
                  style={{ color: stat.color }}
                />
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="mt-3 text-sm text-[#9CA3AF]">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Task */}
      {allProjects.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Zap className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={quickTaskName}
                onChange={(e) => setQuickTaskName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickTask(); }}
                placeholder="Quick task... press Enter to add"
                className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none"
              />
              <select
                value={quickTaskProjectId}
                onChange={(e) => setQuickTaskProjectId(e.target.value)}
                className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#9CA3AF] outline-none transition-colors focus:border-[#F59E0B]/50"
              >
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleQuickTask}
                disabled={!quickTaskName.trim() || !quickTaskProjectId}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B] text-[#0F0F0F] transition-all hover:bg-[#F59E0B]/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          {quickTaskConfirm && (
            <div className="mt-2 flex items-center gap-1.5 pl-11">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
              <span className="text-xs text-[#10B981]">Task added to {quickTaskConfirm}</span>
            </div>
          )}
          <div className="h-px bg-[#2A2A2A] mt-2" />
          <div className="flex items-center gap-3 mt-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <Bug className="h-4 w-4 text-red-400" />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={quickBugTitle}
                onChange={(e) => setQuickBugTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickBug(); }}
                placeholder="Quick bug... press Enter to file"
                className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none"
              />
              <select
                value={quickBugProjectId}
                onChange={(e) => setQuickBugProjectId(e.target.value)}
                className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#9CA3AF] outline-none transition-colors focus:border-[#F59E0B]/50"
              >
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={quickBugSeverity}
                onChange={(e) => setQuickBugSeverity(e.target.value as "blocker" | "critical" | "major" | "minor" | "trivial")}
                className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#9CA3AF] outline-none transition-colors focus:border-[#F59E0B]/50"
              >
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="trivial">Trivial</option>
              </select>
              <button
                onClick={handleQuickBug}
                disabled={!quickBugTitle.trim() || !quickBugProjectId}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition-all hover:bg-red-500/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Bug className="h-4 w-4" />
              </button>
            </div>
          </div>
          {quickBugConfirm && (
            <div className="mt-1.5 flex items-center gap-1.5 pl-11">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
              <span className="text-xs text-[#10B981]">Bug filed in {quickBugConfirm}</span>
            </div>
          )}
        </div>
      )}

      {/* Dev Streak */}
      <div className="rounded-2xl border border-[#F59E0B]/20 bg-gradient-to-r from-[#F59E0B]/8 via-[#1A1A1A] to-[#1A1A1A] overflow-hidden">
        <div className="flex items-center gap-5 px-6 py-5">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-[#F59E0B]/10" />
            <Flame className="relative h-8 w-8 text-[#F59E0B]" />
            {streak.currentStreak >= 7 && (
              <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] text-[9px] font-bold text-black">
                {streak.currentStreak >= 30 ? "!" : streak.currentStreak >= 14 ? "+" : "~"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tabular-nums text-[#F59E0B]">
                {streak.currentStreak}
              </span>
              <span className="text-sm font-medium text-[#9CA3AF]">
                day{streak.currentStreak !== 1 ? "s" : ""} streak
              </span>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              {getStreakMessage(streak.currentStreak)}
            </p>
          </div>
          <div className="hidden sm:flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2">
              <Trophy className="h-3.5 w-3.5 text-[#F59E0B]" />
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Longest</p>
                <p className="text-sm font-bold tabular-nums text-[#F5F5F5]">
                  {streak.longestStreak} day{streak.longestStreak !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
        {streak.currentStreak > 0 && (
          <div className="border-t border-[#2A2A2A]/50 px-6 py-2.5">
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(streak.currentStreak, 14) }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-all"
                  style={{
                    backgroundColor: `rgba(245, 158, 11, ${0.3 + (i / Math.min(streak.currentStreak, 14)) * 0.7})`,
                    maxWidth: "24px",
                  }}
                />
              ))}
              {streak.currentStreak > 14 && (
                <span className="text-[10px] font-medium text-[#F59E0B]">+{streak.currentStreak - 14}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Devlog Calendar */}
      {devlogCalendar.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#10B981]" />
              <h2 className="text-sm font-semibold">Devlog Activity</h2>
            </div>
            <span className="text-xs text-[#6B7280]">
              {devlogCalendar.reduce((s, d) => s + d.count, 0)} entries in the last 30 days
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start gap-6">
              <div>
                <div className="inline-grid grid-cols-6 gap-[5px]">
                  {devlogCalendar.map((day) => (
                    <div
                      key={day.date}
                      className="group relative h-5 w-5 rounded-[3px] cursor-default transition-all hover:ring-1 hover:ring-white/20"
                      style={{
                        backgroundColor:
                          day.count === 0
                            ? "#1F1F1F"
                            : day.count === 1
                              ? "#14532D"
                              : day.count === 2
                                ? "#166534"
                                : "#10B981",
                      }}
                    >
                      <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1 text-[10px] text-[#D1D5DB] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                        {day.label}: {day.count} {day.count === 1 ? "entry" : "entries"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-[#6B7280]">Less</span>
                  {[0, 1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className="h-2.5 w-2.5 rounded-[2px]"
                      style={{
                        backgroundColor:
                          level === 0
                            ? "#1F1F1F"
                            : level === 1
                              ? "#14532D"
                              : level === 2
                                ? "#166534"
                                : "#10B981",
                      }}
                    />
                  ))}
                  <span className="text-[10px] text-[#6B7280]">More</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-end justify-center">
                <p className="text-3xl font-extrabold tabular-nums text-[#10B981]">
                  {devlogCalendar.reduce((s, d) => s + d.count, 0)}
                </p>
                <p className="text-xs text-[#6B7280]">entries in 30 days</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Focus */}
      {focusItems.length > 0 && (
        <div className="rounded-2xl border border-[#F59E0B]/20 bg-gradient-to-br from-[#F59E0B]/5 via-[#1A1A1A] to-[#1A1A1A] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Target className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <h2 className="font-semibold">
              Today&apos;s <span className="text-[#F59E0B]">Focus</span>
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {focusItems.map((item, i) => {
              const FocusIcon = item.icon;
              return (
                <Link
                  key={i}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F]/60 p-4 transition-all hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
                >
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <FocusIcon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#F5F5F5] transition-colors group-hover:text-[#F59E0B]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#6B7280] transition-transform group-hover:translate-x-0.5 group-hover:text-[#F59E0B]" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* This Week Summary */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#F59E0B]" />
            <h2 className="font-semibold">This Week</h2>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 px-3 py-1">
            <Flame className="h-3 w-3 text-[#F59E0B]" />
            <span className="text-xs font-medium text-[#F59E0B]">{weeklySummary.message}</span>
          </div>
        </div>

        <div className="grid gap-px bg-[#2A2A2A] sm:grid-cols-4">
          <div className="flex flex-col bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
              Tasks Completed
            </div>
            <span className="mt-2 text-2xl font-bold text-[#F5F5F5]">{weeklySummary.tasksCompleted.length}</span>
          </div>
          <div className="flex flex-col bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <Bug className="h-3.5 w-3.5 text-[#EF4444]" />
              Bugs Fixed
            </div>
            <span className="mt-2 text-2xl font-bold text-[#F5F5F5]">{weeklySummary.bugsClosed.length}</span>
          </div>
          <div className="flex flex-col bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <PenLine className="h-3.5 w-3.5 text-[#F59E0B]" />
              Devlog Entries
            </div>
            <span className="mt-2 text-2xl font-bold text-[#F5F5F5]">{weeklySummary.devlogsWritten.length}</span>
          </div>
          <div className="flex flex-col bg-[#1A1A1A] p-4">
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <TrendingUp className="h-3.5 w-3.5 text-[#3B82F6]" />
              Sprint Progress
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-bold text-[#F5F5F5]">{weeklySummary.sprintProgress}%</span>
              {weeklySummary.activeSprint && (
                <span className="truncate text-[10px] text-[#6B7280]">{weeklySummary.activeSprint.name}</span>
              )}
            </div>
          </div>
        </div>

        {(weeklySummary.tasksCompleted.length > 0 || weeklySummary.bugsClosed.length > 0 || weeklySummary.devlogsWritten.length > 0) && (
          <div className="border-t border-[#2A2A2A] px-5 py-3">
            <div className="flex flex-wrap gap-4">
              {weeklySummary.tasksCompleted.length > 0 && (
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">Completed Tasks</p>
                  <div className="space-y-1">
                    {weeklySummary.tasksCompleted.slice(0, 4).map((t) => (
                      <p key={t.id} className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-[#10B981]/60" />
                        <span className="truncate">{t.title}</span>
                      </p>
                    ))}
                    {weeklySummary.tasksCompleted.length > 4 && (
                      <p className="text-[10px] text-[#6B7280]">+{weeklySummary.tasksCompleted.length - 4} more</p>
                    )}
                  </div>
                </div>
              )}
              {weeklySummary.bugsClosed.length > 0 && (
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#EF4444]">Bugs Fixed</p>
                  <div className="space-y-1">
                    {weeklySummary.bugsClosed.slice(0, 4).map((b) => (
                      <p key={b.id} className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-[#EF4444]/60" />
                        <span className="truncate">{b.title}</span>
                      </p>
                    ))}
                    {weeklySummary.bugsClosed.length > 4 && (
                      <p className="text-[10px] text-[#6B7280]">+{weeklySummary.bugsClosed.length - 4} more</p>
                    )}
                  </div>
                </div>
              )}
              {weeklySummary.devlogsWritten.length > 0 && (
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B]">Devlog Entries</p>
                  <div className="space-y-1">
                    {weeklySummary.devlogsWritten.slice(0, 4).map((d) => (
                      <p key={d.id} className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                        <PenLine className="h-3 w-3 shrink-0 text-[#F59E0B]/60" />
                        <span className="truncate">{d.title}</span>
                      </p>
                    ))}
                    {weeklySummary.devlogsWritten.length > 4 && (
                      <p className="text-[10px] text-[#6B7280]">+{weeklySummary.devlogsWritten.length - 4} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {weeklySummary.activeSprint && (
          <div className="border-t border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B7280]">{weeklySummary.activeSprint.name}: {weeklySummary.activeSprint.goal}</span>
              <span className="font-medium tabular-nums text-[#F5F5F5]">{weeklySummary.sprintProgress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${weeklySummary.sprintProgress}%`,
                  backgroundColor: weeklySummary.sprintProgress === 100 ? "#10B981" : weeklySummary.sprintProgress >= 50 ? "#F59E0B" : "#3B82F6",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Productivity Score */}
      {(() => {
        const allTasks = recentTasks.length > 0 || stats.openTasks > 0;
        const totalTasks = stats.openTasks + weeklySummary.tasksCompleted.length;
        const taskCompletionRate = totalTasks > 0
          ? Math.min(1, weeklySummary.tasksCompleted.length / Math.max(totalTasks, 1))
          : 0;

        const totalBugs = stats.openBugs + weeklySummary.bugsClosed.length;
        const bugFixRate = totalBugs > 0
          ? Math.min(1, weeklySummary.bugsClosed.length / Math.max(totalBugs, 1))
          : (allTasks ? 1 : 0);

        const devlogConsistency = Math.min(1, weeklySummary.devlogsWritten.length / 5);

        const sprintVelocity = weeklySummary.sprintProgress / 100;

        const overdueTasks = recentTasks.filter((t) => {
          if (t.status === "done" || !t.dueDate) return false;
          return new Date(t.dueDate) < new Date();
        });
        const overduePenalty = Math.min(1, overdueTasks.length * 0.2);

        const rawScore = Math.round(
          taskCompletionRate * 30 +
          bugFixRate * 20 +
          devlogConsistency * 20 +
          sprintVelocity * 15 +
          (1 - overduePenalty) * 15
        );
        const score = Math.max(0, Math.min(100, rawScore));

        const scoreColor = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : score >= 40 ? "#F97316" : "#EF4444";
        const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs Work" : "Critical";

        const breakdowns = [
          { label: "Task Completion", value: Math.round(taskCompletionRate * 100), weight: 30, color: "#3B82F6" },
          { label: "Bug Fix Rate", value: Math.round(bugFixRate * 100), weight: 20, color: "#EF4444" },
          { label: "Devlog Consistency", value: Math.round(devlogConsistency * 100), weight: 20, color: "#F59E0B" },
          { label: "Sprint Velocity", value: Math.round(sprintVelocity * 100), weight: 15, color: "#8B5CF6" },
          { label: "On-time Delivery", value: Math.round((1 - overduePenalty) * 100), weight: 15, color: "#10B981" },
        ];
        const weakest = [...breakdowns].sort((a, b) => a.value - b.value)[0];

        const tips: Record<string, string> = {
          "Task Completion": "Focus on closing out open tasks before starting new ones.",
          "Bug Fix Rate": "Prioritize squashing bugs — they compound if ignored.",
          "Devlog Consistency": "Write at least one devlog entry per day to build the habit.",
          "Sprint Velocity": "Break tasks into smaller chunks to boost sprint throughput.",
          "On-time Delivery": "Review due dates and rescope overdue tasks realistically.",
        };

        const circumference = 2 * Math.PI * 54;
        const strokeDashoffset = circumference - (score / 100) * circumference;

        return (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-4">
              <Gauge className="h-4 w-4 text-[#F59E0B]" />
              <h2 className="font-semibold">Productivity Score</h2>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="relative flex shrink-0 items-center justify-center">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle
                      cx="70" cy="70" r="54"
                      fill="none"
                      stroke="#2A2A2A"
                      strokeWidth="10"
                    />
                    <circle
                      cx="70" cy="70" r="54"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      transform="rotate(-90 70 70)"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: scoreColor }}>{score}</span>
                    <span className="text-[10px] font-medium text-[#6B7280]">{scoreLabel}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  {breakdowns.map((b) => (
                    <div key={b.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#9CA3AF]">{b.label} <span className="text-[#6B7280]">({b.weight}%)</span></span>
                        <span className="font-medium tabular-nums" style={{ color: b.color }}>{b.value}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${b.value}%`, backgroundColor: b.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {weakest && weakest.value < 80 && (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#F59E0B]/15 bg-[#F59E0B]/5 px-4 py-3">
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                  <div>
                    <p className="text-xs font-semibold text-[#F59E0B]">How to improve</p>
                    <p className="mt-0.5 text-xs text-[#9CA3AF]">
                      Your weakest area is <span className="text-[#F5F5F5] font-medium">{weakest.label}</span> at {weakest.value}%. {tips[weakest.label]}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Your Achievements */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-[#F59E0B]" />
            <h2 className="font-semibold">Your Achievements</h2>
          </div>
          <span className="text-xs text-[#6B7280]">
            {GAMEFORGE_BADGES.filter((b) => b.check(badgeStats)).length}/{GAMEFORGE_BADGES.length} unlocked
          </span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {GAMEFORGE_BADGES.map((badge) => {
              const earned = badge.check(badgeStats);
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className="group relative flex flex-col items-center gap-2 rounded-xl border border-[#2A2A2A] p-3 transition-all hover:bg-[#1F1F1F]"
                  style={earned ? { borderColor: badge.color + "30", backgroundColor: badge.color + "08" } : { opacity: 0.45 }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: earned ? badge.color + "20" : "#2A2A2A" }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: earned ? badge.color : "#6B7280" }}
                    />
                  </div>
                  <p className={`text-center text-[11px] font-medium leading-tight ${earned ? "text-[#F5F5F5]" : "text-[#6B7280]"}`}>
                    {badge.name}
                  </p>
                  <div className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    <p className="font-medium text-[#F5F5F5]">{earned ? badge.description : badge.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {GAMEFORGE_BADGES.filter((b) => b.check(badgeStats)).length === GAMEFORGE_BADGES.length && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-2.5">
              <Trophy className="h-4 w-4 text-[#F59E0B]" />
              <p className="text-xs font-medium text-[#F59E0B]">
                All achievements unlocked! You&apos;re a GameForge master.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => { setQcName(""); setQcGenre(QC_GENRES[0]); setQcEngine(QC_ENGINES[0]); setQcCreating(false); setShowQuickCreate(true); }}
          className="group flex items-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 transition-all hover:border-[#F59E0B]/20 text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/10">
            <Plus className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">New Project</p>
            <p className="text-xs text-[#6B7280]">Start a new game</p>
          </div>
          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[#6B7280] transition-transform group-hover:translate-x-0.5" />
        </button>
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex items-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 transition-all hover:border-[#F59E0B]/20"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${action.color}15` }}
            >
              <action.icon
                className="h-4 w-4"
                style={{ color: action.color }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-xs text-[#6B7280]">{action.desc}</p>
            </div>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[#6B7280] transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      {/* Recently Visited */}
      {recentlyVisited.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-[#9CA3AF]">Recently Visited</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyVisited.map((page) => {
              const Icon = RECENT_PAGE_ICONS[page.href] || FileText;
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  className="group flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-3 transition-all hover:border-[#F59E0B]/20"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F59E0B]/10">
                    <Icon className="h-3.5 w-3.5 text-[#F59E0B]" />
                  </div>
                  <span className="truncate text-sm text-[#D1D5DB] group-hover:text-[#F5F5F5]">{page.label}</span>
                  <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-[#4B5563] transition-transform group-hover:translate-x-0.5 group-hover:text-[#6B7280]" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickCreate(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10">
                  <Plus className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <h2 className="text-lg font-bold">Quick Create</h2>
              </div>
              <button
                onClick={() => setShowQuickCreate(false)}
                className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Project Name</label>
                <input
                  type="text"
                  value={qcName}
                  onChange={(e) => setQcName(e.target.value)}
                  placeholder="My Awesome Game"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleQuickCreate(); }}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Genre</label>
                  <select
                    value={qcGenre}
                    onChange={(e) => setQcGenre(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
                  >
                    {QC_GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Engine</label>
                  <select
                    value={qcEngine}
                    onChange={(e) => setQcEngine(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
                  >
                    {QC_ENGINES.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link
                href="/dashboard/projects/new"
                className="flex items-center gap-1.5 text-xs text-[#6B7280] transition-colors hover:text-[#F59E0B]"
              >
                <ExternalLink className="h-3 w-3" />
                Full form
              </Link>
              <button
                onClick={handleQuickCreate}
                disabled={!qcName.trim() || qcCreating}
                className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-semibold text-[#0F0F0F] transition-all hover:bg-[#F59E0B]/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {qcCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Standup Modal */}
      {showStandup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStandup(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10">
                  <MessageSquare className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Daily Standup</h2>
                  <p className="text-xs text-[#6B7280]">AI-generated from your tasks</p>
                </div>
              </div>
              <button
                onClick={() => setShowStandup(false)}
                className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {standupLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                <p className="text-sm text-[#6B7280]">Generating your standup...</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB] font-sans">
                    {standupText}
                  </pre>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-[#6B7280]">Paste into Discord, Slack, or wherever</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(standupText);
                      setStandupCopied(true);
                      setTimeout(() => setStandupCopied(false), 2000);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                      standupCopied
                        ? "bg-[#10B981] text-[#0F0F0F]"
                        : "bg-[#F59E0B] text-[#0F0F0F] hover:bg-[#F59E0B]/90"
                    }`}
                  >
                    {standupCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game Jam Setup Modal */}
      {showJamSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowJamSetup(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[#F59E0B]/30 bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10">
                  <Timer className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Game Jam Mode</h2>
                  <p className="text-xs text-[#6B7280]">Set up your jam and start building</p>
                </div>
              </div>
              <button
                onClick={() => setShowJamSetup(false)}
                className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B]">Your Jam Theme</p>
                  <button
                    onClick={generateJamTheme}
                    disabled={jamThemeLoading}
                    className="flex items-center gap-1 text-[11px] text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
                  >
                    {jamThemeLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                    Reroll
                  </button>
                </div>
                <p className="text-lg font-bold text-[#F5F5F5]">
                  {jamThemeLoading ? "Generating..." : jamTheme || "Loading..."}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">Jam Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {JAM_DURATIONS.map((d) => (
                    <button
                      key={d.ms}
                      onClick={() => {
                        setJamDurationMs(d.ms);
                        setJamCustomHours(d.ms / 3600000);
                      }}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        jamDurationMs === d.ms
                          ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                          : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#F59E0B]/30"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-[#6B7280]">Custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={jamCustomHours}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 1;
                      setJamCustomHours(h);
                      setJamDurationMs(h * 3600000);
                    }}
                    className="w-20 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1.5 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
                  />
                  <span className="text-xs text-[#6B7280]">hours</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowJamSetup(false)}
                className="rounded-lg border border-[#2A2A2A] px-4 py-2.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                onClick={startGameJam}
                disabled={jamThemeLoading || !jamTheme}
                className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-semibold text-[#0F0F0F] transition-all hover:bg-[#F59E0B]/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4" />
                Start Jam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Your Projects */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Your Projects</h2>
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-1 text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
          >
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {allProjects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group flex w-56 shrink-0 flex-col rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-all hover:border-[#F59E0B]/20 hover:bg-[#1F1F1F]"
              style={{ borderLeftColor: project.coverColor, borderLeftWidth: "3px" }}
            >
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{project.name}</p>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${statusBadge[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span>Tasks</span>
                    <span className="tabular-nums">{project.taskPct}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${project.taskPct}%`,
                        backgroundColor: project.coverColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
          <Link
            href="/dashboard/projects/new"
            className="flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#2A2A2A] bg-[#1A1A1A]/50 p-4 transition-all hover:border-[#F59E0B]/30 hover:bg-[#1F1F1F]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B]/10">
              <Plus className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <span className="text-sm font-medium text-[#6B7280]">New Project</span>
          </Link>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Tasks */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Recent Tasks</h2>
              <Link
                href="/dashboard/projects"
                className="text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: getPriorityColor(task.priority),
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-[#6B7280]">
                      {task.sprint}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
                      taskStatusStyles[task.status] || ""
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
                  No tasks yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Bugs */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Open Bugs</h2>
              <Link
                href="/dashboard/projects"
                className="text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {recentBugs.map((bug) => (
                <div
                  key={bug.id}
                  className="px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: getSeverityColor(bug.severity) }}
                    />
                    <p className="truncate text-sm font-medium">{bug.title}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${getSeverityColor(bug.severity)}15`,
                        color: getSeverityColor(bug.severity),
                      }}
                    >
                      {bug.severity}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {bug.platform}
                    </span>
                  </div>
                </div>
              ))}
              {recentBugs.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
                  No open bugs.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Tracking */}
      {timeTracking.totalHours > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-[#F59E0B]" />
              <h2 className="text-sm font-semibold">Time Tracking</h2>
            </div>
            <span className="text-[10px] text-[#6B7280]">This week</span>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
                <p className="text-2xl font-bold tabular-nums text-[#F5F5F5]">{timeTracking.totalHours}h</p>
                <p className="mt-0.5 text-[10px] text-[#6B7280]">Total Logged</p>
              </div>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
                <p className="text-2xl font-bold tabular-nums text-[#F5F5F5]">{timeTracking.avgDailyHours}h</p>
                <p className="mt-0.5 text-[10px] text-[#6B7280]">Avg / Day</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {timeTracking.perProject.map((proj) => {
                const maxHours = timeTracking.perProject[0]?.hours || 1;
                const pct = Math.round((proj.hours / maxHours) * 100);
                return (
                  <div key={proj.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="truncate text-xs font-medium text-[#D1D5DB]">{proj.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-[#6B7280]">{proj.hours}h</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: proj.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <h2 className="font-semibold">Activity Feed</h2>
          <span className="text-xs text-[#6B7280]">
            {activity.length} event{activity.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="divide-y divide-[#2A2A2A]">
          {(showAllActivity ? activity : activity.slice(0, 8)).map((event) => {
            const config = activityConfig[event.type];
            const Icon = config.icon;
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]"
              >
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2A2A2A]"
                  style={{ backgroundColor: `${config.color}10` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium" style={{ color: config.color }}>
                      {event.description}
                    </span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${event.projectColor}15`,
                        color: event.projectColor,
                      }}
                    >
                      {event.projectName}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-[#F5F5F5]">
                    {event.title}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs text-[#6B7280] mt-0.5">
                  <Clock className="h-3 w-3" />
                  {relativeTime(event.timestamp)}
                </div>
              </div>
            );
          })}
          {activity.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
              No activity yet.
            </p>
          )}
        </div>
        {activity.length > 8 && (
          <button
            onClick={() => setShowAllActivity(!showAllActivity)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-[#2A2A2A] py-3 text-xs font-medium text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
          >
            {showAllActivity ? "Show less" : `View all ${activity.length} events`}
            <ChevronRight className={`h-3 w-3 transition-transform ${showAllActivity ? "-rotate-90" : "rotate-90"}`} />
          </button>
        )}
      </div>

      {/* Project Health */}
      {projectHealth.length >= 2 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                <Activity className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <div>
                <h2 className="font-semibold">Project Health</h2>
                <p className="text-xs text-[#6B7280]">{projectHealth.length} projects at a glance</p>
              </div>
            </div>
            <Link
              href="/dashboard/projects"
              className="text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {projectHealth.map((ph) => {
              const pct =
                ph.totalTasks > 0
                  ? Math.round((ph.doneTasks / ph.totalTasks) * 100)
                  : 0;
              const healthColor =
                ph.openBugs >= 5 || pct < 20
                  ? "#EF4444"
                  : ph.openBugs >= 2 || pct < 60
                    ? "#F59E0B"
                    : "#10B981";
              const sprintLabel: Record<string, string> = {
                active: "In Sprint",
                planned: "Sprint Planned",
                completed: "Sprint Done",
                none: "",
              };
              return (
                <Link
                  key={ph.id}
                  href={`/dashboard/projects/${ph.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#1F1F1F]"
                >
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-[#1A1A1A]"
                    style={{ backgroundColor: healthColor, boxShadow: `0 0 6px ${healthColor}40`, ringColor: healthColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: ph.color }} />
                      <p className="truncate text-sm font-semibold">{ph.name}</p>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${statusBadge[ph.status]}`}
                      >
                        {ph.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: healthColor }}
                        />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-[#9CA3AF]">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {ph.sprintStatus !== "none" && (
                      <span className={`hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        ph.sprintStatus === "active"
                          ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                          : ph.sprintStatus === "planned"
                            ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                            : "bg-[#10B981]/10 text-[#10B981]"
                      }`}>
                        {sprintLabel[ph.sprintStatus]}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                      {ph.doneTasks}/{ph.totalTasks}
                    </div>
                    {ph.openBugs > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-[#EF4444]">
                        <Bug className="h-3.5 w-3.5" />
                        {ph.openBugs}
                      </div>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-[#3A3A3A] transition-colors group-hover:text-[#F59E0B]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Backup Reminder */}
      {backupLoaded && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${
            backupStale
              ? "border-[#F59E0B]/20 bg-[#F59E0B]/5"
              : "border-[#2A2A2A] bg-[#1A1A1A]"
          }`}
        >
          <HardDrive
            className={`h-4 w-4 shrink-0 ${backupStale ? "text-[#F59E0B]" : "text-[#6B7280]"}`}
          />
          <div className="min-w-0 flex-1">
            {backupStale ? (
              <p className="text-sm text-[#F59E0B]">
                {lastBackup
                  ? "It\u2019s been a while since you backed up your data."
                  : "You\u2019ve never backed up your data."}
                {" "}
                <Link
                  href="/dashboard/settings"
                  className="font-medium underline decoration-[#F59E0B]/40 underline-offset-2 transition-colors hover:decoration-[#F59E0B]"
                >
                  Export now?
                </Link>
              </p>
            ) : (
              <p className="text-sm text-[#6B7280]">
                Last backup: {backupLabel}
              </p>
            )}
          </div>
          {!backupStale && (
            <Link
              href="/dashboard/settings"
              className="shrink-0 text-xs text-[#6B7280] transition-colors hover:text-[#F59E0B]"
            >
              Settings
            </Link>
          )}
        </div>
      )}

      {/* Game Dev Tip of the Day */}
      {(() => {
        const { tip, category } = getContextualTip(stats.openBugs, stats.devlogThisWeek, tipOffset);
        return (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Game Dev Tip
                  </p>
                  {category !== "Tip of the Day" && (
                    <span className="rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[9px] font-medium text-[#F59E0B]">
                      {category}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-[#9CA3AF]">
                  {tip}
                </p>
              </div>
              <button
                onClick={() => { setTipOffset((prev) => prev + 1); setTipFeedback(null); setTipCopied(false); }}
                className="shrink-0 rounded-lg border border-[#2A2A2A] px-2.5 py-1 text-xs text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                Next tip
              </button>
            </div>
            <div className="flex items-center gap-2 pl-11">
              <button
                onClick={() => { navigator.clipboard.writeText(tip); setTipCopied(true); setTimeout(() => setTipCopied(false), 2000); }}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${tipCopied ? "border-[#22C55E]/30 text-[#22C55E]" : "border-[#2A2A2A] text-[#6B7280] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"}`}
              >
                {tipCopied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {tipCopied ? "Copied" : "Share"}
              </button>
              <button
                onClick={() => setTipFeedback("knew")}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${tipFeedback === "knew" ? "border-[#6B7280]/50 bg-[#6B7280]/10 text-[#9CA3AF]" : "border-[#2A2A2A] text-[#6B7280] hover:border-[#6B7280]/40 hover:text-[#9CA3AF]"}`}
              >
                I knew this
              </button>
              <button
                onClick={() => setTipFeedback("learned")}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${tipFeedback === "learned" ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#2A2A2A] text-[#6B7280] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"}`}
              >
                <Sparkles className="h-3 w-3" />
                Learned something
              </button>
            </div>
          </div>
        );
      })()}

      {/* AI Weekly Summary */}
      <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F5F5F5]">AI Weekly Summary</h3>
              <p className="text-[10px] text-[#6B7280]">Get an AI-generated recap of your week</p>
            </div>
          </div>
          <button
            onClick={handleAiWeeklySummary}
            disabled={aiWeeklyLoading}
            className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-50"
          >
            {aiWeeklyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiWeeklySummary ? "Refresh" : "Generate"}
          </button>
        </div>
        {aiWeeklyLoading && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
            <span className="text-sm text-[#9CA3AF]">Generating your weekly recap...</span>
          </div>
        )}
        {aiWeeklySummary && !aiWeeklyLoading && (
          <div className="rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] p-4">
            <p className="text-sm leading-relaxed text-[#D1D5DB]">{aiWeeklySummary}</p>
          </div>
        )}
      </div>

      {/* AI Tips Hub — 20 AI micro-features */}
      <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
            <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">AI Tips Hub</h3>
            <p className="text-[10px] text-[#6B7280]">20 AI-powered tips across every game dev topic</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={tipsCategory}
            onChange={(e) => setTipsCategory(e.target.value)}
            className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-xs text-[#D1D5DB] outline-none focus:border-[#F59E0B]/50"
          >
            {Object.entries(tipsLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleGetTip}
            disabled={tipsLoading}
            className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-50"
          >
            {tipsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Get Tip
          </button>
        </div>
        {tipsResult[tipsCategory] && !tipsLoading && (
          <div className="mt-3 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] p-3">
            <p className="text-sm leading-relaxed text-[#D1D5DB]">{tipsResult[tipsCategory]}</p>
          </div>
        )}
        {tipsLoading && (
          <div className="mt-3 flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
            <span className="text-xs text-[#9CA3AF]">Generating {tipsLabels[tipsCategory]}...</span>
          </div>
        )}
        {Object.keys(tipsResult).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.keys(tipsResult).map((key) => (
              <button
                key={key}
                onClick={() => setTipsCategory(key)}
                className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${tipsCategory === key ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30" : "bg-[#1A1A1A] text-[#6B7280] border border-[#2A2A2A] hover:text-[#9CA3AF]"}`}
              >
                {tipsLabels[key]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Platform Stats */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-5 py-3">
          <Activity className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-semibold">Platform Stats</h2>
          <span className="ml-auto text-[10px] text-[#6B7280]">Lifetime</span>
        </div>
        <div className="grid grid-cols-5 gap-px bg-[#2A2A2A]">
          {[
            { label: "Tasks Created", value: lifetimeStats.totalTasks, icon: ListTodo, color: "#3B82F6" },
            { label: "Bugs Filed", value: lifetimeStats.totalBugs, icon: Bug, color: "#EF4444" },
            { label: "Words Written", value: lifetimeStats.totalDevlogWords.toLocaleString(), icon: PenLine, color: "#10B981" },
            { label: "AI Requests", value: lifetimeStats.totalAiRequests, icon: Sparkles, color: "#F59E0B" },
            { label: "Days Active", value: lifetimeStats.platformDays, icon: Clock, color: "#8B5CF6" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center bg-[#1A1A1A] px-3 py-4">
              <stat.icon className="mb-2 h-4 w-4" style={{ color: stat.color }} />
              <span className="text-lg font-bold tabular-nums text-[#F5F5F5]">{stat.value}</span>
              <span className="mt-1 text-center text-[10px] text-[#6B7280]">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Check Links */}
      {allRefs.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-[#F59E0B]" />
              <h2 className="text-sm font-semibold">Check Links</h2>
              <span className="rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-[#F59E0B]">
                {allRefs.length}
              </span>
            </div>
            <button
              onClick={() => {
                const urls = allRefs.filter((r) => r.url).map((r) => r.url).join("\n");
                navigator.clipboard.writeText(urls);
                setLinksCopied(true);
                setTimeout(() => setLinksCopied(false), 2000);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${linksCopied ? "border-[#22C55E]/30 text-[#22C55E]" : "border-[#2A2A2A] text-[#6B7280] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"}`}
            >
              {linksCopied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {linksCopied ? "Copied!" : "Copy All URLs"}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto px-5 py-2">
            {allRefs.filter((r) => r.url).map((ref) => (
              <div key={ref.id} className="flex items-center gap-2 py-1">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]/40" />
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-xs text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
                  title={ref.title}
                >
                  {ref.url}
                </a>
                <span className="shrink-0 text-[10px] text-[#4B5563]">{ref.category}</span>
              </div>
            ))}
            {allRefs.filter((r) => r.url).length === 0 && (
              <p className="py-2 text-center text-xs text-[#6B7280]">No URLs in references</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
