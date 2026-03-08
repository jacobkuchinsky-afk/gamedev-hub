"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Save,
  FileText,
  Gamepad2,
  BookOpen,
  Palette,
  Volume2,
  Cpu,
  DollarSign,
  Flag,
  RotateCcw,
  Download,
  CheckCircle2,
  Circle,
  Wand2,
  Sparkles,
  Loader2,
  Printer,
  Library,
  X,
  Swords,
  Puzzle,
  Crosshair,
  Ghost,
  Joystick,
  Trophy,
  Copy,
  Map,
  GraduationCap,
  Languages,
  Target,
  Plus,
  Pencil,
  Trash2,
  Star,
  Anchor,
} from "lucide-react";
import { getProject, type Project } from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

interface GDDSection {
  id: string;
  title: string;
  icon: React.ElementType;
  fields: GDDField[];
}

interface GDDField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder: string;
  options?: string[];
}

interface CodexEntry {
  id: string;
  topic: string;
  content: string;
  createdAt: string;
}

interface Competitor {
  name: string;
  type: "direct" | "indirect";
  strengths: string;
  weaknesses: string;
  differentiation: string;
}

interface CompetitorAnalysis {
  competitors: Competitor[];
  usp: string;
}

interface AIEnemy {
  name: string;
  type: string;
  health: number;
  attackDamage: number;
  speed: number;
  specialAbility: string;
  behaviorPattern: string;
  visualDescription: string;
}

interface DesignPillar {
  id: string;
  name: string;
  description: string;
  priority: number;
}

const GDD_SECTIONS: GDDSection[] = [
  {
    id: "overview",
    title: "Overview",
    icon: FileText,
    fields: [
      { key: "gameTitle", label: "Game Title", type: "text", placeholder: "e.g. Constellar" },
      { key: "tagline", label: "Tagline", type: "text", placeholder: "A short, punchy description" },
      { key: "elevatorPitch", label: "Elevator Pitch", type: "textarea", placeholder: "Describe your game in 2-3 sentences as if pitching to a publisher..." },
      { key: "targetAudience", label: "Target Audience", type: "text", placeholder: "e.g. Casual gamers aged 18-35" },
      { key: "platforms", label: "Platforms", type: "text", placeholder: "e.g. PC, Switch, PS5" },
      { key: "genre", label: "Genre", type: "text", placeholder: "e.g. Action RPG, Metroidvania" },
    ],
  },
  {
    id: "coreMechanics",
    title: "Core Mechanics",
    icon: Gamepad2,
    fields: [
      { key: "gameplayLoop", label: "Primary Gameplay Loop", type: "textarea", placeholder: "Describe the core loop: what does the player do every 30 seconds? Every 5 minutes? Every session?" },
      { key: "controls", label: "Controls", type: "textarea", placeholder: "Describe the control scheme. Keyboard/mouse? Controller? Touch?" },
      { key: "cameraType", label: "Camera Type", type: "select", placeholder: "Select camera type", options: ["First Person", "Third Person", "Top-Down", "Side-Scrolling", "Isometric", "Fixed", "Free Camera"] },
      { key: "coreVerbs", label: "Core Verbs", type: "text", placeholder: "e.g. Jump, Shoot, Build, Explore, Craft" },
    ],
  },
  {
    id: "storySetting",
    title: "Story & Setting",
    icon: BookOpen,
    fields: [
      { key: "setting", label: "Setting", type: "textarea", placeholder: "Where does the game take place? Describe the world." },
      { key: "timePeriod", label: "Time Period", type: "text", placeholder: "e.g. Far future, Medieval fantasy, Modern day" },
      { key: "protagonist", label: "Protagonist", type: "textarea", placeholder: "Who is the player character? What drives them?" },
      { key: "antagonist", label: "Antagonist", type: "textarea", placeholder: "Who or what opposes the player?" },
      { key: "narrativeStyle", label: "Narrative Style", type: "select", placeholder: "Select narrative style", options: ["Linear", "Branching", "Open World", "Environmental Storytelling", "Emergent", "No Story"] },
      { key: "themes", label: "Themes", type: "text", placeholder: "e.g. Survival, Discovery, Redemption" },
    ],
  },
  {
    id: "artDirection",
    title: "Art Direction",
    icon: Palette,
    fields: [
      { key: "visualStyle", label: "Visual Style", type: "select", placeholder: "Select visual style", options: ["Pixel Art", "Low-Poly", "Realistic", "Stylized/Cel-Shaded", "Hand-Drawn", "Voxel", "Vector", "Mixed Media"] },
      { key: "colorPalette", label: "Color Palette Notes", type: "textarea", placeholder: "Describe the color mood. Warm? Cold? Neon? Muted? Reference specific hex codes if you have them." },
      { key: "referenceImages", label: "Reference Images (URLs)", type: "textarea", placeholder: "Paste links to reference images, mood boards, or inspiration. One per line." },
      { key: "uiStyle", label: "UI Style", type: "textarea", placeholder: "Describe the UI approach. Diegetic? Minimalist? HUD-heavy? Describe menus, fonts, iconography." },
    ],
  },
  {
    id: "audio",
    title: "Audio",
    icon: Volume2,
    fields: [
      { key: "musicStyle", label: "Music Style", type: "textarea", placeholder: "Describe the soundtrack direction. Genre, mood, instruments, references." },
      { key: "soundDesign", label: "Sound Design Approach", type: "textarea", placeholder: "How should the game sound? Realistic? Exaggerated? Retro chiptune?" },
      { key: "voiceActing", label: "Voice Acting", type: "select", placeholder: "Voice acting plan", options: ["Full Voice Acting", "Partial (Key Scenes)", "Grunts/Reactions Only", "No Voice Acting"] },
    ],
  },
  {
    id: "technical",
    title: "Technical",
    icon: Cpu,
    fields: [
      { key: "engine", label: "Engine", type: "text", placeholder: "e.g. Unity, Unreal, Godot, Custom" },
      { key: "targetFPS", label: "Target FPS", type: "select", placeholder: "Select target", options: ["30 FPS", "60 FPS", "120 FPS", "Uncapped"] },
      { key: "minSpecs", label: "Minimum Specs", type: "textarea", placeholder: "CPU, GPU, RAM requirements for minimum playable experience" },
      { key: "networking", label: "Networking", type: "select", placeholder: "Select networking model", options: ["Singleplayer Only", "Local Co-op", "Online Multiplayer", "MMO", "Async Multiplayer"] },
      { key: "techPlatforms", label: "Target Platforms", type: "text", placeholder: "e.g. Windows, macOS, Linux, Switch, PS5, Xbox" },
    ],
  },
  {
    id: "monetization",
    title: "Monetization",
    icon: DollarSign,
    fields: [
      { key: "model", label: "Business Model", type: "select", placeholder: "Select model", options: ["Premium (Pay Once)", "Free-to-Play", "Freemium", "Subscription", "DLC/Expansion Packs", "Early Access"] },
      { key: "pricePoint", label: "Price Point", type: "text", placeholder: "e.g. $19.99, $29.99, Free" },
      { key: "iapStrategy", label: "IAP / DLC Strategy", type: "textarea", placeholder: "If applicable, describe what you'd sell. Cosmetics? Expansions? Season passes?" },
    ],
  },
  {
    id: "milestones",
    title: "Milestones",
    icon: Flag,
    fields: [
      { key: "prototype", label: "Prototype", type: "text", placeholder: "Target date and deliverables for prototype" },
      { key: "alpha", label: "Alpha", type: "text", placeholder: "Target date and deliverables for alpha" },
      { key: "beta", label: "Beta", type: "text", placeholder: "Target date and deliverables for beta" },
      { key: "launch", label: "Launch", type: "text", placeholder: "Target launch date and launch deliverables" },
      { key: "postLaunch", label: "Post-Launch", type: "textarea", placeholder: "Post-launch plans: patches, DLC, content updates, community support" },
    ],
  },
];

const CONSTELLAR_SEED: Record<string, string> = {
  gameTitle: "Constellar",
  tagline: "Chart the stars. Build your legacy. Survive the void.",
  elevatorPitch: "A space exploration game where players navigate procedurally generated star systems, build outposts on alien worlds, and uncover ancient artifacts left by a long-dead civilization. Combines real-time combat with strategic base building and a mystery-driven narrative.",
  targetAudience: "Core gamers aged 16-35 who enjoy exploration, crafting, and sci-fi narratives. Fans of No Man's Sky, Subnautica, and Outer Wilds.",
  platforms: "PC (Steam), PlayStation 5, Xbox Series X",
  genre: "Space Exploration / Action-Adventure",
  gameplayLoop: "Explore star system -> Scan planets -> Land and gather resources -> Build outpost -> Discover artifacts -> Decode alien lore -> Upgrade ship -> Jump to next system. Combat encounters with hostile ships and alien creatures break up exploration. Each session should feel like a self-contained adventure with long-term progression.",
  controls: "Keyboard + Mouse (primary), full controller support. WASD for ship movement, mouse for aiming/camera. Context-sensitive interactions. Radial menu for quick access to tools and weapons.",
  cameraType: "Third Person",
  coreVerbs: "Explore, Scan, Build, Fight, Trade, Discover",
  setting: "A galaxy on the edge of known space, filled with procedurally generated star systems. Ancient ruins dot habitable planets, left by the Architects \u2014 a civilization that vanished millennia ago. Space stations serve as trading hubs between frontier colonies.",
  timePeriod: "Far future \u2014 humanity has achieved FTL travel but is still expanding into uncharted regions",
  protagonist: "A Pathfinder \u2014 an independent explorer contracted by the Frontier Authority to chart new systems, establish outposts, and investigate Architect sites. Customizable appearance and backstory.",
  antagonist: "The Void Collective \u2014 a rogue faction that believes Architect technology should be weaponized. Also: the mystery of what destroyed the Architects themselves.",
  narrativeStyle: "Environmental Storytelling",
  themes: "Discovery, Isolation, Legacy, the cost of progress",
  visualStyle: "Stylized/Cel-Shaded",
  colorPalette: "Deep space blues and purples for void. Warm amber/gold for Architect technology. Vibrant alien biomes with each planet having a distinct color identity. UI uses amber (#F59E0B) on dark backgrounds.",
  referenceImages: "https://www.artstation.com/artwork/space-exploration-concept\nhttps://www.pinterest.com/pin/sci-fi-outpost-design\nhttps://dribbble.com/shots/space-game-ui",
  uiStyle: "Minimalist sci-fi HUD. Holographic elements that feel diegetic. Clean sans-serif fonts. Amber accent color. Information density increases in menus but gameplay HUD stays minimal \u2014 health, shield, compass, objective marker.",
  musicStyle: "Ambient electronic with orchestral swells for key moments. Synth pads for exploration, driving percussion for combat. Inspired by the soundtracks of Mass Effect, Interstellar, and Outer Wilds.",
  soundDesign: "Realistic with stylized accents. Ship engines hum, airlocks hiss, weapons have punch. Alien environments have unique ambient soundscapes. Audio cues for nearby artifacts (ethereal tones).",
  voiceActing: "Partial (Key Scenes)",
  engine: "Custom Engine (C++ with Vulkan renderer)",
  targetFPS: "60 FPS",
  minSpecs: "CPU: Intel i5-10400 / Ryzen 5 3600\nGPU: GTX 1060 / RX 580\nRAM: 8GB\nStorage: 20GB SSD",
  networking: "Singleplayer Only",
  techPlatforms: "Windows, PlayStation 5, Xbox Series X|S",
  model: "Premium (Pay Once)",
  pricePoint: "$29.99",
  iapStrategy: "No microtransactions. Post-launch DLC expansions planned \u2014 new star systems, story chapters, and ship types. First expansion ~6 months after launch.",
  prototype: "2025-11-15 \u2014 Core flight model, procedural planet generation, basic landing",
  alpha: "2026-01-30 \u2014 Combat system, outpost building, 3 hand-crafted story missions",
  beta: "2026-03-01 \u2014 Full gameplay loop, trading, 10+ star systems, save/load",
  launch: "2026-06-15 \u2014 Polished release with 50+ star systems, full story arc, Steam achievements",
  postLaunch: "Month 1: Bug fixes and QoL patches\nMonth 3: Free content update (new biomes, ship customization)\nMonth 6: Paid DLC \u2014 'The Architect's Wake' (new story chapter, 15 new systems)\nOngoing: Community mod support tools",
};

