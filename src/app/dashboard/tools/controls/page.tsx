"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  Keyboard,
  Gamepad2,
  AlertTriangle,
  Trash2,
  RotateCcw,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";

type ActionCategory = "Movement" | "Action" | "UI" | "Camera";

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  Movement: "#3B82F6",
  Action: "#F59E0B",
  UI: "#10B981",
  Camera: "#A855F7",
};

interface KeyMapping {
  key: string;
  action: string;
  category: ActionCategory;
}

interface GamepadMapping {
  button: string;
  action: string;
  category: ActionCategory;
}

interface Preset {
  name: string;
  keys: KeyMapping[];
  gamepad: GamepadMapping[];
}

const PRESETS: Record<string, Preset> = {
  Platformer: {
    name: "Platformer",
    keys: [
      { key: "W", action: "Jump", category: "Movement" },
      { key: "A", action: "Move Left", category: "Movement" },
      { key: "D", action: "Move Right", category: "Movement" },
      { key: "S", action: "Crouch", category: "Movement" },
      { key: "Space", action: "Jump", category: "Movement" },
      { key: "Shift", action: "Run", category: "Movement" },
      { key: "E", action: "Interact", category: "Action" },
      { key: "Q", action: "Special Ability", category: "Action" },
      { key: "1", action: "Slot 1", category: "Action" },
      { key: "2", action: "Slot 2", category: "Action" },
      { key: "Escape", action: "Pause Menu", category: "UI" },
      { key: "Tab", action: "Inventory", category: "UI" },
      { key: "M", action: "Map", category: "UI" },
    ],
    gamepad: [
      { button: "A", action: "Jump", category: "Movement" },
      { button: "B", action: "Run", category: "Movement" },
      { button: "X", action: "Attack", category: "Action" },
      { button: "Y", action: "Special", category: "Action" },
      { button: "LStick", action: "Move", category: "Movement" },
      { button: "DPad", action: "Move", category: "Movement" },
      { button: "Start", action: "Pause", category: "UI" },
      { button: "RB", action: "Interact", category: "Action" },
    ],
  },
  RPG: {
    name: "RPG",
    keys: [
      { key: "W", action: "Move Up", category: "Movement" },
      { key: "A", action: "Move Left", category: "Movement" },
      { key: "S", action: "Move Down", category: "Movement" },
      { key: "D", action: "Move Right", category: "Movement" },
      { key: "Space", action: "Confirm / Interact", category: "Action" },
      { key: "E", action: "Use Item", category: "Action" },
      { key: "Q", action: "Quick Spell", category: "Action" },
      { key: "1", action: "Spell Slot 1", category: "Action" },
      { key: "2", action: "Spell Slot 2", category: "Action" },
      { key: "3", action: "Spell Slot 3", category: "Action" },
      { key: "4", action: "Spell Slot 4", category: "Action" },
      { key: "I", action: "Inventory", category: "UI" },
      { key: "C", action: "Character Sheet", category: "UI" },
      { key: "J", action: "Journal / Quests", category: "UI" },
      { key: "M", action: "World Map", category: "UI" },
      { key: "Tab", action: "Quick Menu", category: "UI" },
      { key: "Escape", action: "Pause / System", category: "UI" },
    ],
    gamepad: [
      { button: "LStick", action: "Move", category: "Movement" },
      { button: "A", action: "Confirm", category: "Action" },
      { button: "B", action: "Cancel", category: "UI" },
      { button: "X", action: "Attack", category: "Action" },
      { button: "Y", action: "Use Item", category: "Action" },
      { button: "LB", action: "Prev Spell", category: "Action" },
      { button: "RB", action: "Next Spell", category: "Action" },
      { button: "Start", action: "Menu", category: "UI" },
      { button: "Select", action: "Map", category: "UI" },
    ],
  },
  FPS: {
    name: "FPS",
    keys: [
      { key: "W", action: "Move Forward", category: "Movement" },
      { key: "A", action: "Strafe Left", category: "Movement" },
      { key: "S", action: "Move Backward", category: "Movement" },
      { key: "D", action: "Strafe Right", category: "Movement" },
      { key: "Space", action: "Jump", category: "Movement" },
      { key: "Ctrl", action: "Crouch", category: "Movement" },
      { key: "Shift", action: "Sprint", category: "Movement" },
      { key: "R", action: "Reload", category: "Action" },
      { key: "G", action: "Grenade", category: "Action" },
      { key: "F", action: "Melee", category: "Action" },
      { key: "E", action: "Use / Interact", category: "Action" },
      { key: "1", action: "Primary Weapon", category: "Action" },
      { key: "2", action: "Secondary Weapon", category: "Action" },
      { key: "3", action: "Sidearm", category: "Action" },
      { key: "Tab", action: "Scoreboard", category: "UI" },
      { key: "Escape", action: "Menu", category: "UI" },
      { key: "M", action: "Map", category: "UI" },
      { key: "V", action: "Toggle View", category: "Camera" },
    ],
    gamepad: [
      { button: "LStick", action: "Move", category: "Movement" },
      { button: "RStick", action: "Look", category: "Camera" },
      { button: "RT", action: "Shoot", category: "Action" },
      { button: "LT", action: "Aim Down Sights", category: "Camera" },
      { button: "A", action: "Jump", category: "Movement" },
      { button: "B", action: "Crouch", category: "Movement" },
      { button: "X", action: "Reload", category: "Action" },
      { button: "Y", action: "Switch Weapon", category: "Action" },
      { button: "RB", action: "Grenade", category: "Action" },
      { button: "LB", action: "Sprint", category: "Movement" },
      { button: "Start", action: "Menu", category: "UI" },
    ],
  },
  "Top-Down": {
    name: "Top-Down",
    keys: [
      { key: "W", action: "Move Up", category: "Movement" },
      { key: "A", action: "Move Left", category: "Movement" },
      { key: "S", action: "Move Down", category: "Movement" },
      { key: "D", action: "Move Right", category: "Movement" },
      { key: "Space", action: "Dash / Dodge", category: "Movement" },
      { key: "Shift", action: "Sprint", category: "Movement" },
      { key: "E", action: "Interact", category: "Action" },
      { key: "Q", action: "Ability 1", category: "Action" },
      { key: "F", action: "Ability 2", category: "Action" },
      { key: "R", action: "Reload", category: "Action" },
      { key: "Tab", action: "Inventory", category: "UI" },
      { key: "Escape", action: "Pause", category: "UI" },
      { key: "M", action: "Minimap Toggle", category: "UI" },
      { key: "Z", action: "Zoom Out", category: "Camera" },
      { key: "X", action: "Zoom In", category: "Camera" },
    ],
    gamepad: [
      { button: "LStick", action: "Move", category: "Movement" },
      { button: "RStick", action: "Aim", category: "Camera" },
      { button: "RT", action: "Shoot", category: "Action" },
      { button: "LT", action: "Ability", category: "Action" },
      { button: "A", action: "Dash", category: "Movement" },
      { button: "B", action: "Interact", category: "Action" },
      { button: "Start", action: "Pause", category: "UI" },
    ],
  },
  Strategy: {
    name: "Strategy",
    keys: [
      { key: "W", action: "Pan Up", category: "Camera" },
      { key: "A", action: "Pan Left", category: "Camera" },
      { key: "S", action: "Pan Down", category: "Camera" },
      { key: "D", action: "Pan Right", category: "Camera" },
      { key: "Q", action: "Rotate Left", category: "Camera" },
      { key: "E", action: "Rotate Right", category: "Camera" },
      { key: "Z", action: "Zoom In", category: "Camera" },
      { key: "X", action: "Zoom Out", category: "Camera" },
      { key: "1", action: "Select Group 1", category: "Action" },
      { key: "2", action: "Select Group 2", category: "Action" },
      { key: "3", action: "Select Group 3", category: "Action" },
      { key: "Space", action: "Pause Game", category: "UI" },
      { key: "Tab", action: "Cycle Units", category: "Action" },
      { key: "G", action: "Attack Move", category: "Action" },
      { key: "H", action: "Hold Position", category: "Action" },
      { key: "P", action: "Patrol", category: "Action" },
      { key: "B", action: "Build Menu", category: "UI" },
      { key: "T", action: "Tech Tree", category: "UI" },
      { key: "F1", action: "Help", category: "UI" },
      { key: "Escape", action: "Cancel / Menu", category: "UI" },
    ],
    gamepad: [
      { button: "LStick", action: "Pan Camera", category: "Camera" },
      { button: "RStick", action: "Cursor", category: "UI" },
      { button: "A", action: "Select", category: "Action" },
      { button: "B", action: "Cancel", category: "UI" },
      { button: "X", action: "Action", category: "Action" },
      { button: "Y", action: "Build Menu", category: "UI" },
      { button: "LB", action: "Prev Group", category: "Action" },
      { button: "RB", action: "Next Group", category: "Action" },
      { button: "Start", action: "Pause", category: "UI" },
    ],
  },
};

