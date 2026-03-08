export interface Project {
  id: string;
  name: string;
  description: string;
  engine: string;
  genre: string;
  status: "concept" | "prototype" | "alpha" | "beta" | "gold" | "released";
  coverColor: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "testing" | "done";
  priority: "critical" | "high" | "medium" | "low";
  sprint: string;
  assignee: string;
  created_at: string;
}

export interface Bug {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: "blocker" | "critical" | "major" | "minor" | "trivial";
  status: "open" | "confirmed" | "fixing" | "testing" | "closed";
  platform: string;
  reproSteps: string;
  created_at: string;
}

export interface DevlogEntry {
  id: string;
  projectId: string;
  title: string;
  content: string;
  mood: "productive" | "struggling" | "breakthrough" | "grinding";
  date: string;
}

const PROJECTS_KEY = "gameforge_projects";
const TASKS_KEY = "gameforge_tasks";
const BUGS_KEY = "gameforge_bugs";
const DEVLOG_KEY = "gameforge_devlog";

const SEED_PROJECTS: Project[] = [
  {
    id: "proj_001",
    name: "Constellar",
    description:
      "A space exploration game where players navigate procedurally generated star systems, build outposts, and uncover ancient alien artifacts. Features real-time combat and base building.",
    engine: "Custom Engine",
    genre: "Space Exploration / Action",
    status: "beta",
    coverColor: "#6366F1",
    created_at: "2025-11-01T10:00:00Z",
    updated_at: "2026-03-07T14:00:00Z",
  },
  {
    id: "proj_002",
    name: "Dungeon Crawl",
    description:
      "Classic roguelike dungeon crawler with procedural generation, permadeath, and loot-driven progression. Turn-based combat with ASCII-inspired pixel art.",
    engine: "Godot",
    genre: "Roguelike / RPG",
    status: "concept",
    coverColor: "#EF4444",
    created_at: "2026-02-15T08:00:00Z",
    updated_at: "2026-02-15T08:00:00Z",
  },
  {
    id: "proj_003",
    name: "Space Pirates",
    description:
      "Multiplayer co-op game where players crew a pirate spaceship. Assign roles (captain, engineer, gunner), raid cargo ships, and upgrade your vessel.",
    engine: "Unity",
    genre: "Co-op / Action",
    status: "prototype",
    coverColor: "#F59E0B",
    created_at: "2026-01-20T12:00:00Z",
    updated_at: "2026-03-01T09:00:00Z",
  },
];

const SEED_TASKS: Task[] = [
  {
    id: "task_001",
    projectId: "proj_001",
    title: "Fix shield generator VFX",
    description: "Shield bubble effect flickers at low FPS. Need to switch to shader-based rendering.",
    status: "in-progress",
    priority: "high",
    sprint: "Sprint 14",
    assignee: "JacobK",
    created_at: "2026-03-05T10:00:00Z",
  },
  {
    id: "task_002",
    projectId: "proj_001",
    title: "Balance weapon damage values",
    description: "Laser cannon is overpowered in PvE. Reduce base damage by 15% and increase cooldown.",
    status: "todo",
    priority: "medium",
    sprint: "Sprint 14",
    assignee: "JacobK",
    created_at: "2026-03-05T10:30:00Z",
  },
  {
    id: "task_003",
    projectId: "proj_001",
    title: "Implement save/load system",
    description: "Add serialization for player state, inventory, and discovered star systems.",
    status: "done",
    priority: "critical",
    sprint: "Sprint 13",
    assignee: "JacobK",
    created_at: "2026-02-20T08:00:00Z",
  },
  {
    id: "task_004",
    projectId: "proj_001",
    title: "Add tutorial sequence",
    description: "Guide new players through first 5 minutes: movement, scanning, docking, combat basics.",
    status: "todo",
    priority: "high",
    sprint: "Sprint 15",
    assignee: "JacobK",
    created_at: "2026-03-06T09:00:00Z",
  },
  {
    id: "task_005",
    projectId: "proj_001",
    title: "Optimize asteroid field rendering",
    description: "Large asteroid fields cause frame drops. Implement LOD and culling.",
    status: "testing",
    priority: "high",
    sprint: "Sprint 14",
    assignee: "JacobK",
    created_at: "2026-03-04T14:00:00Z",
  },
  {
    id: "task_006",
    projectId: "proj_001",
    title: "Design main menu UI",
    description: "New game, continue, settings, credits. Animated starfield background.",
    status: "done",
    priority: "medium",
    sprint: "Sprint 12",
    assignee: "JacobK",
    created_at: "2026-02-10T11:00:00Z",
  },
  {
    id: "task_007",
    projectId: "proj_001",
    title: "Add sound effects for docking",
    description: "Magnetic clamp sound, airlock hiss, docking confirmation chime.",
    status: "todo",
    priority: "low",
    sprint: "Sprint 15",
    assignee: "JacobK",
    created_at: "2026-03-06T10:00:00Z",
  },
  {
    id: "task_008",
    projectId: "proj_001",
    title: "Implement trading system",
    description: "Buy/sell resources at space stations. Dynamic pricing based on supply/demand.",
    status: "in-progress",
    priority: "high",
    sprint: "Sprint 14",
    assignee: "JacobK",
    created_at: "2026-03-03T08:00:00Z",
  },
  {
    id: "task_009",
    projectId: "proj_002",
    title: "Create project document",
    description: "Write GDD covering core loop, mechanics, art style, and target platforms.",
    status: "todo",
    priority: "high",
    sprint: "Sprint 1",
    assignee: "JacobK",
    created_at: "2026-02-15T08:30:00Z",
  },
  {
    id: "task_010",
    projectId: "proj_003",
    title: "Prototype ship movement",
    description: "Basic 3D ship controller with thrust, rotation, and drift physics.",
    status: "in-progress",
    priority: "critical",
    sprint: "Sprint 2",
    assignee: "JacobK",
    created_at: "2026-01-22T10:00:00Z",
  },
];