const QUICK_FILL_TEMPLATES: Record<string, Record<string, string>> = {
  overview: {
    gameTitle: "My Game",
    tagline: "A brief, memorable tagline for your game",
    elevatorPitch: "Describe your game concept in 2-3 sentences. What makes it unique? What's the core experience players will have?",
    targetAudience: "Core gamers aged 18-35 who enjoy [genre]",
    platforms: "PC (Steam)",
    genre: "Action Adventure",
  },
  coreMechanics: {
    gameplayLoop: "The player [core action] to [short-term goal], which feeds into [long-term progression]. Each session involves [typical activities].",
    controls: "Keyboard + Mouse primary. WASD movement, mouse aim. Full controller support planned.",
    cameraType: "Third Person",
    coreVerbs: "Move, Jump, Attack, Interact, Explore",
  },
  storySetting: {
    setting: "Describe the world - its geography, culture, and atmosphere.",
    timePeriod: "Modern day",
    protagonist: "Describe the player character - their personality, motivations, and arc.",
    antagonist: "Describe the main opposing force - whether a person, organization, or concept.",
    narrativeStyle: "Linear",
    themes: "Adventure, Discovery, Growth",
  },
  artDirection: {
    visualStyle: "Stylized/Cel-Shaded",
    colorPalette: "Define the mood through color. Reference specific palettes if available.",
    referenceImages: "Paste URLs to concept art, mood boards, or visual references.",
    uiStyle: "Clean, minimal HUD during gameplay. Detailed menus with clear iconography.",
  },
  audio: {
    musicStyle: "Ambient electronic for exploration, orchestral swells for key moments.",
    soundDesign: "Grounded and immersive with stylized accents for key interactions.",
    voiceActing: "No Voice Acting",
  },
  technical: {
    engine: "Unity",
    targetFPS: "60 FPS",
    minSpecs: "CPU: Intel i5 / Ryzen 5\nGPU: GTX 1060 / RX 580\nRAM: 8GB",
    networking: "Singleplayer Only",
    techPlatforms: "Windows",
  },
  monetization: {
    model: "Premium (Pay Once)",
    pricePoint: "$19.99",
    iapStrategy: "No microtransactions. Post-launch DLC expansions planned.",
  },
  milestones: {
    prototype: "Target date - Core mechanics playable, basic art pass",
    alpha: "Target date - Feature complete, placeholder art acceptable",
    beta: "Target date - Content complete, bug fixing, polish",
    launch: "Target date - Full release with all planned features",
    postLaunch: "Month 1: Bug fixes\nMonth 3: Free content update\nMonth 6: Paid DLC",
  },
};

interface GDDTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  color: string;
  data: Record<string, string>;
}

