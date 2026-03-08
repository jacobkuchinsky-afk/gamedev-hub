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

  useEffect(() => {
    console.log("[GDDPage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (!p) {
      router.replace("/dashboard/projects");
      return;
    }
    setProject(p);
    setData(loadGDD(projectId));
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
            <div className="flex items-center gap-2">
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