const SEED_BUGS: Bug[] = [
  {
    id: "bug_001",
    projectId: "proj_001",
    title: "Player clips through station walls",
    description: "When boosting into docking bay at high speed, collision detection fails and player passes through geometry.",
    severity: "critical",
    status: "confirmed",
    platform: "Windows",
    reproSteps: "1. Approach station at max speed\n2. Boost into docking bay entrance\n3. Player passes through wall",
    created_at: "2026-03-06T15:00:00Z",
  },
  {
    id: "bug_002",
    projectId: "proj_001",
    title: "Inventory duplication glitch",
    description: "Rapidly clicking transfer button duplicates items between ship cargo and station storage.",
    severity: "major",
    status: "fixing",
    platform: "All",
    reproSteps: "1. Open station storage\n2. Click transfer rapidly on any item\n3. Item count increases in both inventories",
    created_at: "2026-03-05T11:00:00Z",
  },
  {
    id: "bug_003",
    projectId: "proj_001",
    title: "Music doesn't loop in asteroid belt",
    description: "Background music stops after first play in asteroid belt zones. Silent until zone change.",
    severity: "minor",
    status: "open",
    platform: "All",
    reproSteps: "1. Enter asteroid belt\n2. Wait for track to finish (~3 min)\n3. No music plays after",
    created_at: "2026-03-04T09:00:00Z",
  },
  {
    id: "bug_004",
    projectId: "proj_001",
    title: "Star map tooltip overlaps edge",
    description: "When hovering stars near the edge of the map, tooltip renders off-screen.",
    severity: "trivial",
    status: "open",
    platform: "Windows",
    reproSteps: "1. Open star map\n2. Hover over a star in the top-right corner\n3. Tooltip is clipped",
    created_at: "2026-03-03T16:00:00Z",
  },
  {
    id: "bug_005",
    projectId: "proj_001",
    title: "Game crashes on alt-tab during loading",
    description: "Alt-tabbing during the initial loading screen causes a hard crash with no error dialog.",
    severity: "blocker",
    status: "open",
    platform: "Windows",
    reproSteps: "1. Launch game\n2. During loading screen, alt-tab\n3. Game crashes to desktop",
    created_at: "2026-03-07T08:00:00Z",
  },
];

