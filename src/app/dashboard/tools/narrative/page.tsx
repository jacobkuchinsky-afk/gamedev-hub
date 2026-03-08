"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Loader2,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Scroll,
  Users,
  Swords,
  Clock,
  Plus,
  X,
  Download,
  MessageSquare,
} from "lucide-react";

const STORAGE_KEY = "gameforge_narratives";

interface Narrative {
  id: string;
  type: "outline" | "backstory" | "quest" | "dialogue";
  title: string;
  content: string;
  createdAt: number;
}

const GENRES = [
  "Fantasy",
  "Sci-Fi",
  "Horror",
  "Post-Apocalyptic",
  "Steampunk",
  "Cyberpunk",
  "Medieval",
  "Mythology",
  "Noir",
  "Western",
];

const TONES = [
  "Epic",
  "Dark & Gritty",
  "Lighthearted",
  "Mysterious",
  "Comedic",
  "Tragic",
  "Hopeful",
  "Suspenseful",
];

const QUEST_TYPES = ["Main", "Side", "Fetch", "Escort", "Mystery"] as const;

async function callAI(prompt: string): Promise<string> {
  try {
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
        max_tokens: 512,
        temperature: 0.8,
      }),
    });
    const data = await response.json();
    return (
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.message?.reasoning ||
      ""
    );
  } catch {
    return "";
  }
}

