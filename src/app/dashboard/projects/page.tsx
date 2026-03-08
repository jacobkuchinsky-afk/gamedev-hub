"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderKanban,
  ListTodo,
  Bug,
  LayoutGrid,
  List,
  Search,
  ArrowUpDown,
  BookOpen,
  Clock,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  GitCompare,
  X,
  Gamepad2,
  Shield,
  Zap,
  Download,
  Check,
  Loader2,
  Target,
  Upload,
  FileJson,
} from "lucide-react";
import {
  getProjects,
  getTasks,
  getBugs,
  getDevlog,
  getSprints,
  getChangelog,
  getMilestones,
  updateProject,
  addProject,
  addTask,
  addBug,
  addSprint,
  addDevlogEntry,
  addChangelogEntry,
  addMilestone,
  addAsset,
  addReference,
  addPlaytestResponse,
  addSession,
  type Project,
  type Sprint,
  type Milestone,
} from "@/lib/store";

const STATUS_BADGE_STYLES: Record<Project["status"], string> = {
  concept: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
  prototype: "bg-[#3B82F6]/10 text-[#3B82F6]",
  alpha: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  beta: "bg-[#F59E0B]/10 text-[#F59E0B]",
  gold: "bg-[#10B981]/10 text-[#10B981]",
  released: "bg-[#22C55E]/10 text-[#22C55E]",
};

const STATUS_ORDER: Record<Project["status"], number> = {
  released: 0,
  gold: 1,
  beta: 2,
  alpha: 3,
  prototype: 4,
  concept: 5,
};

type SortKey = "name" | "status" | "updated";
type ViewMode = "grid" | "list";
type FilterMode = "active" | "all" | "archived";

type HealthStatus = "green" | "amber" | "red";

interface ProjectData {
  project: Project;
  taskCount: number;
  completedTaskCount: number;
  inProgressTaskCount: number;
  bugCount: number;
  allBugCount: number;
  closedBugCount: number;
  overdueBugCount: number;
  devlogCount: number;
  devlogWords: number;
  loggedHours: number;
  sprintCount: number;
  activeSprintCount: number;
  completedSprintCount: number;
  changelogCount: number;
  activeSprint: Sprint | null;
  nextMilestone: Milestone | null;
  health: HealthStatus;
  criticalBugCount: number;
  missedMilestoneCount: number;
}

interface CompareMetric {
  label: string;
  a: string | number;
  b: string | number;
  higherIsBetter: boolean;
}

function getCompareMetrics(a: ProjectData, b: ProjectData): CompareMetric[] {
  return [
    { label: "Total Tasks", a: a.taskCount, b: b.taskCount, higherIsBetter: true },
    { label: "Completed Tasks", a: a.completedTaskCount, b: b.completedTaskCount, higherIsBetter: true },
    { label: "In-Progress Tasks", a: a.inProgressTaskCount, b: b.inProgressTaskCount, higherIsBetter: true },
    { label: "Completion %", a: a.taskCount ? Math.round((a.completedTaskCount / a.taskCount) * 100) : 0, b: b.taskCount ? Math.round((b.completedTaskCount / b.taskCount) * 100) : 0, higherIsBetter: true },
    { label: "Total Bugs", a: a.allBugCount, b: b.allBugCount, higherIsBetter: false },
    { label: "Open Bugs", a: a.bugCount, b: b.bugCount, higherIsBetter: false },
    { label: "Fixed Bugs", a: a.closedBugCount, b: b.closedBugCount, higherIsBetter: true },
    { label: "Devlog Entries", a: a.devlogCount, b: b.devlogCount, higherIsBetter: true },
    { label: "Devlog Words", a: a.devlogWords, b: b.devlogWords, higherIsBetter: true },
    { label: "Sprints", a: a.sprintCount, b: b.sprintCount, higherIsBetter: true },
    { label: "Active Sprints", a: a.activeSprintCount, b: b.activeSprintCount, higherIsBetter: true },
    { label: "Completed Sprints", a: a.completedSprintCount, b: b.completedSprintCount, higherIsBetter: true },
    { label: "Hours Logged", a: a.loggedHours % 1 === 0 ? a.loggedHours : +a.loggedHours.toFixed(1), b: b.loggedHours % 1 === 0 ? b.loggedHours : +b.loggedHours.toFixed(1), higherIsBetter: true },
    { label: "Changelog Versions", a: a.changelogCount, b: b.changelogCount, higherIsBetter: true },
  ];
}

