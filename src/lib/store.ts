export interface Project {
  id: string;
  name: string;
  description: string;
  engine: string;
  genre: string;
  status: "concept" | "prototype" | "alpha" | "beta" | "gold" | "released";
  coverColor: string;
  archived?: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskTag = "UI" | "Gameplay" | "Art" | "Audio" | "Backend" | "Polish" | "Bugfix" | "Feature" | "Optimization";

export const TASK_TAG_COLORS: Record<TaskTag, string> = {
  UI: "#3B82F6",
  Gameplay: "#10B981",
  Art: "#EC4899",
  Audio: "#8B5CF6",
  Backend: "#F97316",
  Polish: "#F59E0B",
  Bugfix: "#EF4444",
  Feature: "#06B6D4",
  Optimization: "#6B7280",
};

export const ALL_TASK_TAGS: TaskTag[] = ["UI", "Gameplay", "Art", "Audio", "Backend", "Polish", "Bugfix", "Feature", "Optimization"];

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
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
  tags?: TaskTag[];
  blockedBy?: string;
  estimatedHours?: number;
  loggedHours?: number;
  subtasks?: Subtask[];
  dueDate?: string;
  comments?: TaskComment[];
  created_at: string;
}

export interface TaskComment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface BugComment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface BugStatusEntry {
  status: string;
  timestamp: string;
}

export interface Bug {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: "blocker" | "critical" | "major" | "minor" | "trivial";
  status: "open" | "investigating" | "in-progress" | "fixed" | "closed";
  platform: string;
  reproSteps: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  comments?: BugComment[];
  statusHistory?: BugStatusEntry[];
  created_at: string;
}

export interface DevlogNote {
  id: string;
  text: string;
  timestamp: string;
}