const KEYBOARD_ROWS: string[][] = [
  ["Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
  ["CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter"],
  ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "RShift"],
  ["Ctrl", "Win", "Alt", "Space", "RAlt", "Fn", "Menu", "RCtrl"],
];

const WIDE_KEYS: Record<string, number> = {
  Backspace: 2,
  Tab: 1.5,
  "\\": 1.5,
  CapsLock: 1.75,
  Enter: 2.25,
  Shift: 2.25,
  RShift: 2.75,
  Ctrl: 1.25,
  Win: 1.25,
  Alt: 1.25,
  Space: 6.25,
  RAlt: 1.25,
  Fn: 1.25,
  Menu: 1.25,
  RCtrl: 1.25,
};

const KEY_DISPLAY: Record<string, string> = {
  Escape: "Esc",
  Backspace: "Bksp",
  CapsLock: "Caps",
  RShift: "Shift",
  RAlt: "Alt",
  RCtrl: "Ctrl",
  Win: "Win",
  Fn: "Fn",
  Menu: "Menu",
  "\\": "\\",
  ";": ";",
  "'": "'",
  ",": ",",
  ".": ".",
  "/": "/",
  "[": "[",
  "]": "]",
  "`": "`",
  "-": "-",
  "=": "=",
};

const BROWSER_KEY_MAP: Record<string, string> = {
  " ": "Space",
  arrowup: "W",
  arrowdown: "S",
  arrowleft: "A",
  arrowright: "D",
  control: "Ctrl",
  meta: "Win",
  alt: "Alt",
  enter: "Enter",
  backspace: "Backspace",
  tab: "Tab",
  capslock: "CapsLock",
  escape: "Escape",
  shift: "Shift",
};

