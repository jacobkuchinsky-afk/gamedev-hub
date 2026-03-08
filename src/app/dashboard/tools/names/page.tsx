"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Download,
  Trash2,
  Bookmark,
  BookmarkCheck,
  User,
  MapPin,
  Sword,
  Sparkles,
  Bug,
  Shield,
  Shuffle,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

type Category = "characters" | "places" | "items" | "spells" | "creatures" | "guilds";
type Style = "fantasy" | "scifi" | "horror" | "japanese" | "norse" | "steampunk";

interface SavedName {
  name: string;
  category: Category;
  style: Style;
}

const CATEGORIES: { id: Category; label: string; icon: typeof User }[] = [
  { id: "characters", label: "Characters", icon: User },
  { id: "places", label: "Places", icon: MapPin },
  { id: "items", label: "Items/Weapons", icon: Sword },
  { id: "spells", label: "Spells/Abilities", icon: Sparkles },
  { id: "creatures", label: "Creatures", icon: Bug },
  { id: "guilds", label: "Guilds/Factions", icon: Shield },
];

const STYLES: { id: Style; label: string }[] = [
  { id: "fantasy", label: "Fantasy" },
  { id: "scifi", label: "Sci-Fi" },
  { id: "horror", label: "Horror" },
  { id: "japanese", label: "Japanese" },
  { id: "norse", label: "Norse" },
  { id: "steampunk", label: "Steampunk" },
];

const SYLLABLES: Record<Style, {
  onset: string[];
  nucleus: string[];
  coda: string[];
  compound?: string[];
}> = {
  fantasy: {
    onset: ["", "l", "r", "th", "sh", "v", "k", "m", "n", "s", "f", "dr", "tr", "gl", "cr", "br", "ph", "wr", "str"],
    nucleus: ["a", "e", "i", "o", "ae", "ei", "ia", "ou", "ey", "ai", "y", "u"],
    coda: ["n", "r", "l", "th", "nd", "x", "s", "d", "ra", "lia", "na", "ris", "lor", "mir", "ven"],
  },
  scifi: {
    onset: ["z", "x", "kr", "vr", "nx", "q", "tr", "pr", "gl", "dr", "th", ""],
    nucleus: ["a", "e", "i", "o", "u", "y", "ae", "io"],
    coda: ["x", "n", "r", "k", "th", "on", "ix", "ax", "or", "us", "is", "ex"],
    compound: ["-7", "-X", "-9", " Prime", " Zero", " Mk.II", "-Alpha", "-One"],
  },
  horror: {
    onset: ["", "sh", "cr", "gr", "wr", "bl", "dr", "thr", "gh", "sk", "sl", "n", "v"],
    nucleus: ["a", "o", "u", "ai", "ou", "oo", "aa", "ei"],
    coda: ["th", "rn", "ck", "gul", "mor", "nox", "vex", "rak", "gloom", "shade", "crypt"],
  },
  japanese: {
    onset: ["", "k", "s", "t", "n", "h", "m", "y", "r", "w", "sh", "ch", "ts"],
    nucleus: ["a", "i", "u", "e", "o", "ai", "ei", "ou", "uu"],
    coda: ["", "n", "ki", "ko", "ra", "to", "mi", "shi", "ka", "ru", "ma", "ri"],
  },
  norse: {
    onset: ["", "th", "sk", "sv", "br", "fr", "gr", "hr", "kj", "hj", "v", "r", "b", "g", "st"],
    nucleus: ["a", "e", "i", "o", "u", "ei", "au", "y", "ae"],
    coda: ["r", "n", "nd", "rn", "ld", "lf", "rd", "gard", "heim", "mir", "mund", "vald", "bjorn"],
  },
  steampunk: {
    onset: ["", "b", "cl", "cr", "g", "pr", "wr", "st", "wh", "ch", "th", "br", "fl"],
    nucleus: ["a", "e", "i", "o", "u", "ea", "ai", "ou", "ee"],
    coda: ["ck", "th", "n", "r", "ton", "wick", "worth", "ley", "ford", "shire", "well", "gear"],
  },
};