const SEED_DEVLOG: DevlogEntry[] = [
  {
    id: "devlog_001",
    projectId: "proj_001",
    title: "Save system finally works",
    content:
      "After three days of wrestling with serialization, the save/load system is finally solid. Player state, inventory, discovered systems — all persist correctly. The trick was using a custom serializer for the procedural star map data instead of trying to serialize the entire scene graph. Feels good to check this off.",
    mood: "breakthrough",
    date: "2026-02-28",
  },
  {
    id: "devlog_002",
    projectId: "proj_001",
    title: "Beta build pushed, bugs incoming",
    content:
      "Pushed the first beta build to testers today. Already getting reports about collision issues and an inventory dupe glitch. Expected, but still a lot to fix. The trading system prototype is looking promising though — dynamic pricing makes the economy feel alive. Need to focus on stability before adding more features.",
    mood: "grinding",
    date: "2026-03-05",
  },
  {
    id: "devlog_003",
    projectId: "proj_001",
    title: "Performance pass on asteroid fields",
    content:
      "Spent the day optimizing asteroid rendering. Implemented LOD (level of detail) switching and frustum culling. Went from 25 FPS to steady 60 in dense fields. Still need to test on lower-end hardware but this is a huge win. The visual difference between LOD levels is barely noticeable, which is exactly what you want.",
    mood: "productive",
    date: "2026-03-06",
  },
];

function getOrSeed<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(seed));
    return [...seed];
  }
  return JSON.parse(raw);
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getProjects(): Project[] {
  return getOrSeed(PROJECTS_KEY, SEED_PROJECTS);
}

export function getProject(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function addProject(project: Omit<Project, "id" | "created_at" | "updated_at">): Project {
  const projects = getProjects();
  const newProject: Project = {
    ...project,
    id: `proj_${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  projects.push(newProject);
  save(PROJECTS_KEY, projects);
  return newProject;
}

export function getTasks(projectId?: string): Task[] {
  const tasks = getOrSeed(TASKS_KEY, SEED_TASKS);
  return projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
}

export function addTask(task: Omit<Task, "id" | "created_at">): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: `task_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  tasks.push(newTask);
  save(TASKS_KEY, tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | undefined {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  tasks[idx] = { ...tasks[idx], ...updates };
  save(TASKS_KEY, tasks);
  return tasks[idx];
}

export function getBugs(projectId?: string): Bug[] {
  const bugs = getOrSeed(BUGS_KEY, SEED_BUGS);
  return projectId ? bugs.filter((b) => b.projectId === projectId) : bugs;
}

export function addBug(bug: Omit<Bug, "id" | "created_at">): Bug {
  const bugs = getBugs();
  const newBug: Bug = {
    ...bug,
    id: `bug_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  bugs.push(newBug);
  save(BUGS_KEY, bugs);
  return newBug;
}

export function updateBug(id: string, updates: Partial<Bug>): Bug | undefined {
  const bugs = getBugs();
  const idx = bugs.findIndex((b) => b.id === id);
  if (idx === -1) return undefined;
  bugs[idx] = { ...bugs[idx], ...updates };
  save(BUGS_KEY, bugs);
  return bugs[idx];
}

export function getDevlog(projectId?: string): DevlogEntry[] {
  const entries = getOrSeed(DEVLOG_KEY, SEED_DEVLOG);
  return projectId ? entries.filter((e) => e.projectId === projectId) : entries;
}

export function addDevlogEntry(entry: Omit<DevlogEntry, "id">): DevlogEntry {
  const entries = getDevlog();
  const newEntry: DevlogEntry = {
    ...entry,
    id: `devlog_${Date.now()}`,
  };
  entries.push(newEntry);
  save(DEVLOG_KEY, entries);
  return newEntry;
}

export function getStatusColor(status: Project["status"]): string {
  const colors: Record<Project["status"], string> = {
    concept: "#9CA3AF",
    prototype: "#F59E0B",
    alpha: "#3B82F6",
    beta: "#8B5CF6",
    gold: "#F59E0B",
    released: "#10B981",
  };
  return colors[status];
}

export function getPriorityColor(priority: Task["priority"]): string {
  const colors: Record<Task["priority"], string> = {
    critical: "#EF4444",
    high: "#F59E0B",
    medium: "#3B82F6",
    low: "#9CA3AF",
  };
  return colors[priority];
}

export function getSeverityColor(severity: Bug["severity"]): string {
  const colors: Record<Bug["severity"], string> = {
    blocker: "#EF4444",
    critical: "#F97316",
    major: "#F59E0B",
    minor: "#3B82F6",
    trivial: "#9CA3AF",
  };
  return colors[severity];
}

export function getMoodEmoji(mood: DevlogEntry["mood"]): string {
  const emojis: Record<DevlogEntry["mood"], string> = {
    productive: "🔥",
    struggling: "😤",
    breakthrough: "🎉",
    grinding: "⚙️",
  };
  return emojis[mood];
}
