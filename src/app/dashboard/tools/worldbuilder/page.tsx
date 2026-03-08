"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Sparkles,
  Loader2,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  Users,
  X,
  MapPin,
  Zap,
} from "lucide-react";

const SETTINGS = ["Fantasy", "Sci-Fi", "Post-Apocalyptic", "Modern", "Historical"] as const;
const TONES = ["Dark", "Light", "Mysterious", "Epic"] as const;
const WORLD_SIZES = ["Small", "Medium", "Large", "Massive"] as const;

const RELATIONSHIP_TYPES = ["ally", "enemy", "neutral", "romantic", "mentor", "rival"] as const;
type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

const REL_COLORS: Record<RelationshipType, string> = {
  ally: "#22C55E",
  enemy: "#EF4444",
  neutral: "#6B7280",
  romantic: "#EC4899",
  mentor: "#F59E0B",
  rival: "#3B82F6",
};

interface Character {
  id: string;
  name: string;
  role: string;
  faction: string;
}

interface Relationship {
  from: string;
  to: string;
  type: RelationshipType;
}

interface SavedWorld {
  id: string;
  name: string;
  setting: string;
  tone: string;
  size: string;
  content: string;
  createdAt: string;
}

const STORAGE_KEY = "gameforge_worlds";

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, j) => {
    const bold = part.match(/^\*\*(.+?)\*\*$/);
    if (bold)
      return (
        <strong key={j} className="font-semibold text-[#F5F5F5]">
          {bold[1]}
        </strong>
      );
    return <span key={j}>{part}</span>;
  });
}