const GDD_TEMPLATES: GDDTemplate[] = [
  {
    id: "platformer",
    name: "2D Platformer",
    icon: Joystick,
    description: "Classic side-scrolling action with jumping, collectibles, and level-based progression.",
    color: "#3B82F6",
    data: {
      gameTitle: "Untitled Platformer",
      tagline: "Run, jump, and conquer a vibrant world one level at a time.",
      elevatorPitch: "A tight, responsive 2D platformer with hand-crafted levels, collectible power-ups, and a charming art style. Players master momentum-based movement through increasingly creative obstacle courses, with hidden secrets rewarding exploration.",
      targetAudience: "All ages, fans of Celeste, Hollow Knight, and classic Mario",
      platforms: "PC, Nintendo Switch",
      genre: "2D Platformer / Action",
      gameplayLoop: "Enter level -> Navigate obstacles using jump/dash/wall-climb -> Collect gems and power-ups -> Reach the end -> Unlock next level. Each level introduces a new mechanic or twist. Speedrun timers encourage replay.",
      controls: "Keyboard or controller. D-pad/stick for movement, A to jump, X to dash, B for special ability. Simple 3-button scheme with deep skill ceiling.",
      cameraType: "Side-Scrolling",
      coreVerbs: "Jump, Dash, Wall-Climb, Collect, Dodge",
      setting: "A colorful kingdom where each world has a distinct biome: lush forests, crystal caves, volcanic mountains, and floating sky islands. The land has been shattered by a magical storm.",
      timePeriod: "Fantasy / Timeless",
      protagonist: "A small, agile fox spirit awakened by the storm. Moves with fluid grace and gains new traversal abilities as the journey progresses.",
      antagonist: "The Storm King, a corrupted guardian who shattered the land. Each world boss is one of his lieutenants.",
      narrativeStyle: "Environmental Storytelling",
      themes: "Perseverance, Exploration, Mastery",
      visualStyle: "Pixel Art",
      colorPalette: "Vibrant and saturated. Each world has a distinct palette: greens/browns for forest, blues/purples for caves, reds/oranges for volcanic, whites/golds for sky. High contrast for readability.",
      referenceImages: "",
      uiStyle: "Minimal in-game HUD: health hearts, gem counter, and timer. Clean pixel-art menus with smooth transitions. Level select shown as a world map.",
      musicStyle: "Chiptune-influenced with modern production. Upbeat and energetic for action levels, ambient for exploration areas. Each world has a unique theme with variations for boss fights.",
      soundDesign: "Punchy and satisfying. Crisp jump sounds, coin collection chimes, exaggerated impacts. Retro-inspired but polished.",
      voiceActing: "Grunts/Reactions Only",
      engine: "Godot",
      targetFPS: "60 FPS",
      minSpecs: "CPU: Any dual-core\nGPU: Integrated graphics\nRAM: 2GB\nStorage: 500MB",
      networking: "Singleplayer Only",
      techPlatforms: "Windows, macOS, Nintendo Switch",
      model: "Premium (Pay Once)",
      pricePoint: "$14.99",
      iapStrategy: "No microtransactions. One paid DLC expansion with 20 new levels and a new world planned for 3 months post-launch.",
      prototype: "4 weeks — Core movement (jump, dash, wall-climb), 3 test levels, basic art",
      alpha: "10 weeks — 3 complete worlds (15 levels each), all movement abilities, basic enemies",
      beta: "16 weeks — All 5 worlds, boss fights, collectibles, save system, sound",
      launch: "20 weeks — Full polish, accessibility options, speedrun leaderboards",
      postLaunch: "Month 1: Bug fixes and speedrun community support\nMonth 3: Free update with time trial mode\nMonth 6: Paid DLC — new world with 20 levels",
    },
  },
  {
    id: "rpg",
    name: "RPG",
    icon: Swords,
    description: "Story-driven role-playing with character progression, quests, and turn-based or real-time combat.",
    color: "#8B5CF6",
    data: {
      gameTitle: "Untitled RPG",
      tagline: "Forge your legend in a world that remembers your choices.",
      elevatorPitch: "A narrative-driven RPG where player choices shape the world. Build a party of unique companions, master a deep combat system, and uncover a sprawling mystery across a hand-crafted open world. Every quest has multiple solutions, and the world reacts to your reputation.",
      targetAudience: "RPG enthusiasts aged 16-40, fans of Divinity: Original Sin, Baldur's Gate, and Final Fantasy",
      platforms: "PC (Steam), PlayStation 5, Xbox Series X",
      genre: "RPG / Adventure",
      gameplayLoop: "Explore world -> Accept quests from NPCs -> Traverse dungeons/areas -> Engage in turn-based combat -> Earn XP and loot -> Level up and choose skills -> Return to town to craft/trade -> Advance main story. Side content feeds into the main narrative.",
      controls: "Mouse + keyboard (point-and-click for navigation, hotbar for abilities). Full controller support with radial menus. Pause-and-plan combat.",
      cameraType: "Isometric",
      coreVerbs: "Fight, Talk, Explore, Craft, Choose, Level Up",
      setting: "A continent recovering from a magical cataclysm. Ancient ruins hold powerful artifacts, rival kingdoms vie for territory, and a secretive guild manipulates events from the shadows. Cities feel lived-in, wilderness is dangerous.",
      timePeriod: "Medieval fantasy with magical technology (runic machinery, enchanted infrastructure)",
      protagonist: "A former scholar whose hometown was destroyed in the cataclysm. Customizable class, background, and moral alignment. Driven by a personal mystery tied to the larger plot.",
      antagonist: "The Ashen Council — a cabal of mages who caused the cataclysm intentionally and now seek to harness its aftereffects. Their leader is a former mentor to the protagonist.",
      narrativeStyle: "Branching",
      themes: "Power and corruption, Redemption, The cost of knowledge, Trust",
      visualStyle: "Stylized/Cel-Shaded",
      colorPalette: "Rich and warm for civilized areas (ambers, deep reds, warm stone). Cold and desaturated for corrupted zones (grays, sickly greens). Magic effects in bright jewel tones.",
      referenceImages: "",
      uiStyle: "Detailed but organized. Tabbed character sheets, inventory grid with item comparison tooltips, quest journal with map markers. Dialogue UI with portrait art and branching options clearly labeled.",
      musicStyle: "Orchestral fantasy with regional instruments. Sweeping strings for exploration, intense percussion for combat, haunting vocals for story moments. Dynamic layers that shift with combat intensity.",
      soundDesign: "Immersive and detailed. Footsteps change by terrain, spells have distinct audio signatures, ambient environments (tavern chatter, forest wildlife, dungeon drips). Combat sounds are weighty and impactful.",
      voiceActing: "Partial (Key Scenes)",
      engine: "Unity",
      targetFPS: "60 FPS",
      minSpecs: "CPU: Intel i5-10400 / Ryzen 5 3600\nGPU: GTX 1060 / RX 580\nRAM: 8GB\nStorage: 15GB SSD",
      networking: "Singleplayer Only",
      techPlatforms: "Windows, PlayStation 5, Xbox Series X",
      model: "Premium (Pay Once)",
      pricePoint: "$29.99",
      iapStrategy: "No microtransactions. Story expansion DLC planned: 'The Ashen Legacy' (new region, 10+ hours of content, new companion). Second expansion with endgame dungeon content.",
      prototype: "8 weeks — Core combat system, 1 town, 3 quests, character creation, basic dialogue",
      alpha: "20 weeks — First act complete (5-8 hours), party system, crafting, 2 companion characters",
      beta: "32 weeks — All 3 acts playable, all companions, full quest chains, save/load, localization-ready",
      launch: "40 weeks — Full polish, balancing pass, accessibility, achievements",
      postLaunch: "Month 1: Bug fixes and balance patches\nMonth 3: Free content update (new side quests, quality of life)\nMonth 8: Paid DLC expansion — new region and story arc\nOngoing: Mod support tools",
    },
  },
  {
    id: "puzzle",
    name: "Puzzle Game",
    icon: Puzzle,
    description: "Brain-teasing mechanics with escalating complexity, minimal story, and satisfying 'aha' moments.",
    color: "#10B981",
    data: {
      gameTitle: "Untitled Puzzle",
      tagline: "Simple rules. Infinite depth. One more level.",
      elevatorPitch: "An elegant puzzle game built around a single core mechanic that evolves through creative level design. Each chapter introduces a twist that recontextualizes everything you've learned. Minimalist presentation keeps focus on the puzzles. Perfect for short sessions or marathon solving.",
      targetAudience: "Puzzle lovers of all ages, fans of Baba Is You, The Witness, and Portal",
      platforms: "PC, Mobile (iOS/Android), Nintendo Switch",
      genre: "Puzzle / Logic",
      gameplayLoop: "View puzzle -> Analyze constraints -> Experiment with solutions -> Solve -> Unlock next puzzle. Chapters group puzzles by mechanic. Optional star challenges for each level reward mastery. Hint system prevents frustration.",
      controls: "Mouse/touch primary. Click/tap to interact with puzzle elements. Drag to move pieces. Undo button always available. Keyboard shortcuts for power users.",
      cameraType: "Top-Down",
      coreVerbs: "Place, Rotate, Connect, Undo, Think",
      setting: "Abstract geometric world. Each chapter has a visual theme (crystal, water, light, shadow) but the world is more conceptual than narrative. Environments reflect the mechanic being explored.",
      timePeriod: "Abstract / Timeless",
      protagonist: "No traditional protagonist. The player's cursor/hand is the only presence. Optional: a small geometric avatar that reacts to puzzle completion.",
      antagonist: "No antagonist. The puzzles themselves are the challenge. Late-game puzzles may have a 'trickster' element that subverts expectations.",
      narrativeStyle: "No Story",
      themes: "Logic, Elegance, Discovery, Patience",
      visualStyle: "Vector",
      colorPalette: "Clean and minimal. White/light gray backgrounds with bold accent colors for interactive elements. Each chapter uses a distinct accent color. High contrast for accessibility.",
      referenceImages: "",
      uiStyle: "Ultra-minimal. No HUD during puzzles — just the puzzle itself. Level select as a clean grid. Chapter progress shown as connected nodes. Settings accessible from pause menu only.",
      musicStyle: "Ambient electronic. Soft synth pads that evolve as you progress through chapters. Subtle melodic elements that respond to puzzle interactions. Never distracting.",
      soundDesign: "Satisfying tactile sounds. Clicks for placement, chimes for correct connections, a rewarding completion sound. Minimal but every sound feels intentional.",
      voiceActing: "No Voice Acting",
      engine: "Godot",
      targetFPS: "60 FPS",
      minSpecs: "CPU: Any modern processor\nGPU: Integrated graphics\nRAM: 1GB\nStorage: 200MB",
      networking: "Singleplayer Only",
      techPlatforms: "Windows, macOS, iOS, Android, Nintendo Switch",
      model: "Premium (Pay Once)",
      pricePoint: "$9.99 (PC/Switch), $4.99 (Mobile)",
      iapStrategy: "No microtransactions. Free content updates with new puzzle packs. Optional paid expansion with advanced puzzles for hardcore players.",
      prototype: "3 weeks — Core mechanic implemented, 10 hand-crafted puzzles, basic UI",
      alpha: "8 weeks — 3 chapters (60 puzzles), hint system, undo/redo, save progress",
      beta: "12 weeks — All 6 chapters (120+ puzzles), star challenges, accessibility options",
      launch: "16 weeks — Full polish, mobile optimization, colorblind modes, cloud save",
      postLaunch: "Month 1: Bug fixes\nMonth 2: Free puzzle pack (20 community-favorite style puzzles)\nMonth 4: Paid expansion — 'Expert Mode' with 40 brutally hard puzzles\nOngoing: Daily puzzle feature",
    },
  },
  {
    id: "fps",
    name: "FPS",
    icon: Crosshair,
    description: "Fast-paced first-person shooter with tight gunplay, multiplayer modes, and visceral combat.",
    color: "#EF4444",
    data: {
      gameTitle: "Untitled FPS",
      tagline: "Lock and load. Every bullet counts.",
      elevatorPitch: "A skill-based FPS that blends tactical gunplay with fluid movement. Tight weapon handling, destructible environments, and competitive multiplayer modes. A solo campaign teaches mechanics through intense set pieces. Movement abilities like sliding and wall-running add verticality without sacrificing tactical depth.",
      targetAudience: "FPS fans aged 16-35, competitive gamers, fans of DOOM, Titanfall, and Counter-Strike",
      platforms: "PC (Steam), PlayStation 5, Xbox Series X",
      genre: "First-Person Shooter / Action",
      gameplayLoop: "Campaign: Enter area -> Engage enemies using guns + movement abilities -> Clear encounter -> Scavenge ammo/upgrades -> Push forward. Multiplayer: Queue match -> Select loadout -> Compete in objective or deathmatch modes -> Earn XP -> Unlock cosmetics.",
      controls: "WASD movement, mouse aim, left-click shoot, right-click ADS, shift sprint, ctrl slide, space jump/double-jump, Q/E for abilities. Fully rebindable. Controller with aim assist options.",
      cameraType: "First Person",
      coreVerbs: "Shoot, Move, Slide, Aim, Dodge, Reload",
      setting: "Near-future Earth after a corporate war. Megacities are battlegrounds between private military companies. Environments range from neon-lit urban districts to industrial wastelands and orbital stations.",
      timePeriod: "Near future (2080s)",
      protagonist: "Campaign: A disgraced PMC operative pulled back in for one last mission. Dry humor, reluctant heroism. Multiplayer: customizable operator with faction allegiance.",
      antagonist: "Campaign: Zenith Corp, a megacorp developing autonomous weapons. Their CEO is a charismatic tech oligarch who believes human soldiers are obsolete.",
      narrativeStyle: "Linear",
      themes: "Technology vs. humanity, Corporate warfare, Loyalty, The cost of violence",
      visualStyle: "Realistic",
      colorPalette: "High contrast. Dark environments with bright muzzle flashes, neon signage, and particle effects. UI uses warm amber/orange on dark backgrounds. Enemy indicators in red, allies in blue.",
      referenceImages: "",
      uiStyle: "Clean military HUD. Ammo counter, health bar, minimap, and crosshair. Kill feed and objective markers. Minimal clutter — information density adjustable in settings.",
      musicStyle: "Electronic/industrial with orchestral elements for cinematic moments. Heavy bass and synth during combat, ambient tension during stealth/exploration. Dynamic music system that ramps with combat intensity.",
      soundDesign: "Hyper-realistic weapon sounds with spatial audio. Distinct audio signatures per weapon type. Directional footsteps for competitive advantage. Explosions with bass impact. Shell casings hitting the floor.",
      voiceActing: "Full Voice Acting",
      engine: "Unreal Engine 5",
      targetFPS: "120 FPS",
      minSpecs: "CPU: Intel i7-10700K / Ryzen 7 3700X\nGPU: RTX 2070 / RX 5700 XT\nRAM: 16GB\nStorage: 50GB SSD",
      networking: "Online Multiplayer",
      techPlatforms: "Windows, PlayStation 5, Xbox Series X",
      model: "Premium (Pay Once)",
      pricePoint: "$39.99",
      iapStrategy: "Cosmetic-only microtransactions: weapon skins, operator outfits, emotes. Battle pass each season (8 weeks). No pay-to-win — all gameplay content is free.",
      prototype: "12 weeks — Core gunplay, movement system, 1 multiplayer map, 3 weapons, basic AI for campaign",
      alpha: "24 weeks — 4 multiplayer maps, 10 weapons, 3 campaign missions, matchmaking",
      beta: "36 weeks — Full campaign (8 missions), 8 multiplayer maps, ranked mode, anti-cheat",
      launch: "44 weeks — Full polish, launch trailer, server infrastructure, season 1 content ready",
      postLaunch: "Season 1 (launch): 2 new maps, battle pass, ranked ladder\nSeason 2 (8 weeks): New game mode, 3 weapons\nSeason 3: New campaign DLC\nOngoing: Community maps, esports support",
    },
  },
  {
    id: "horror",
    name: "Horror",
    icon: Ghost,
    description: "Atmospheric survival horror with tension, resource management, and psychological dread.",
    color: "#6B7280",
    data: {
      gameTitle: "Untitled Horror",
      tagline: "Some doors should stay closed.",
      elevatorPitch: "A first-person psychological horror game where the environment itself is the enemy. Explore a shifting, impossible space that reacts to your actions and sanity. No combat — survival depends on stealth, puzzle-solving, and managing your deteriorating mental state. The less you see, the more you fear.",
      targetAudience: "Horror fans aged 18+, fans of Amnesia, PT, and Soma",
      platforms: "PC (Steam), PlayStation 5",
      genre: "Psychological Horror / Survival",
      gameplayLoop: "Explore environment -> Solve environmental puzzles to progress -> Avoid/hide from threats -> Manage sanity and resources (light sources, medicine) -> Uncover story fragments -> Reach safe room to save. Sanity affects what you see and hear — unreliable perception is core.",
      controls: "WASD movement, mouse look, E to interact, F for flashlight, shift to sprint (limited stamina), ctrl to crouch/hide. Deliberately limited — no combat buttons reinforce vulnerability.",
      cameraType: "First Person",
      coreVerbs: "Explore, Hide, Listen, Solve, Survive, Run",
      setting: "An abandoned research facility built into a coastal cliff. The architecture shifts impossibly — hallways loop, rooms change when you're not looking, doors lead to places they shouldn't. The facility was studying something recovered from the deep ocean.",
      timePeriod: "Modern day (isolated location, no outside contact)",
      protagonist: "A maintenance contractor called in for a routine job. No combat training, no weapons. Relatable and vulnerable. Internal monologue reveals growing dread and fragmented memories.",
      antagonist: "The Presence — never fully seen, only felt. It corrupts the space around it, turning the facility into a labyrinth. Secondary threat: your own deteriorating sanity and the hallucinations it creates.",
      narrativeStyle: "Environmental Storytelling",
      themes: "Fear of the unknown, Isolation, Sanity, What lies beneath the surface",
      visualStyle: "Realistic",
      colorPalette: "Extremely desaturated. Grays, dark blues, sickly yellows from fluorescent lights. Occasional vivid red as a warning color. Darkness is a design element — most of the screen is shadow.",
      referenceImages: "",
      uiStyle: "Almost no HUD. No health bar — physical state communicated through visual/audio cues (limping, heavy breathing, screen distortion). Inventory is a physical item the player holds. Flashlight battery shown as a dim indicator light.",
      musicStyle: "Barely music — more like a living soundscape. Low drones, distant industrial sounds, dissonant strings. Silence is used as tension. Rare melodic fragments in safe rooms feel like relief. Stinger cues for scares are used sparingly.",
      soundDesign: "The most important design element. Spatial audio critical — directional sounds, reverb changes with room size, sounds behind walls. Breathing, heartbeat, footsteps are hyper-detailed. Ambiguous sounds that could be threat or environment.",
      voiceActing: "Partial (Key Scenes)",
      engine: "Unreal Engine 5",
      targetFPS: "60 FPS",
      minSpecs: "CPU: Intel i5-10400 / Ryzen 5 3600\nGPU: RTX 2060 / RX 5600 XT\nRAM: 12GB\nStorage: 25GB SSD",
      networking: "Singleplayer Only",
      techPlatforms: "Windows, PlayStation 5",
      model: "Premium (Pay Once)",
      pricePoint: "$24.99",
      iapStrategy: "No microtransactions. One story DLC expanding the lore — a prequel chapter showing the facility's final days before the incident. Released 4 months post-launch.",
      prototype: "8 weeks — Core loop: exploration, flashlight, one shifting room, basic AI stalker, sanity system prototype",
      alpha: "18 weeks — 2 of 4 chapters playable, puzzle mechanics, full sanity system, sound design pass",
      beta: "28 weeks — All 4 chapters, multiple endings based on sanity, full audio, playtesting for scare pacing",
      launch: "34 weeks — Final polish, performance optimization, accessibility (subtitle options, scare intensity slider)",
      postLaunch: "Month 1: Bug fixes, community feedback on scare pacing\nMonth 4: Paid DLC — 'Before the Dark' prequel chapter\nMonth 6: Free update with commentary mode and behind-the-scenes",
    },
  },
];

