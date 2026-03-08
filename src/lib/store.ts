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

// ─── Asset Pipeline ───────────────────────────────────────────────────────────

export type AssetType = "sprite" | "model" | "animation" | "audio" | "ui" | "level" | "vfx";
export type AssetStatus = "concept" | "wip" | "review" | "approved" | "integrated";

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
  return projectId ? assets.filter((a) => a.projectId === projectId) : assets;
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

// ─── Playtesting Feedback ─────────────────────────────────────────────────────

export interface PlaytestResponse {
  id: string;
  projectId: string;
  testerName: string;
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