const ITEM_PREFIXES: Record<Style, string[]> = {
  fantasy: ["Blade", "Staff", "Crown", "Ring", "Amulet", "Shield", "Bow", "Tome", "Orb", "Gauntlet", "Scepter", "Chalice"],
  scifi: ["Photon", "Plasma", "Quantum", "Nano", "Cyber", "Hyper", "Proto", "Ion", "Pulse", "Void"],
  horror: ["Cursed", "Wailing", "Rotting", "Hungering", "Weeping", "Screaming", "Bleeding", "Withered"],
  japanese: ["Katana", "Tachi", "Tanto", "Kunai", "Shuriken", "Naginata", "Yumi", "Kanabo"],
  norse: ["Mjolnir", "Gungnir", "Tyrfing", "Gram", "Skofnung", "Dainsleif", "Hofund", "Ridill"],
  steampunk: ["Clockwork", "Brass", "Steam", "Copper", "Aether", "Voltaic", "Pneumatic", "Chrome"],
};

const ITEM_SUFFIXES: Record<Style, string[]> = {
  fantasy: ["of Whispers", "of Storms", "of Twilight", "of the Fallen", "of Dawn", "of Eternity", "of Ruin", "of Starlight", "of the Void", "of the Ancients"],
  scifi: ["Mk.VII", "X-9", "Prime", "Epsilon", "Omega", "Zero", "Nexus", "Core", "Array", "Matrix"],
  horror: ["of Suffering", "of Madness", "of the Damned", "of Bone", "of Nightmares", "of the Abyss", "of Decay", "of Torment"],
  japanese: ["no Kaze", "no Hikari", "no Yami", "no Honoo", "no Tsuki", "no Ken", "no Tamashii", "no Chi"],
  norse: ["of Ragnarok", "of the Frost", "Bane", "of Valhalla", "of the Wolf", "of Odin", "Slayer", "the Undying"],
  steampunk: ["Engine", "Mechanism", "Apparatus", "Device", "Contraption", "Automaton", "Generator", "Dynamo"],
};

const SPELL_VERBS: Record<Style, string[]> = {
  fantasy: ["Arcane", "Mystic", "Divine", "Shadow", "Celestial", "Eldritch", "Primal", "Astral"],
  scifi: ["Quantum", "Temporal", "Neural", "Molecular", "Graviton", "Photonic", "Entropic", "Subspace"],
  horror: ["Dread", "Wither", "Unholy", "Crimson", "Abyssal", "Necrotic", "Eldritch", "Spectral"],
  japanese: ["Katon:", "Suiton:", "Raiton:", "Fuuton:", "Doton:", "Meiton:", "Senjutsu:", "Kinjutsu:"],
  norse: ["Rune of", "Galdr:", "Seidr:", "Frostbite", "Thunderous", "Valkyr", "Berserker", "Norn's"],
  steampunk: ["Overdrive", "Overcharge", "Pressurized", "Catalytic", "Galvanic", "Turbine", "Tesla", "Combustion"],
};

const SPELL_NOUNS: Record<Style, string[]> = {
  fantasy: ["Blast", "Shield", "Storm", "Nova", "Veil", "Surge", "Bind", "Rift", "Torrent", "Cascade"],
  scifi: ["Pulse", "Field", "Beam", "Surge", "Warp", "Shift", "Lock", "Scan", "Burst", "Flux"],
  horror: ["Curse", "Plague", "Grasp", "Scream", "Blight", "Feast", "Haunt", "Drain", "Corruption", "Torment"],
  japanese: ["Bakuha", "Kekkai", "Arashi", "Kaen", "Senko", "Ryu", "Geki", "Rendan"],
  norse: ["Strike", "Ward", "Call", "Fury", "Blessing", "Sacrifice", "Howl", "Judgment"],
  steampunk: ["Blast", "Shield", "Burst", "Wave", "Lock", "Charge", "Ignition", "Protocol"],
};