function getGDDKey(projectId: string) {
  return `gameforge_gdd_${projectId}`;
}

function loadGDD(projectId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(getGDDKey(projectId));
  if (raw) return JSON.parse(raw);
  if (projectId === "proj_001") {
    localStorage.setItem(getGDDKey(projectId), JSON.stringify(CONSTELLAR_SEED));
    return { ...CONSTELLAR_SEED };
  }
  return {};
}

function saveGDD(projectId: string, data: Record<string, string>) {
  localStorage.setItem(getGDDKey(projectId), JSON.stringify(data));
}

function getPillarsKey(projectId: string) {
  return `gameforge_pillars_${projectId}`;
}

function loadPillarsData(projectId: string): DesignPillar[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(getPillarsKey(projectId));
  if (raw) return JSON.parse(raw);
  return [];
}

function savePillarsData(projectId: string, pillars: DesignPillar[]) {
  localStorage.setItem(getPillarsKey(projectId), JSON.stringify(pillars));
}

function getCodexKey(projectId: string) {
  return `gameforge_codex_${projectId}`;
}

function loadCodex(projectId: string): CodexEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(getCodexKey(projectId));
  if (raw) return JSON.parse(raw);
  return [];
}

function saveCodex(projectId: string, entries: CodexEntry[]) {
  localStorage.setItem(getCodexKey(projectId), JSON.stringify(entries));
}

