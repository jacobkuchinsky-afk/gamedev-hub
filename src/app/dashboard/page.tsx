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
} from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import {
  getProjects,
  getTasks,
  getBugs,
  getDevlog,
  getSprints,
  getStatusColor,
  getPriorityColor,
  getSeverityColor,
  getMoodEmoji,
  addProject,
  type Project,
  type Task,
  type Bug as BugType,
  type DevlogEntry,
  type Sprint,
} from "@/lib/store";

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
  status: Project["status"];
  openBugs: number;
  totalTasks: number;
  doneTasks: number;
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

const GAME_DEV_TIPS = [
  "Playtest early and often — don't wait until it's \"ready.\"",
  "Your first idea is rarely your best. Iterate ruthlessly.",
  "Polish the first 5 minutes of your game before anything else.",
  "Make the controls feel good before adding content.",
  "Scope down. Then scope down again. Ship something small and complete.",
  "Juice it up: screen shake, particles, and sound make everything feel better.",
  "Write your game's store description before you build it. Clarity comes from constraints.",
  "If a mechanic isn't fun in a gray-box prototype, art won't save it.",
  "Keep a devlog — future you will thank present you.",
  "Don't optimize until you know what's actually slow. Profile first.",
  "Playtesters don't lie. If they're confused, your design is the problem.",
  "Ship your \"embarrassing\" prototype. The feedback is worth more than your pride.",
  "Sound design is 50% of the experience. Don't leave it for last.",
  "Build the game you want to play, not the game you think will sell.",
  "Deadlines create decisions. Set one, even if it's arbitrary.",
  "Every feature you add is a feature you have to debug, balance, and support.",
  "Reward the player constantly. Micro-feedback loops keep people hooked.",
  "If your tutorial is boring, players will never see the fun parts.",
  "Learn from games you dislike too — knowing what doesn't work is valuable.",
  "Accessibility isn't optional. Rebindable keys and subtitles go a long way.",
  "Version control isn't just for teams. Solo devs need git too.",
  "Take breaks. Your subconscious solves design problems while you rest.",
  "Consistent art style beats expensive art. Cohesion is king.",
  "Test on the lowest-spec machine you can find. Not everyone has a gaming rig.",
  "Make failing fun. The best games make you want to try again immediately.",
  "Don't build an engine. Build a game. You can refactor later.",
  "Watch someone play your game without saying a word. It's painful and invaluable.",
  "Color palette and lighting set the mood more than detailed textures.",
  "If you can't explain your game in one sentence, simplify it.",
  "Back up your project. Right now. Today. Seriously.",
  "Your game's feel is defined by the first 3 seconds of input response.",
  "Steal mechanics, not aesthetics. Combine ideas from different genres.",
  "Finish something. An okay finished game teaches more than a perfect unfinished one.",
  "Add a screenshot key. You'll need marketing material eventually.",
  "Analytics are your friend — track where players quit to find your weak spots.",
];


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

  useEffect(() => {
    const dismissed = localStorage.getItem("gameforge_welcome_dismissed") === "true";
    setWelcomeDismissed(dismissed);
    const ts = localStorage.getItem("gameforge_last_backup");
    setLastBackup(ts);
    setBackupLoaded(true);
  }, []);

  const handleDismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem("gameforge_welcome_dismissed", "true");
  };

  useEffect(() => {
    const projects = getProjects();
    const tasks = getTasks();
    const bugs = getBugs();
    const devlog = getDevlog();

    setTotalProjects(projects.length);
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
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          openBugs: pBugs.length,
          totalTasks: pTasks.length,
          doneTasks: pTasks.filter((t) => t.status === "done").length,
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
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back,{" "}
              <span className="text-[#F59E0B]">{user?.username}</span>
            </h1>
            <p className="mt-1 text-[#9CA3AF]">
              Here&apos;s what&apos;s happening with your games.
            </p>
          </div>
        </>
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
      {projectHealth.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
            <h2 className="font-semibold">Project Health</h2>
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
              return (
                <Link
                  key={ph.id}
                  href={`/dashboard/projects/${ph.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#1F1F1F]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{ph.name}</p>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${statusBadge[ph.status]}`}
                      >
                        {ph.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              pct === 100
                                ? "#10B981"
                                : pct >= 50
                                  ? "#F59E0B"
                                  : "#3B82F6",
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-[#9CA3AF]">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#9CA3AF]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                    {ph.doneTasks}/{ph.totalTasks}
                  </div>
                  {ph.openBugs > 0 && (
                    <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#EF4444]">
                      <Bug className="h-3.5 w-3.5" />
                      {ph.openBugs}
                    </div>
                  )}
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
        const dayIndex = Math.floor(Date.now() / 86400000);
        const tipIndex = (dayIndex + tipOffset) % GAME_DEV_TIPS.length;
        const tip = GAME_DEV_TIPS[tipIndex < 0 ? tipIndex + GAME_DEV_TIPS.length : tipIndex];
        return (
          <div className="flex items-start gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Game Dev Tip of the Day
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#9CA3AF]">
                {tip}
              </p>
            </div>
            <button
              onClick={() => setTipOffset((prev) => prev + 1)}
              className="shrink-0 rounded-lg border border-[#2A2A2A] px-2.5 py-1 text-xs text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              Next tip
            </button>
          </div>
        );
      })()}
    </div>
  );
}