function FormatContent({
  text,
  onSectionClick,
  loadingSection,
}: {
  text: string;
  onSectionClick?: (section: string) => void;
  loadingSection?: string | null;
}) {
  const lines = text.split("\n");

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.trim() === "---")
          return <hr key={i} className="border-[#2A2A2A] my-4" />;
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        const headerMatch = line.match(/^\*\*(.+?)\*\*(.*)/);
        if (headerMatch) {
          const sectionName = headerMatch[1];
          const rest = headerMatch[2] || "";
          const isLoading = loadingSection === sectionName;

          return (
            <div
              key={i}
              className="mt-3 first:mt-0 group flex items-start gap-1.5"
            >
              {onSectionClick && (
                <button
                  onClick={() => onSectionClick(sectionName)}
                  disabled={!!loadingSection}
                  className="shrink-0 mt-0.5 rounded p-0.5 text-[#444] opacity-0 group-hover:opacity-100 hover:text-[#F59E0B] transition-all disabled:opacity-30"
                  title={`More details: ${sectionName}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-[#F59E0B]" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </button>
              )}
              <p className="text-sm leading-relaxed text-[#D1D5DB]">
                <strong className="font-semibold text-[#F59E0B]">
                  {sectionName}
                </strong>
                {rest && renderInline(rest)}
              </p>
            </div>
          );
        }

        return (
          <p
            key={i}
            className={`text-sm leading-relaxed text-[#D1D5DB] ${onSectionClick ? "pl-5" : ""}`}
          >
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function RelationshipMap({
  characters,
  relationships,
}: {
  characters: Character[];
  relationships: Relationship[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600, H = 400;
  const cx = W / 2, cy = H / 2, radius = 140;

  const positions = characters.map((_, i) => {
    const angle = (2 * Math.PI * i) / characters.length - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  const charIndex = (name: string) => characters.findIndex((c) => c.name === name);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {relationships.map((rel, i) => {
        const fi = charIndex(rel.from);
        const ti = charIndex(rel.to);
        if (fi === -1 || ti === -1) return null;
        const from = positions[fi];
        const to = positions[ti];
        const color = REL_COLORS[rel.type] || "#6B7280";
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        return (
          <g key={i}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={2} strokeOpacity={0.7} />
            <rect x={midX - 22} y={midY - 8} width={44} height={16} rx={4} fill="#0F0F0F" stroke={color} strokeWidth={1} strokeOpacity={0.4} />
            <text x={midX} y={midY + 4} textAnchor="middle" fill={color} fontSize={8} fontWeight={500}>
              {rel.type}
            </text>
          </g>
        );
      })}
      {characters.map((char, i) => {
        const pos = positions[i];
        return (
          <g key={char.id}>
            <circle cx={pos.x} cy={pos.y} r={28} fill="#1A1A1A" stroke="#F59E0B" strokeWidth={2} />
            <text x={pos.x} y={pos.y - 4} textAnchor="middle" fill="#F5F5F5" fontSize={10} fontWeight={600}>
              {char.name.length > 10 ? char.name.slice(0, 9) + "…" : char.name}
            </text>
            <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="#9CA3AF" fontSize={7}>
              {char.role}
            </text>
            <text x={pos.x} y={pos.y + 42} textAnchor="middle" fill="#6B7280" fontSize={7} fontStyle="italic">
              {char.faction}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const CHAR_STORAGE_KEY = "gameforge_characters";
const REL_STORAGE_KEY = "gameforge_relationships";

export default function WorldBuilderPage() {
  const [activeTab, setActiveTab] = useState<"world" | "characters">("world");
  const [name, setName] = useState("");
  const [setting, setSetting] = useState<string>(SETTINGS[0]);
  const [tone, setTone] = useState<string>(TONES[0]);
  const [worldSize, setWorldSize] = useState<string>(WORLD_SIZES[1]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailSection, setDetailSection] = useState<string | null>(null);
  const [savedWorlds, setSavedWorlds] = useState<SavedWorld[]>([]);
  const [expandedWorld, setExpandedWorld] = useState<string | null>(null);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [charName, setCharName] = useState("");
  const [charRole, setCharRole] = useState("");
  const [charFaction, setCharFaction] = useState("");
  const [relFrom, setRelFrom] = useState("");
  const [relTo, setRelTo] = useState("");
  const [relType, setRelType] = useState<RelationshipType>("ally");
  const [charGenLoading, setCharGenLoading] = useState(false);
  const [factionGenLoading, setFactionGenLoading] = useState(false);

  const [placeNames, setPlaceNames] = useState<{ name: string; desc: string }[]>([]);
  const [placeNamesLoading, setPlaceNamesLoading] = useState(false);
  const [aiTerrain, setAiTerrain] = useState("");
  const [aiTerrainLoading, setAiTerrainLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState("");
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [worldEvents, setWorldEvents] = useState<
    { name: string; trigger: string; effect: string; duration: string }[]
  >([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const generatePlaceNames = useCallback(async () => {
    setPlaceNamesLoading(true);
    setPlaceNames([]);
    try {
      const prompt = `Generate 10 place names for a ${setting} game world with a ${tone} tone. Include: 3 cities/towns, 3 wilderness areas, 2 dungeons/dangerous places, 2 landmarks. For each: name and a one-line description. Just list them.`;
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
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const lines = content.split("\n").filter((l: string) => l.trim());
      const parsed: { name: string; desc: string }[] = [];
      for (const line of lines) {
        const match = line.match(/^\d+[\.\)]\s*\*{0,2}(.+?)\*{0,2}\s*[-:]\s*(.+)/);
        if (match) {
          parsed.push({ name: match[1].trim(), desc: match[2].trim() });
        } else if (line.includes(" - ") || line.includes(": ")) {
          const sep = line.includes(" - ") ? " - " : ": ";
          const [n, ...rest] = line.split(sep);
          const cleanName = n.replace(/^\d+[\.\)]\s*/, "").replace(/\*+/g, "").trim();
          if (cleanName && rest.length > 0) {
            parsed.push({ name: cleanName, desc: rest.join(sep).replace(/\*+/g, "").trim() });
          }
        }
      }
      setPlaceNames(parsed.length > 0 ? parsed : [{ name: "Could not parse results", desc: "Try again" }]);
    } catch {
      setPlaceNames([{ name: "Generation failed", desc: "Please try again" }]);
    } finally {
      setPlaceNamesLoading(false);
    }
  }, [setting, tone]);

  const generateTerrain = useCallback(async () => {
    if (aiTerrainLoading || !name.trim()) return;
    setAiTerrainLoading(true);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Suggest 4 terrain types for a ${setting} region named '${name.trim()}'. Just list them.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setAiTerrain(content || "Could not generate terrain.");
    } catch { setAiTerrain("Failed to generate terrain."); }
    finally { setAiTerrainLoading(false); }
  }, [aiTerrainLoading, name, setting]);

  const appendPlaceToResult = useCallback((placeName: string, placeDesc: string) => {
    const entry = `\n**${placeName}** - ${placeDesc}`;
    setResult((prev) => prev ? prev + entry : entry);
  }, []);

  const generateHistory = useCallback(async () => {
    setAiHistoryLoading(true);
    setAiHistory("");
    try {
      const prompt = `Write a brief history timeline for a ${setting} game world with ${tone} tone. Include 5 key events spanning different eras. Format as: Year/Era — Event description. Keep it brief.`;
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
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      setAiHistory(content || "Could not generate history. Try again.");
    } catch {
      setAiHistory("Failed to generate history. Check your connection and try again.");
    } finally {
      setAiHistoryLoading(false);
    }
  }, [setting, tone]);

  const generateEvents = useCallback(async () => {
    setEventsLoading(true);
    setWorldEvents([]);
    try {
      const prompt = `Generate 3 random world events for a ${setting} game with ${tone} tone. These are dynamic events that could happen during gameplay. For each event, respond in this EXACT JSON format (no markdown fences): [{"name":"event name","trigger":"trigger condition","effect":"effect on the world","duration":"duration"}]. Keep each field brief (1-2 sentences max).`;
      const response = await fetch(
        "https://llm.chutes.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "moonshotai/Kimi-K2.5-TEE",
            messages: [{ role: "user", content: prompt }],
            stream: false,
            max_tokens: 512,
            temperature: 0.8,
          }),
        },
      );
      const data = await response.json();
      let content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";
      content = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWorldEvents(
            parsed.map(
              (e: {
                name?: string;
                trigger?: string;
                effect?: string;
                duration?: string;
              }) => ({
                name: e.name || "Unknown Event",
                trigger: e.trigger || "Unknown trigger",
                effect: e.effect || "Unknown effect",
                duration: e.duration || "Unknown duration",
              }),
            ),
          );
          return;
        }
      }
      throw new Error("parse failed");
    } catch {
      setWorldEvents([
        {
          name: "The Blood Moon Rises",
          trigger: "Every 7th night cycle",
          effect:
            "Monsters become twice as aggressive. New rare enemies spawn. NPC shops close early.",
          duration: "One full night cycle",
        },
        {
          name: "Merchant Caravan Arrival",
          trigger: "Player reaches a new settlement",
          effect:
            "Rare items become available for purchase. Trade prices drop by 20%.",
          duration: "3 in-game days",
        },
        {
          name: "Tremors of the Deep",
          trigger: "Player disturbs an ancient ruin",
          effect:
            "Earthquakes reshape terrain. Hidden passages open. Some routes become blocked.",
          duration: "Until the ancient guardian is defeated",
        },
      ]);
    } finally {
      setEventsLoading(false);
    }
  }, [setting, tone]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedWorlds(JSON.parse(stored));
      const storedChars = localStorage.getItem(CHAR_STORAGE_KEY);
      if (storedChars) setCharacters(JSON.parse(storedChars));
      const storedRels = localStorage.getItem(REL_STORAGE_KEY);
      if (storedRels) setRelationships(JSON.parse(storedRels));
    } catch {}
  }, []);

  const saveToStorage = useCallback((worlds: SavedWorld[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds));
  }, []);

  const saveCharsToStorage = useCallback((chars: Character[]) => {
    localStorage.setItem(CHAR_STORAGE_KEY, JSON.stringify(chars));
  }, []);

  const saveRelsToStorage = useCallback((rels: Relationship[]) => {
    localStorage.setItem(REL_STORAGE_KEY, JSON.stringify(rels));
  }, []);

  const generateFactionName = useCallback(async () => {
    setFactionGenLoading(true);
    try {
      const prompt = `Suggest a creative faction name for a ${setting} game world with ${tone} tone. Just the faction name, max 3 words.`;
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
          max_tokens: 128,
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const cleaned = content.replace(/[*"'\n]/g, "").trim();
      if (cleaned) setCharFaction(cleaned);
    } catch {} finally {
      setFactionGenLoading(false);
    }
  }, [setting, tone]);

  const addCharacter = useCallback(() => {
    if (!charName.trim()) return;
    const newChar: Character = { id: Date.now().toString(), name: charName.trim(), role: charRole.trim() || "Unknown", faction: charFaction.trim() || "Unaligned" };
    const updated = [...characters, newChar];
    setCharacters(updated);
    saveCharsToStorage(updated);
    setCharName("");
    setCharRole("");
    setCharFaction("");
  }, [charName, charRole, charFaction, characters, saveCharsToStorage]);

  const removeCharacter = useCallback((id: string) => {
    const char = characters.find((c) => c.id === id);
    const updatedChars = characters.filter((c) => c.id !== id);
    setCharacters(updatedChars);
    saveCharsToStorage(updatedChars);
    if (char) {
      const updatedRels = relationships.filter((r) => r.from !== char.name && r.to !== char.name);
      setRelationships(updatedRels);
      saveRelsToStorage(updatedRels);
    }
  }, [characters, relationships, saveCharsToStorage, saveRelsToStorage]);

  const addRelationship = useCallback(() => {
    if (!relFrom || !relTo || relFrom === relTo) return;
    const exists = relationships.some((r) => (r.from === relFrom && r.to === relTo) || (r.from === relTo && r.to === relFrom));
    if (exists) return;
    const updated = [...relationships, { from: relFrom, to: relTo, type: relType }];
    setRelationships(updated);
    saveRelsToStorage(updated);
    setRelFrom("");
    setRelTo("");
  }, [relFrom, relTo, relType, relationships, saveRelsToStorage]);

  const removeRelationship = useCallback((idx: number) => {
    const updated = relationships.filter((_, i) => i !== idx);
    setRelationships(updated);
    saveRelsToStorage(updated);
  }, [relationships, saveRelsToStorage]);

  const generateCharacterWeb = useCallback(async () => {
    setCharGenLoading(true);
    try {
      const prompt = `Create a character relationship web for a ${setting} game. Include 6 characters: names, roles, factions. Define 8 relationships between them (ally, enemy, neutral, romantic, mentor, rival). Format as JSON: {"characters": [{"name": "...", "role": "...", "faction": "..."}], "relationships": [{"from": "character_name", "to": "character_name", "type": "ally|enemy|neutral|romantic|mentor|rival"}]}. Return ONLY the JSON, no markdown fences.`;

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

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(content);

      if (parsed.characters && Array.isArray(parsed.characters)) {
        const newChars: Character[] = parsed.characters.map((c: { name: string; role: string; faction: string }, i: number) => ({
          id: Date.now().toString() + i,
          name: c.name || `Character ${i + 1}`,
          role: c.role || "Unknown",
          faction: c.faction || "Unaligned",
        }));
        setCharacters(newChars);
        saveCharsToStorage(newChars);

        if (parsed.relationships && Array.isArray(parsed.relationships)) {
          const validTypes = new Set(RELATIONSHIP_TYPES as unknown as string[]);
          const newRels: Relationship[] = parsed.relationships
            .filter((r: { from: string; to: string; type: string }) => r.from && r.to && validTypes.has(r.type))
            .map((r: { from: string; to: string; type: string }) => ({ from: r.from, to: r.to, type: r.type as RelationshipType }));
          setRelationships(newRels);
          saveRelsToStorage(newRels);
        }
      }
    } catch {
      // parse error — silently fail, user can retry
    } finally {
      setCharGenLoading(false);
    }
  }, [setting, saveCharsToStorage, saveRelsToStorage]);

  const generateWorld = useCallback(async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setResult("");

    try {
      const prompt = `Create a brief game world overview for '${name.trim()}'. Setting: ${setting}. Tone: ${tone}. Scale: ${worldSize}. Include: a 2-sentence overview, 3 key locations with descriptions, 2 factions with motivations, 1 central conflict, and 3 plot hooks. Format with bold headers.`;

      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization:
            "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
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

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";
      setResult(content || "No content generated. Please try again.");
    } catch {
      setResult("Failed to generate world. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [name, setting, tone, worldSize, loading]);

  const saveWorld = useCallback(() => {
    if (!result || !name.trim()) return;
    const world: SavedWorld = {
      id: Date.now().toString(),
      name: name.trim(),
      setting,
      tone,
      size: worldSize,
      content: result,
      createdAt: new Date().toISOString(),
    };
    const updated = [world, ...savedWorlds];
    setSavedWorlds(updated);
    saveToStorage(updated);
  }, [result, name, setting, tone, worldSize, savedWorlds, saveToStorage]);

  const deleteWorld = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = savedWorlds.filter((w) => w.id !== id);
      setSavedWorlds(updated);
      saveToStorage(updated);
      if (expandedWorld === id) setExpandedWorld(null);
    },
    [savedWorlds, expandedWorld, saveToStorage],
  );

  const generateMoreDetails = useCallback(
    async (section: string, worldContent: string) => {
      setDetailSection(section);

      try {
        const prompt = `Given this game world:\n\n${worldContent}\n\nGenerate more detailed lore about: "${section}". Include history, notable characters, unique features, and connections to the rest of the world. Format with bold headers. Keep it concise (under 250 words).`;

        const response = await fetch(
          "https://llm.chutes.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization:
                "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "moonshotai/Kimi-K2.5-TEE",
              messages: [{ role: "user", content: prompt }],
              stream: false,
              max_tokens: 512,
              temperature: 0.8,
            }),
          },
        );

        const data = await response.json();
        const content =
          data.choices?.[0]?.message?.content ||
          data.choices?.[0]?.message?.reasoning ||
          "";
        setResult((prev) => prev + "\n\n---\n\n" + content);
      } catch {
        setResult(
          (prev) =>
            prev + "\n\n---\n\nFailed to generate details for: " + section,
        );
      } finally {
        setDetailSection(null);
      }
    },
    [],
  );

  const loadWorld = useCallback(
    (world: SavedWorld) => {
      setName(world.name);
      setSetting(world.setting);
      setTone(world.tone);
      setWorldSize(world.size);
      setResult(world.content);
    },
    [],
  );

  const selectBtnClass = (active: boolean) =>
    `rounded-lg px-3 py-2 text-xs font-medium transition-all ${
      active
        ? "bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/30"
        : "bg-[#111] text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
    }`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#F59E0B]" />
            World Builder
          </h1>
          <p className="text-xs text-[#9CA3AF]">
            Generate rich game world lore with AI
          </p>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-[#2A2A2A] bg-[#111] p-1">
        <button
          onClick={() => setActiveTab("world")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === "world" ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "text-[#9CA3AF] hover:text-[#F5F5F5]"}`}
        >
          <Globe className="h-4 w-4" /> World Lore
        </button>
        <button
          onClick={() => setActiveTab("characters")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === "characters" ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "text-[#9CA3AF] hover:text-[#F5F5F5]"}`}
        >
          <Users className="h-4 w-4" /> Character Relationships
        </button>
      </div>

      {activeTab === "characters" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Add Character</h3>
              <input
                type="text"
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                placeholder="Character name..."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#555] outline-none focus:border-[#F59E0B]/40 transition-colors"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={charRole}
                  onChange={(e) => setCharRole(e.target.value)}
                  placeholder="Role (e.g. Warrior)"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#555] outline-none focus:border-[#F59E0B]/40 transition-colors"
                />
                <div className="relative">
                  <input
                    type="text"
                    value={charFaction}
                    onChange={(e) => setCharFaction(e.target.value)}
                    placeholder="Faction (e.g. The Order)"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 pr-8 text-sm text-[#F5F5F5] placeholder-[#555] outline-none focus:border-[#F59E0B]/40 transition-colors"
                  />
                  <button
                    onClick={generateFactionName}
                    disabled={factionGenLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#555] hover:text-[#F59E0B] transition-colors disabled:opacity-40"
                    title="AI Faction Name"
                  >
                    {factionGenLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={addCharacter}
                disabled={!charName.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-colors hover:bg-[#2A2A2A] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" /> Add Character
              </button>
            </div>

            {characters.length > 0 && (
              <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Characters ({characters.length})</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {characters.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F5F5F5] truncate">{c.name}</p>
                        <p className="text-[10px] text-[#6B7280]">{c.role} &middot; {c.faction}</p>
                      </div>
                      <button onClick={() => removeCharacter(c.id)} className="shrink-0 p-1 text-[#555] hover:text-red-400 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {characters.length >= 2 && (
              <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Add Relationship</h3>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={relFrom}
                    onChange={(e) => setRelFrom(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/40 transition-colors"
                  >
                    <option value="">From...</option>
                    {characters.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <select
                    value={relTo}
                    onChange={(e) => setRelTo(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/40 transition-colors"
                  >
                    <option value="">To...</option>
                    {characters.filter((c) => c.name !== relFrom).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIP_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setRelType(t)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${relType === t ? "ring-1" : "bg-[#111] text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"}`}
                      style={relType === t ? { background: REL_COLORS[t] + "20", color: REL_COLORS[t], boxShadow: `0 0 0 1px ${REL_COLORS[t]}50` } : {}}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={addRelationship}
                  disabled={!relFrom || !relTo || relFrom === relTo}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-colors hover:bg-[#2A2A2A] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" /> Add Relationship
                </button>

                {relationships.length > 0 && (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {relationships.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-[#111] border border-[#2A2A2A] px-3 py-2">
                        <span className="text-[#F5F5F5]">{r.from}</span>
                        <span className="font-medium px-1.5 py-0.5 rounded" style={{ color: REL_COLORS[r.type], background: REL_COLORS[r.type] + "15" }}>{r.type}</span>
                        <span className="text-[#F5F5F5]">{r.to}</span>
                        <button onClick={() => removeRelationship(i)} className="ml-auto shrink-0 p-0.5 text-[#555] hover:text-red-400 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={generateCharacterWeb}
              disabled={charGenLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {charGenLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Character Web...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Character Web
                </>
              )}
            </button>
          </div>

          <div>
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] min-h-[300px] sticky top-4">
              {characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <Users className="h-12 w-12 text-[#2A2A2A] mb-4" />
                  <p className="text-sm text-[#555]">
                    Add characters manually or click Generate Character Web to create a relationship map
                  </p>
                </div>
              ) : charGenLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B] mb-3" />
                  <p className="text-sm text-[#9CA3AF]">Generating character web...</p>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#F5F5F5]">Relationship Map</h3>
                    <div className="flex flex-wrap gap-2">
                      {RELATIONSHIP_TYPES.map((t) => (
                        <span key={t} className="flex items-center gap-1 text-[10px]" style={{ color: REL_COLORS[t] }}>
                          <span className="inline-block h-2 w-2 rounded-full" style={{ background: REL_COLORS[t] }} />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] overflow-hidden">
                    <RelationshipMap characters={characters} relationships={relationships} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "world" && <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left: Input Panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                World Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your world's name..."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#555] outline-none focus:border-[#F59E0B]/40 transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Setting
              </label>
              <div className="flex flex-wrap gap-2">
                {SETTINGS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSetting(s)}
                    className={selectBtnClass(setting === s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={selectBtnClass(tone === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                World Size
              </label>
              <div className="flex flex-wrap gap-2">
                {WORLD_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setWorldSize(sz)}
                    className={selectBtnClass(worldSize === sz)}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateWorld}
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating World...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate World
                </>
              )}
            </button>

            <button
              onClick={generatePlaceNames}
              disabled={placeNamesLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-colors hover:bg-[#2A2A2A] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {placeNamesLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                  Generating Place Names...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 text-[#F59E0B]" />
                  AI Name Places
                </>
              )}
            </button>

            <button
              onClick={generateHistory}
              disabled={aiHistoryLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] transition-colors hover:bg-[#2A2A2A] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiHistoryLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                  Generating History...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                  AI History
                </>
              )}
            </button>

            <button
              onClick={generateEvents}
              disabled={eventsLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-2.5 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {eventsLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Events...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  AI Events
                </>
              )}
            </button>

            {placeNames.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Click to add to description
                </p>
                <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
                  {placeNames.map((place, i) => (
                    <button
                      key={i}
                      onClick={() => appendPlaceToResult(place.name, place.desc)}
                      className="w-full text-left rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 transition-colors hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/5 group"
                    >
                      <span className="text-xs font-medium text-[#F59E0B] group-hover:underline">
                        {place.name}
                      </span>
                      <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">
                        {place.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={generateTerrain}
              disabled={aiTerrainLoading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-2.5 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiTerrainLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiTerrainLoading ? "Generating..." : "AI Terrain Types"}
            </button>
            {aiTerrain && !aiTerrainLoading && (
              <div className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-3 text-xs leading-relaxed text-[#D1D5DB] whitespace-pre-line">{aiTerrain}</div>
            )}
          </div>

          {/* Saved Worlds */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Saved Worlds ({savedWorlds.length})
            </h3>
            {savedWorlds.length === 0 ? (
              <p className="text-xs text-[#555] py-4 text-center">
                No worlds saved yet. Generate one and click Save.
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {savedWorlds.map((world) => (
                  <div
                    key={world.id}
                    className="rounded-lg border border-[#2A2A2A] bg-[#111] overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedWorld(
                          expandedWorld === world.id ? null : world.id,
                        )
                      }
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#1A1A1A] transition-colors"
                    >
                      {expandedWorld === world.id ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#555]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F5F5F5] truncate">
                          {world.name}
                        </p>
                        <p className="text-[10px] text-[#666]">
                          {world.setting} &middot; {world.tone} &middot;{" "}
                          {world.size}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteWorld(world.id, e)}
                        className="shrink-0 p-1 text-[#555] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </button>
                    {expandedWorld === world.id && (
                      <div className="border-t border-[#2A2A2A] px-3 py-3 space-y-3">
                        <FormatContent
                          text={world.content}
                          onSectionClick={(section) => {
                            loadWorld(world);
                            generateMoreDetails(section, world.content);
                          }}
                          loadingSection={detailSection}
                        />
                        <button
                          onClick={() => loadWorld(world)}
                          className="text-xs text-[#F59E0B] hover:underline"
                        >
                          Load into editor
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Results Panel */}
        <div>
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] min-h-[300px] sticky top-4">
            {!result && !loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Globe className="h-12 w-12 text-[#2A2A2A] mb-4" />
                <p className="text-sm text-[#555]">
                  Configure your world settings and click Generate to create
                  rich lore
                </p>
              </div>
            ) : loading && !result ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B] mb-3" />
                <p className="text-sm text-[#9CA3AF]">
                  Building your world...
                </p>
              </div>
            ) : (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">
                    {name || "Generated World"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#555] px-2 py-0.5 rounded bg-[#111] border border-[#2A2A2A]">
                      {setting}
                    </span>
                    <span className="text-[10px] text-[#555] px-2 py-0.5 rounded bg-[#111] border border-[#2A2A2A]">
                      {tone}
                    </span>
                    <button
                      onClick={saveWorld}
                      className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-medium text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                  </div>
                </div>
                <FormatContent
                  text={result}
                  onSectionClick={(section) =>
                    generateMoreDetails(section, result)
                  }
                  loadingSection={detailSection}
                />
                {detailSection && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-[#9CA3AF]">
                    <Loader2 className="h-3 w-3 animate-spin text-[#F59E0B]" />
                    Expanding: {detailSection}...
                  </div>
                )}
                {(aiHistory || aiHistoryLoading) && (
                  <div className="mt-5 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
                      <Sparkles className="h-3 w-3" />
                      World History
                    </div>
                    {aiHistoryLoading ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#6B7280]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />
                        Writing history...
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#D1D5DB]">{aiHistory}</p>
                    )}
                  </div>
                )}
                {(worldEvents.length > 0 || eventsLoading) && (
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
                      <Zap className="h-3 w-3" />
                      World Events
                    </div>
                    {eventsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#6B7280]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />
                        Generating world events...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {worldEvents.map((event, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4 space-y-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
                              <h4 className="text-sm font-semibold text-[#F5F5F5]">
                                {event.name}
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 gap-2 pl-6">
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B]">
                                  Trigger
                                </span>
                                <p className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">
                                  {event.trigger}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B]">
                                  Effect
                                </span>
                                <p className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">
                                  {event.effect}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B]">
                                  Duration
                                </span>
                                <p className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">
                                  {event.duration}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>}
    </div>
  );
}