const CREATURE_PARTS: Record<Style, { prefix: string[]; suffix: string[] }> = {
  fantasy: { prefix: ["Fire", "Shadow", "Crystal", "Storm", "Moon", "Blood", "Frost", "Iron", "Spirit", "Thorn"], suffix: ["drake", "wyrm", "stag", "wolf", "hawk", "serpent", "golem", "wraith", "phoenix", "gryphon"] },
  scifi: { prefix: ["Xeno", "Mecha", "Bio", "Cyber", "Nano", "Void", "Astro", "Synth", "Chrono", "Pulse"], suffix: ["morph", "drone", "beast", "parasite", "hunter", "swarm", "titan", "stalker", "crawler", "fiend"] },
  horror: { prefix: ["Rot", "Flesh", "Bone", "Soul", "Dread", "Night", "Grave", "Plague", "Blood", "Gloom"], suffix: ["fiend", "crawler", "stalker", "eater", "weeper", "howler", "lurker", "horror", "blight", "spawn"] },
  japanese: { prefix: ["Oni", "Kitsune", "Tengu", "Tanuki", "Kappa", "Yokai", "Bakeneko", "Raiju", "Tsuchigumo", "Jorogumo"], suffix: ["", "", "", "", "", "", "", "", "", ""] },
  norse: { prefix: ["Frost", "Fire", "Storm", "Iron", "Stone", "Dark", "Sea", "Wind", "Thunder", "Death"], suffix: ["jotun", "wolf", "serpent", "raven", "boar", "bear", "eagle", "stag", "drake", "troll"] },
  steampunk: { prefix: ["Clockwork", "Brass", "Steam", "Iron", "Copper", "Chrome", "Gear", "Piston", "Coal", "Arc"], suffix: ["golem", "spider", "hound", "raptor", "beetle", "leviathan", "wyrm", "titan", "automaton", "construct"] },
};