const GAMEPAD_BUTTONS = [
  { id: "A", label: "A", x: 78, y: 42 },
  { id: "B", label: "B", x: 90, y: 32 },
  { id: "X", label: "X", x: 66, y: 32 },
  { id: "Y", label: "Y", x: 78, y: 22 },
  { id: "LB", label: "LB", x: 18, y: 8 },
  { id: "RB", label: "RB", x: 82, y: 8 },
  { id: "LT", label: "LT", x: 18, y: 0 },
  { id: "RT", label: "RT", x: 82, y: 0 },
  { id: "LStick", label: "L3", x: 30, y: 35 },
  { id: "RStick", label: "R3", x: 66, y: 50 },
  { id: "DPad", label: "D-Pad", x: 30, y: 50 },
  { id: "Start", label: "Start", x: 58, y: 28 },
  { id: "Select", label: "Select", x: 42, y: 28 },
];

export default function ControlsPage() {
  const [keyMappings, setKeyMappings] = useState<KeyMapping[]>([]);
  const [gamepadMappings, setGamepadMappings] = useState<GamepadMapping[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedGamepadBtn, setSelectedGamepadBtn] = useState<string | null>(null);
  const [assignAction, setAssignAction] = useState("");
  const [assignCategory, setAssignCategory] = useState<ActionCategory>("Action");
  const [pressAnyKeyMode, setPressAnyKeyMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"keyboard" | "gamepad">("keyboard");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiDescCopied, setAiDescCopied] = useState(false);
  const [aiPresetInput, setAiPresetInput] = useState("");
  const [aiPresetLoading, setAiPresetLoading] = useState(false);

  const conflicts = useMemo(() => {
    const seen = new Map<string, string[]>();
    keyMappings.forEach((m) => {
      const existing = seen.get(m.key) || [];
      existing.push(m.action);
      seen.set(m.key, existing);
    });
    const result: string[] = [];
    seen.forEach((actions, key) => {
      if (actions.length > 1) result.push(key);
    });
    return new Set(result);
  }, [keyMappings]);

  const getMappingForKey = useCallback(
    (key: string) => keyMappings.find((m) => m.key === key),
    [keyMappings]
  );

  const getMappingForButton = useCallback(
    (btn: string) => gamepadMappings.find((m) => m.button === btn),
    [gamepadMappings]
  );

  const handleKeyClick = useCallback((key: string) => {
    setSelectedKey(key);
    setSelectedGamepadBtn(null);
    setShowAssignModal(true);
    setAssignAction("");
    setAssignCategory("Action");
  }, []);

  const handleGamepadClick = useCallback((btn: string) => {
    setSelectedGamepadBtn(btn);
    setSelectedKey(null);
    setShowAssignModal(true);
    setAssignAction("");
    setAssignCategory("Action");
  }, []);

  const handleAssign = useCallback(() => {
    if (!assignAction.trim()) return;
    if (selectedKey) {
      setKeyMappings((prev) => {
        const filtered = prev.filter((m) => m.key !== selectedKey);
        return [...filtered, { key: selectedKey, action: assignAction.trim(), category: assignCategory }];
      });
    } else if (selectedGamepadBtn) {
      setGamepadMappings((prev) => {
        const filtered = prev.filter((m) => m.button !== selectedGamepadBtn);
        return [...filtered, { button: selectedGamepadBtn, action: assignAction.trim(), category: assignCategory }];
      });
    }
    setShowAssignModal(false);
    setSelectedKey(null);
    setSelectedGamepadBtn(null);
  }, [assignAction, assignCategory, selectedKey, selectedGamepadBtn]);

  const handleRemoveKey = useCallback((key: string) => {
    setKeyMappings((prev) => prev.filter((m) => m.key !== key));
  }, []);

  const handleRemoveGamepadBtn = useCallback((btn: string) => {
    setGamepadMappings((prev) => prev.filter((m) => m.button !== btn));
  }, []);

  const loadPreset = useCallback((name: string) => {
    const preset = PRESETS[name];
    if (!preset) return;
    setKeyMappings([...preset.keys]);
    setGamepadMappings([...preset.gamepad]);
    setActivePreset(name);
  }, []);

  const clearAll = useCallback(() => {
    setKeyMappings([]);
    setGamepadMappings([]);
    setActivePreset(null);
  }, []);

  useEffect(() => {
    if (!pressAnyKeyMode) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const raw = e.key.toLowerCase();
      const mapped = BROWSER_KEY_MAP[raw] || e.key.toUpperCase();
      const allKeys = KEYBOARD_ROWS.flat();
      const found = allKeys.find((k) => k === mapped || k.toUpperCase() === mapped.toUpperCase());
      if (found) {
        setSelectedKey(found);
        setSelectedGamepadBtn(null);
        setShowAssignModal(true);
        setAssignAction("");
        setAssignCategory("Action");
        setPressAnyKeyMode(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pressAnyKeyMode]);

  const generateAIDescription = useCallback(async () => {
    const allMappings: string[] = [];
    keyMappings.forEach((m) => allMappings.push(`${m.key} = ${m.action}`));
    gamepadMappings.forEach((m) => allMappings.push(`${m.button} (gamepad) = ${m.action}`));
    if (allMappings.length === 0) return;

    setAiDescLoading(true);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{
            role: "user",
            content: `Write a brief controls guide for a game with these keyboard mappings: ${allMappings.join(", ")}. Format as a clean reference card with categories. 5-6 lines max.`,
          }],
          stream: false,
          max_tokens: 256,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      setAiDescription(content.trim() || "Failed to generate description.");
    } catch {
      setAiDescription("AI unavailable. Try again later.");
    } finally {
      setAiDescLoading(false);
    }
  }, [keyMappings, gamepadMappings]);

  const copyAiDescription = useCallback(() => {
    navigator.clipboard.writeText(aiDescription);
    setAiDescCopied(true);
    setTimeout(() => setAiDescCopied(false), 1500);
  }, [aiDescription]);

  const generateAIPreset = useCallback(async () => {
    if (!aiPresetInput.trim() || aiPresetLoading) return;
    setAiPresetLoading(true);
    try {
      const prompt = `Suggest keyboard controls for a ${aiPresetInput.trim()} game. List key=action pairs for 8-10 essential controls. Format: KEY=ACTION, one per line. No extra text.`;
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
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";

      const CATEGORY_KEYWORDS: Record<ActionCategory, string[]> = {
        Movement: ["move", "walk", "run", "sprint", "jump", "crouch", "dash", "dodge", "strafe", "climb", "swim", "fly", "roll", "slide"],
        Action: ["attack", "shoot", "fire", "reload", "interact", "use", "ability", "spell", "throw", "melee", "block", "parry", "grab", "cast", "special", "slot", "weapon", "grenade", "bomb"],
        UI: ["menu", "pause", "inventory", "map", "quest", "journal", "scoreboard", "chat", "tab", "escape", "help", "settings"],
        Camera: ["look", "zoom", "rotate", "camera", "view", "pan"],
      };

      function guessCategory(action: string): ActionCategory {
        const lower = action.toLowerCase();
        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          if (keywords.some((kw) => lower.includes(kw))) return cat as ActionCategory;
        }
        return "Action";
      }

      const allKeys = KEYBOARD_ROWS.flat();
      const parsed: KeyMapping[] = [];
      const lines = content.split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*[`*-]*\s*(\S+?)\s*=\s*(.+?)\s*[`*]*$/);
        if (!match) continue;
        let [, rawKey, action] = match;
        action = action.replace(/[`*]/g, "").trim();
        const normalized = rawKey.charAt(0).toUpperCase() + rawKey.slice(1).toLowerCase();
        const found = allKeys.find((k) => k.toLowerCase() === rawKey.toLowerCase() || k === normalized);
        const finalKey = found || rawKey.toUpperCase();
        if (action) {
          parsed.push({ key: finalKey, action, category: guessCategory(action) });
        }
      }

      if (parsed.length > 0) {
        setKeyMappings(parsed);
        setGamepadMappings([]);
        setActivePreset(null);
      }
    } catch {
      // silently fail
    } finally {
      setAiPresetLoading(false);
    }
  }, [aiPresetInput, aiPresetLoading]);

  const exportJSON = useCallback(() => {
    const data = { keyboard: keyMappings, gamepad: gamepadMappings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "control-scheme.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [keyMappings, gamepadMappings]);

  const exportDocument = useCallback(() => {
    const lines: string[] = [
      "GAME CONTROL SCHEME",
      "=".repeat(40),
      "",
    ];
    if (activePreset) lines.push(`Preset: ${activePreset}`, "");

    const catGroups: Record<string, KeyMapping[]> = {};
    keyMappings.forEach((m) => {
      (catGroups[m.category] = catGroups[m.category] || []).push(m);
    });

    lines.push("KEYBOARD CONTROLS", "-".repeat(40));
    Object.entries(catGroups).forEach(([cat, mappings]) => {
      lines.push("", `  [${cat}]`);
      mappings.forEach((m) => {
        lines.push(`    ${m.key.padEnd(14)} ${m.action}`);
      });
    });

    if (gamepadMappings.length > 0) {
      lines.push("", "", "GAMEPAD CONTROLS", "-".repeat(40));
      const gpGroups: Record<string, GamepadMapping[]> = {};
      gamepadMappings.forEach((m) => {
        (gpGroups[m.category] = gpGroups[m.category] || []).push(m);
      });
      Object.entries(gpGroups).forEach(([cat, mappings]) => {
        lines.push("", `  [${cat}]`);
        mappings.forEach((m) => {
          lines.push(`    ${m.button.padEnd(14)} ${m.action}`);
        });
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "control-scheme.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [keyMappings, gamepadMappings, activePreset]);

  const copyJSON = useCallback(() => {
    const data = { keyboard: keyMappings, gamepad: gamepadMappings };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [keyMappings, gamepadMappings]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tools"
            className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-2 text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#F5F5F5]">Input Mapper</h1>
            <p className="text-sm text-[#6B7280]">
              Design and document game control schemes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyJSON}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
          >
            <Download className="h-3.5 w-3.5" />
            JSON
          </button>
          <button
            onClick={exportDocument}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
          >
            <Download className="h-3.5 w-3.5" />
            Document
          </button>
          <button
            onClick={generateAIDescription}
            disabled={aiDescLoading || (keyMappings.length === 0 && gamepadMappings.length === 0)}
            className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B]/15 px-3 py-2 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {aiDescLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiDescLoading ? "Writing..." : "AI Describe"}
          </button>
        </div>
      </div>

      {/* Presets + Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[#6B7280] mr-1">Presets:</span>
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => loadPreset(name)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activePreset === name
                ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            }`}
          >
            {name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPressAnyKeyMode(!pressAnyKeyMode)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              pressAnyKeyMode
                ? "bg-[#F59E0B]/15 text-[#F59E0B] animate-pulse"
                : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            {pressAnyKeyMode ? "Press a key..." : "Press Any Key"}
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#EF4444]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* AI Custom Preset */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-[#F59E0B]" />
          <p className="text-sm font-semibold text-[#F5F5F5]">AI Custom Preset</p>
          <span className="text-xs text-[#6B7280]">Describe your game to generate controls</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiPresetInput}
            onChange={(e) => setAiPresetInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") generateAIPreset(); }}
            placeholder='e.g. "twin-stick shooter", "point and click adventure"'
            className="min-w-0 flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#F59E0B]/50"
          />
          <button
            onClick={generateAIPreset}
            disabled={aiPresetLoading || !aiPresetInput.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20 disabled:opacity-40"
          >
            {aiPresetLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {aiPresetLoading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Conflict warnings */}
      {conflicts.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
          <span className="text-sm text-[#F59E0B]">
            Key conflict{conflicts.size > 1 ? "s" : ""} detected:{" "}
            {[...conflicts].map((k) => `"${k}"`).join(", ")}
          </span>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-1 w-fit">
        <button
          onClick={() => setActiveTab("keyboard")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "keyboard"
              ? "bg-[#F59E0B]/15 text-[#F59E0B]"
              : "text-[#6B7280] hover:text-[#9CA3AF]"
          }`}
        >
          <Keyboard className="h-4 w-4" />
          Keyboard
        </button>
        <button
          onClick={() => setActiveTab("gamepad")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "gamepad"
              ? "bg-[#F59E0B]/15 text-[#F59E0B]"
              : "text-[#6B7280] hover:text-[#9CA3AF]"
          }`}
        >
          <Gamepad2 className="h-4 w-4" />
          Gamepad
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main area */}
        <div className="space-y-4">
          {activeTab === "keyboard" ? (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
              <div className="space-y-1.5">
                {KEYBOARD_ROWS.map((row, ri) => (
                  <div key={ri} className="flex gap-1">
                    {row.map((key) => {
                      const mapping = getMappingForKey(key);
                      const width = WIDE_KEYS[key] || 1;
                      const hasConflict = conflicts.has(key);
                      const display = KEY_DISPLAY[key] || key;
                      const isSelected = selectedKey === key && !showAssignModal;
                      return (
                        <button
                          key={key}
                          onClick={() => handleKeyClick(key)}
                          title={mapping ? `${key}: ${mapping.action} (${mapping.category})` : key}
                          className={`relative flex flex-col items-center justify-center rounded-lg border text-[10px] font-medium transition-all hover:scale-105 ${
                            hasConflict
                              ? "border-[#EF4444]/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                              : mapping
                                ? "border-transparent"
                                : isSelected
                                  ? "border-[#F59E0B]"
                                  : "border-[#2A2A2A] hover:border-[#3A3A3A]"
                          }`}
                          style={{
                            width: `${width * 48}px`,
                            height: "44px",
                            backgroundColor: mapping
                              ? `${CATEGORY_COLORS[mapping.category]}20`
                              : "#0F0F0F",
                            color: mapping
                              ? CATEGORY_COLORS[mapping.category]
                              : "#6B7280",
                            ...(mapping && {
                              boxShadow: `inset 0 0 0 1px ${CATEGORY_COLORS[mapping.category]}40`,
                            }),
                          }}
                        >
                          <span className="leading-none">{display}</span>
                          {mapping && (
                            <span
                              className="mt-0.5 max-w-full truncate px-0.5 text-[7px] leading-none opacity-70"
                              style={{ maxWidth: `${width * 44}px` }}
                            >
                              {mapping.action}
                            </span>
                          )}
                          {hasConflict && (
                            <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#EF4444]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#2A2A2A] pt-4">
                {(Object.entries(CATEGORY_COLORS) as [ActionCategory, string][]).map(
                  ([cat, color]) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: `${color}40` }}
                      />
                      <span className="text-xs text-[#6B7280]">{cat}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            /* Gamepad visual */
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
              <div className="relative mx-auto" style={{ width: "100%", maxWidth: "500px", aspectRatio: "5/3" }}>
                {/* Gamepad body shape */}
                <svg viewBox="0 0 100 65" className="absolute inset-0 w-full h-full">
                  <path
                    d="M 15 15 Q 15 8 22 8 L 78 8 Q 85 8 85 15 L 88 45 Q 90 58 78 60 L 65 58 Q 55 56 50 56 Q 45 56 35 58 L 22 60 Q 10 58 12 45 Z"
                    fill="#0F0F0F"
                    stroke="#2A2A2A"
                    strokeWidth="0.8"
                  />
                </svg>

                {/* Buttons */}
                {GAMEPAD_BUTTONS.map((btn) => {
                  const mapping = getMappingForButton(btn.id);
                  return (
                    <button
                      key={btn.id}
                      onClick={() => handleGamepadClick(btn.id)}
                      title={
                        mapping
                          ? `${btn.label}: ${mapping.action} (${mapping.category})`
                          : btn.label
                      }
                      className="absolute flex flex-col items-center justify-center rounded-full border transition-all hover:scale-110"
                      style={{
                        left: `${btn.x}%`,
                        top: `${btn.y}%`,
                        transform: "translate(-50%, -50%)",
                        width: btn.id === "DPad" ? "36px" : "30px",
                        height: btn.id === "DPad" ? "36px" : "30px",
                        backgroundColor: mapping
                          ? `${CATEGORY_COLORS[mapping.category]}25`
                          : "#1A1A1A",
                        borderColor: mapping
                          ? `${CATEGORY_COLORS[mapping.category]}60`
                          : "#2A2A2A",
                        color: mapping
                          ? CATEGORY_COLORS[mapping.category]
                          : "#6B7280",
                      }}
                    >
                      <span className="text-[8px] font-bold leading-none">{btn.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Gamepad mapping list */}
              {gamepadMappings.length > 0 && (
                <div className="mt-6 space-y-1 border-t border-[#2A2A2A] pt-4">
                  {gamepadMappings.map((m) => (
                    <div
                      key={m.button}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[#0F0F0F]"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-bold"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[m.category]}20`,
                            color: CATEGORY_COLORS[m.category],
                          }}
                        >
                          {m.button}
                        </span>
                        <span className="text-sm text-[#D1D5DB]">{m.action}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveGamepadBtn(m.button)}
                        className="text-[#3A3A3A] transition-colors hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar — mapped actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[#F5F5F5]">
              Mapped Actions
              <span className="ml-2 text-xs font-normal text-[#6B7280]">
                ({keyMappings.length + gamepadMappings.length})
              </span>
            </h3>

            {keyMappings.length === 0 && gamepadMappings.length === 0 ? (
              <p className="text-xs text-[#6B7280]">
                Click a key or load a preset to start mapping controls.
              </p>
            ) : (
              <div className="space-y-4">
                {(Object.keys(CATEGORY_COLORS) as ActionCategory[]).map((cat) => {
                  const catKeys = keyMappings.filter((m) => m.category === cat);
                  const catBtns = gamepadMappings.filter((m) => m.category === cat);
                  if (catKeys.length === 0 && catBtns.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h4
                        className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: CATEGORY_COLORS[cat] }}
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                        />
                        {cat}
                      </h4>
                      <div className="space-y-0.5">
                        {catKeys.map((m) => (
                          <div
                            key={m.key}
                            className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-[#0F0F0F]"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="min-w-[36px] rounded px-1.5 py-0.5 text-center text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[cat]}15`,
                                  color: CATEGORY_COLORS[cat],
                                }}
                              >
                                {m.key}
                              </span>
                              <span className="text-xs text-[#D1D5DB]">{m.action}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveKey(m.key)}
                              className="text-[#3A3A3A] opacity-0 transition-all group-hover:opacity-100 hover:text-[#EF4444]"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {catBtns.map((m) => (
                          <div
                            key={`gp-${m.button}`}
                            className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-[#0F0F0F]"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="min-w-[36px] rounded px-1.5 py-0.5 text-center text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[cat]}15`,
                                  color: CATEGORY_COLORS[cat],
                                }}
                              >
                                <Gamepad2 className="mr-0.5 inline h-2.5 w-2.5" />
                                {m.button}
                              </span>
                              <span className="text-xs text-[#D1D5DB]">{m.action}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveGamepadBtn(m.button)}
                              className="text-[#3A3A3A] opacity-0 transition-all group-hover:opacity-100 hover:text-[#EF4444]"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[#F5F5F5]">Stats</h3>
            <div className="space-y-2">
              {(Object.entries(CATEGORY_COLORS) as [ActionCategory, string][]).map(
                ([cat, color]) => {
                  const count =
                    keyMappings.filter((m) => m.category === cat).length +
                    gamepadMappings.filter((m) => m.category === cat).length;
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-[#9CA3AF]">{cat}</span>
                      </div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: count > 0 ? color : "#3A3A3A" }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                }
              )}
              <div className="mt-2 border-t border-[#2A2A2A] pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF]">Total Bindings</span>
                  <span className="text-xs font-semibold text-[#F59E0B]">
                    {keyMappings.length + gamepadMappings.length}
                  </span>
                </div>
                {conflicts.size > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-[#9CA3AF]">Conflicts</span>
                    <span className="text-xs font-semibold text-[#EF4444]">
                      {conflicts.size}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Description panel */}
      {(aiDescription || aiDescLoading) && (
        <div className="rounded-xl border border-[#F59E0B]/20 bg-[#1A1A1A] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#F59E0B]">
              <Sparkles className="h-4 w-4" />
              Controls Reference Card
            </h3>
            <div className="flex items-center gap-2">
              {aiDescription && !aiDescLoading && (
                <>
                  <button
                    onClick={copyAiDescription}
                    className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  >
                    {aiDescCopied ? <Check className="h-3 w-3 text-[#10B981]" /> : <Copy className="h-3 w-3" />}
                    {aiDescCopied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => setAiDescription("")}
                    className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          {aiDescLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#F59E0B]" />
              <span className="ml-3 text-sm text-[#9CA3AF]">Generating controls description...</span>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-lg bg-[#0F0F0F] p-4 text-sm leading-relaxed text-[#D1D5DB] font-mono">{aiDescription}</pre>
          )}
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && (selectedKey || selectedGamepadBtn) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-[#F5F5F5]">
                Assign{" "}
                <span className="text-[#F59E0B]">
                  {selectedKey || selectedGamepadBtn}
                </span>
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedKey(null);
                  setSelectedGamepadBtn(null);
                }}
                className="text-[#6B7280] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">Action</label>
                <input
                  type="text"
                  value={assignAction}
                  onChange={(e) => setAssignAction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAssign();
                    e.stopPropagation();
                  }}
                  placeholder='e.g. "Jump", "Move Left", "Open Menu"'
                  autoFocus
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">Category</label>
                <div className="grid grid-cols-4 gap-1">
                  {(Object.keys(CATEGORY_COLORS) as ActionCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAssignCategory(cat)}
                      className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        assignCategory === cat
                          ? "text-white"
                          : "text-[#6B7280] hover:text-[#9CA3AF]"
                      }`}
                      style={{
                        backgroundColor:
                          assignCategory === cat
                            ? `${CATEGORY_COLORS[cat]}30`
                            : "#0F0F0F",
                        ...(assignCategory === cat && {
                          boxShadow: `inset 0 0 0 1px ${CATEGORY_COLORS[cat]}50`,
                          color: CATEGORY_COLORS[cat],
                        }),
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAssign}
                  disabled={!assignAction.trim()}
                  className="flex-1 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
                {(selectedKey
                  ? getMappingForKey(selectedKey)
                  : selectedGamepadBtn
                    ? getMappingForButton(selectedGamepadBtn)
                    : null) && (
                  <button
                    onClick={() => {
                      if (selectedKey) handleRemoveKey(selectedKey);
                      if (selectedGamepadBtn) handleRemoveGamepadBtn(selectedGamepadBtn);
                      setShowAssignModal(false);
                      setSelectedKey(null);
                      setSelectedGamepadBtn(null);
                    }}
                    className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/10"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