export interface DevlogEntry {
  id: string;
  projectId: string;
  title: string;
  content: string;
  mood: "productive" | "struggling" | "breakthrough" | "grinding";
  date: string;
  notes?: DevlogNote[];
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
    tags: ["Art", "Bugfix"],
    estimatedHours: 6,
    loggedHours: 3.5,
    subtasks: [
      { id: "st_001", title: "Profile current particle system", done: true },
      { id: "st_002", title: "Write replacement shader", done: true },
      { id: "st_003", title: "Test on low-end hardware", done: false },
      { id: "st_004", title: "Update shield color parameters", done: false },
    ],
    comments: [
      { id: "tc_001", text: "Shader draft is working but needs optimization for integrated GPUs.", author: "JacobK", timestamp: "2026-03-05T14:30:00Z" },
      { id: "tc_002", text: "Tested on GTX 1050 — still some flicker at 30fps. Might need to double-buffer the shield mesh.", author: "JacobK", timestamp: "2026-03-06T10:00:00Z" },
    ],
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
    tags: ["Gameplay", "Polish"],
    estimatedHours: 2,
    loggedHours: 0,
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
    tags: ["Backend", "Feature"],
    estimatedHours: 16,
    loggedHours: 18,
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
    tags: ["UI", "Gameplay", "Feature"],
    estimatedHours: 12,
    loggedHours: 0,
    subtasks: [
      { id: "st_010", title: "Design tutorial flow document", done: false },
      { id: "st_011", title: "Movement tutorial step", done: false },
      { id: "st_012", title: "Scanning tutorial step", done: false },
      { id: "st_013", title: "Docking tutorial step", done: false },
      { id: "st_014", title: "Combat basics tutorial step", done: false },
    ],
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
    tags: ["Optimization"],
    estimatedHours: 8,
    loggedHours: 7,
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
    tags: ["UI", "Art"],
    estimatedHours: 4,
    loggedHours: 5,
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
    tags: ["Audio"],
    estimatedHours: 3,
    loggedHours: 0,
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
    tags: ["Gameplay", "Feature", "Backend"],
    estimatedHours: 20,
    loggedHours: 12,
    subtasks: [
      { id: "st_020", title: "Resource data model", done: true },
      { id: "st_021", title: "Buy/sell UI", done: true },
      { id: "st_022", title: "Dynamic pricing algorithm", done: true },
      { id: "st_023", title: "Trade history log", done: false },
      { id: "st_024", title: "Profit/loss indicators", done: false },
      { id: "st_025", title: "Station inventory refresh cycle", done: false },
    ],
    comments: [
      { id: "tc_003", text: "Dynamic pricing is feeling really good — prices fluctuate naturally based on supply. Need to cap the variance though, some items get absurdly expensive.", author: "JacobK", timestamp: "2026-03-04T16:00:00Z" },
    ],
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
    estimatedHours: 8,
    loggedHours: 0,
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
    estimatedHours: 10,
    loggedHours: 4,
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
    status: "investigating",
    platform: "Windows",
    reproSteps: "1. Approach station at max speed\n2. Boost into docking bay entrance\n3. Player passes through wall",
    expectedBehavior: "Player should collide with station walls and be stopped or deflected regardless of speed.",
    actualBehavior: "Player passes through station geometry entirely and ends up inside or behind the station mesh.",
    comments: [
      { id: "bc_001", text: "Confirmed. This is a classic CCD issue — we need continuous collision detection for high-velocity objects.", author: "JacobK", timestamp: "2026-03-06T15:30:00Z" },
      { id: "bc_002", text: "Happens more frequently with the boost upgrade equipped. Speed threshold seems to be around 200 units/s.", author: "AlexC", timestamp: "2026-03-06T16:15:00Z" },
    ],
    created_at: "2026-03-06T15:00:00Z",
  },
  {
    id: "bug_002",
    projectId: "proj_001",
    title: "Inventory duplication glitch",
    description: "Rapidly clicking transfer button duplicates items between ship cargo and station storage.",
    severity: "major",
    status: "in-progress",
    platform: "All",
    reproSteps: "1. Open station storage\n2. Click transfer rapidly on any item\n3. Item count increases in both inventories",
    expectedBehavior: "Item should transfer from one inventory to the other with correct counts on both sides.",
    actualBehavior: "Item count increases in both inventories simultaneously, creating duplicates out of thin air.",
    comments: [
      { id: "bc_003", text: "Adding a debounce on the transfer button click should fix this. 200ms cooldown.", author: "JacobK", timestamp: "2026-03-05T12:00:00Z" },
      { id: "bc_004", text: "Also need to lock the inventory state during transfer to prevent race conditions.", author: "JacobK", timestamp: "2026-03-05T14:30:00Z" },
      { id: "bc_005", text: "Fix is in Sprint 14 branch. Need to test with rapid clicking macro before closing.", author: "JacobK", timestamp: "2026-03-06T09:00:00Z" },
    ],
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
    expectedBehavior: "Music should seamlessly loop when the track ends while the player is still in the asteroid belt zone.",
    actualBehavior: "Complete silence after the first track finishes. Music only resumes when entering a different zone.",
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
    expectedBehavior: "Tooltip should reposition itself to stay fully visible within the viewport.",
    actualBehavior: "Tooltip renders at its default position and gets clipped by the screen edge.",
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
    expectedBehavior: "Game should handle focus loss gracefully, pausing the loading process or continuing in background.",
    actualBehavior: "Hard crash to desktop with no error dialog or crash log generated.",
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

export function updateProject(id: string, updates: Partial<Omit<Project, "id" | "created_at">>): Project | undefined {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  projects[idx] = { ...projects[idx], ...updates, updated_at: new Date().toISOString() };
  save(PROJECTS_KEY, projects);
  return projects[idx];
}

export function deleteProject(id: string): boolean {
  const projects = getProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  save(PROJECTS_KEY, filtered);

  const tasks = getTasks();
  save(TASKS_KEY, tasks.filter((t) => t.projectId !== id));

  const bugs = getBugs();
  save(BUGS_KEY, bugs.filter((b) => b.projectId !== id));

  const devlog = getDevlog();
  save(DEVLOG_KEY, devlog.filter((d) => d.projectId !== id));

  const assets = getAssets();
  save(ASSETS_KEY, assets.filter((a) => a.projectId !== id));

  const playtest = getPlaytestResponses();
  save(PLAYTEST_KEY, playtest.filter((p) => p.projectId !== id));

  const sessionData = getSessions();
  save(SESSIONS_KEY, sessionData.filter((s) => s.projectId !== id));

  const refs = getReferences();
  save(REFERENCES_KEY, refs.filter((r) => r.projectId !== id));

  const changelog = getChangelog();
  save(CHANGELOG_KEY, changelog.filter((c) => c.projectId !== id));

  const sprintData = getSprints();
  save(SPRINTS_KEY, sprintData.filter((s) => s.projectId !== id));

  const milestoneData = getMilestones();
  save(MILESTONES_KEY, milestoneData.filter((m) => m.projectId !== id));

  return true;
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

export function deleteTask(id: string): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  save(TASKS_KEY, filtered);
  return true;
}

export function deleteTasks(ids: string[]): number {
  const tasks = getTasks();
  const idSet = new Set(ids);
  const filtered = tasks.filter((t) => !idSet.has(t.id));
  const removed = tasks.length - filtered.length;
  if (removed > 0) save(TASKS_KEY, filtered);
  return removed;
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

export function updateDevlogEntry(id: string, updates: Partial<Omit<DevlogEntry, "id" | "projectId">>): DevlogEntry | null {
  const entries = getDevlog();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  entries[idx] = { ...entries[idx], ...updates };
  save(DEVLOG_KEY, entries);
  return entries[idx];
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

// ─── Asset Pipeline ───────────────────────────────────────────────────────────

export type AssetType = "sprite" | "model" | "animation" | "audio" | "ui" | "level" | "vfx";
export type AssetStatus = "concept" | "wip" | "review" | "approved" | "integrated";

export interface AssetVersionEntry {
  version: number;
  timestamp: string;
  notes: string;
}

export interface GameAsset {
  id: string;
  projectId: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  assignee: string;
  priority: "critical" | "high" | "medium" | "low";
  fileRef: string;
  notes: string;
  folder?: AssetFolder;
  version?: number;
  versionHistory?: AssetVersionEntry[];
  created_at: string;
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  sprite: "Sprites/Art",
  model: "3D Models",
  animation: "Animations",
  audio: "Audio/Music",
  ui: "UI Elements",
  level: "Level Data",
  vfx: "VFX",
};

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  sprite: "#F59E0B",
  model: "#8B5CF6",
  animation: "#3B82F6",
  audio: "#10B981",
  ui: "#EC4899",
  level: "#F97316",
  vfx: "#06B6D4",
};

export type AssetFolder = "Sprites" | "Audio" | "UI" | "Textures" | "Animations" | "Other";

export const ASSET_FOLDERS: AssetFolder[] = ["Sprites", "Audio", "UI", "Textures", "Animations", "Other"];

export const TYPE_TO_DEFAULT_FOLDER: Record<AssetType, AssetFolder> = {
  sprite: "Sprites",
  model: "Other",
  animation: "Animations",
  audio: "Audio",
  ui: "UI",
  level: "Other",
  vfx: "Other",
};

export const ASSET_FOLDER_COLORS: Record<AssetFolder, string> = {
  Sprites: "#F59E0B",
  Audio: "#10B981",
  UI: "#EC4899",
  Textures: "#8B5CF6",
  Animations: "#3B82F6",
  Other: "#9CA3AF",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  concept: "Concept",
  wip: "WIP",
  review: "Review",
  approved: "Approved",
  integrated: "Integrated",
};

const ASSETS_KEY = "gameforge_assets";

const SEED_ASSETS: GameAsset[] = [
  {
    id: "asset_001",
    projectId: "proj_001",
    name: "Player Ship - Main Hull",
    type: "sprite",
    status: "integrated",
    assignee: "JacobK",
    priority: "critical",
    fileRef: "sprites/ships/player_hull_v3.png",
    notes: "Final version with damage states. 4 directional frames.",
    version: 3,
    versionHistory: [
      { version: 1, timestamp: "2025-12-10T09:00:00Z", notes: "Initial hull design" },
      { version: 2, timestamp: "2026-01-05T14:00:00Z", notes: "Added directional frames" },
      { version: 3, timestamp: "2026-02-12T11:00:00Z", notes: "Added damage states" },
    ],
    created_at: "2025-12-10T09:00:00Z",
  },
  {
    id: "asset_002",
    projectId: "proj_001",
    name: "Space Station Interior",
    type: "model",
    status: "approved",
    assignee: "JacobK",
    priority: "high",
    fileRef: "models/stations/interior_hub.glb",
    notes: "Main hub area with trading desk, repair bay, and cantina. Needs LOD variants.",
    created_at: "2026-01-15T14:00:00Z",
  },
  {
    id: "asset_003",
    projectId: "proj_001",
    name: "Shield Activation VFX",
    type: "vfx",
    status: "wip",
    assignee: "JacobK",
    priority: "high",
    fileRef: "vfx/shield_activate.vfx",
    notes: "Blue energy bubble expanding from ship center. Shader-based, not particles.",
    created_at: "2026-02-20T11:00:00Z",
  },
  {
    id: "asset_004",
    projectId: "proj_001",
    name: "Docking Sequence Animation",
    type: "animation",
    status: "review",
    assignee: "JacobK",
    priority: "medium",
    fileRef: "anims/docking_sequence_v2.anim",
    notes: "3-second docking clamp animation. Syncs with magnetic clamp SFX.",
    version: 2,
    versionHistory: [
      { version: 1, timestamp: "2026-02-28T16:00:00Z", notes: "Initial animation draft" },
      { version: 2, timestamp: "2026-03-04T10:00:00Z", notes: "Sync with SFX timing" },
    ],
    created_at: "2026-02-28T16:00:00Z",
  },
  {
    id: "asset_005",
    projectId: "proj_001",
    name: "Combat Music - Asteroid Belt",
    type: "audio",
    status: "approved",
    assignee: "JacobK",
    priority: "medium",
    fileRef: "audio/music/combat_asteroid.ogg",
    notes: "High-tempo synth track. 2:45 loop with seamless crossfade points.",
    created_at: "2026-01-22T10:00:00Z",
  },
  {
    id: "asset_006",
    projectId: "proj_001",
    name: "HUD - Health & Shield Bars",
    type: "ui",
    status: "integrated",
    assignee: "JacobK",
    priority: "critical",
    fileRef: "ui/hud/health_shield_bar.figma",
    notes: "Animated bars with pulse effect on low health. Color transitions from green to red.",
    created_at: "2025-11-20T08:00:00Z",
  },
  {
    id: "asset_007",
    projectId: "proj_001",
    name: "Asteroid Belt - Sector 7",
    type: "level",
    status: "wip",
    assignee: "JacobK",
    priority: "high",
    fileRef: "levels/sector7_asteroid_belt.json",
    notes: "Dense asteroid field with hidden loot caches. Performance-critical zone.",
    created_at: "2026-03-01T13:00:00Z",
  },
  {
    id: "asset_008",
    projectId: "proj_001",
    name: "Explosion - Small Ship",
    type: "vfx",
    status: "concept",
    assignee: "JacobK",
    priority: "low",
    fileRef: "",
    notes: "Debris + fire particles + screen shake. Reference: FTL explosion style.",
    created_at: "2026-03-05T09:00:00Z",
  },
  {
    id: "asset_009",
    projectId: "proj_001",
    name: "Alien Artifact Sprite",
    type: "sprite",
    status: "review",
    assignee: "JacobK",
    priority: "medium",
    fileRef: "sprites/items/alien_artifact_v1.png",
    notes: "Glowing rune-covered object. Needs idle animation with soft pulse.",
    created_at: "2026-03-03T15:00:00Z",
  },
  {
    id: "asset_010",
    projectId: "proj_001",
    name: "Menu Click SFX",
    type: "audio",
    status: "integrated",
    assignee: "JacobK",
    priority: "low",
    fileRef: "audio/sfx/menu_click.wav",
    notes: "Subtle sci-fi click. 0.1s duration.",
    created_at: "2025-12-05T07:00:00Z",
  },
];

export function getAssets(projectId?: string): GameAsset[] {
  const assets = getOrSeed(ASSETS_KEY, SEED_ASSETS);
  const enriched = assets.map(a => ({
    ...a,
    folder: a.folder || TYPE_TO_DEFAULT_FOLDER[a.type],
  }));
  return projectId ? enriched.filter((a) => a.projectId === projectId) : enriched;
}

export function addAsset(asset: Omit<GameAsset, "id" | "created_at">): GameAsset {
  const assets = getAssets();
  const newAsset: GameAsset = {
    ...asset,
    id: `asset_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  assets.push(newAsset);
  save(ASSETS_KEY, assets);
  return newAsset;
}

export function updateAsset(id: string, updates: Partial<GameAsset>): GameAsset | undefined {
  const assets = getAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return undefined;
  assets[idx] = { ...assets[idx], ...updates };
  save(ASSETS_KEY, assets);
  return assets[idx];
}

export function bumpAssetVersion(id: string, notes: string): GameAsset | undefined {
  const assets = getAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return undefined;
  const asset = assets[idx];
  const currentVersion = asset.version || 1;
  const newVersion = currentVersion + 1;
  const history = asset.versionHistory || [
    { version: currentVersion, timestamp: asset.created_at, notes: "Initial version" },
  ];
  history.push({ version: newVersion, timestamp: new Date().toISOString(), notes });
  assets[idx] = { ...asset, version: newVersion, versionHistory: history };
  save(ASSETS_KEY, assets);
  return assets[idx];
}

export function swapAssetOrder(id1: string, id2: string): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(ASSETS_KEY);
  const all: GameAsset[] = raw ? JSON.parse(raw) : [];
  const idx1 = all.findIndex(a => a.id === id1);
  const idx2 = all.findIndex(a => a.id === id2);
  if (idx1 === -1 || idx2 === -1) return;
  [all[idx1], all[idx2]] = [all[idx2], all[idx1]];
  save(ASSETS_KEY, all);
}

// ─── Playtesting Feedback ─────────────────────────────────────────────────────

export interface PlaytestResponse {
  id: string;
  projectId: string;
  testerName: string;
  sessionId?: string;
  overallRating: number;
  difficulty: "too-easy" | "just-right" | "too-hard";
  favoriteMoment: string;
  frustratingMoment: string;
  bugEncountered: boolean;
  bugDescription: string;
  playAgain: "yes" | "definitely" | "maybe" | "no";
  suggestions: string;
  platform: "PC" | "Mac" | "Mobile" | "Console";
  submitted_at: string;
}

const PLAYTEST_KEY = "gameforge_playtest";

const SEED_PLAYTEST: PlaytestResponse[] = [
  {
    id: "pt_001",
    projectId: "proj_001",
    testerName: "Alex Chen",
    sessionId: "session_001",
    overallRating: 4,
    difficulty: "just-right",
    favoriteMoment: "The first time I jumped to hyperspace and saw the star map unfold. Absolutely stunning visual.",
    frustratingMoment: "Got stuck in the station walls after docking at high speed. Had to restart.",
    bugEncountered: true,
    bugDescription: "Clipped through station geometry when boosting into dock. Hard crash on alt-tab during loading.",
    playAgain: "definitely",
    suggestions: "Add a minimap for asteroid belt navigation. Also would love controller support.",
    platform: "PC",
    submitted_at: "2026-03-06T18:00:00Z",
  },
  {
    id: "pt_002",
    projectId: "proj_001",
    testerName: "Maya Rodriguez",
    overallRating: 5,
    difficulty: "just-right",
    favoriteMoment: "Trading system is addictive. Spent an hour just doing trade runs between stations.",
    frustratingMoment: "Inventory management is clunky. No sorting or filtering options.",
    bugEncountered: false,
    bugDescription: "",
    playAgain: "definitely",
    suggestions: "Inventory sorting by value/weight. Also a trade route planner would be amazing.",
    platform: "PC",
    submitted_at: "2026-03-06T20:30:00Z",
  },
  {
    id: "pt_003",
    projectId: "proj_001",
    testerName: "Sam Wilson",
    sessionId: "session_002",
    overallRating: 3,
    difficulty: "too-hard",
    favoriteMoment: "Combat feels really satisfying when you land a perfect shield-dodge-fire combo.",
    frustratingMoment: "Died 6 times in the first asteroid belt. No idea what I was supposed to do. Tutorial needed.",
    bugEncountered: true,
    bugDescription: "Music stopped playing after first track ended in asteroid belt. Silent for the rest of the session.",
    playAgain: "maybe",
    suggestions: "Needs a proper tutorial. Also difficulty options would help. I'm not great at action games but love space exploration.",
    platform: "PC",
    submitted_at: "2026-03-07T10:00:00Z",
  },
  {
    id: "pt_004",
    projectId: "proj_001",
    testerName: "Jordan Lee",
    sessionId: "session_003",
    overallRating: 4,
    difficulty: "too-easy",
    favoriteMoment: "Finding the hidden alien artifact in sector 7. The lore text was really cool.",
    frustratingMoment: "Combat is too easy once you get the laser cannon. No challenge after the first hour.",
    bugEncountered: false,
    bugDescription: "",
    playAgain: "yes",
    suggestions: "Harder enemies in later sectors. Boss fights would be sick. Also multiplayer co-op?",
    platform: "Mac",
    submitted_at: "2026-03-07T12:15:00Z",
  },
  {
    id: "pt_005",
    projectId: "proj_001",
    testerName: "Riley Park",
    overallRating: 4,
    difficulty: "just-right",
    favoriteMoment: "Base building on a moon. The procedural terrain generation is impressive.",
    frustratingMoment: "Save system lost my outpost progress once. Scary but didn't happen again.",
    bugEncountered: true,
    bugDescription: "Star map tooltip gets cut off when hovering stars near the edge of the screen.",
    playAgain: "definitely",
    suggestions: "More building options for outposts. Automated mining drones. A photo mode would be great too.",
    platform: "PC",
    submitted_at: "2026-03-07T14:45:00Z",
  },
];

export function getPlaytestResponses(projectId?: string): PlaytestResponse[] {
  const responses = getOrSeed(PLAYTEST_KEY, SEED_PLAYTEST);
  return projectId ? responses.filter((r) => r.projectId === projectId) : responses;
}

export function addPlaytestResponse(response: Omit<PlaytestResponse, "id" | "submitted_at">): PlaytestResponse {
  const responses = getPlaytestResponses();
  const newResponse: PlaytestResponse = {
    ...response,
    id: `pt_${Date.now()}`,
    submitted_at: new Date().toISOString(),
  };
  responses.push(newResponse);
  save(PLAYTEST_KEY, responses);
  return newResponse;
}

// ─── Playtest Sessions ────────────────────────────────────────────────────────

export interface PlaytestSession {
  id: string;
  projectId: string;
  date: string;
  testerName: string;
  durationMinutes: number;
  platform: string;
  buildVersion: string;
  notes: string;
  created_at: string;
}

const SESSIONS_KEY = "gameforge_sessions";

const SEED_SESSIONS: PlaytestSession[] = [
  {
    id: "session_001",
    projectId: "proj_001",
    date: "2026-03-06",
    testerName: "Alex Chen",
    durationMinutes: 45,
    platform: "PC",
    buildVersion: "0.9.1-beta",
    notes: "First external playtest. Focus on core loop and trading system.",
    created_at: "2026-03-06T17:00:00Z",
  },
  {
    id: "session_002",
    projectId: "proj_001",
    date: "2026-03-07",
    testerName: "Sam Wilson",
    durationMinutes: 60,
    platform: "PC",
    buildVersion: "0.9.2-beta",
    notes: "Testing new LOD system and combat balance after patch.",
    created_at: "2026-03-07T09:00:00Z",
  },
  {
    id: "session_003",
    projectId: "proj_001",
    date: "2026-03-07",
    testerName: "Jordan Lee",
    durationMinutes: 90,
    platform: "Mac",
    buildVersion: "0.9.2-beta",
    notes: "Extended session for exploration content and artifact discovery.",
    created_at: "2026-03-07T11:00:00Z",
  },
];

export function getSessions(projectId?: string): PlaytestSession[] {
  const sessions = getOrSeed(SESSIONS_KEY, SEED_SESSIONS);
  return projectId ? sessions.filter((s) => s.projectId === projectId) : sessions;
}

export function addSession(session: Omit<PlaytestSession, "id" | "created_at">): PlaytestSession {
  const sessions = getSessions();
  const newSession: PlaytestSession = {
    ...session,
    id: `session_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  sessions.push(newSession);
  save(SESSIONS_KEY, sessions);
  return newSession;
}

// ─── Reference Board ──────────────────────────────────────────────────────────

export type ReferenceCategory = "Art" | "Gameplay" | "UI" | "Audio" | "Story" | "Marketing";

export interface Reference {
  id: string;
  projectId: string;
  title: string;
  url: string;
  category: ReferenceCategory;
  notes: string;
  colorLabel: string;
  created_at: string;
}

export const REFERENCE_CATEGORY_COLORS: Record<ReferenceCategory, string> = {
  Art: "#F59E0B",
  Gameplay: "#3B82F6",
  UI: "#EC4899",
  Audio: "#10B981",
  Story: "#8B5CF6",
  Marketing: "#F97316",
};

const REFERENCES_KEY = "gameforge_references";

const SEED_REFERENCES: Reference[] = [
  {
    id: "ref_001",
    projectId: "proj_001",
    title: "FTL: Faster Than Light - Art Style",
    url: "https://store.steampowered.com/app/212680/FTL_Faster_Than_Light/",
    category: "Art",
    notes: "Clean pixel art with glowing VFX. Great reference for shield and weapon effects.",
    colorLabel: "#F59E0B",
    created_at: "2025-12-01T10:00:00Z",
  },
  {
    id: "ref_002",
    projectId: "proj_001",
    title: "No Man's Sky - Procedural Generation",
    url: "https://www.nomanssky.com/",
    category: "Gameplay",
    notes: "Study how they handle seamless planet transitions and star system generation at scale.",
    colorLabel: "#3B82F6",
    created_at: "2025-12-05T14:00:00Z",
  },
  {
    id: "ref_003",
    projectId: "proj_001",
    title: "Dead Cells - HUD Design",
    url: "https://dead-cells.com/",
    category: "UI",
    notes: "Minimal HUD that stays out of the way. Health bar animation is buttery smooth.",
    colorLabel: "#EC4899",
    created_at: "2026-01-10T09:00:00Z",
  },
  {
    id: "ref_004",
    projectId: "proj_001",
    title: "Outer Wilds - Soundtrack Approach",
    url: "https://www.mobiusdigitalgames.com/outer-wilds.html",
    category: "Audio",
    notes: "Adaptive music that blends with environment. Instruments fade in/out based on proximity.",
    colorLabel: "#10B981",
    created_at: "2026-01-15T11:00:00Z",
  },
  {
    id: "ref_005",
    projectId: "proj_001",
    title: "Mass Effect - Alien Lore Writing",
    url: "https://www.ea.com/games/mass-effect",
    category: "Story",
    notes: "Codex system for deep lore without interrupting gameplay. Artifact descriptions should feel this detailed.",
    colorLabel: "#8B5CF6",
    created_at: "2026-02-01T08:00:00Z",
  },
  {
    id: "ref_006",
    projectId: "proj_001",
    title: "Hollow Knight - Launch Trailer Pacing",
    url: "https://www.youtube.com/watch?v=UAO2urG23S4",
    category: "Marketing",
    notes: "Perfect trailer pacing: atmosphere first, then gameplay hooks, then title card. No voiceover needed.",
    colorLabel: "#F97316",
    created_at: "2026-02-20T16:00:00Z",
  },
];

export function getReferences(projectId?: string): Reference[] {
  const refs = getOrSeed(REFERENCES_KEY, SEED_REFERENCES);
  return projectId ? refs.filter((r) => r.projectId === projectId) : refs;
}

export function addReference(ref: Omit<Reference, "id" | "created_at">): Reference {
  const refs = getReferences();
  const newRef: Reference = {
    ...ref,
    id: `ref_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  refs.push(newRef);
  save(REFERENCES_KEY, refs);
  return newRef;
}

export function updateReference(id: string, updates: Partial<Omit<Reference, "id" | "projectId" | "created_at">>): Reference | null {
  const refs = getReferences();
  const idx = refs.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  refs[idx] = { ...refs[idx], ...updates };
  save(REFERENCES_KEY, refs);
  return refs[idx];
}

export function deleteReference(id: string): boolean {
  const refs = getReferences();
  const filtered = refs.filter((r) => r.id !== id);
  if (filtered.length === refs.length) return false;
  save(REFERENCES_KEY, filtered);
  return true;
}

// ─── Changelog / Patch Notes ──────────────────────────────────────────────────

export type VersionType = "Major" | "Minor" | "Patch" | "Hotfix";
export type ChangeCategory = "Added" | "Changed" | "Fixed" | "Removed" | "Known Issues";

export interface ChangelogEntry {
  id: string;
  projectId: string;
  version: string;
  title: string;
  date: string;
  type: VersionType;
  changes: Record<ChangeCategory, string[]>;
}

export const VERSION_TYPE_COLORS: Record<VersionType, string> = {
  Major: "#EF4444",
  Minor: "#3B82F6",
  Patch: "#F59E0B",
  Hotfix: "#F97316",
};

export const CHANGE_CATEGORY_COLORS: Record<ChangeCategory, string> = {
  Added: "#10B981",
  Changed: "#3B82F6",
  Fixed: "#F59E0B",
  Removed: "#EF4444",
  "Known Issues": "#9CA3AF",
};

const CHANGELOG_KEY = "gameforge_changelog";

const SEED_CHANGELOG: ChangelogEntry[] = [
  {
    id: "cl_001",
    projectId: "proj_001",
    version: "0.9.2-beta",
    title: "Stability & Performance",
    date: "2026-03-07",
    type: "Patch",
    changes: {
      Added: [
        "LOD system for asteroid fields — steady 60 FPS in dense zones",
        "Frustum culling for off-screen objects",
      ],
      Changed: [
        "Shield VFX switched to shader-based rendering (fixes flicker at low FPS)",
        "Star map tooltip repositions when near screen edges",
      ],
      Fixed: [
        "Music now loops correctly in asteroid belt zones",
        "Inventory transfer no longer duplicates items on rapid clicks",
      ],
      Removed: [],
      "Known Issues": [
        "Alt-tab during loading screen causes crash (investigating)",
        "Player can clip through station walls when boosting at max speed",
      ],
    },
  },
  {
    id: "cl_002",
    projectId: "proj_001",
    version: "0.9.1-beta",
    title: "Trading & Economy",
    date: "2026-03-03",
    type: "Minor",
    changes: {
      Added: [
        "Trading system with dynamic pricing based on supply/demand",
        "Station storage with transfer UI",
        "Trade history log viewable at any station",
      ],
      Changed: [
        "Station interior lighting improved for trading desk area",
        "NPC merchant portraits updated with new art style",
      ],
      Fixed: [
        "Save system now correctly persists discovered star systems",
        "Docking animation sync issue with SFX resolved",
      ],
      Removed: [
        "Placeholder barter system replaced by full trading",
      ],
      "Known Issues": [
        "Inventory duplication possible with rapid transfer clicks",
        "Music stops after first track in asteroid belt",
      ],
    },
  },
  {
    id: "cl_003",
    projectId: "proj_001",
    version: "0.9.0-beta",
    title: "First Beta Release",
    date: "2026-02-28",
    type: "Major",
    changes: {
      Added: [
        "Complete save/load system for player state, inventory, and star map",
        "Main menu with New Game, Continue, Settings, Credits",
        "Animated starfield background for main menu",
        "Base building on planetary surfaces",
        "Alien artifact discovery system with lore entries",
      ],
      Changed: [
        "Combat damage model rebalanced for beta feedback",
        "Player ship hull sprite updated to v3 with damage states",
        "HUD health/shield bars now pulse on low health",
      ],
      Fixed: [
        "Hyperspace jump transition no longer freezes for 2 seconds",
        "Weapon cooldown timer now displays correctly",
      ],
      Removed: [
        "Debug console access in release builds",
        "Placeholder star map (replaced with procedural generation)",
      ],
      "Known Issues": [
        "Performance drops in dense asteroid fields",
        "Some station collision boundaries are too generous",
      ],
    },
  },
];

export function getChangelog(projectId?: string): ChangelogEntry[] {
  const entries = getOrSeed(CHANGELOG_KEY, SEED_CHANGELOG);
  return projectId ? entries.filter((e) => e.projectId === projectId) : entries;
}

export function addChangelogEntry(entry: Omit<ChangelogEntry, "id">): ChangelogEntry {
  const entries = getChangelog();
  const newEntry: ChangelogEntry = {
    ...entry,
    id: `cl_${Date.now()}`,
  };
  entries.push(newEntry);
  save(CHANGELOG_KEY, entries);
  return newEntry;
}

export function deleteChangelogEntry(id: string): boolean {
  const entries = getChangelog();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  save(CHANGELOG_KEY, filtered);
  return true;
}

// ─── Sprints ──────────────────────────────────────────────────────────────────

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "planned";
  created_at: string;
}

const SPRINTS_KEY = "gameforge_sprints";

const SEED_SPRINTS: Sprint[] = [
  {
    id: "sprint_001",
    projectId: "proj_001",
    name: "Sprint 12",
    goal: "Core UI & menus",
    startDate: "2026-01-20",
    endDate: "2026-02-02",
    status: "completed",
    created_at: "2026-01-20T08:00:00Z",
  },
  {
    id: "sprint_002",
    projectId: "proj_001",
    name: "Sprint 13",
    goal: "Save system & persistence",
    startDate: "2026-02-03",
    endDate: "2026-02-16",
    status: "completed",
    created_at: "2026-02-03T08:00:00Z",
  },
  {
    id: "sprint_003",
    projectId: "proj_001",
    name: "Sprint 14",
    goal: "Trading, VFX & performance",
    startDate: "2026-02-17",
    endDate: "2026-03-09",
    status: "active",
    created_at: "2026-02-17T08:00:00Z",
  },
  {
    id: "sprint_004",
    projectId: "proj_001",
    name: "Sprint 15",
    goal: "Tutorial & polish",
    startDate: "2026-03-10",
    endDate: "2026-03-23",
    status: "planned",
    created_at: "2026-03-07T08:00:00Z",
  },
];

export function getSprints(projectId?: string): Sprint[] {
  const sprints = getOrSeed(SPRINTS_KEY, SEED_SPRINTS);
  return projectId ? sprints.filter((s) => s.projectId === projectId) : sprints;
}

export function addSprint(sprint: Omit<Sprint, "id" | "created_at">): Sprint {
  const sprints = getSprints();
  const newSprint: Sprint = {
    ...sprint,
    id: `sprint_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  sprints.push(newSprint);
  save(SPRINTS_KEY, sprints);
  return newSprint;
}

export function updateSprint(id: string, updates: Partial<Sprint>): Sprint | undefined {
  const sprints = getSprints();
  const idx = sprints.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  sprints[idx] = { ...sprints[idx], ...updates };
  save(SPRINTS_KEY, sprints);
  return sprints[idx];
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  targetDate: string;
  status: "upcoming" | "in-progress" | "completed";
  created_at: string;
}

const MILESTONES_KEY = "gameforge_milestones";

const SEED_MILESTONES: Milestone[] = [
  {
    id: "ms_001",
    projectId: "proj_001",
    name: "Core Gameplay Loop",
    targetDate: "2026-01-15",
    status: "completed",
    created_at: "2025-11-01T10:00:00Z",
  },
  {
    id: "ms_002",
    projectId: "proj_001",
    name: "Alpha Release",
    targetDate: "2026-02-01",
    status: "completed",
    created_at: "2025-11-01T10:00:00Z",
  },
  {
    id: "ms_003",
    projectId: "proj_001",
    name: "Beta Launch",
    targetDate: "2026-02-28",
    status: "completed",
    created_at: "2025-12-01T10:00:00Z",
  },
  {
    id: "ms_004",
    projectId: "proj_001",
    name: "Feature Complete",
    targetDate: "2026-03-23",
    status: "in-progress",
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "ms_005",
    projectId: "proj_001",
    name: "Gold Master",
    targetDate: "2026-04-15",
    status: "upcoming",
    created_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "ms_006",
    projectId: "proj_001",
    name: "Public Release",
    targetDate: "2026-05-01",
    status: "upcoming",
    created_at: "2026-02-01T10:00:00Z",
  },
];

export function getMilestones(projectId?: string): Milestone[] {
  const milestones = getOrSeed(MILESTONES_KEY, SEED_MILESTONES);
  return projectId ? milestones.filter((m) => m.projectId === projectId) : milestones;
}

export function addMilestone(milestone: Omit<Milestone, "id" | "created_at">): Milestone {
  const milestones = getMilestones();
  const newMilestone: Milestone = {
    ...milestone,
    id: `ms_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  milestones.push(newMilestone);
  save(MILESTONES_KEY, milestones);
  return newMilestone;
}

export function updateMilestone(id: string, updates: Partial<Milestone>): Milestone | undefined {
  const milestones = getMilestones();
  const idx = milestones.findIndex((m) => m.id === id);
  if (idx === -1) return undefined;
  milestones[idx] = { ...milestones[idx], ...updates };
  save(MILESTONES_KEY, milestones);
  return milestones[idx];
}

export function deleteMilestone(id: string): boolean {
  const milestones = getMilestones();
  const filtered = milestones.filter((m) => m.id !== id);
  if (filtered.length === milestones.length) return false;
  save(MILESTONES_KEY, filtered);
  return true;
}

// ─── Data Integrity ───────────────────────────────────────────────────────────

export function validateStorage(): void {
  if (typeof window === "undefined") return;

  const projectIds = new Set(getProjects().map((p) => p.id));
  let cleaned = 0;

  const filterOrphans = <T extends { projectId: string }>(key: string, getter: () => T[], label: string) => {
    const items = getter();
    const valid = items.filter((item) => projectIds.has(item.projectId));
    const removed = items.length - valid.length;
    if (removed > 0) {
      save(key, valid);
      cleaned += removed;
      console.log(`[GameForge] Cleaned ${removed} orphaned ${label}`);
    }
  };

  filterOrphans(TASKS_KEY, () => getTasks(), "tasks");
  filterOrphans(BUGS_KEY, () => getBugs(), "bugs");
  filterOrphans(DEVLOG_KEY, () => getDevlog(), "devlog entries");
  filterOrphans(ASSETS_KEY, () => getAssets(), "assets");
  filterOrphans(PLAYTEST_KEY, () => getPlaytestResponses(), "playtest responses");
  filterOrphans(SESSIONS_KEY, () => getSessions(), "sessions");
  filterOrphans(REFERENCES_KEY, () => getReferences(), "references");
  filterOrphans(CHANGELOG_KEY, () => getChangelog(), "changelog entries");
  filterOrphans(SPRINTS_KEY, () => getSprints(), "sprints");
  filterOrphans(MILESTONES_KEY, () => getMilestones(), "milestones");

  if (cleaned === 0) {
    console.log("[GameForge] Storage integrity check passed — no orphans found");
  } else {
    console.log(`[GameForge] Storage integrity check complete — cleaned ${cleaned} total orphaned items`);
  }
}