const GUILD_FORMATS: Record<Style, string[][]> = {
  fantasy: [["The", "Order of", "Brotherhood of", "Circle of", "House"], ["Silver", "Golden", "Crimson", "Shadow", "Iron", "Sacred", "Verdant", "Arcane"], ["Dawn", "Thorns", "Flame", "Serpents", "Ravens", "Lions", "Rose", "Storm", "Stars", "Veil"]],
  scifi: [["The", "Unit", "Division", "Corps"], ["Black", "Red", "Ghost", "Quantum", "Void", "Solar", "Neon", "Zero"], ["Protocol", "Initiative", "Syndicate", "Collective", "Network", "Legion", "Vanguard", "Nexus"]],
  horror: [["The", "Cult of", "Order of", "House of"], ["Silent", "Crimson", "Hollow", "Rotting", "Screaming", "Bleeding", "Forgotten", "Eyeless"], ["Hand", "Maw", "Covenant", "Circle", "Congregation", "Flesh", "Veil", "Whisper"]],
  japanese: [["", "", ""], ["Kuro", "Aka", "Shiro", "Ao", "Kin", "Gin", "Hi", "Tsuki"], ["Ryu-kai", "Kaze-dan", "Ken-shi", "Oni-gumi", "Hana-kai", "Yami-shu", "Rai-dan", "Getsu-kai"]],
  norse: [["The", "Clan", "Sons of", "Daughters of"], ["Iron", "Blood", "Storm", "Frost", "Raven", "Wolf", "Thunder", "Oaken"], ["Shield", "Axe", "Fang", "Hammer", "Pact", "Guard", "Kin", "Born"]],
  steampunk: [["The", "Guild of", "Society of", "League of"], ["Brass", "Iron", "Copper", "Gilded", "Crimson", "Midnight", "Grand", "Royal"], ["Cog", "Gear", "Engine", "Artificers", "Inventors", "Engineers", "Foundry", "Forge"]],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSyllable(style: Style): string {
  const s = SYLLABLES[style];
  return pick(s.onset) + pick(s.nucleus) + pick(s.coda);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateName(category: Category, style: Style, minSyl: number, maxSyl: number): string {
  const sylCount = minSyl + Math.floor(Math.random() * (maxSyl - minSyl + 1));

  switch (category) {
    case "characters": {
      let name = "";
      for (let i = 0; i < sylCount; i++) name += generateSyllable(style);
      if (style === "scifi" && Math.random() > 0.6) {
        const compound = SYLLABLES.scifi.compound;
        if (compound) name += pick(compound);
      }
      return capitalize(name);
    }

    case "places": {
      if (sylCount <= 2) {
        const word1 = capitalize(generateSyllable(style));
        const word2 = capitalize(generateSyllable(style));
        const suffixes: Record<Style, string[]> = {
          fantasy: ["haven", "mere", "hollow", "vale", "peak", "ford", "falls", "reach", "rest", "watch"],
          scifi: ["station", "prime", "nexus", "port", "core", "dome", "spire", "citadel", "hub", "gate"],
          horror: ["hollow", "mire", "crypt", "pit", "tomb", "depths", "asylum", "ruins", "wastes", "marsh"],
          japanese: ["mura", "yama", "shima", "kawa", "machi", "jima", "sato", "hara", "umi", "mori"],
          norse: ["heim", "gard", "fjord", "borg", "stad", "land", "mark", "vik", "dal", "berg"],
          steampunk: ["works", "foundry", "mill", "port", "district", "junction", "yard", "tower", "quarter", "borough"],
        };
        return word1 + pick(suffixes[style]);
      }
      let place = "";
      for (let i = 0; i < sylCount; i++) place += generateSyllable(style);
      return capitalize(place);
    }

    case "items": {
      const prefix = pick(ITEM_PREFIXES[style]);
      const suffix = pick(ITEM_SUFFIXES[style]);
      return `${prefix} ${suffix}`;
    }

    case "spells": {
      const verb = pick(SPELL_VERBS[style]);
      const noun = pick(SPELL_NOUNS[style]);
      return `${verb} ${noun}`;
    }

    case "creatures": {
      const parts = CREATURE_PARTS[style];
      const pre = pick(parts.prefix);
      const suf = pick(parts.suffix);
      if (style === "japanese") return pre;
      return pre + suf;
    }

    case "guilds": {
      const fmt = GUILD_FORMATS[style];
      const article = pick(fmt[0]);
      const adj = pick(fmt[1]);
      const noun = pick(fmt[2]);
      const parts = [article, adj, noun].filter(Boolean);
      return parts.join(" ");
    }

    default:
      return capitalize(generateSyllable(style) + generateSyllable(style));
  }
}

const STORAGE_KEY = "gameforge_saved_names";

export default function NamesPage() {
  const [category, setCategory] = useState<Category>("characters");
  const [style, setStyle] = useState<Style>("fantasy");
  const [names, setNames] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedName[]>([]);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [minSyl, setMinSyl] = useState(2);
  const [maxSyl, setMaxSyl] = useState(3);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    console.log("[NamesPage] rendered");
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) setSaved(JSON.parse(data));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {}
  }, [saved]);

  const generate = useCallback(() => {
    console.log("[NamesPage] generating, category:", category, "style:", style);
    const result: string[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (result.length < 10 && attempts < 100) {
      const name = generateName(category, style, minSyl, maxSyl);
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        result.push(name);
      }
      attempts++;
    }
    setNames(result);
  }, [category, style, minSyl, maxSyl]);

  useEffect(() => {
    generate();
  }, [generate]);

  const copyName = (name: string) => {
    console.log("[NamesPage] copy:", name);
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 1500);
  };

  const toggleSave = (name: string) => {
    const exists = saved.some((s) => s.name === name);
    if (exists) {
      console.log("[NamesPage] unsave:", name);
      setSaved((prev) => prev.filter((s) => s.name !== name));
    } else {
      console.log("[NamesPage] save:", name);
      setSaved((prev) => [...prev, { name, category, style }]);
    }
  };

  const isSaved = (name: string) => saved.some((s) => s.name === name);

  const exportNames = () => {
    console.log("[NamesPage] export saved names");
    const content = saved.map((s) => `${s.name} [${s.category}, ${s.style}]`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "game_names.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearSaved = () => {
    console.log("[NamesPage] clear saved");
    setSaved([]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Name Generator</h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF]">
            Generate names for characters, places, items, and more
          </p>
        </div>
      </div>

      {/* Category selection */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Category
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); console.log("[NamesPage] category:", cat.id); }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                category === cat.id
                  ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Style selection */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Style
        </h2>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => { setStyle(s.id); console.log("[NamesPage] style:", s.id); }}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                style === s.id
                  ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {/* Generate controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={generate}
              className="flex items-center gap-2 rounded-xl bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0F0F0F] transition-all hover:bg-[#D97706] active:scale-[0.97]"
            >
              <RefreshCw className="h-4 w-4" /> Generate 10
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                showSettings
                  ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#F5F5F5]"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" /> Customize
            </button>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Name Settings
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                    Min Syllables: {minSyl}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={minSyl}
                    onChange={(e) => setMinSyl(Math.min(parseInt(e.target.value), maxSyl))}
                    className="w-full accent-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
                    Max Syllables: {maxSyl}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={maxSyl}
                    onChange={(e) => setMaxSyl(Math.max(parseInt(e.target.value), minSyl))}
                    className="w-full accent-[#F59E0B]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Generated names */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Generated Names
            </h2>
            {names.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#4B5563]">
                Click Generate to create names
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {names.map((name, i) => (
                  <div
                    key={`${name}-${i}`}
                    className="group flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 transition-all hover:border-[#F59E0B]/30"
                  >
                    <span className="text-sm font-medium text-[#F5F5F5]">{name}</span>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => toggleSave(name)}
                        className={`rounded p-1.5 transition-colors ${
                          isSaved(name)
                            ? "text-[#F59E0B]"
                            : "text-[#6B7280] hover:text-[#F59E0B]"
                        }`}
                        title={isSaved(name) ? "Unsave" : "Save"}
                      >
                        {isSaved(name) ? (
                          <BookmarkCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => copyName(name)}
                        className="rounded p-1.5 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
                        title="Copy to clipboard"
                      >
                        {copiedName === name ? (
                          <Check className="h-3.5 w-3.5 text-[#10B981]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Saved names sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Saved ({saved.length})
              </h3>
              <div className="flex gap-1">
                {saved.length > 0 && (
                  <>
                    <button
                      onClick={exportNames}
                      className="rounded p-1.5 text-[#6B7280] transition-colors hover:text-[#F59E0B]"
                      title="Export as text"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={clearSaved}
                      className="rounded p-1.5 text-[#6B7280] transition-colors hover:text-[#EF4444]"
                      title="Clear all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {saved.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#4B5563]">
                Click the bookmark icon to save names
              </p>
            ) : (
              <div className="max-h-[480px] space-y-1.5 overflow-y-auto">
                {saved.map((entry, i) => (
                  <div
                    key={`${entry.name}-${i}`}
                    className="group flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2"
                  >
                    <div>
                      <button
                        onClick={() => copyName(entry.name)}
                        className="text-sm font-medium text-[#F5F5F5] transition-colors hover:text-[#F59E0B]"
                      >
                        {entry.name}
                      </button>
                      <div className="mt-0.5 flex gap-1.5">
                        <span className="text-[10px] text-[#6B7280]">{entry.category}</span>
                        <span className="text-[10px] text-[#4B5563]">/</span>
                        <span className="text-[10px] text-[#6B7280]">{entry.style}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSave(entry.name)}
                      className="text-[#4B5563] opacity-0 transition-all hover:text-[#EF4444] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick reference */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
              Style Guide
            </h3>
            <div className="space-y-2 text-xs leading-relaxed text-[#9CA3AF]">
              <div>
                <span className="font-medium text-[#F5F5F5]">Fantasy</span> — lyrical, vowel-heavy names
              </div>
              <div>
                <span className="font-medium text-[#F5F5F5]">Sci-Fi</span> — harsh consonants, alphanumeric tags
              </div>
              <div>
                <span className="font-medium text-[#F5F5F5]">Horror</span> — dark, guttural, foreboding
              </div>
              <div>
                <span className="font-medium text-[#F5F5F5]">Japanese</span> — authentic kana-based phonemes
              </div>
              <div>
                <span className="font-medium text-[#F5F5F5]">Norse</span> — Old Norse roots, hard consonants
              </div>
              <div>
                <span className="font-medium text-[#F5F5F5]">Steampunk</span> — Victorian compound words
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