export default function GDDPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GDDTemplate | null>(null);
  const [achievements, setAchievements] = useState<{ name: string; description: string; rarity: string; condition: string }[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementsCopied, setAchievementsCopied] = useState(false);
  const [scenePlannerLoading, setScenePlannerLoading] = useState(false);
  const [scenePlannerResult, setScenePlannerResult] = useState("");
  const [showScenePlanner, setShowScenePlanner] = useState(false);
  const [scenePlannerCopied, setScenePlannerCopied] = useState(false);
  const [tutorialLoading, setTutorialLoading] = useState(false);
  const [tutorialResult, setTutorialResult] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCopied, setTutorialCopied] = useState(false);

  const [showLocalize, setShowLocalize] = useState(false);
  const [localizeLoading, setLocalizeLoading] = useState(false);
  const [localizeSource, setLocalizeSource] = useState("");
  const [localizeSourceField, setLocalizeSourceField] = useState("custom");
  const [localizeLang, setLocalizeLang] = useState("Spanish");
  const [localizeResult, setLocalizeResult] = useState("");
  const [localizeCopied, setLocalizeCopied] = useState(false);

  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorResult, setCompetitorResult] = useState<CompetitorAnalysis | null>(null);
  const [showCompetitor, setShowCompetitor] = useState(false);
  const [competitorCopied, setCompetitorCopied] = useState(false);

  const [pillars, setPillars] = useState<DesignPillar[]>([]);
  const [editingPillar, setEditingPillar] = useState<DesignPillar | null>(null);
  const [showPillarForm, setShowPillarForm] = useState(false);
  const [pillarForm, setPillarForm] = useState({ name: "", description: "", priority: 3 });
  const [pillarsAILoading, setPillarsAILoading] = useState(false);

  const [conceptDocLoading, setConceptDocLoading] = useState(false);
  const [conceptDocResult, setConceptDocResult] = useState("");
  const [showConceptDoc, setShowConceptDoc] = useState(false);
  const [conceptDocCopied, setConceptDocCopied] = useState(false);

  const [enemies, setEnemies] = useState<AIEnemy[]>([]);
  const [enemiesLoading, setEnemiesLoading] = useState(false);
  const [showEnemies, setShowEnemies] = useState(false);
  const [enemiesCopied, setEnemiesCopied] = useState(false);

  const [mechanicsLoading, setMechanicsLoading] = useState(false);
  const [mechanicsResult, setMechanicsResult] = useState("");
  const [showMechanics, setShowMechanics] = useState(false);
  const [mechanicsCopied, setMechanicsCopied] = useState(false);

  const [showWiki, setShowWiki] = useState(false);
  const [wikiTopic, setWikiTopic] = useState("");
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiResult, setWikiResult] = useState("");
  const [codexEntries, setCodexEntries] = useState<CodexEntry[]>([]);
  const [codexView, setCodexView] = useState(false);
  const [selectedCodexEntry, setSelectedCodexEntry] = useState<CodexEntry | null>(null);

  useEffect(() => {
    console.log("[GDDPage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (!p) {
      router.replace("/dashboard/projects");
      return;
    }
    setProject(p);
    setData(loadGDD(projectId));
    setPillars(loadPillarsData(projectId));
    setCodexEntries(loadCodex(projectId));
    const initial: Record<string, boolean> = {};
    GDD_SECTIONS.forEach((s) => (initial[s.id] = true));
    setExpanded(initial);
  }, [projectId, router]);

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };
        return next;
      });
      setDirty(true);
      setSaved(false);
    },
    []
  );

  const handleSave = useCallback(() => {
    saveGDD(projectId, data);
    setSaved(true);
    setDirty(false);
    console.log("[GDD] Saved document for project:", projectId);
    setTimeout(() => setSaved(false), 2000);
  }, [projectId, data]);

  const handleReset = useCallback(() => {
    if (!confirm("Reset all GDD fields to empty? This cannot be undone.")) return;
    const empty: Record<string, string> = {};
    setData(empty);
    saveGDD(projectId, empty);
    setDirty(false);
    console.log("[GDD] Reset document for project:", projectId);
  }, [projectId]);

  const handleExport = useCallback(() => {
    const lines: string[] = [`# ${project?.name || "Untitled"} - Game Design Document\n`];

    for (const section of GDD_SECTIONS) {
      const fieldValues = section.fields
        .filter((f) => data[f.key]?.trim())
        .map((f) => `**${f.label}:** ${data[f.key]}`);
      if (fieldValues.length === 0) continue;
      lines.push(`## ${section.title}\n`);
      for (const val of fieldValues) {
        lines.push(val);
        lines.push("");
      }
    }

    lines.push("---");
    lines.push(`\n*Generated by GameForge on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*`);

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project?.name || "untitled").toLowerCase().replace(/\s+/g, "-")}-gdd.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project, data]);

  const handlePrint = useCallback(() => {
    const allOpen: Record<string, boolean> = {};
    GDD_SECTIONS.forEach((s) => (allOpen[s.id] = true));
    setExpanded(allOpen);
    setTimeout(() => window.print(), 200);
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    setExpanded((prev) => ({ ...prev, [sectionId]: true }));
    setTimeout(() => {
      document.getElementById(`gdd-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const quickFillSection = useCallback((sectionId: string) => {
    const templates = QUICK_FILL_TEMPLATES[sectionId];
    if (!templates) return;
    setData((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(templates)) {
        if (!next[key]?.trim()) {
          next[key] = value;
        }
      }
      return next;
    });
    setDirty(true);
    setSaved(false);
  }, []);

  const applyTemplate = useCallback(
    (template: GDDTemplate) => {
      const hasExistingData = Object.values(data).some((v) => v.trim().length > 0);
      if (hasExistingData) {
        if (!confirm(`This will overwrite your existing GDD data with the "${template.name}" template. Continue?`)) {
          return;
        }
      }
      setData({ ...template.data });
      setDirty(true);
      setSaved(false);
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setToast({ message: `Applied "${template.name}" template`, type: "success" });
    },
    [data]
  );

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleAIWrite = useCallback(
    async (section: GDDSection) => {
      if (!project) return;
      setAiLoading((prev) => ({ ...prev, [section.id]: true }));

      const fieldLabels = section.fields.map((f) => f.label).join(", ");
      const prompt = `Write a "${section.title}" section for a game design document. Game: ${project.name}. Genre: ${project.genre || "unspecified"}. Engine: ${project.engine || "unspecified"}. Description: ${project.description || "No description provided"}. The section should cover these fields: ${fieldLabels}. Be specific and practical. For each field, write 3-5 bullet points or 2-3 short paragraphs. Return ONLY a JSON object where each key is one of these exact field keys: ${section.fields.map((f) => f.key).join(", ")}. The value for each key should be a string with the content. Do not wrap in markdown code blocks. Return raw JSON only.`;

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
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });

        if (!response.ok) throw new Error(`API returned ${response.status}`);

        const apiData = await response.json();
        const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";

        let parsed: Record<string, string> = {};
        try {
          const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          const singleFieldContent = content.trim();
          for (const field of section.fields) {
            if (!data[field.key]?.trim()) {
              parsed[field.key] = singleFieldContent;
              break;
            }
          }
        }

        setData((prev) => {
          const next = { ...prev };
          for (const field of section.fields) {
            if (parsed[field.key]) {
              next[field.key] = parsed[field.key];
            }
          }
          return next;
        });
        setDirty(true);
        setSaved(false);
        setToast({ message: `AI filled "${section.title}" section`, type: "success" });
      } catch (err) {
        console.error("[GDD AI Write]", err);
        setToast({ message: `Failed to generate "${section.title}" — try again`, type: "error" });
      } finally {
        setAiLoading((prev) => ({ ...prev, [section.id]: false }));
      }
    },
    [project, data]
  );

  const handleGenerateAchievements = useCallback(async () => {
    if (!project) return;
    setAchievementsLoading(true);
    setShowAchievements(true);

    const gddSummary = Object.entries(data)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .slice(0, 8)
      .join(". ");

    const prompt = `Design 10 achievements/trophies for '${project.name}', a ${project.genre || "unspecified"} game. Context: ${gddSummary || project.description || "No additional context"}. Include: achievement name, description, rarity (Common/Rare/Epic/Legendary), and unlock condition. Mix progression, skill-based, and hidden achievements. Format as JSON array: [{name, description, rarity, condition}]. Return ONLY raw JSON, no markdown.`;

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
          max_tokens: 1024,
          temperature: 0.8,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setAchievements(Array.isArray(parsed) ? parsed : []);
      setToast({ message: "Generated 10 achievements!", type: "success" });
    } catch (err) {
      console.error("[GDD Achievements]", err);
      setToast({ message: "Failed to generate achievements — try again", type: "error" });
    } finally {
      setAchievementsLoading(false);
    }
  }, [project, data]);

  const handleScenePlanner = useCallback(async () => {
    if (!project) return;
    setScenePlannerLoading(true);
    setShowScenePlanner(true);

    const genre = data.genre || project.genre || "unspecified";
    const description = data.elevatorPitch || data.tagline || project.description || "No description";

    const prompt = `Design 5 game levels/scenes for a ${genre} game: '${description}'. For each level include: name, setting description, objectives (2-3), enemies/obstacles, estimated playtime, and difficulty progression. Format as a numbered list with bold headers.`;

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
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      setScenePlannerResult(content);
      setToast({ message: "Generated 5 level designs!", type: "success" });
    } catch (err) {
      console.error("[GDD Scene Planner]", err);
      setScenePlannerResult("Failed to generate level designs. Please try again.");
      setToast({ message: "Failed to generate levels — try again", type: "error" });
    } finally {
      setScenePlannerLoading(false);
    }
  }, [project, data]);

  const handleMechanicsAdvisor = useCallback(async () => {
    if (!project) return;
    setMechanicsLoading(true);
    setShowMechanics(true);

    const genre = data.genre || project.genre || "unspecified";
    const name = data.gameTitle || project.name || "Untitled";

    const prompt = `Suggest 5 game mechanics for a ${genre} game called '${name}'. For each: name, how it works (2 sentences), why it's fun, complexity level (Simple/Medium/Complex), and which genre conventions it follows or breaks. Format with bold headers.`;

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
          max_tokens: 1024,
          temperature: 0.8,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      setMechanicsResult(content);
      setToast({ message: "Generated 5 game mechanics!", type: "success" });
    } catch (err) {
      console.error("[GDD Mechanics Advisor]", err);
      setMechanicsResult("Failed to generate mechanics. Please try again.");
      setToast({ message: "Failed to generate mechanics — try again", type: "error" });
    } finally {
      setMechanicsLoading(false);
    }
  }, [project, data]);

  const handleTutorialFlow = useCallback(async () => {
    if (!project) return;
    setTutorialLoading(true);
    setShowTutorial(true);

    const genre = data.genre || project.genre || "unspecified";
    const name = data.gameTitle || project.name || "Untitled";

    const prompt = `Design a tutorial sequence for a ${genre} game called '${name}'. Create 8 tutorial steps that teach the player core mechanics. For each step: step number, what the player learns, how it's presented (popup, highlight, level design), estimated duration. Format as a numbered list with bold headers.`;

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
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      setTutorialResult(content);
      setToast({ message: "Generated 8-step tutorial flow!", type: "success" });
    } catch (err) {
      console.error("[GDD Tutorial Flow]", err);
      setTutorialResult("Failed to generate tutorial flow. Please try again.");
      setToast({ message: "Failed to generate tutorial — try again", type: "error" });
    } finally {
      setTutorialLoading(false);
    }
  }, [project, data]);

  const LOCALIZE_LANGUAGES = ["Spanish", "French", "German", "Japanese", "Chinese", "Korean", "Portuguese", "Russian"];

  const gddFieldOptions = GDD_SECTIONS.flatMap((s) =>
    s.fields
      .filter((f) => data[f.key]?.trim())
      .map((f) => ({ key: f.key, label: `${s.title} - ${f.label}` }))
  );

  const handleLocalize = useCallback(async () => {
    if (!localizeSource.trim()) return;
    setLocalizeLoading(true);
    setLocalizeResult("");

    const prompt = `Translate this game text to ${localizeLang}: '${localizeSource}'. Keep gaming terminology accurate. Return only the translation.`;

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
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      setLocalizeResult(content.trim());
      setToast({ message: `Translated to ${localizeLang}!`, type: "success" });
    } catch (err) {
      console.error("[GDD Localize]", err);
      setLocalizeResult("Translation failed. Please try again.");
      setToast({ message: "Translation failed — try again", type: "error" });
    } finally {
      setLocalizeLoading(false);
    }
  }, [localizeSource, localizeLang]);

  const handleCompetitorAnalysis = useCallback(async () => {
    if (!project) return;
    setCompetitorLoading(true);
    setShowCompetitor(true);

    const genre = data.genre || project.genre || "unspecified";
    const name = data.gameTitle || project.name || "Untitled";
    const description = data.elevatorPitch || data.tagline || project.description || "No description";

    const prompt = `Analyze the competitive landscape for a ${genre} game called '${name}'. Describe: ${description}. Identify 3 direct competitors and 2 indirect competitors. For each: name, what they do well, what they lack, and how '${name}' can differentiate. Also suggest the game's unique selling proposition. Return as JSON: {"competitors":[{"name":"...","type":"direct"|"indirect","strengths":"...","weaknesses":"...","differentiation":"..."}],"usp":"..."}. Return ONLY raw JSON, no markdown.`;

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
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setCompetitorResult(parsed);
      setToast({ message: "Competitor analysis complete!", type: "success" });
    } catch (err) {
      console.error("[GDD Competitor Analysis]", err);
      setToast({ message: "Failed to analyze competitors — try again", type: "error" });
    } finally {
      setCompetitorLoading(false);
    }
  }, [project, data]);

  const handleSavePillar = useCallback(() => {
    if (!pillarForm.name.trim()) return;
    setPillars((prev) => {
      let next: DesignPillar[];
      if (editingPillar) {
        next = prev.map((p) =>
          p.id === editingPillar.id
            ? { ...p, name: pillarForm.name, description: pillarForm.description, priority: pillarForm.priority }
            : p
        );
      } else {
        next = [
          ...prev,
          {
            id: `pillar_${Date.now()}`,
            name: pillarForm.name,
            description: pillarForm.description,
            priority: pillarForm.priority,
          },
        ];
      }
      savePillarsData(projectId, next);
      return next;
    });
    setShowPillarForm(false);
    setEditingPillar(null);
    setPillarForm({ name: "", description: "", priority: 3 });
  }, [pillarForm, editingPillar, projectId]);

  const handleDeletePillar = useCallback(
    (id: string) => {
      setPillars((prev) => {
        const next = prev.filter((p) => p.id !== id);
        savePillarsData(projectId, next);
        return next;
      });
    },
    [projectId]
  );

  const handleEditPillar = useCallback((pillar: DesignPillar) => {
    setEditingPillar(pillar);
    setPillarForm({ name: pillar.name, description: pillar.description, priority: pillar.priority });
    setShowPillarForm(true);
  }, []);

  const handleAISuggestPillars = useCallback(async () => {
    if (!project) return;
    if (pillars.length > 0 && !confirm("This will replace your existing design pillars. Continue?")) return;
    setPillarsAILoading(true);

    const genre = data.genre || project.genre || "unspecified";
    const description = data.elevatorPitch || data.tagline || project.description || "No description";

    const prompt = `Suggest 4 design pillars for a ${genre} game: '${description}'. Design pillars are the core principles the game should follow. For each: name (2-3 words), description (1-2 sentences), and priority (1-5, where 5 is highest). Return as JSON array: [{"name":"...","description":"...","priority":N}]. Return ONLY raw JSON, no markdown.`;

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
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        const newPillars: DesignPillar[] = parsed.map(
          (p: { name: string; description: string; priority: number }, i: number) => ({
            id: `pillar_ai_${Date.now()}_${i}`,
            name: p.name || "Untitled",
            description: p.description || "",
            priority: Math.min(5, Math.max(1, p.priority || 3)),
          })
        );
        setPillars(newPillars);
        savePillarsData(projectId, newPillars);
        setToast({ message: "AI suggested 4 design pillars!", type: "success" });
      }
    } catch (err) {
      console.error("[GDD AI Pillars]", err);
      setToast({ message: "Failed to suggest pillars — try again", type: "error" });
    } finally {
      setPillarsAILoading(false);
    }
  }, [project, data, projectId, pillars.length]);

  const handleGenerateConceptDoc = useCallback(async () => {
    if (!project) return;
    setConceptDocLoading(true);
    setConceptDocResult("");
    setShowConceptDoc(true);
    setConceptDocCopied(false);

    const name = data.gameTitle || project.name;
    const genre = data.genre || project.genre || "unknown genre";

    const prompt = `Write a one-page game concept document for '${name}', a ${genre} game. Include: High Concept (1 sentence), Elevator Pitch (2 sentences), Player Experience Goals (3 bullets), Game Loop (describe the core loop), Target Audience, Art Direction (2 sentences), Sound Direction (2 sentences), Scope Assessment (small/medium/large with justification). Format each section with a clear heading.`;

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
          max_tokens: 512,
          temperature: 0.7,
        }),
      });
      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      setConceptDocResult(content.trim());
      setToast({ message: "Concept doc generated!", type: "success" });

      const aiUses = parseInt(localStorage.getItem("gameforge_ai_uses") || "0", 10);
      localStorage.setItem("gameforge_ai_uses", String(aiUses + 1));
    } catch (err) {
      console.error("[GDD ConceptDoc]", err);
      setConceptDocResult("Failed to generate concept doc. Please try again.");
      setToast({ message: "Concept doc failed -- try again", type: "error" });
    } finally {
      setConceptDocLoading(false);
    }
  }, [project, data]);

  const handleExportConceptDoc = useCallback(() => {
    if (!conceptDocResult) return;
    const name = data.gameTitle || project?.name || "Untitled";
    const blob = new Blob([`# ${name} - Game Concept Document\n\n${conceptDocResult}\n\n---\n*Generated by GameForge on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, "-")}-concept-doc.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [conceptDocResult, data, project]);

  const handleGenerateEnemies = useCallback(async () => {
    if (!project) return;
    setEnemiesLoading(true);
    setShowEnemies(true);
    setEnemiesCopied(false);

    const genre = data.genre || project.genre || "unspecified";
    const name = data.gameTitle || project.name || "Untitled";

    const prompt = `Design 5 enemies for a ${genre} game called '${name}'. For each enemy provide: name, type (one of: Minion, Elite, Boss, or NPC), health (number 50-5000), attackDamage (number 5-500), speed (number 1-10), specialAbility (one sentence), behaviorPattern (one sentence), and visualDescription (one sentence). Return as JSON array: [{"name":"...","type":"...","health":N,"attackDamage":N,"speed":N,"specialAbility":"...","behaviorPattern":"...","visualDescription":"..."}]. Include at least 1 Boss, 1 Elite, 1 NPC, and 2 Minions. Return ONLY raw JSON, no markdown.`;

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
          max_tokens: 1024,
          temperature: 0.8,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setEnemies(Array.isArray(parsed) ? parsed : []);
      setToast({ message: `Generated ${Array.isArray(parsed) ? parsed.length : 0} enemies!`, type: "success" });
    } catch (err) {
      console.error("[GDD AI Enemies]", err);
      setToast({ message: "Failed to generate enemies — try again", type: "error" });
    } finally {
      setEnemiesLoading(false);
    }
  }, [project, data]);

  const handleGenerateWikiEntry = useCallback(async () => {
    if (!project || !wikiTopic.trim()) return;
    setWikiLoading(true);
    setWikiResult("");
    setSelectedCodexEntry(null);

    const name = data.gameTitle || project.name || "Untitled";
    const genre = data.genre || project.genre || "unspecified";

    const prompt = `Write a game wiki/codex entry for the topic '${wikiTopic.trim()}' in '${name}', a ${genre} game. Include: overview (1 paragraph), history/background, key details (3 bullet points), and connections to other game elements. Write in an in-universe tone, like a game encyclopedia. Keep it to 200 words.`;

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
          max_tokens: 512,
          temperature: 0.8,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const apiData = await response.json();
      const content = apiData.choices?.[0]?.message?.content || apiData.choices?.[0]?.message?.reasoning || "";
      setWikiResult(content.trim());
      setToast({ message: `Wiki entry for "${wikiTopic.trim()}" generated!`, type: "success" });
    } catch (err) {
      console.error("[GDD Wiki]", err);
      setWikiResult("Failed to generate wiki entry. Please try again.");
      setToast({ message: "Wiki generation failed -- try again", type: "error" });
    } finally {
      setWikiLoading(false);
    }
  }, [project, data, wikiTopic]);

  const handleSaveCodexEntry = useCallback(() => {
    if (!wikiResult || !wikiTopic.trim()) return;
    const entry: CodexEntry = {
      id: `codex_${Date.now()}`,
      topic: wikiTopic.trim(),
      content: wikiResult,
      createdAt: new Date().toISOString(),
    };
    setCodexEntries((prev) => {
      const next = [entry, ...prev];
      saveCodex(projectId, next);
      return next;
    });
    setToast({ message: `"${wikiTopic.trim()}" saved to codex!`, type: "success" });
  }, [wikiResult, wikiTopic, projectId]);

  const handleDeleteCodexEntry = useCallback(
    (id: string) => {
      setCodexEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        saveCodex(projectId, next);
        return next;
      });
      if (selectedCodexEntry?.id === id) {
        setSelectedCodexEntry(null);
      }
    },
    [projectId, selectedCodexEntry]
  );

  const filledFields = Object.values(data).filter((v) => v.trim().length > 0).length;
  const totalFields = GDD_SECTIONS.reduce((acc, s) => acc + s.fields.length, 0);
  const completionPct = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  if (!project) return null;

  return (
    <div className="flex gap-8">
      {/* TOC Sidebar */}
      <nav className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Contents
            </h3>
            <div className="space-y-0.5">
              {GDD_SECTIONS.map((section) => {
                const sf = section.fields.filter((f) => data[f.key]?.trim().length > 0).length;
                const st = section.fields.length;
                const done = sf === st && st > 0;
                const partial = sf > 0 && !done;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#2A2A2A]/50 group"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                    ) : partial ? (
                      <div className="relative h-4 w-4 shrink-0">
                        <Circle className="h-4 w-4 text-[#F59E0B]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                        </div>
                      </div>
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-[#3A3A3A]" />
                    )}
                    <span
                      className={`truncate ${
                        done
                          ? "text-[#10B981]"
                          : partial
                          ? "text-[#D1D5DB]"
                          : "text-[#6B7280]"
                      } group-hover:text-[#F5F5F5]`}
                    >
                      {section.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mini progress */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#6B7280]">Progress</span>
              <span className="font-medium text-[#F59E0B]">{completionPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
              <div
                className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 min-w-0 max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Projects", href: "/dashboard/projects" },
              { label: project.name, href: `/dashboard/projects/${projectId}` },
              { label: "GDD" },
            ]}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Game Design Document</h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Define every aspect of {project.name} in one place
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerateConceptDoc}
                disabled={conceptDocLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {conceptDocLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                AI Full Concept Doc
              </button>
              <button
                onClick={handleTutorialFlow}
                disabled={tutorialLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tutorialLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GraduationCap className="h-3.5 w-3.5" />
                )}
                AI Tutorial
              </button>
              <button
                onClick={() => setShowLocalize(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10"
              >
                <Languages className="h-3.5 w-3.5" />
                AI Localize
              </button>
              <button
                onClick={handleCompetitorAnalysis}
                disabled={competitorLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {competitorLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Target className="h-3.5 w-3.5" />
                )}
                AI Competitors
              </button>
              <button
                onClick={handleScenePlanner}
                disabled={scenePlannerLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scenePlannerLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Map className="h-3.5 w-3.5" />
                )}
                AI Scene Planner
              </button>
              <button
                onClick={handleGenerateAchievements}
                disabled={achievementsLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {achievementsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trophy className="h-3.5 w-3.5" />
                )}
                AI Achievements
              </button>
              <button
                onClick={handleGenerateEnemies}
                disabled={enemiesLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enemiesLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Swords className="h-3.5 w-3.5" />
                )}
                AI Enemies
              </button>
              <button
                onClick={handleMechanicsAdvisor}
                disabled={mechanicsLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mechanicsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Puzzle className="h-3.5 w-3.5" />
                )}
                AI Mechanics
              </button>
              <button
                onClick={() => { setShowWiki(true); setCodexView(false); }}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10"
              >
                <BookOpen className="h-3.5 w-3.5" />
                AI Game Wiki
                {codexEntries.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-[#F59E0B]/20 px-1.5 py-0.5 text-[10px] font-semibold">
                    {codexEntries.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10"
              >
                <Library className="h-3.5 w-3.5" />
                Load Template
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                <Download className="h-3.5 w-3.5" />
                Export .md
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-red-500/30 hover:text-red-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
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
                <Save className="h-3.5 w-3.5" />
                {saved ? "Saved!" : dirty ? "Save Changes" : "Save"}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#9CA3AF]">Document Completion</span>
            <span className="font-medium text-[#F59E0B]">{completionPct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
            <div
              className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#6B7280]">
            {filledFields} of {totalFields} fields completed
          </p>
        </div>

        {/* Design Pillars */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                <Anchor className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <div>
                <h3 className="font-semibold">Design Pillars</h3>
                <p className="text-xs text-[#6B7280]">Core principles guiding {project.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAISuggestPillars}
                disabled={pillarsAILoading}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#8B5CF6]/30 bg-[#8B5CF6]/5 px-3 py-2 text-sm text-[#8B5CF6] transition-colors hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pillarsAILoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {pillarsAILoading ? "Suggesting..." : "AI Suggest Pillars"}
              </button>
              <button
                onClick={() => {
                  setEditingPillar(null);
                  setPillarForm({ name: "", description: "", priority: 3 });
                  setShowPillarForm(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Pillar
              </button>
            </div>
          </div>

          <div className="p-5">
            {pillars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Anchor className="h-10 w-10 text-[#2A2A2A]" />
                <p className="text-sm text-[#6B7280]">
                  No design pillars yet. Add your core principles or let AI suggest them.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pillars.map((pillar) => (
                  <div
                    key={pillar.id}
                    className="group rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4 transition-all hover:border-[#F59E0B]/30"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-[#F5F5F5]">{pillar.name}</h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditPillar(pillar)}
                          className="rounded-md p-1 text-[#6B7280] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePillar(pillar.id)}
                          className="rounded-md p-1 text-[#6B7280] hover:text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed mb-3">{pillar.description}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= pillar.priority ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#2A2A2A]"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-[10px] text-[#6B7280] uppercase tracking-wider">
                        {pillar.priority === 5
                          ? "Critical"
                          : pillar.priority === 4
                          ? "High"
                          : pillar.priority === 3
                          ? "Medium"
                          : pillar.priority === 2
                          ? "Low"
                          : "Optional"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pillar Add/Edit Modal */}
        {showPillarForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
                <h3 className="text-lg font-semibold">
                  {editingPillar ? "Edit Pillar" : "Add Design Pillar"}
                </h3>
                <button
                  onClick={() => {
                    setShowPillarForm(false);
                    setEditingPillar(null);
                  }}
                  className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Pillar Name</label>
                  <input
                    type="text"
                    value={pillarForm.name}
                    onChange={(e) => setPillarForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Player Agency, Tactile Feedback"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] focus:border-[#F59E0B]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Description</label>
                  <textarea
                    value={pillarForm.description}
                    onChange={(e) => setPillarForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe what this pillar means for your game..."
                    rows={3}
                    className="w-full resize-y rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] focus:border-[#F59E0B]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Priority</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setPillarForm((p) => ({ ...p, priority: s }))}
                        className="rounded-md p-1 transition-colors hover:bg-[#F59E0B]/10"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            s <= pillarForm.priority ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#3A3A3A]"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs text-[#6B7280]">
                      {pillarForm.priority === 5
                        ? "Critical"
                        : pillarForm.priority === 4
                        ? "High"
                        : pillarForm.priority === 3
                        ? "Medium"
                        : pillarForm.priority === 2
                        ? "Low"
                        : "Optional"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#2A2A2A] px-6 py-4">
                <button
                  onClick={() => {
                    setShowPillarForm(false);
                    setEditingPillar(null);
                  }}
                  className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePillar}
                  disabled={!pillarForm.name.trim()}
                  className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingPillar ? "Save Changes" : "Add Pillar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-3">
          {GDD_SECTIONS.map((section) => {
            const isOpen = expanded[section.id] ?? false;
            const sectionFilled = section.fields.filter(
              (f) => data[f.key]?.trim().length > 0
            ).length;
            const sectionTotal = section.fields.length;
            const sectionDone = sectionFilled === sectionTotal && sectionTotal > 0;
            const sectionPartial = sectionFilled > 0 && !sectionDone;
            const hasEmptyFields = sectionFilled < sectionTotal;

            return (
              <div
                key={section.id}
                id={`gdd-${section.id}`}
                className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] scroll-mt-6"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1F1F1F]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                    <section.icon className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold">{section.title}</span>
                    <span className="ml-2 text-xs text-[#6B7280]">
                      {sectionFilled}/{sectionTotal} filled
                    </span>
                  </div>
                  {sectionDone ? (
                    <CheckCircle2 className="mr-2 h-5 w-5 text-[#10B981]" />
                  ) : sectionPartial ? (
                    <div className="relative mr-2 h-5 w-5">
                      <Circle className="h-5 w-5 text-[#F59E0B]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                      </div>
                    </div>
                  ) : (
                    <Circle className="mr-2 h-5 w-5 text-[#3A3A3A]" />
                  )}
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280]" />
                  )}
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-[#2A2A2A] px-5 py-5">
                    <div className="flex flex-wrap gap-2">
                      {hasEmptyFields && (
                        <button
                          onClick={() => quickFillSection(section.id)}
                          className="flex items-center gap-2 rounded-lg border border-dashed border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-2.5 text-sm text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10"
                        >
                          <Wand2 className="h-4 w-4" />
                          Quick Fill Empty Fields
                        </button>
                      )}
                      <button
                        onClick={() => handleAIWrite(section)}
                        disabled={!!aiLoading[section.id]}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-[#8B5CF6]/30 bg-[#8B5CF6]/5 px-4 py-2.5 text-sm text-[#8B5CF6] transition-colors hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiLoading[section.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {aiLoading[section.id] ? "Writing..." : "AI Write"}
                      </button>
                    </div>
                    {section.fields.map((field) => (
                      <div key={field.key}>
                        <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#D1D5DB]">
                          {field.label}
                          {data[field.key]?.trim() ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-[#3A3A3A]" />
                          )}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            value={data[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={4}
                            className="w-full resize-y rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                          />
                        ) : field.type === "select" ? (
                          <select
                            value={data[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                          >
                            <option value="" className="text-[#6B7280]">
                              {field.placeholder}
                            </option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={data[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Scene Planner Panel */}
        {showScenePlanner && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <Map className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Scene / Level Planner</h3>
                  <p className="text-xs text-[#6B7280]">
                    5 levels designed for {project?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {scenePlannerResult && !scenePlannerLoading && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scenePlannerResult);
                      setScenePlannerCopied(true);
                      setTimeout(() => setScenePlannerCopied(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      scenePlannerCopied
                        ? "bg-[#10B981] text-white"
                        : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                    }`}
                  >
                    {scenePlannerCopied ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowScenePlanner(false)}
                  className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {scenePlannerLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                  <p className="text-sm text-[#6B7280]">Designing levels...</p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB] font-sans">
                    {scenePlannerResult}
                  </pre>
                </div>
              )}
            </div>

            {scenePlannerResult && !scenePlannerLoading && (
              <div className="flex items-center justify-between border-t border-[#2A2A2A] px-5 py-3">
                <p className="text-xs text-[#6B7280]">Based on your GDD genre and description</p>
                <button
                  onClick={handleScenePlanner}
                  disabled={scenePlannerLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Mechanics Advisor Panel */}
        {showMechanics && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <Puzzle className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Game Mechanics Advisor</h3>
                  <p className="text-xs text-[#6B7280]">
                    5 mechanics suggested for {project?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mechanicsResult && !mechanicsLoading && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(mechanicsResult);
                      setMechanicsCopied(true);
                      setTimeout(() => setMechanicsCopied(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      mechanicsCopied
                        ? "bg-[#10B981] text-white"
                        : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                    }`}
                  >
                    {mechanicsCopied ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowMechanics(false)}
                  className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {mechanicsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                  <p className="text-sm text-[#6B7280]">Brainstorming mechanics...</p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB] font-sans">
                    {mechanicsResult}
                  </pre>
                </div>
              )}
            </div>

            {mechanicsResult && !mechanicsLoading && (
              <div className="flex items-center justify-between border-t border-[#2A2A2A] px-5 py-3">
                <p className="text-xs text-[#6B7280]">Based on your game genre and title</p>
                <button
                  onClick={handleMechanicsAdvisor}
                  disabled={mechanicsLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Tutorial Flow Panel */}
        {showTutorial && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <GraduationCap className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Tutorial Flow</h3>
                  <p className="text-xs text-[#6B7280]">
                    8-step tutorial sequence for {project?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {tutorialResult && !tutorialLoading && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tutorialResult);
                      setTutorialCopied(true);
                      setTimeout(() => setTutorialCopied(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      tutorialCopied
                        ? "bg-[#10B981] text-white"
                        : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                    }`}
                  >
                    {tutorialCopied ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowTutorial(false)}
                  className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {tutorialLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                  <p className="text-sm text-[#6B7280]">Designing tutorial flow...</p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB] font-sans">
                    {tutorialResult}
                  </pre>
                </div>
              )}
            </div>

            {tutorialResult && !tutorialLoading && (
              <div className="flex items-center justify-between border-t border-[#2A2A2A] px-5 py-3">
                <p className="text-xs text-[#6B7280]">Based on your game genre and title</p>
                <button
                  onClick={handleTutorialFlow}
                  disabled={tutorialLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Localize Panel */}
        {showLocalize && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <Languages className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Localize</h3>
                  <p className="text-xs text-[#6B7280]">
                    Translate game text with accurate gaming terminology
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLocalize(false)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Source</label>
                  <select
                    value={localizeSourceField}
                    onChange={(e) => {
                      setLocalizeSourceField(e.target.value);
                      if (e.target.value !== "custom") {
                        setLocalizeSource(data[e.target.value] || "");
                      }
                    }}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                  >
                    <option value="custom">Custom text</option>
                    {gddFieldOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Target Language</label>
                  <select
                    value={localizeLang}
                    onChange={(e) => setLocalizeLang(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                  >
                    {LOCALIZE_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Text to Translate</label>
                <textarea
                  value={localizeSource}
                  onChange={(e) => {
                    setLocalizeSource(e.target.value);
                    setLocalizeSourceField("custom");
                  }}
                  placeholder="Paste or type the text you want translated..."
                  rows={4}
                  className="w-full resize-y rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B]/50 focus:outline-none"
                />
              </div>

              <button
                onClick={handleLocalize}
                disabled={localizeLoading || !localizeSource.trim()}
                className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {localizeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                {localizeLoading ? "Translating..." : `Translate to ${localizeLang}`}
              </button>

              {localizeResult && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Original</p>
                      <p className="text-sm leading-relaxed text-[#D1D5DB] whitespace-pre-wrap">{localizeSource}</p>
                    </div>
                    <div className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B]">{localizeLang}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(localizeResult);
                            setLocalizeCopied(true);
                            setTimeout(() => setLocalizeCopied(false), 2000);
                          }}
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                            localizeCopied
                              ? "bg-[#10B981] text-white"
                              : "text-[#9CA3AF] hover:text-[#F59E0B]"
                          }`}
                        >
                          {localizeCopied ? (
                            <><CheckCircle2 className="h-3 w-3" /> Copied</>
                          ) : (
                            <><Copy className="h-3 w-3" /> Copy</>
                          )}
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed text-[#F5F5F5] whitespace-pre-wrap">{localizeResult}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Competitor Analysis Panel */}
        {showCompetitor && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <Target className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Competitor Analysis</h3>
                  <p className="text-xs text-[#6B7280]">
                    Competitive landscape for {project?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {competitorResult && !competitorLoading && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(competitorResult, null, 2));
                      setCompetitorCopied(true);
                      setTimeout(() => setCompetitorCopied(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      competitorCopied
                        ? "bg-[#10B981] text-white"
                        : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                    }`}
                  >
                    {competitorCopied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy JSON
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowCompetitor(false)}
                  className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {competitorLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                  <p className="text-sm text-[#6B7280]">Analyzing competitors...</p>
                </div>
              ) : competitorResult ? (
                <div className="space-y-5">
                  {competitorResult.usp && (
                    <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B] mb-2">
                        Unique Selling Proposition
                      </p>
                      <p className="text-sm leading-relaxed text-[#F5F5F5]">{competitorResult.usp}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">
                      Direct Competitors
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {competitorResult.competitors
                        ?.filter((c) => (c.type || "direct").toLowerCase() === "direct")
                        .map((comp, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4"
                          >
                            <h4 className="text-sm font-semibold text-[#F5F5F5] mb-3">{comp.name}</h4>
                            <div className="space-y-2.5">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981] mb-1">
                                  Strengths
                                </p>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">{comp.strengths}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">
                                  Weaknesses
                                </p>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">{comp.weaknesses}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B] mb-1">
                                  Our Edge
                                </p>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                                  {comp.differentiation}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">
                      Indirect Competitors
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {competitorResult.competitors
                        ?.filter((c) => (c.type || "").toLowerCase() === "indirect")
                        .map((comp, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#0F0F0F] p-4"
                          >
                            <h4 className="text-sm font-semibold text-[#F5F5F5] mb-3">{comp.name}</h4>
                            <div className="space-y-2.5">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981] mb-1">
                                  Strengths
                                </p>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">{comp.strengths}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">
                                  Weaknesses
                                </p>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">{comp.weaknesses}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B] mb-1">
                                  Our Edge
                                </p>
                                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                                  {comp.differentiation}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {competitorResult && !competitorLoading && (
              <div className="flex items-center justify-between border-t border-[#2A2A2A] px-5 py-3">
                <p className="text-xs text-[#6B7280]">Based on your GDD genre, name, and description</p>
                <button
                  onClick={handleCompetitorAnalysis}
                  disabled={competitorLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Achievements Modal */}
      {showAchievements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <Trophy className="h-4.5 w-4.5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">AI Achievements</h3>
                  <p className="text-xs text-[#6B7280]">
                    {achievements.length} trophies generated for {project?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {achievements.length > 0 && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(achievements, null, 2));
                      setAchievementsCopied(true);
                      setTimeout(() => setAchievementsCopied(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      achievementsCopied
                        ? "bg-[#10B981] text-white"
                        : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                    }`}
                  >
                    {achievementsCopied ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy JSON</>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowAchievements(false)}
                  className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {achievementsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                  <p className="text-sm text-[#6B7280]">Designing achievements...</p>
                </div>
              ) : achievements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Trophy className="h-10 w-10 text-[#3A3A3A]" />
                  <p className="text-sm text-[#6B7280]">No achievements generated yet</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {achievements.map((ach, i) => {
                    const rarityColors: Record<string, { border: string; bg: string; text: string }> = {
                      Common: { border: "#6B7280", bg: "#6B728010", text: "#9CA3AF" },
                      Rare: { border: "#3B82F6", bg: "#3B82F610", text: "#60A5FA" },
                      Epic: { border: "#8B5CF6", bg: "#8B5CF610", text: "#A78BFA" },
                      Legendary: { border: "#F59E0B", bg: "#F59E0B10", text: "#FBBF24" },
                    };
                    const r = rarityColors[ach.rarity] || rarityColors.Common;
                    return (
                      <div
                        key={i}
                        className="rounded-xl border-2 bg-[#0F0F0F] p-4 transition-all hover:bg-[#151515]"
                        style={{ borderColor: r.border + "40" }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 shrink-0" style={{ color: r.text }} />
                            <h4 className="text-sm font-semibold text-[#F5F5F5]">{ach.name}</h4>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: r.bg, color: r.text }}
                          >
                            {ach.rarity}
                          </span>
                        </div>
                        <p className="text-xs text-[#9CA3AF] leading-relaxed mb-2">{ach.description}</p>
                        <div className="flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-2.5 py-1.5">
                          <Flag className="h-3 w-3 shrink-0 text-[#6B7280]" />
                          <p className="text-[11px] text-[#6B7280]">{ach.condition}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {achievements.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#2A2A2A] px-6 py-3 shrink-0">
                <p className="text-xs text-[#6B7280]">
                  {achievements.filter((a) => a.rarity === "Legendary").length} Legendary, {" "}
                  {achievements.filter((a) => a.rarity === "Epic").length} Epic, {" "}
                  {achievements.filter((a) => a.rarity === "Rare").length} Rare, {" "}
                  {achievements.filter((a) => a.rarity === "Common").length} Common
                </p>
                <button
                  onClick={handleGenerateAchievements}
                  disabled={achievementsLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Enemies Modal */}
      {showEnemies && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                  <Swords className="h-4.5 w-4.5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">AI Enemy / NPC Designer</h3>
                  <p className="text-xs text-[#6B7280]">
                    {enemies.length} entities designed for {project?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {enemies.length > 0 && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(enemies, null, 2));
                      setEnemiesCopied(true);
                      setTimeout(() => setEnemiesCopied(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      enemiesCopied
                        ? "bg-[#10B981] text-white"
                        : "border border-[#2A2A2A] text-[#9CA3AF] hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                    }`}
                  >
                    {enemiesCopied ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy JSON</>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowEnemies(false)}
                  className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {enemiesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                  <p className="text-sm text-[#6B7280]">Designing enemies & NPCs...</p>
                </div>
              ) : enemies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Swords className="h-10 w-10 text-[#3A3A3A]" />
                  <p className="text-sm text-[#6B7280]">No enemies generated yet</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {enemies.map((enemy, i) => {
                    const typeColors: Record<string, { border: string; bg: string; text: string; label: string }> = {
                      Minion: { border: "#6B7280", bg: "#6B728015", text: "#9CA3AF", label: "MINION" },
                      Elite: { border: "#3B82F6", bg: "#3B82F615", text: "#60A5FA", label: "ELITE" },
                      Boss: { border: "#EF4444", bg: "#EF444415", text: "#F87171", label: "BOSS" },
                      NPC: { border: "#10B981", bg: "#10B98115", text: "#34D399", label: "NPC" },
                    };
                    const tc = typeColors[enemy.type] || typeColors.Minion;
                    const maxHealth = Math.max(...enemies.map((e) => e.health || 100), 100);
                    const maxDmg = Math.max(...enemies.map((e) => e.attackDamage || 10), 10);

                    return (
                      <div
                        key={i}
                        className="rounded-xl border-2 bg-[#0F0F0F] p-5 transition-all hover:bg-[#131313]"
                        style={{ borderColor: tc.border + "50" }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg"
                              style={{ backgroundColor: tc.bg }}
                            >
                              <Swords className="h-4 w-4" style={{ color: tc.text }} />
                            </div>
                            <h4 className="text-sm font-bold text-[#F5F5F5]">{enemy.name}</h4>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: tc.bg, color: tc.text }}
                          >
                            {tc.label}
                          </span>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-[#6B7280]">HP</span>
                              <span className="text-[11px] font-mono text-[#9CA3AF]">{enemy.health}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#1A1A1A]">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, ((enemy.health || 0) / maxHealth) * 100)}%`,
                                  backgroundColor: "#EF4444",
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-[#6B7280]">ATK</span>
                              <span className="text-[11px] font-mono text-[#9CA3AF]">{enemy.attackDamage}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#1A1A1A]">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, ((enemy.attackDamage || 0) / maxDmg) * 100)}%`,
                                  backgroundColor: "#F59E0B",
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-[#6B7280]">SPD</span>
                              <span className="text-[11px] font-mono text-[#9CA3AF]">{enemy.speed}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#1A1A1A]">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, ((enemy.speed || 0) / 10) * 100)}%`,
                                  backgroundColor: "#3B82F6",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="rounded-lg bg-[#1A1A1A] px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B] mb-0.5">Special Ability</p>
                            <p className="text-xs text-[#9CA3AF] leading-relaxed">{enemy.specialAbility}</p>
                          </div>
                          <div className="rounded-lg bg-[#1A1A1A] px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">Behavior</p>
                            <p className="text-xs text-[#9CA3AF] leading-relaxed">{enemy.behaviorPattern}</p>
                          </div>
                          <div className="rounded-lg bg-[#1A1A1A] px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">Appearance</p>
                            <p className="text-xs text-[#9CA3AF] leading-relaxed">{enemy.visualDescription}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {enemies.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#2A2A2A] px-6 py-3 shrink-0">
                <p className="text-xs text-[#6B7280]">
                  {enemies.filter((e) => e.type === "Boss").length} Boss, {" "}
                  {enemies.filter((e) => e.type === "Elite").length} Elite, {" "}
                  {enemies.filter((e) => e.type === "Minion").length} Minion, {" "}
                  {enemies.filter((e) => e.type === "NPC").length} NPC
                </p>
                <button
                  onClick={handleGenerateEnemies}
                  disabled={enemiesLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black hover:bg-[#F59E0B]/90 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Concept Doc Modal */}
      {showConceptDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10">
                  <FileText className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Game Concept Document</h3>
                  <p className="text-xs text-[#6B7280]">{data.gameTitle || project?.name || "Untitled"}</p>
                </div>
              </div>
              <button
                onClick={() => setShowConceptDoc(false)}
                className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {conceptDocLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                  <p className="text-sm text-[#6B7280]">Generating concept document...</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  {conceptDocResult.split("\n").map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={i} className="h-3" />;
                    if (trimmed.startsWith("# ")) {
                      return <h1 key={i} className="text-xl font-bold text-[#F59E0B] mb-2 mt-4 first:mt-0">{trimmed.replace(/^#+\s*/, "")}</h1>;
                    }
                    if (trimmed.startsWith("## ") || trimmed.startsWith("**") && trimmed.endsWith("**")) {
                      const text = trimmed.replace(/^#+\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, "").replace(/\*\*:?$/, "");
                      return <h2 key={i} className="text-base font-semibold text-[#F59E0B] mb-1.5 mt-4">{text}</h2>;
                    }
                    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                      return (
                        <div key={i} className="flex items-start gap-2 py-0.5">
                          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                          <p className="text-sm leading-relaxed text-[#D1D5DB]">{trimmed.replace(/^[-*]\s*/, "")}</p>
                        </div>
                      );
                    }
                    return <p key={i} className="text-sm leading-relaxed text-[#D1D5DB]">{trimmed}</p>;
                  })}
                </div>
              )}
            </div>

            {!conceptDocLoading && conceptDocResult && (
              <div className="flex items-center justify-between border-t border-[#2A2A2A] px-6 py-3 shrink-0">
                <button
                  onClick={handleExportConceptDoc}
                  className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export .md
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateConceptDoc}
                    disabled={conceptDocLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B] disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(conceptDocResult);
                      setConceptDocCopied(true);
                      setTimeout(() => setConceptDocCopied(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      conceptDocCopied
                        ? "bg-[#10B981] text-[#0F0F0F]"
                        : "bg-[#F59E0B] text-[#0F0F0F] hover:bg-[#F59E0B]/90"
                    }`}
                  >
                    {conceptDocCopied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy All
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Game Wiki / Codex Modal */}
      {showWiki && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10">
                  <BookOpen className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Game Wiki / Codex</h3>
                  <p className="text-xs text-[#6B7280]">
                    Generate encyclopedia entries for {data.gameTitle || project?.name || "your game"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCodexView(!codexView); setSelectedCodexEntry(null); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    codexView
                      ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "text-[#9CA3AF] hover:text-[#F5F5F5]"
                  }`}
                >
                  {codexView ? "New Entry" : `Codex (${codexEntries.length})`}
                </button>
                <button
                  onClick={() => setShowWiki(false)}
                  className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {codexView ? (
                <div className="flex h-full">
                  <div className="w-64 shrink-0 border-r border-[#2A2A2A] overflow-y-auto">
                    {codexEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
                        <BookOpen className="h-8 w-8 text-[#2A2A2A]" />
                        <p className="text-xs text-[#6B7280] text-center">No codex entries yet. Generate your first wiki entry!</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {codexEntries.map((entry) => (
                          <button
                            key={entry.id}
                            onClick={() => setSelectedCodexEntry(entry)}
                            className={`w-full text-left rounded-lg px-3 py-2.5 transition-all group ${
                              selectedCodexEntry?.id === entry.id
                                ? "bg-[#F59E0B]/10 border border-[#F59E0B]/30"
                                : "hover:bg-[#2A2A2A]/50 border border-transparent"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className={`text-sm font-medium truncate ${
                                selectedCodexEntry?.id === entry.id ? "text-[#F59E0B]" : "text-[#D1D5DB]"
                              }`}>
                                {entry.topic}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCodexEntry(entry.id); }}
                                className="shrink-0 rounded p-0.5 text-[#6B7280] opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="mt-0.5 text-[10px] text-[#6B7280]">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto">
                    {selectedCodexEntry ? (
                      <div>
                        <h4 className="text-lg font-bold text-[#F59E0B] mb-1">{selectedCodexEntry.topic}</h4>
                        <p className="text-[10px] text-[#6B7280] mb-4">
                          Created {new Date(selectedCodexEntry.createdAt).toLocaleString()}
                        </p>
                        <div className="prose prose-invert max-w-none">
                          {selectedCodexEntry.content.split("\n").map((line, i) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={i} className="h-3" />;
                            if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || (trimmed.startsWith("**") && trimmed.endsWith("**"))) {
                              const text = trimmed.replace(/^#+\s*/, "").replace(/^\*\*/, "").replace(/\*\*:?$/, "").replace(/\*\*$/, "");
                              return <h3 key={i} className="text-sm font-semibold text-[#F59E0B] mt-4 mb-1">{text}</h3>;
                            }
                            if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                              return (
                                <div key={i} className="flex items-start gap-2 py-0.5">
                                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                                  <p className="text-sm leading-relaxed text-[#D1D5DB]">{trimmed.replace(/^[-*]\s*/, "")}</p>
                                </div>
                              );
                            }
                            return <p key={i} className="text-sm leading-relaxed text-[#D1D5DB]">{trimmed}</p>;
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <BookOpen className="h-10 w-10 text-[#2A2A2A]" />
                        <p className="text-sm text-[#6B7280]">Select an entry from the codex</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={wikiTopic}
                      onChange={(e) => setWikiTopic(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && wikiTopic.trim()) handleGenerateWikiEntry(); }}
                      placeholder="Enter a topic... e.g. 'the ancient ruins', 'the protagonist', 'the magic system'"
                      className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
                    />
                    <button
                      onClick={handleGenerateWikiEntry}
                      disabled={wikiLoading || !wikiTopic.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {wikiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {wikiLoading ? "Generating..." : "Generate"}
                    </button>
                  </div>

                  {wikiLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                      <p className="text-sm text-[#6B7280]">Writing codex entry for &quot;{wikiTopic}&quot;...</p>
                    </div>
                  )}

                  {!wikiLoading && wikiResult && (
                    <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-bold text-[#F59E0B]">{wikiTopic}</h4>
                        <button
                          onClick={handleSaveCodexEntry}
                          className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 px-3 py-1.5 text-xs font-medium text-[#10B981] transition-all hover:bg-[#10B981]/10"
                        >
                          <Save className="h-3 w-3" />
                          Save to Codex
                        </button>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        {wikiResult.split("\n").map((line, i) => {
                          const trimmed = line.trim();
                          if (!trimmed) return <div key={i} className="h-3" />;
                          if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || (trimmed.startsWith("**") && trimmed.endsWith("**"))) {
                            const text = trimmed.replace(/^#+\s*/, "").replace(/^\*\*/, "").replace(/\*\*:?$/, "").replace(/\*\*$/, "");
                            return <h3 key={i} className="text-sm font-semibold text-[#F59E0B] mt-4 mb-1">{text}</h3>;
                          }
                          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                            return (
                              <div key={i} className="flex items-start gap-2 py-0.5">
                                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                                <p className="text-sm leading-relaxed text-[#D1D5DB]">{trimmed.replace(/^[-*]\s*/, "")}</p>
                              </div>
                            );
                          }
                          return <p key={i} className="text-sm leading-relaxed text-[#D1D5DB]">{trimmed}</p>;
                        })}
                      </div>
                    </div>
                  )}

                  {!wikiLoading && !wikiResult && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <BookOpen className="h-10 w-10 text-[#2A2A2A]" />
                      <p className="text-sm text-[#6B7280]">Enter a topic from your game world to generate a wiki entry</p>
                      <div className="flex flex-wrap gap-2 mt-2 justify-center">
                        {["the protagonist", "the magic system", "the ancient ruins", "the main villain", "the capital city"].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setWikiTopic(suggestion)}
                            className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#9CA3AF] transition-all hover:border-[#F59E0B]/40 hover:text-[#F59E0B]"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Selector Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">GDD Templates</h3>
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  Pick a genre template to pre-fill all sections
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setSelectedTemplate(null);
                }}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {GDD_TEMPLATES.map((template) => {
                const isSelected = selectedTemplate?.id === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-[#F59E0B]/50 bg-[#F59E0B]/5"
                        : "border-[#2A2A2A] bg-[#0F0F0F] hover:border-[#3A3A3A]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${template.color}15` }}
                      >
                        <template.icon
                          className="h-5 w-5"
                          style={{ color: template.color }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{template.name}</span>
                          {isSelected && (
                            <span className="rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[#9CA3AF] leading-relaxed">
                          {template.description}
                        </p>
                        {isSelected && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {GDD_SECTIONS.map((section) => {
                              const filled = section.fields.filter(
                                (f) => template.data[f.key]?.trim()
                              ).length;
                              return (
                                <span
                                  key={section.id}
                                  className="rounded-md bg-[#2A2A2A] px-2 py-0.5 text-[10px] text-[#9CA3AF]"
                                >
                                  {section.title}: {filled}/{section.fields.length}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#2A2A2A] px-6 py-4">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setSelectedTemplate(null);
                }}
                className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedTemplate && applyTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
                className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]"
            }`}
          >
            {toast.type === "error" ? (
              <Circle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {toast.message}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body, html { background: white !important; }
          *, *::before, *::after {
            color: black !important;
            box-shadow: none !important;
          }
          div, section, main { background: transparent !important; }
          aside, [data-sidebar] { display: none !important; }
          .flex.gap-8 > nav { display: none !important; }
          .flex.gap-8 { display: block !important; }
          .border-dashed { display: none !important; }
          svg { display: none !important; }
          h1 { font-size: 24pt !important; margin-bottom: 12px !important; }
          label { color: #333 !important; font-weight: 600 !important; font-size: 11pt !important; }
          input, textarea, select {
            border: none !important;
            background: transparent !important;
            color: black !important;
            padding: 2px 0 !important;
            font-size: 10pt !important;
            line-height: 1.5 !important;
          }
          textarea {
            overflow: visible !important;
            height: auto !important;
            resize: none !important;
          }
          button { display: none !important; }
          .scroll-mt-6 > button:first-child {
            display: flex !important;
            pointer-events: none !important;
            border-bottom: 2px solid #333 !important;
            padding: 8px 0 !important;
            margin-bottom: 8px !important;
          }
          .scroll-mt-6 > button:first-child .font-semibold {
            font-size: 14pt !important;
            font-weight: 700 !important;
          }
          .scroll-mt-6 > button:first-child svg,
          .scroll-mt-6 > button:first-child .h-8 {
            display: none !important;
          }
          .scroll-mt-6 { page-break-inside: avoid; border: none !important; margin-bottom: 16px !important; }
          .rounded-full { display: none !important; }
          @page { margin: 0.75in; }
        }
      `}</style>
    </div>
  );
}