function getSaved(): Narrative[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistSaved(items: Narrative[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function NarrativePage() {
  // Story outline inputs
  const [genre, setGenre] = useState("Fantasy");
  const [setting, setSetting] = useState("");
  const [protagonist, setProtagonist] = useState("");
  const [tone, setTone] = useState("Epic");

  // Backstory inputs
  const [charName, setCharName] = useState("");
  const [charRole, setCharRole] = useState("");

  // Quest inputs
  const [questType, setQuestType] = useState<(typeof QUEST_TYPES)[number]>("Main");

  // Generated content
  const [outlineResult, setOutlineResult] = useState("");
  const [backstoryResult, setBackstoryResult] = useState("");
  const [questResult, setQuestResult] = useState("");

  // Loading states
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [backstoryLoading, setBackstoryLoading] = useState(false);
  const [questLoading, setQuestLoading] = useState(false);

  // Saved narratives
  const [saved, setSaved] = useState<Narrative[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);

  // Section collapse
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [backstoryOpen, setBackstoryOpen] = useState(true);
  const [questOpen, setQuestOpen] = useState(true);
  const [dialogueOpen, setDialogueOpen] = useState(true);

  const [dialogueChar1, setDialogueChar1] = useState("");
  const [dialogueChar2, setDialogueChar2] = useState("");
  const [dialogueSituation, setDialogueSituation] = useState("");
  const [dialogueResult, setDialogueResult] = useState("");
  const [dialogueLoading, setDialogueLoading] = useState(false);

  useEffect(() => {
    setSaved(getSaved());
  }, []);

  const saveNarrative = useCallback(
    (type: Narrative["type"], title: string, content: string) => {
      if (!content.trim()) return;
      const item: Narrative = {
        id: `nar_${Date.now()}`,
        type,
        title: title || `${type} - ${new Date().toLocaleDateString()}`,
        content,
        createdAt: Date.now(),
      };
      setSaved((prev) => {
        const next = [item, ...prev];
        persistSaved(next);
        return next;
      });
    },
    [],
  );

  const deleteNarrative = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persistSaved(next);
      return next;
    });
  }, []);

  const exportAllNarratives = useCallback(() => {
    if (saved.length === 0) return;
    const labels: Record<string, string> = { outline: "Story Outline", backstory: "Character Backstory", quest: "Quest", dialogue: "Dialogue" };
    const sections = saved.map((n) =>
      `## ${labels[n.type] || n.type}: ${n.title}\n\n*Created: ${new Date(n.createdAt).toLocaleString()}*\n\n${n.content}`
    );
    const md = `# Game Narratives\n\nExported on ${new Date().toLocaleDateString()}\n\n---\n\n${sections.join("\n\n---\n\n")}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "game-narratives.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [saved]);

  const generateOutline = useCallback(async () => {
    if (!setting.trim() && !protagonist.trim()) return;
    setOutlineLoading(true);
    setOutlineResult("");

    const prompt = `You are a game narrative designer. Create a story outline for a ${genre} game with a ${tone.toLowerCase()} tone.

Setting: ${setting || "A mysterious world"}
Protagonist: ${protagonist || "A brave hero"}

Respond with EXACTLY this format (use plain text, no markdown headers):

THREE-ACT STRUCTURE:
Act 1 - Setup: [2-3 sentences]
Act 2 - Confrontation: [2-3 sentences]
Act 3 - Resolution: [2-3 sentences]

CHARACTER ARC:
[2-3 sentences about how the protagonist changes]

KEY PLOT POINTS:
1. [Plot point with 1-2 sentence description]
2. [Plot point with 1-2 sentence description]
3. [Plot point with 1-2 sentence description]

THEMES:
- [Theme 1]: [Brief explanation]
- [Theme 2]: [Brief explanation]
- [Theme 3]: [Brief explanation]`;

    const result = await callAI(prompt);
    if (result) {
      setOutlineResult(result);
    } else {
      setOutlineResult(
        `THREE-ACT STRUCTURE:\nAct 1 - Setup: In the ${setting || "ruined kingdom"}, ${protagonist || "a wanderer"} discovers a hidden truth that shakes the foundations of their world.\nAct 2 - Confrontation: Allies are gathered, betrayals unfold, and the protagonist must face their deepest fear.\nAct 3 - Resolution: A final confrontation determines the fate of the world, and the hero emerges forever changed.\n\nCHARACTER ARC:\nThe protagonist begins as an outsider driven by personal loss and grows into a reluctant leader who must sacrifice their desires for the greater good.\n\nKEY PLOT POINTS:\n1. The Awakening: A catastrophic event reveals the protagonist's hidden connection to the ancient power threatening the land.\n2. The Betrayal: A trusted companion reveals their true allegiance, forcing the hero to question everything.\n3. The Sacrifice: The protagonist must choose between saving someone they love and preventing the world's destruction.\n\nTHEMES:\n- Identity: Who are we when everything we believed is a lie?\n- Sacrifice: What are we willing to give up for those we protect?\n- Redemption: Can past sins ever truly be forgiven?`,
      );
    }
    setOutlineLoading(false);
  }, [genre, setting, protagonist, tone]);

  const generateBackstory = useCallback(async () => {
    if (!charName.trim()) return;
    setBackstoryLoading(true);
    setBackstoryResult("");

    const prompt = `You are a game narrative designer. Create a character backstory for a game character.

Character Name: ${charName}
Role: ${charRole || "Adventurer"}

Respond with EXACTLY this format (use plain text, no markdown headers):

BACKSTORY:
[3-4 sentences about their past and origin]

MOTIVATION:
[2-3 sentences about what drives them]

FATAL FLAW:
[2-3 sentences about their greatest weakness]

KEY RELATIONSHIP:
[2-3 sentences about their most important relationship and how it shapes them]`;

    const result = await callAI(prompt);
    if (result) {
      setBackstoryResult(result);
    } else {
      setBackstoryResult(
        `BACKSTORY:\n${charName} was raised in the outskirts of a dying empire, orphaned by a war they were too young to understand. They learned to survive by their wits, taking odd jobs and earning a reputation as someone who always finishes what they start. A chance encounter with a retired ${charRole || "warrior"} gave them purpose and the skills to fight back.\n\nMOTIVATION:\n${charName} is driven by a burning need to uncover the truth behind the war that destroyed their family. Every step forward is fueled by the belief that justice is still possible, even in a broken world.\n\nFATAL FLAW:\nThey trust too easily, seeing the good in people even when all evidence points otherwise. This naivety has led them into traps more than once, and one day it may cost them everything.\n\nKEY RELATIONSHIP:\nTheir bond with their mentor, the retired ${charRole || "warrior"}, is the anchor that keeps them grounded. When their mentor disappears under mysterious circumstances, ${charName}'s quest becomes deeply personal.`,
      );
    }
    setBackstoryLoading(false);
  }, [charName, charRole]);

  const generateQuest = useCallback(async () => {
    setQuestLoading(true);
    setQuestResult("");

    const prompt = `You are a game quest designer. Create a ${questType} quest for an RPG game.

Quest Type: ${questType}

Respond with EXACTLY this format (use plain text, no markdown headers):

QUEST NAME: [Creative quest name]

QUEST GIVER: [NPC name and brief description]

OBJECTIVE: [Clear 2-3 sentence description of what the player must do]

REWARD: [What the player receives - items, gold, reputation, abilities, etc.]

TWIST 1: [An unexpected complication mid-quest, 2 sentences]
TWIST 2: [A moral dilemma or surprise revelation, 2 sentences]`;

    const result = await callAI(prompt);
    if (result) {
      setQuestResult(result);
    } else {
      const fallbacks: Record<string, string> = {
        Main: `QUEST NAME: The Shattered Crown\n\nQUEST GIVER: Aldric the Blind Seer - An ancient oracle who lost his sight to a vision of the future.\n\nOBJECTIVE: Retrieve the three fragments of the Shattered Crown from the Sunken Temple, the Ashen Peaks, and the Whispering Forest. Only by reassembling the crown can the barrier protecting the kingdom be restored.\n\nREWARD: The Crown of Sovereignty (legendary helm), 5000 gold, and the loyalty of the Royal Guard.\n\nTWIST 1: The second fragment is guarded by a dragon who claims to be the rightful heir to the throne. She offers to help if you side with her against the current king.\nTWIST 2: The Blind Seer knew the crown was cursed all along. Reassembling it doesn't restore the barrier -- it opens a portal to the realm of the dead.`,
        Side: `QUEST NAME: The Collector's Dilemma\n\nQUEST GIVER: Mira Thornweave - A nervous botanist studying rare plants in the Darkwood.\n\nOBJECTIVE: Gather three Moonbloom flowers that only bloom at midnight in the deepest part of the forest. Mira needs them for a cure to save her village from a spreading blight.\n\nREWARD: Elixir of Nightsight (permanent dark vision buff), 200 gold, and Mira becomes a shop vendor.\n\nTWIST 1: The Moonblooms are sentient and beg the player not to pick them. They claim Mira's "cure" will actually spread the blight further.\nTWIST 2: Mira is actually trying to create a poison to kill the forest guardian who cursed her family. The blight story was a lie.`,
        Fetch: `QUEST NAME: Lost Shipment\n\nQUEST GIVER: Garret Ironbelly - A grumpy dwarven merchant whose caravan was raided.\n\nOBJECTIVE: Track down and recover five stolen crates of rare ore from the bandit camp in Hollow Ridge. The bandits have fortified their position and set traps along the mountain path.\n\nREWARD: 300 gold, a Dwarven Steel Ingot (crafting material), and a 15% discount at Garret's shop.\n\nTWIST 1: The bandits are actually displaced villagers who were driven from their homes by Garret's mining operation. They stole the ore because it was mined from their ancestral land.\nTWIST 2: One of the crates contains something other than ore -- it holds a sealed dwarven artifact that Garret didn't mention.`,
        Escort: `QUEST NAME: The Last Witness\n\nQUEST GIVER: Commander Hale - A battle-scarred officer stationed at Fort Resolve.\n\nOBJECTIVE: Escort a young scholar named Pim safely through the Ashlands to the capital. Pim witnessed a war crime committed by a powerful noble and must testify before the High Court.\n\nREWARD: 500 gold, a Letter of Commendation (unlocks military vendors), and Commander Hale's trust for future missions.\n\nTWIST 1: Halfway through the Ashlands, a group of elite assassins attacks. They're not trying to kill Pim -- they're trying to deliver a counter-offer from the noble: wealth beyond imagination in exchange for silence.\nTWIST 2: Pim confesses they weren't just a witness. They were complicit in the crime and are testifying to clear their own conscience, not for justice.`,
        Mystery: `QUEST NAME: The Vanishing of Harrowmere\n\nQUEST GIVER: Mayor Edda Grimshaw - The desperate leader of a small lakeside town.\n\nOBJECTIVE: Investigate why residents of Harrowmere have been disappearing one by one over the past month. Search homes for clues, interview townsfolk, and follow the trail to the abandoned lighthouse on the lake.\n\nREWARD: 400 gold, a Cloak of Shadows (stealth gear), and the town's eternal gratitude (free lodging).\n\nTWIST 1: The missing villagers aren't dead. They've been lured underwater by a siren living beneath the lake who is building a "family" of enchanted thralls.\nTWIST 2: Mayor Grimshaw already knows about the siren. She made a deal years ago -- sacrifice a few villagers each year in exchange for the siren keeping the lake's waters pure and the fishing bountiful.`,
      };
      setQuestResult(fallbacks[questType] || fallbacks["Main"]);
    }
    setQuestLoading(false);
  }, [questType]);

  const generateDialogue = useCallback(async () => {
    if (!dialogueChar1.trim() || !dialogueChar2.trim()) return;
    setDialogueLoading(true);
    setDialogueResult("");

    const prompt = `Write a short game dialogue exchange (4-6 lines) between '${dialogueChar1.trim()}' and '${dialogueChar2.trim()}' in this situation: '${dialogueSituation.trim() || "a tense encounter"}'. Include emotional tags [happy], [angry], [sad], [scared], [neutral], [surprised], etc. Format EACH line as: CHARACTER_NAME: dialogue text [emotion]. No other formatting.`;

    const result = await callAI(prompt);
    if (result) {
      setDialogueResult(result);
    } else {
      setDialogueResult(
        `${dialogueChar1}: I wasn't expecting to see you here. [surprised]\n${dialogueChar2}: Neither was I. But here we are. [neutral]\n${dialogueChar1}: We need to talk about what happened. [serious]\n${dialogueChar2}: There's nothing left to say. You made your choice. [angry]\n${dialogueChar1}: I didn't have a choice. You know that. [sad]\n${dialogueChar2}: ...Maybe. But it still hurts. [sad]`,
      );
    }
    setDialogueLoading(false);
  }, [dialogueChar1, dialogueChar2, dialogueSituation]);

  function renderDialogue(text: string) {
    const lines = text.split("\n").filter((l) => l.trim());
    return (
      <div className="space-y-3">
        {lines.map((line, i) => {
          const match = line.match(/^(.+?):\s*(.+?)(?:\s*\[(\w+)\])?\s*$/);
          if (!match)
            return (
              <div key={i} className="text-xs text-[#6B7280] italic pl-2">
                {line}
              </div>
            );
          const [, speaker, dialogue, emotion] = match;
          const isChar1 =
            speaker.trim().toLowerCase() ===
            dialogueChar1.trim().toLowerCase();
          return (
            <div
              key={i}
              className={`flex ${isChar1 ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 ${isChar1 ? "bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-bl-sm" : "bg-[#10B981]/10 border border-[#10B981]/20 rounded-br-sm"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[11px] font-bold ${isChar1 ? "text-[#F59E0B]" : "text-[#10B981]"}`}
                  >
                    {speaker.trim()}
                  </span>
                  {emotion && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#2A2A2A] text-[#9CA3AF]">
                      {emotion}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#D1D5DB] leading-relaxed">
                  {dialogue.trim()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderContent(text: string) {
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-3" />;

      const isSectionHeader =
        /^(THREE-ACT STRUCTURE|CHARACTER ARC|KEY PLOT POINTS|THEMES|BACKSTORY|MOTIVATION|FATAL FLAW|KEY RELATIONSHIP|QUEST NAME|QUEST GIVER|OBJECTIVE|REWARD|TWIST \d):?/i.test(
          trimmed,
        );

      if (isSectionHeader) {
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > -1) {
          const label = trimmed.slice(0, colonIdx);
          const rest = trimmed.slice(colonIdx + 1).trim();
          return (
            <div key={i} className="mt-3 first:mt-0">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                {label}
              </span>
              {rest && (
                <span className="text-sm text-[#D1D5DB] ml-2">{rest}</span>
              )}
            </div>
          );
        }
        return (
          <div
            key={i}
            className="mt-3 text-xs font-bold uppercase tracking-wider text-[#F59E0B] first:mt-0"
          >
            {trimmed}
          </div>
        );
      }

      if (/^(Act \d|[-\d]+\.)/.test(trimmed)) {
        const dashIdx =
          trimmed.indexOf(" - ") > 0
            ? trimmed.indexOf(" - ")
            : trimmed.indexOf(": ");
        if (dashIdx > -1) {
          return (
            <div key={i} className="mt-1.5 pl-3">
              <span className="text-sm font-semibold text-[#E5E7EB]">
                {trimmed.slice(0, dashIdx + 3)}
              </span>
              <span className="text-sm text-[#9CA3AF]">
                {trimmed.slice(dashIdx + 3)}
              </span>
            </div>
          );
        }
      }

      if (trimmed.startsWith("- ")) {
        return (
          <div key={i} className="mt-1 pl-3 flex gap-2">
            <span className="text-[#F59E0B] mt-0.5 shrink-0">*</span>
            <span className="text-sm text-[#9CA3AF]">{trimmed.slice(2)}</span>
          </div>
        );
      }

      return (
        <div key={i} className="mt-1 text-sm text-[#9CA3AF] pl-3 leading-relaxed">
          {trimmed}
        </div>
      );
    });
  }

  const typeIcon = {
    outline: Scroll,
    backstory: Users,
    quest: Swords,
    dialogue: MessageSquare,
  };

  const typeColor = {
    outline: "#F59E0B",
    backstory: "#3B82F6",
    quest: "#EF4444",
    dialogue: "#10B981",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#1A1A1A] hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/10">
          <BookOpen className="h-5 w-5 text-[#F59E0B]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5]">
            AI Narrative Writer
          </h1>
          <p className="text-xs text-[#6B7280]">
            Generate story outlines, character backstories, and quests with AI
          </p>
        </div>
      </div>

      {/* Story Outline Section */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <button
          onClick={() => setOutlineOpen(!outlineOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Scroll className="h-4.5 w-4.5 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                Story Outline Generator
              </h2>
              <p className="text-xs text-[#6B7280]">
                3-act structure, character arc, plot points, and themes
              </p>
            </div>
          </div>
          {outlineOpen ? (
            <ChevronUp className="h-4 w-4 text-[#6B7280]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          )}
        </button>

        {outlineOpen && (
          <div className="border-t border-[#2A2A2A] px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Genre
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none transition-colors focus:border-[#F59E0B]/50"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Setting
              </label>
              <input
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                placeholder="A crumbling space station orbiting a dying star..."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#F59E0B]/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Protagonist
              </label>
              <input
                value={protagonist}
                onChange={(e) => setProtagonist(e.target.value)}
                placeholder="A disgraced knight seeking redemption..."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#F59E0B]/50"
              />
            </div>

            <button
              onClick={generateOutline}
              disabled={outlineLoading || (!setting.trim() && !protagonist.trim())}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-4 py-2.5 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {outlineLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {outlineLoading ? "Generating..." : "Generate Story Outline"}
            </button>

            {outlineResult && (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Generated Outline
                  </span>
                  <button
                    onClick={() =>
                      saveNarrative(
                        "outline",
                        `${genre} - ${setting.slice(0, 30) || "Story"}`,
                        outlineResult,
                      )
                    }
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors"
                  >
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
                <div>{renderContent(outlineResult)}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Character Backstory Section */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <button
          onClick={() => setBackstoryOpen(!backstoryOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6]/10">
              <Users className="h-4.5 w-4.5 text-[#3B82F6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                Character Backstory
              </h2>
              <p className="text-xs text-[#6B7280]">
                Backstory, motivation, flaw, and key relationship
              </p>
            </div>
          </div>
          {backstoryOpen ? (
            <ChevronUp className="h-4 w-4 text-[#6B7280]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          )}
        </button>

        {backstoryOpen && (
          <div className="border-t border-[#2A2A2A] px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Character Name
                </label>
                <input
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="Kael Ashborn"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#3B82F6]/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Role
                </label>
                <input
                  value={charRole}
                  onChange={(e) => setCharRole(e.target.value)}
                  placeholder="Rogue Alchemist, Fallen Paladin..."
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#3B82F6]/50"
                />
              </div>
            </div>

            <button
              onClick={generateBackstory}
              disabled={backstoryLoading || !charName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 px-4 py-2.5 text-sm font-medium text-[#3B82F6] transition-colors hover:bg-[#3B82F6]/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {backstoryLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {backstoryLoading
                ? "Generating..."
                : "Generate Character Backstory"}
            </button>

            {backstoryResult && (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Generated Backstory
                  </span>
                  <button
                    onClick={() =>
                      saveNarrative("backstory", charName, backstoryResult)
                    }
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors"
                  >
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
                <div>{renderContent(backstoryResult)}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Quest Generator Section */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <button
          onClick={() => setQuestOpen(!questOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EF4444]/10">
              <Swords className="h-4.5 w-4.5 text-[#EF4444]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                Quest Generator
              </h2>
              <p className="text-xs text-[#6B7280]">
                Quest name, giver, objective, reward, and twists
              </p>
            </div>
          </div>
          {questOpen ? (
            <ChevronUp className="h-4 w-4 text-[#6B7280]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          )}
        </button>

        {questOpen && (
          <div className="border-t border-[#2A2A2A] px-5 py-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Quest Type
              </label>
              <div className="flex flex-wrap gap-2">
                {QUEST_TYPES.map((qt) => (
                  <button
                    key={qt}
                    onClick={() => setQuestType(qt)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                      questType === qt
                        ? "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                        : "bg-[#0F0F0F] text-[#9CA3AF] border border-[#2A2A2A] hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {qt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateQuest}
              disabled={questLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/30 px-4 py-2.5 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {questLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {questLoading ? "Generating..." : "Generate Quest"}
            </button>

            {questResult && (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Generated Quest
                  </span>
                  <button
                    onClick={() =>
                      saveNarrative(
                        "quest",
                        `${questType} Quest`,
                        questResult,
                      )
                    }
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  >
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
                <div>{renderContent(questResult)}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* AI Dialogue Section */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <button
          onClick={() => setDialogueOpen(!dialogueOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10B981]/10">
              <MessageSquare className="h-4.5 w-4.5 text-[#10B981]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                AI Dialogue Writer
              </h2>
              <p className="text-xs text-[#6B7280]">
                Generate character dialogue with emotional tags
              </p>
            </div>
          </div>
          {dialogueOpen ? (
            <ChevronUp className="h-4 w-4 text-[#6B7280]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          )}
        </button>

        {dialogueOpen && (
          <div className="border-t border-[#2A2A2A] px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Character 1
                </label>
                <input
                  value={dialogueChar1}
                  onChange={(e) => setDialogueChar1(e.target.value)}
                  placeholder="Kael the Knight"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#10B981]/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Character 2
                </label>
                <input
                  value={dialogueChar2}
                  onChange={(e) => setDialogueChar2(e.target.value)}
                  placeholder="Mira the Rogue"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#10B981]/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Situation
              </label>
              <input
                value={dialogueSituation}
                onChange={(e) => setDialogueSituation(e.target.value)}
                placeholder="Meeting for the first time in a dark tavern during a storm..."
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#10B981]/50"
              />
            </div>

            <button
              onClick={generateDialogue}
              disabled={
                dialogueLoading ||
                !dialogueChar1.trim() ||
                !dialogueChar2.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 px-4 py-2.5 text-sm font-medium text-[#10B981] transition-colors hover:bg-[#10B981]/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {dialogueLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              {dialogueLoading ? "Generating..." : "Generate Dialogue"}
            </button>

            {dialogueResult && (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Generated Dialogue
                  </span>
                  <button
                    onClick={() =>
                      saveNarrative(
                        "dialogue",
                        `${dialogueChar1} & ${dialogueChar2}`,
                        dialogueResult,
                      )
                    }
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[#10B981] hover:bg-[#10B981]/10 transition-colors"
                  >
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
                {renderDialogue(dialogueResult)}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Saved Narratives */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
        <button
          onClick={() => setSavedOpen(!savedOpen)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F59E0B]/10">
              <Save className="h-4.5 w-4.5 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F5F5]">
                Saved Narratives
              </h2>
              <p className="text-xs text-[#6B7280]">
                {saved.length} saved {saved.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          {savedOpen ? (
            <ChevronUp className="h-4 w-4 text-[#6B7280]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          )}
        </button>

        {savedOpen && (
          <div className="border-t border-[#2A2A2A]">
            {saved.length > 0 && (
              <div className="flex justify-end px-5 pt-3">
                <button
                  onClick={exportAllNarratives}
                  className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10"
                >
                  <Download className="h-3.5 w-3.5" /> Export All
                </button>
              </div>
            )}
            {saved.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BookOpen className="h-10 w-10 text-[#2A2A2A]" />
                <p className="text-sm text-[#6B7280]">
                  No saved narratives yet
                </p>
                <p className="text-xs text-[#4B5563]">
                  Generate content above and hit Save to keep it here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A2A]">
                {saved.map((item) => {
                  const Icon = typeIcon[item.type];
                  const color = typeColor[item.type];
                  return (
                    <details key={item.id} className="group">
                      <summary className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-[#0F0F0F] transition-colors list-none [&::-webkit-details-marker]:hidden">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon
                            className="h-3.5 w-3.5"
                            style={{ color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#D1D5DB] truncate">
                              {item.title}
                            </span>
                            <span
                              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                              style={{
                                backgroundColor: `${color}15`,
                                color,
                              }}
                            >
                              {item.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(item.createdAt).toLocaleDateString()}{" "}
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteNarrative(item.id);
                          }}
                          className="shrink-0 rounded-md p-1.5 text-[#4B5563] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronDown className="h-4 w-4 shrink-0 text-[#4B5563] transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-[#222] bg-[#0F0F0F] px-5 py-4">
                        {renderContent(item.content)}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