function metricColor(val: number | string, other: number | string, higherIsBetter: boolean): string {
  const a = typeof val === "string" ? parseFloat(val) || 0 : val;
  const b = typeof other === "string" ? parseFloat(other) || 0 : other;
  if (a === b) return "text-[#9CA3AF]";
  const aWins = higherIsBetter ? a > b : a < b;
  return aWins ? "text-[#10B981]" : "text-[#EF4444]";
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

interface TemplateTask {
  title: string;
  description: string;
  status: "todo" | "in-progress" | "testing" | "done";
  priority: "critical" | "high" | "medium" | "low";
  sprint: string;
  assignee: string;
}

interface TemplateBug {
  title: string;
  description: string;
  severity: "blocker" | "critical" | "major" | "minor" | "trivial";
  status: "open" | "investigating" | "in-progress" | "fixed" | "closed";
  platform: string;
  reproSteps: string;
}

interface TemplateSprint {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "planned";
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  stats: string;
  project: Omit<Project, "id" | "created_at" | "updated_at">;
  tasks: TemplateTask[];
  bugs: TemplateBug[];
  sprints: TemplateSprint[];
  gdd?: Record<string, string>;
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "platformer",
    name: "Platformer Starter",
    description: "Side-scrolling platformer with movement, enemies, and levels pre-configured.",
    icon: Gamepad2,
    color: "#3B82F6",
    stats: "15 tasks \u00b7 5 bugs \u00b7 3 sprints",
    project: { name: "My Platformer", description: "A 2D platformer with tight controls and challenging levels.", engine: "Unity", genre: "Platformer", status: "prototype", coverColor: "#3B82F6" },
    tasks: [
      { title: "Player movement system", description: "Horizontal movement with acceleration curves", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Jump mechanics", description: "Variable height jump with coyote time", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Wall slide & wall jump", description: "Wall detection and directional wall jumps", status: "done", priority: "high", sprint: "Sprint 1", assignee: "" },
      { title: "Level 1 - Tutorial", description: "Teach basic movement and jumping", status: "done", priority: "high", sprint: "Sprint 1", assignee: "" },
      { title: "Level 2 - Forest", description: "Introduce enemies and hazards", status: "done", priority: "high", sprint: "Sprint 2", assignee: "" },
      { title: "Level 3 - Caves", description: "Underground level with limited visibility", status: "in-progress", priority: "medium", sprint: "Sprint 2", assignee: "" },
      { title: "Level 4 - Castle", description: "Final level with boss encounter", status: "todo", priority: "medium", sprint: "Sprint 3", assignee: "" },
      { title: "Basic enemy AI", description: "Patrol and chase behaviors", status: "done", priority: "high", sprint: "Sprint 1", assignee: "" },
      { title: "Flying enemy AI", description: "Airborne enemies with swooping attacks", status: "in-progress", priority: "medium", sprint: "Sprint 2", assignee: "" },
      { title: "Checkpoint system", description: "Save progress at checkpoint flags", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Health & damage system", description: "Hearts, damage, invincibility frames", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Collectibles", description: "Coins and power-ups throughout levels", status: "in-progress", priority: "medium", sprint: "Sprint 2", assignee: "" },
      { title: "Main menu", description: "Title screen with play, options, quit", status: "done", priority: "medium", sprint: "Sprint 1", assignee: "" },
      { title: "Sound effects", description: "Jump, land, damage, collect SFX", status: "todo", priority: "low", sprint: "Sprint 3", assignee: "" },
      { title: "Background music", description: "Unique tracks for each level", status: "todo", priority: "low", sprint: "Sprint 3", assignee: "" },
    ],
    bugs: [
      { title: "Player clips through corners", description: "At high speeds, player passes through corner tiles", severity: "major", status: "open", platform: "All", reproSteps: "Run into a corner tile at full speed" },
      { title: "Double jump not registering", description: "Second jump input occasionally ignored", severity: "critical", status: "open", platform: "All", reproSteps: "Rapidly press jump twice" },
      { title: "Checkpoint not saving", description: "Respawn at level start instead of checkpoint", severity: "major", status: "open", platform: "All", reproSteps: "Touch checkpoint, die, observe spawn" },
      { title: "Enemy stuck in wall", description: "Patrol enemy gets stuck at platform edges", severity: "minor", status: "investigating", platform: "All", reproSteps: "Watch enemy reach end of platform" },
      { title: "Menu animation glitch", description: "Buttons flicker on first load", severity: "trivial", status: "open", platform: "PC", reproSteps: "Launch game, observe main menu" },
    ],
    sprints: [
      { name: "Core Mechanics", goal: "Player movement, combat, and basic level", startDate: "2026-03-01", endDate: "2026-03-07", status: "completed" },
      { name: "Level Design", goal: "Build all 4 levels with enemies and collectibles", startDate: "2026-03-08", endDate: "2026-03-14", status: "active" },
      { name: "Polish & Audio", goal: "SFX, music, particles, and bug fixes", startDate: "2026-03-15", endDate: "2026-03-21", status: "planned" },
    ],
    gdd: {
      elevatorPitch: "A fast-paced 2D platformer where tight controls and creative level design create a satisfying challenge.",
      tagline: "Run. Jump. Conquer.",
      coreVerbs: "Run, Jump, Wall-slide, Collect",
      gameplayLoop: "Enter level -> Navigate obstacles -> Defeat enemies -> Reach exit -> Unlock next",
      visualStyle: "Pixel art with modern lighting and particle effects",
      setting: "A colorful fantasy world with forests, caves, and castles",
    },
  },
  {
    id: "rpg",
    name: "RPG Starter",
    description: "Turn-based RPG with inventory, quests, dialogue, and dungeon crawling ready to build on.",
    icon: Shield,
    color: "#8B5CF6",
    stats: "20 tasks \u00b7 8 bugs \u00b7 4 sprints",
    project: { name: "My RPG", description: "A classic turn-based RPG with deep character progression and an engaging story.", engine: "Godot", genre: "RPG", status: "alpha", coverColor: "#8B5CF6" },
    tasks: [
      { title: "Character creation", description: "Name, class, and stat allocation", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Inventory system", description: "Grid-based inventory with drag and drop", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Quest log", description: "Track active, completed, and failed quests", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Dialogue system", description: "Branching dialogue with NPC portraits", status: "done", priority: "high", sprint: "Sprint 1", assignee: "" },
      { title: "Melee combat", description: "Sword, axe, and mace attack types", status: "done", priority: "critical", sprint: "Sprint 2", assignee: "" },
      { title: "Ranged combat", description: "Bow mechanics with arrow physics", status: "done", priority: "high", sprint: "Sprint 2", assignee: "" },
      { title: "Magic system", description: "Spell casting with mana costs and cooldowns", status: "in-progress", priority: "high", sprint: "Sprint 3", assignee: "" },
      { title: "XP and leveling", description: "Experience curve and stat growth", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Equipment stats", description: "Weapons and armor affect character stats", status: "done", priority: "high", sprint: "Sprint 2", assignee: "" },
      { title: "NPC schedules", description: "NPCs move between locations by time of day", status: "in-progress", priority: "medium", sprint: "Sprint 3", assignee: "" },
      { title: "Town hub map", description: "Central town with shops, inn, and quest givers", status: "done", priority: "high", sprint: "Sprint 2", assignee: "" },
      { title: "Dungeon 1 - Forest Crypt", description: "Introductory dungeon with undead enemies", status: "done", priority: "high", sprint: "Sprint 2", assignee: "" },
      { title: "Dungeon 2 - Ice Caverns", description: "Slippery floors and frost enemies", status: "in-progress", priority: "medium", sprint: "Sprint 3", assignee: "" },
      { title: "Overworld map", description: "Navigate between locations with random encounters", status: "in-progress", priority: "medium", sprint: "Sprint 3", assignee: "" },
      { title: "Crafting system", description: "Combine materials to create items", status: "todo", priority: "medium", sprint: "Sprint 4", assignee: "" },
      { title: "Skill tree UI", description: "Visual skill tree with unlock paths", status: "todo", priority: "medium", sprint: "Sprint 4", assignee: "" },
      { title: "Save/load system", description: "Multiple save slots with auto-save", status: "done", priority: "critical", sprint: "Sprint 1", assignee: "" },
      { title: "Tutorial sequence", description: "Guided intro teaching core mechanics", status: "in-progress", priority: "high", sprint: "Sprint 3", assignee: "" },
      { title: "Boss encounters", description: "Unique boss mechanics and patterns", status: "todo", priority: "high", sprint: "Sprint 4", assignee: "" },
      { title: "Cutscene system", description: "Scripted camera and dialogue sequences", status: "todo", priority: "low", sprint: "Sprint 4", assignee: "" },
    ],
    bugs: [
      { title: "Inventory overflow crash", description: "Game crashes when inventory exceeds 99 items", severity: "blocker", status: "open", platform: "All", reproSteps: "Add 100+ items to inventory" },
      { title: "Quest log not updating", description: "Completed quests stay in active tab", severity: "major", status: "open", platform: "All", reproSteps: "Complete any quest, check log" },
      { title: "Dialogue skipping lines", description: "Fast clicking skips dialogue branches", severity: "major", status: "investigating", platform: "All", reproSteps: "Click rapidly through dialogue" },
      { title: "Damage calculation off", description: "Defense stat not reducing damage correctly", severity: "critical", status: "open", platform: "All", reproSteps: "Equip armor, take damage, compare" },
      { title: "Equipment won't unequip", description: "Clicking unequip does nothing", severity: "major", status: "open", platform: "All", reproSteps: "Equip item, try to unequip" },
      { title: "XP bar not updating", description: "XP bar stays at 0 despite gaining XP", severity: "critical", status: "open", platform: "All", reproSteps: "Kill enemy, check XP bar" },
      { title: "Map transition stutter", description: "1-2 second freeze when changing maps", severity: "minor", status: "investigating", platform: "PC", reproSteps: "Walk between any two maps" },
      { title: "NPC clipping through walls", description: "NPCs walk through solid objects", severity: "minor", status: "open", platform: "All", reproSteps: "Observe NPCs near walls" },
    ],
    sprints: [
      { name: "Core Systems", goal: "Character, inventory, quests, dialogue, saves", startDate: "2026-02-09", endDate: "2026-02-22", status: "completed" },
      { name: "World Building", goal: "Town, first dungeon, overworld, combat basics", startDate: "2026-02-23", endDate: "2026-03-08", status: "completed" },
      { name: "Combat & Balance", goal: "Magic, skills, second dungeon, balancing", startDate: "2026-03-09", endDate: "2026-03-22", status: "active" },
      { name: "Polish & Testing", goal: "Crafting, skill tree, bosses, bug fixes", startDate: "2026-03-23", endDate: "2026-04-05", status: "planned" },
    ],
    gdd: {
      elevatorPitch: "A classic turn-based RPG with deep character progression, branching quests, and a living world that reacts to your choices.",
      tagline: "Your story. Your choices. Your legend.",
      coreVerbs: "Explore, Fight, Talk, Craft, Level Up",
      gameplayLoop: "Accept quest -> Explore dungeon -> Fight enemies -> Collect loot -> Return to town -> Level up -> Repeat",
      visualStyle: "Hand-painted 2D art with detailed character portraits",
      setting: "A medieval fantasy realm threatened by an ancient evil awakening",
    },
  },
  {
    id: "gamejam",
    name: "Game Jam Project",
    description: "Minimal setup for a 48-hour game jam. Just the essentials to start building fast.",
    icon: Zap,
    color: "#F59E0B",
    stats: "8 tasks \u00b7 1 sprint (48h)",
    project: { name: "Jam Entry", description: "A game jam entry - build fast, break things, ship it.", engine: "Godot", genre: "Action", status: "concept", coverColor: "#F59E0B" },
    tasks: [
      { title: "Core mechanic prototype", description: "Get the main gameplay loop working", status: "in-progress", priority: "critical", sprint: "Jam Sprint", assignee: "" },
      { title: "Art style & sprites", description: "Quick art pass - consistent style over polish", status: "todo", priority: "high", sprint: "Jam Sprint", assignee: "" },
      { title: "Sound design", description: "SFX and a simple music loop", status: "todo", priority: "medium", sprint: "Jam Sprint", assignee: "" },
      { title: "3 levels minimum", description: "Intro, main challenge, finale", status: "todo", priority: "high", sprint: "Jam Sprint", assignee: "" },
      { title: "Main menu & UI", description: "Title screen, HUD, game over screen", status: "todo", priority: "medium", sprint: "Jam Sprint", assignee: "" },
      { title: "Win/lose conditions", description: "Clear victory and failure states", status: "todo", priority: "critical", sprint: "Jam Sprint", assignee: "" },
      { title: "Build & export", description: "Web build or desktop executable", status: "todo", priority: "high", sprint: "Jam Sprint", assignee: "" },
      { title: "Submit to jam", description: "Upload, write description, add screenshots", status: "todo", priority: "critical", sprint: "Jam Sprint", assignee: "" },
    ],
    bugs: [],
    sprints: [
      { name: "Jam Sprint", goal: "Ship a complete game in 48 hours", startDate: "2026-03-08", endDate: "2026-03-10", status: "active" },
    ],
    gdd: {
      elevatorPitch: "A fast-paced jam game built in 48 hours. Focus on one core mechanic and polish it.",
      tagline: "Made in 48 hours.",
      coreVerbs: "TBD - pick one core verb and build around it",
      gameplayLoop: "TBD - keep it simple: action -> feedback -> repeat",
    },
  },
];

interface ImportProjectPreview {
  raw: Record<string, unknown>;
  projectName: string;
  projectDescription: string;
  engine: string;
  genre: string;
  status: string;
  taskCount: number;
  bugCount: number;
  sprintCount: number;
  devlogCount: number;
  changelogCount: number;
  milestoneCount: number;
  assetCount: number;
  referenceCount: number;
  playtestCount: number;
  sessionCount: number;
  gddFound: boolean;
}

function parseExportForProject(data: Record<string, unknown>): ImportProjectPreview | null {
  const resolve = (key: string): unknown[] => {
    const val = data[key];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch {}
    }
    return [];
  };

  const projects = resolve("gameforge_projects") as Project[];
  if (projects.length === 0) return null;

  const proj = projects[0];
  const tasks = resolve("gameforge_tasks");
  const bugs = resolve("gameforge_bugs");
  const sprints = resolve("gameforge_sprints");
  const devlog = resolve("gameforge_devlog");
  const changelog = resolve("gameforge_changelog");
  const milestones = resolve("gameforge_milestones");
  const assets = resolve("gameforge_assets");
  const references = resolve("gameforge_references");
  const playtest = resolve("gameforge_playtest");
  const sessions = resolve("gameforge_sessions");

  const projId = proj.id;
  const filterById = (arr: unknown[]) =>
    arr.filter((item) => (item as Record<string, unknown>).projectId === projId);

  const gddKey = Object.keys(data).find((k) => k.startsWith("gameforge_gdd_"));

  return {
    raw: data,
    projectName: proj.name || "Unnamed Project",
    projectDescription: proj.description || "",
    engine: proj.engine || "Unknown",
    genre: proj.genre || "Unknown",
    status: proj.status || "concept",
    taskCount: filterById(tasks).length,
    bugCount: filterById(bugs).length,
    sprintCount: filterById(sprints).length,
    devlogCount: filterById(devlog).length,
    changelogCount: filterById(changelog).length,
    milestoneCount: filterById(milestones).length,
    assetCount: filterById(assets).length,
    referenceCount: filterById(references).length,
    playtestCount: filterById(playtest).length,
    sessionCount: filterById(sessions).length,
    gddFound: !!gddKey,
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projectData, setProjectData] = useState<ProjectData[]>([]);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [filter, setFilter] = useState<FilterMode>("active");
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState<string | null>(null);
  const [importingTemplate, setImportingTemplate] = useState(false);
  const [showImportProject, setShowImportProject] = useState(false);
  const [importProjectPreview, setImportProjectPreview] = useState<ImportProjectPreview | null>(null);
  const [importingProject, setImportingProject] = useState(false);
  const [importProjectError, setImportProjectError] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(() => {
    const allProjects = getProjects();
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const data: ProjectData[] = allProjects.map((p) => {
      const allTasks = getTasks(p.id);
      const allBugs = getBugs(p.id);
      const devlogEntries = getDevlog(p.id);
      const sprints = getSprints(p.id);
      const changelog = getChangelog(p.id);
      const milestones = getMilestones(p.id);

      const overdueBugCount = allBugs.filter(
        (b) => b.status !== "closed" && new Date(b.created_at).getTime() < sevenDaysAgo
      ).length;
      const criticalBugCount = allBugs.filter(
        (b) => b.status !== "closed" && (b.severity === "blocker" || b.severity === "critical")
      ).length;

      const missedMilestones = milestones.filter(
        (m) => m.status !== "completed" && new Date(m.targetDate).getTime() < now
      );

      const activeSprint = sprints.find((s) => s.status === "active") || null;

      const upcomingMilestones = milestones
        .filter((m) => m.status !== "completed" && new Date(m.targetDate).getTime() >= now && new Date(m.targetDate).getTime() <= sevenDaysFromNow)
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
      const nextMilestone = upcomingMilestones[0] || null;

      let health: HealthStatus = "green";
      if (criticalBugCount > 0 || missedMilestones.length > 0) {
        health = "red";
      } else if (overdueBugCount > 0) {
        health = "amber";
      }

      return {
        project: p,
        taskCount: allTasks.length,
        completedTaskCount: allTasks.filter((t) => t.status === "done").length,
        inProgressTaskCount: allTasks.filter((t) => t.status === "in-progress").length,
        bugCount: allBugs.filter((b) => b.status !== "closed").length,
        allBugCount: allBugs.length,
        closedBugCount: allBugs.filter((b) => b.status === "closed").length,
        overdueBugCount,
        devlogCount: devlogEntries.length,
        devlogWords: devlogEntries.reduce((s, e) => s + e.content.split(/\s+/).filter(Boolean).length, 0),
        loggedHours: allTasks.reduce((s, t) => s + (t.loggedHours || 0), 0),
        sprintCount: sprints.length,
        activeSprintCount: sprints.filter((s) => s.status === "active").length,
        completedSprintCount: sprints.filter((s) => s.status === "completed").length,
        changelogCount: changelog.length,
        activeSprint,
        nextMilestone,
        health,
        criticalBugCount,
        missedMilestoneCount: missedMilestones.length,
      };
    });
    setProjectData(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleArchive = (projectId: string, archive: boolean) => {
    updateProject(projectId, { archived: archive });
    loadData();
  };

  const toggleCompareSelect = (projectId: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(projectId)) return prev.filter((id) => id !== projectId);
      if (prev.length >= 2) return [prev[1], projectId];
      return [...prev, projectId];
    });
  };

  const importTemplate = useCallback((templateId: string) => {
    const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setImportingTemplate(true);
    const newProject = addProject(template.project);
    for (const t of template.tasks) {
      addTask({ ...t, projectId: newProject.id });
    }
    for (const b of template.bugs) {
      addBug({ ...b, projectId: newProject.id });
    }
    for (const s of template.sprints) {
      addSprint({ ...s, projectId: newProject.id });
    }
    if (template.gdd) {
      localStorage.setItem(`gameforge_gdd_${newProject.id}`, JSON.stringify(template.gdd));
    }
    setImportingTemplate(false);
    setShowTemplates(false);
    setConfirmTemplate(null);
    loadData();
    router.push(`/dashboard/projects/${newProject.id}`);
  }, [loadData, router]);

  const handleImportFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProjectError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (typeof data !== "object" || data === null || Array.isArray(data)) {
          setImportProjectError("Invalid format. Expected a JSON export file.");
          return;
        }

        const preview = parseExportForProject(data);
        if (!preview) {
          setImportProjectError("No project data found in this file.");
          return;
        }

        setImportProjectPreview(preview);
        setShowImportProject(true);
      } catch {
        setImportProjectError("Failed to parse JSON. Make sure the file is valid.");
      }
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = "";
  }, []);

  const handleConfirmImportProject = useCallback(() => {
    if (!importProjectPreview) return;
    setImportingProject(true);

    const data = importProjectPreview.raw;
    const resolve = (key: string): unknown[] => {
      const val = data[key];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch {}
      }
      return [];
    };

    const projects = resolve("gameforge_projects") as Project[];
    if (projects.length === 0) {
      setImportingProject(false);
      return;
    }

    const oldProject = projects[0];
    const oldId = oldProject.id;

    const { id: _id, created_at: _ca, updated_at: _ua, ...projectData } = oldProject;
    const newProject = addProject(projectData);
    const newId = newProject.id;

    type AnyRecord = Record<string, unknown>;
    const filterById = (arr: unknown[]) =>
      (arr as AnyRecord[]).filter((item) => item.projectId === oldId);

    for (const t of filterById(resolve("gameforge_tasks"))) {
      const { id: _, created_at: __, projectId: ___, ...rest } = t;
      addTask({ ...rest, projectId: newId } as Parameters<typeof addTask>[0]);
    }
    for (const b of filterById(resolve("gameforge_bugs"))) {
      const { id: _, created_at: __, projectId: ___, ...rest } = b;
      addBug({ ...rest, projectId: newId } as Parameters<typeof addBug>[0]);
    }
    for (const s of filterById(resolve("gameforge_sprints"))) {
      const { id: _, created_at: __, projectId: ___, ...rest } = s;
      addSprint({ ...rest, projectId: newId } as Parameters<typeof addSprint>[0]);
    }
    for (const d of filterById(resolve("gameforge_devlog"))) {
      const { id: _, projectId: __, ...rest } = d;
      addDevlogEntry({ ...rest, projectId: newId } as Parameters<typeof addDevlogEntry>[0]);
    }
    for (const c of filterById(resolve("gameforge_changelog"))) {
      const { id: _, projectId: __, ...rest } = c;
      addChangelogEntry({ ...rest, projectId: newId } as Parameters<typeof addChangelogEntry>[0]);
    }
    for (const m of filterById(resolve("gameforge_milestones"))) {
      const { id: _, created_at: __, projectId: ___, ...rest } = m;
      addMilestone({ ...rest, projectId: newId } as Parameters<typeof addMilestone>[0]);
    }
    for (const a of filterById(resolve("gameforge_assets"))) {
      const { id: _, created_at: __, projectId: ___, ...rest } = a;
      addAsset({ ...rest, projectId: newId } as Parameters<typeof addAsset>[0]);
    }
    for (const r of filterById(resolve("gameforge_references"))) {
      const { id: _, created_at: __, projectId: ___, ...rest } = r;
      addReference({ ...rest, projectId: newId } as Parameters<typeof addReference>[0]);
    }
    for (const p of filterById(resolve("gameforge_playtest"))) {
      const { id: _, submitted_at: __, projectId: ___, ...rest } = p;
      addPlaytestResponse({ ...rest, projectId: newId } as Parameters<typeof addPlaytestResponse>[0]);
    }
    for (const s of filterById(resolve("gameforge_sessions"))) {
      const { id: _, created_at: __, projectId: ___, ...rest } = s;
      addSession({ ...rest, projectId: newId } as Parameters<typeof addSession>[0]);
    }

    const gddKey = Object.keys(data).find((k) => k.startsWith("gameforge_gdd_"));
    if (gddKey) {
      const gddData = data[gddKey];
      localStorage.setItem(`gameforge_gdd_${newId}`, typeof gddData === "string" ? gddData : JSON.stringify(gddData));
    }

    setImportingProject(false);
    setShowImportProject(false);
    setImportProjectPreview(null);
    loadData();
    router.push(`/dashboard/projects/${newId}`);
  }, [importProjectPreview, loadData, router]);

  const compareA = projectData.find((d) => d.project.id === compareSelection[0]);
  const compareB = projectData.find((d) => d.project.id === compareSelection[1]);

  const stats = useMemo(() => ({
    activeCount: projectData.filter((d) => !d.project.archived).length,
    archivedCount: projectData.filter((d) => d.project.archived).length,
    totalTasks: projectData.reduce((s, d) => s + d.taskCount, 0),
    totalBugs: projectData.reduce((s, d) => s + d.allBugCount, 0),
    totalLoggedHours: projectData.reduce((s, d) => s + d.loggedHours, 0),
  }), [projectData]);

  const filtered = useMemo(() => {
    let items = [...projectData];

    if (filter === "active") {
      items = items.filter((d) => !d.project.archived);
    } else if (filter === "archived") {
      items = items.filter((d) => d.project.archived);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((d) => d.project.name.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.project.name.localeCompare(b.project.name);
        case "status":
          return (
            STATUS_ORDER[a.project.status] - STATUS_ORDER[b.project.status]
          );
        case "updated":
          return (
            new Date(b.project.updated_at).getTime() -
            new Date(a.project.updated_at).getTime()
          );
        default:
          return 0;
      }
    });

    return items;
  }, [projectData, search, sortBy, filter]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "updated", label: "Last Updated" },
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Manage your game development projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCompareMode((prev) => !prev);
              if (compareMode) {
                setCompareSelection([]);
                setShowCompare(false);
              }
            }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              compareMode
                ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            }`}
          >
            <GitCompare className="h-4 w-4" />
            {compareMode ? "Cancel" : "Compare"}
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            onChange={handleImportFileSelect}
            className="hidden"
          />
          <button
            onClick={() => { setImportProjectError(null); importFileRef.current?.click(); }}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
          >
            <Upload className="h-4 w-4" />
            Import Project
          </button>
          <button
            onClick={() => { setShowTemplates(true); setConfirmTemplate(null); }}
            className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
          >
            <Download className="h-4 w-4" />
            Import Template
          </button>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>
      </div>

      {/* Projects at a Glance */}
      {projectData.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([
            { label: "Active", value: stats.activeCount, icon: FolderKanban, color: "#10B981" },
            { label: "Archived", value: stats.archivedCount, icon: Archive, color: "#6B7280" },
            { label: "Total Tasks", value: stats.totalTasks, icon: ListTodo, color: "#3B82F6" },
            { label: "Total Bugs", value: stats.totalBugs, icon: Bug, color: "#EF4444" },
            { label: "Time Logged", value: `${stats.totalLoggedHours % 1 === 0 ? stats.totalLoggedHours : stats.totalLoggedHours.toFixed(1)}h`, icon: Clock, color: "#F59E0B" },
          ] as const).map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                {stat.label}
              </div>
              <p className="mt-1 text-xl font-bold text-[#F5F5F5]">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2 pl-9 pr-3 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/40"
            />
          </div>
          {/* Quick Filters */}
          <div className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-1 py-1">
            {([
              { key: "active" as FilterMode, label: "Active Only" },
              { key: "all" as FilterMode, label: "All" },
              { key: "archived" as FilterMode, label: "Archived Only" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === opt.key
                    ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "text-[#9CA3AF] hover:text-[#F5F5F5]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#6B7280]" />
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "text-[#9CA3AF] hover:text-[#F5F5F5]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center justify-center rounded-l-lg p-2 transition-colors ${
                view === "grid"
                  ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "text-[#6B7280] hover:text-[#9CA3AF]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center justify-center rounded-r-lg p-2 transition-colors ${
                view === "list"
                  ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "text-[#6B7280] hover:text-[#9CA3AF]"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && projectData.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-20">
          <FolderKanban className="h-12 w-12 text-[#6B7280]" />
          <p className="mt-4 text-lg font-medium text-[#9CA3AF]">
            No projects yet
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create your first game project to get started
          </p>
          <Link
            href="/dashboard/projects/new"
            className="mt-6 flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>
      )}

      {/* No search results */}
      {filtered.length === 0 && projectData.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16">
          <Search className="h-10 w-10 text-[#6B7280]" />
          <p className="mt-3 text-sm text-[#9CA3AF]">
            No projects match &ldquo;{search}&rdquo;
          </p>
        </div>
      )}

      {/* Compare selection bar */}
      {compareMode && (
        <div className="flex items-center justify-between rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-5 py-3">
          <div className="flex items-center gap-3 text-sm">
            <GitCompare className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-[#9CA3AF]">
              {compareSelection.length === 0 && "Select 2 projects to compare"}
              {compareSelection.length === 1 && "Select 1 more project"}
              {compareSelection.length === 2 && "Ready to compare"}
            </span>
            {compareSelection.map((id) => {
              const p = projectData.find((d) => d.project.id === id);
              return p ? (
                <span key={id} className="flex items-center gap-1.5 rounded-md bg-[#2A2A2A] px-2.5 py-1 text-xs text-[#F5F5F5]">
                  <span className="h-2 w-2 rounded" style={{ backgroundColor: p.project.coverColor }} />
                  {p.project.name}
                  <button onClick={() => toggleCompareSelect(id)} className="ml-1 text-[#6B7280] hover:text-[#EF4444]">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
          <button
            onClick={() => setShowCompare(true)}
            disabled={compareSelection.length !== 2}
            className="rounded-lg bg-[#F59E0B] px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Compare
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      {showCompare && compareA && compareB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
              <div className="flex items-center gap-3">
                <GitCompare className="h-5 w-5 text-[#F59E0B]" />
                <h2 className="text-lg font-semibold text-[#F5F5F5]">Project Comparison</h2>
              </div>
              <button
                onClick={() => { setShowCompare(false); setCompareMode(false); setCompareSelection([]); }}
                className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {/* Project headers */}
              <div className="grid grid-cols-[180px_1fr_1fr] border-b border-[#2A2A2A] px-6 py-4">
                <div />
                {[compareA, compareB].map((d) => (
                  <div key={d.project.id} className="flex items-center gap-3 px-3">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: d.project.coverColor }} />
                    <div>
                      <p className="font-semibold text-[#F5F5F5]">{d.project.name}</p>
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${STATUS_BADGE_STYLES[d.project.status]}`}>
                        {d.project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics rows */}
              <div className="divide-y divide-[#2A2A2A]">
                {(() => {
                  const metrics = getCompareMetrics(compareA, compareB);
                  const groups: { title: string; icon: React.ReactNode; rows: CompareMetric[] }[] = [
                    { title: "Tasks", icon: <ListTodo className="h-3.5 w-3.5 text-[#3B82F6]" />, rows: metrics.slice(0, 4) },
                    { title: "Bugs", icon: <Bug className="h-3.5 w-3.5 text-[#EF4444]" />, rows: metrics.slice(4, 7) },
                    { title: "Devlog", icon: <BookOpen className="h-3.5 w-3.5 text-[#8B5CF6]" />, rows: metrics.slice(7, 9) },
                    { title: "Sprints", icon: <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />, rows: metrics.slice(9, 12) },
                    { title: "Overall", icon: <FolderKanban className="h-3.5 w-3.5 text-[#10B981]" />, rows: metrics.slice(12) },
                  ];
                  return groups.map((group) => (
                    <div key={group.title}>
                      <div className="flex items-center gap-2 bg-[#0F0F0F] px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        {group.icon}
                        {group.title}
                      </div>
                      {group.rows.map((m) => (
                        <div key={m.label} className="grid grid-cols-[180px_1fr_1fr] px-6 py-2.5 text-sm hover:bg-[#1F1F1F]">
                          <span className="text-[#9CA3AF]">{m.label}</span>
                          <span className={`px-3 font-mono font-medium ${metricColor(m.a, m.b, m.higherIsBetter)}`}>
                            {typeof m.a === "number" && m.label === "Completion %" ? `${m.a}%` : m.a}
                          </span>
                          <span className={`px-3 font-mono font-medium ${metricColor(m.b, m.a, m.higherIsBetter)}`}>
                            {typeof m.b === "number" && m.label === "Completion %" ? `${m.b}%` : m.b}
                          </span>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="border-t border-[#2A2A2A] px-6 py-3">
              <button
                onClick={() => { setShowCompare(false); setCompareMode(false); setCompareSelection([]); }}
                className="w-full rounded-lg border border-[#2A2A2A] py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-[#F59E0B]" />
                <h2 className="text-lg font-semibold text-[#F5F5F5]">Import from Template</h2>
              </div>
              <button
                onClick={() => { setShowTemplates(false); setConfirmTemplate(null); }}
                className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!confirmTemplate ? (
              <div className="p-6">
                <p className="mb-5 text-sm text-[#9CA3AF]">
                  Start with a pre-built project including tasks, bugs, sprints, and GDD content.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {PROJECT_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => setConfirmTemplate(tmpl.id)}
                      className="group rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-5 text-left transition-all hover:border-[#F59E0B]/30"
                    >
                      <div
                        className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${tmpl.color}15` }}
                      >
                        <tmpl.icon className="h-5 w-5" style={{ color: tmpl.color }} />
                      </div>
                      <h3 className="text-sm font-semibold text-[#F5F5F5] transition-colors group-hover:text-[#F59E0B]">
                        {tmpl.name}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#9CA3AF]">{tmpl.description}</p>
                      <p className="mt-3 text-[10px] font-medium text-[#6B7280]">{tmpl.stats}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              (() => {
                const tmpl = PROJECT_TEMPLATES.find((t) => t.id === confirmTemplate);
                if (!tmpl) return null;
                return (
                  <div className="p-6">
                    <div className="mb-6 flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${tmpl.color}15` }}
                      >
                        <tmpl.icon className="h-6 w-6" style={{ color: tmpl.color }} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#F5F5F5]">{tmpl.name}</h3>
                        <p className="mt-0.5 text-sm text-[#9CA3AF]">{tmpl.description}</p>
                      </div>
                    </div>
                    <div className="mb-6 grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
                        <p className="text-lg font-bold text-[#F5F5F5]">{tmpl.tasks.length}</p>
                        <p className="text-[10px] text-[#6B7280]">Tasks</p>
                      </div>
                      <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
                        <p className="text-lg font-bold text-[#F5F5F5]">{tmpl.bugs.length}</p>
                        <p className="text-[10px] text-[#6B7280]">Bugs</p>
                      </div>
                      <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
                        <p className="text-lg font-bold text-[#F5F5F5]">{tmpl.sprints.length}</p>
                        <p className="text-[10px] text-[#6B7280]">Sprints</p>
                      </div>
                    </div>
                    <p className="mb-4 text-sm text-[#9CA3AF]">
                      This will create a new project called <span className="font-medium text-[#F5F5F5]">&ldquo;{tmpl.project.name}&rdquo;</span> with all seed data. You can rename and customize it after import.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmTemplate(null)}
                        className="flex-1 rounded-lg border border-[#2A2A2A] py-2.5 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F5F5F5]"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => importTemplate(confirmTemplate)}
                        disabled={importingTemplate}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-50"
                      >
                        {importingTemplate ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {importingTemplate ? "Importing..." : "Create Project"}
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Import Project Error */}
      {importProjectError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {importProjectError}
          <button onClick={() => setImportProjectError(null)} className="ml-auto text-[#6B7280] hover:text-[#F5F5F5]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Import Project Preview Modal */}
      {showImportProject && importProjectPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
              <div className="flex items-center gap-3">
                <FileJson className="h-5 w-5 text-[#F59E0B]" />
                <h2 className="text-lg font-semibold text-[#F5F5F5]">Import Project</h2>
              </div>
              <button
                onClick={() => { setShowImportProject(false); setImportProjectPreview(null); }}
                className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/10">
                  <FolderKanban className="h-6 w-6 text-[#F59E0B]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-[#F5F5F5]">
                    {importProjectPreview.projectName}
                  </h3>
                  <p className="mt-0.5 truncate text-sm text-[#9CA3AF]">
                    {importProjectPreview.engine} &middot; {importProjectPreview.genre}
                  </p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                  STATUS_BADGE_STYLES[importProjectPreview.status as Project["status"]] || "bg-[#9CA3AF]/10 text-[#9CA3AF]"
                }`}>
                  {importProjectPreview.status}
                </span>
              </div>

              {importProjectPreview.projectDescription && (
                <p className="mb-5 line-clamp-2 text-sm text-[#6B7280]">
                  {importProjectPreview.projectDescription}
                </p>
              )}

              <div className="mb-5 grid grid-cols-3 gap-2">
                {([
                  { label: "Tasks", count: importProjectPreview.taskCount, color: "#3B82F6" },
                  { label: "Bugs", count: importProjectPreview.bugCount, color: "#EF4444" },
                  { label: "Sprints", count: importProjectPreview.sprintCount, color: "#F59E0B" },
                  { label: "Devlog", count: importProjectPreview.devlogCount, color: "#8B5CF6" },
                  { label: "Changelog", count: importProjectPreview.changelogCount, color: "#10B981" },
                  { label: "Milestones", count: importProjectPreview.milestoneCount, color: "#06B6D4" },
                ] as const).filter(s => s.count > 0).map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
                    <p className="text-lg font-bold text-[#F5F5F5]">{stat.count}</p>
                    <p className="text-[10px]" style={{ color: stat.color }}>{stat.label}</p>
                  </div>
                ))}
                {importProjectPreview.assetCount > 0 && (
                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
                    <p className="text-lg font-bold text-[#F5F5F5]">{importProjectPreview.assetCount}</p>
                    <p className="text-[10px] text-[#EC4899]">Assets</p>
                  </div>
                )}
                {importProjectPreview.gddFound && (
                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3 text-center">
                    <p className="text-lg font-bold text-[#F5F5F5]">1</p>
                    <p className="text-[10px] text-[#F97316]">GDD</p>
                  </div>
                )}
              </div>

              <p className="mb-5 text-sm text-[#9CA3AF]">
                This will create a new project called <span className="font-medium text-[#F5F5F5]">&ldquo;{importProjectPreview.projectName}&rdquo;</span> with all associated data. Existing projects are not affected.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowImportProject(false); setImportProjectPreview(null); }}
                  className="flex-1 rounded-lg border border-[#2A2A2A] py-2.5 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F5F5F5]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImportProject}
                  disabled={importingProject}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-50"
                >
                  {importingProject ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {importingProject ? "Importing..." : "Import Project"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid View */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(
            (
              {
                project,
                taskCount,
                completedTaskCount,
                bugCount,
                overdueBugCount,
                devlogCount,
                activeSprint,
                nextMilestone,
                health,
              },
              index
            ) => {
              const pct = taskCount
                ? Math.round((completedTaskCount / taskCount) * 100)
                : 0;
              const isSelected = compareSelection.includes(project.id);
              const CardWrapper = compareMode ? "div" : Link;
              const healthColors: Record<HealthStatus, string> = {
                green: "bg-[#10B981]",
                amber: "bg-[#F59E0B]",
                red: "bg-[#EF4444]",
              };
              const healthTitles: Record<HealthStatus, string> = {
                green: "Healthy",
                amber: "Has overdue bugs",
                red: "Critical issues",
              };
              const cardProps = compareMode
                ? {
                    onClick: () => toggleCompareSelect(project.id),
                    className: `group cursor-pointer rounded-xl border bg-[#1A1A1A] transition-all animate-slide-up ${
                      isSelected
                        ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/30"
                        : project.archived
                          ? "border-dashed border-[#2A2A2A] opacity-50 hover:opacity-70"
                          : "border-[#2A2A2A] hover:border-[#F59E0B]/30"
                    }`,
                    style: { animationDelay: `${index * 50}ms` },
                  }
                : {
                    href: `/dashboard/projects/${project.id}`,
                    className: `group rounded-xl border bg-[#1A1A1A] transition-all animate-slide-up ${
                      project.archived
                        ? "border-dashed border-[#2A2A2A] opacity-50 hover:opacity-70"
                        : "border-[#2A2A2A] hover:border-[#F59E0B]/30"
                    }`,
                    style: { animationDelay: `${index * 50}ms` },
                  };
              return (
                // @ts-expect-error dynamic element
                <CardWrapper key={project.id} {...cardProps}>
                  <div className="relative">
                    <div
                      className="h-2 rounded-t-xl"
                      style={{ backgroundColor: project.coverColor }}
                    />
                    {compareMode && (
                      <div className={`absolute right-2 top-4 flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        isSelected ? "border-[#F59E0B] bg-[#F59E0B]" : "border-[#6B7280] bg-[#0F0F0F]"
                      }`}>
                        {isSelected && <span className="text-[10px] font-bold text-black">&#10003;</span>}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${healthColors[health]}`}
                          title={healthTitles[health]}
                        />
                        <h3 className="font-semibold text-[#F5F5F5] transition-colors group-hover:text-[#F59E0B]">
                          {project.name}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_STYLES[project.status]}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[#9CA3AF]">
                      {project.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#6B7280]">
                      <span className="rounded bg-[#2A2A2A] px-2 py-0.5">
                        {project.engine}
                      </span>
                      <span className="rounded bg-[#2A2A2A] px-2 py-0.5">
                        {project.genre}
                      </span>
                    </div>

                    {(activeSprint || nextMilestone) && (
                      <div className="mt-3 space-y-1.5">
                        {activeSprint && (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]">
                            <Zap className="h-3 w-3 text-[#3B82F6]" />
                            <span className="truncate">{activeSprint.name}</span>
                          </div>
                        )}
                        {nextMilestone && (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]">
                            <Target className="h-3 w-3 text-[#F59E0B]" />
                            <span className="truncate">{nextMilestone.name}</span>
                            <span className="shrink-0 text-[#6B7280]">
                              {new Date(nextMilestone.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                        <span>
                          {completedTaskCount}/{taskCount} tasks
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-full rounded-full bg-[#F59E0B] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 border-t border-[#2A2A2A] pt-3 text-xs text-[#9CA3AF]">
                      <div className="flex items-center gap-1.5">
                        <ListTodo className="h-3.5 w-3.5" />
                        {taskCount}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bug className="h-3.5 w-3.5" />
                        {bugCount}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {devlogCount}
                      </div>
                      <div className="flex-1" />
                      {overdueBugCount > 0 && (
                        <div className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#EF4444]">
                          <AlertTriangle className="h-3 w-3" />
                          {overdueBugCount} overdue
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                        <Clock className="h-3 w-3" />
                        Updated {relativeTime(project.updated_at)}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchive(project.id, !project.archived);
                        }}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                          project.archived
                            ? "text-[#F59E0B] hover:bg-[#F59E0B]/10"
                            : "text-[#6B7280] opacity-0 group-hover:opacity-100 hover:text-[#F59E0B] hover:bg-[#F59E0B]/10"
                        }`}
                      >
                        {project.archived ? (
                          <ArchiveRestore className="h-3 w-3" />
                        ) : (
                          <Archive className="h-3 w-3" />
                        )}
                        {project.archived ? "Unarchive" : "Archive"}
                      </button>
                    </div>
                  </div>
                </CardWrapper>
              );
            }
          )}
        </div>
      )}

      {/* List View */}
      {view === "list" && filtered.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          {/* Table header */}
          <div className={`grid gap-2 border-b border-[#2A2A2A] px-5 py-3 text-xs font-medium text-[#6B7280] ${compareMode ? "grid-cols-[28px_1fr_100px_100px_70px_80px_110px]" : "grid-cols-[1fr_100px_100px_70px_80px_110px]"}`}>
            {compareMode && <span />}
            <span>Name</span>
            <span>Status</span>
            <span className="text-center">Progress</span>
            <span className="text-center">Bugs</span>
            <span className="text-center">Alerts</span>
            <span className="text-right">Last Activity</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-[#2A2A2A]">
            {filtered.map(
              ({
                project,
                taskCount,
                completedTaskCount,
                bugCount,
                overdueBugCount,
              }) => {
                const pct = taskCount
                  ? Math.round((completedTaskCount / taskCount) * 100)
                  : 0;
                const isSelected = compareSelection.includes(project.id);
                const RowWrapper = compareMode ? "div" : Link;
                const rowProps = compareMode
                  ? {
                      onClick: () => toggleCompareSelect(project.id),
                      className: `group cursor-pointer grid items-center gap-2 px-5 py-3.5 transition-colors grid-cols-[28px_1fr_100px_100px_70px_80px_110px] ${
                        isSelected ? "bg-[#F59E0B]/5" : project.archived ? "opacity-50" : "hover:bg-[#1F1F1F]"
                      }`,
                    }
                  : {
                      href: `/dashboard/projects/${project.id}`,
                      className: `group grid grid-cols-[1fr_100px_100px_70px_80px_110px] items-center gap-2 px-5 py-3.5 transition-colors ${
                        project.archived ? "opacity-50" : "hover:bg-[#1F1F1F]"
                      }`,
                    };
                return (
                  // @ts-expect-error dynamic element
                  <RowWrapper key={project.id} {...rowProps}>
                    {compareMode && (
                      <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        isSelected ? "border-[#F59E0B] bg-[#F59E0B]" : "border-[#6B7280] bg-[#0F0F0F]"
                      }`}>
                        {isSelected && <span className="text-[9px] font-bold text-black">&#10003;</span>}
                      </div>
                    )}
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="h-3 w-3 shrink-0 rounded"
                        style={{ backgroundColor: project.coverColor }}
                      />
                      <span className="truncate text-sm font-medium text-[#F5F5F5]">
                        {project.name}
                      </span>
                    </div>
                    <span
                      className={`justify-self-start rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_STYLES[project.status]}`}
                    >
                      {project.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#2A2A2A]">
                        <div
                          className="h-full rounded-full bg-[#F59E0B]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[10px] text-[#9CA3AF]">
                        {pct}%
                      </span>
                    </div>
                    <span className="text-center text-sm text-[#9CA3AF]">
                      {bugCount}
                    </span>
                    <div className="flex justify-center">
                      {overdueBugCount > 0 ? (
                        <span className="flex items-center gap-1 rounded bg-[#EF4444]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#EF4444]">
                          <AlertTriangle className="h-3 w-3" />
                          {overdueBugCount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#4B5563]">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                        <Clock className="h-3 w-3" />
                        {relativeTime(project.updated_at)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleArchive(project.id, !project.archived);
                        }}
                        className={`rounded p-1 transition-colors ${
                          project.archived
                            ? "text-[#F59E0B] hover:bg-[#F59E0B]/10"
                            : "text-transparent group-hover:text-[#4B5563] hover:!text-[#F59E0B] hover:!bg-[#F59E0B]/10"
                        }`}
                        title={project.archived ? "Unarchive" : "Archive"}
                      >
                        {project.archived ? (
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </RowWrapper>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
