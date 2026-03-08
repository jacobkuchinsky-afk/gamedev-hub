"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Download,
  RotateCcw,
  X,
  FolderOpen,
  Loader2,
  Sparkles,
  AlertTriangle,
  Play,
  Circle,
  Upload,
} from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────

interface SMState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  isStart: boolean;
}

interface SMTransition {
  id: string;
  fromId: string;
  toId: string;
  condition: string;
}

interface SavedMachine {
  id: string;
  name: string;
  states: SMState[];
  transitions: SMTransition[];
  createdAt: number;
}

// ── Constants ────────────────────────────────────────────────

const STATE_W = 160;
const STATE_H = 56;
const STATE_RX = 16;
const STORAGE_KEY = "gameforge_state_machines";

const STATE_COLORS = [
  "#F59E0B", "#3B82F6", "#22C55E", "#EF4444", "#A855F7",
  "#EC4899", "#06B6D4", "#F97316", "#8B5CF6", "#14B8A6",
];

function uid(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Presets ──────────────────────────────────────────────────

const PRESETS: { key: string; name: string; desc: string; states: Omit<SMState, "id">[]; transitions: { from: number; to: number; condition: string }[] }[] = [
  {
    key: "enemy",
    name: "Enemy AI",
    desc: "Idle -> Patrol -> Chase -> Attack -> Flee",
    states: [
      { name: "Idle", color: "#3B82F6", x: 80, y: 200, isStart: true },
      { name: "Patrol", color: "#22C55E", x: 300, y: 80, isStart: false },
      { name: "Chase", color: "#F59E0B", x: 540, y: 200, isStart: false },
      { name: "Attack", color: "#EF4444", x: 440, y: 400, isStart: false },
      { name: "Flee", color: "#A855F7", x: 180, y: 400, isStart: false },
    ],
    transitions: [
      { from: 0, to: 1, condition: "timer > 3s" },
      { from: 1, to: 2, condition: "player spotted" },
      { from: 2, to: 3, condition: "in range" },
      { from: 3, to: 2, condition: "target moved" },
      { from: 3, to: 4, condition: "health < 20%" },
      { from: 4, to: 0, condition: "safe distance" },
      { from: 1, to: 0, condition: "patrol done" },
      { from: 2, to: 0, condition: "lost target" },
    ],
  },
  {
    key: "player",
    name: "Player Character",
    desc: "Idle -> Run -> Jump -> Fall -> Land",
    states: [
      { name: "Idle", color: "#3B82F6", x: 80, y: 220, isStart: true },
      { name: "Run", color: "#22C55E", x: 300, y: 100, isStart: false },
      { name: "Jump", color: "#F59E0B", x: 540, y: 100, isStart: false },
      { name: "Fall", color: "#EF4444", x: 540, y: 340, isStart: false },
      { name: "Land", color: "#A855F7", x: 300, y: 340, isStart: false },
    ],
    transitions: [
      { from: 0, to: 1, condition: "move input" },
      { from: 1, to: 0, condition: "no input" },
      { from: 0, to: 2, condition: "jump pressed" },
      { from: 1, to: 2, condition: "jump pressed" },
      { from: 2, to: 3, condition: "velocity.y < 0" },
      { from: 3, to: 4, condition: "grounded" },
      { from: 4, to: 0, condition: "anim done" },
      { from: 4, to: 1, condition: "move input" },
    ],
  },
  {
    key: "menu",
    name: "Menu Flow",
    desc: "Title -> Settings -> Play -> Pause -> GameOver",
    states: [
      { name: "Title", color: "#F59E0B", x: 100, y: 180, isStart: true },
      { name: "Settings", color: "#8B5CF6", x: 100, y: 380, isStart: false },
      { name: "Playing", color: "#22C55E", x: 380, y: 80, isStart: false },
      { name: "Paused", color: "#3B82F6", x: 600, y: 180, isStart: false },
      { name: "Game Over", color: "#EF4444", x: 380, y: 380, isStart: false },
    ],
    transitions: [
      { from: 0, to: 2, condition: "start clicked" },
      { from: 0, to: 1, condition: "settings clicked" },
      { from: 1, to: 0, condition: "back" },
      { from: 2, to: 3, condition: "ESC pressed" },
      { from: 3, to: 2, condition: "resume" },
      { from: 3, to: 0, condition: "quit" },
      { from: 2, to: 4, condition: "player died" },
      { from: 4, to: 0, condition: "main menu" },
      { from: 4, to: 2, condition: "retry" },
    ],
  },
];

function buildPreset(p: typeof PRESETS[number]): { states: SMState[]; transitions: SMTransition[] } {
  const states: SMState[] = p.states.map((s) => ({ ...s, id: uid() }));
  const transitions: SMTransition[] = p.transitions.map((t) => ({
    id: uid(),
    fromId: states[t.from].id,
    toId: states[t.to].id,
    condition: t.condition,
  }));
  return { states, transitions };
}

// ── Geometry helpers ─────────────────────────────────────────

function stateCenter(s: SMState): [number, number] {
  return [s.x + STATE_W / 2, s.y + STATE_H / 2];
}

function edgePoint(cx: number, cy: number, tx: number, ty: number): [number, number] {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return [cx, cy];
  const hw = STATE_W / 2 + 4;
  const hh = STATE_H / 2 + 4;
  const sx = Math.abs(dx) < 0.001 ? 1e9 : hw / Math.abs(dx);
  const sy = Math.abs(dy) < 0.001 ? 1e9 : hh / Math.abs(dy);
  const sc = Math.min(sx, sy);
  return [cx + dx * sc, cy + dy * sc];
}

function transitionPath(from: SMState, to: SMState, offset: number): { path: string; midX: number; midY: number; angle: number } {
  const [cx1, cy1] = stateCenter(from);
  const [cx2, cy2] = stateCenter(to);

  if (from.id === to.id) {
    const loopR = 40;
    const topY = from.y - loopR;
    return {
      path: `M ${cx1} ${from.y} C ${cx1 - loopR} ${topY - loopR}, ${cx1 + loopR} ${topY - loopR}, ${cx1} ${from.y}`,
      midX: cx1,
      midY: topY - loopR + 8,
      angle: 0,
    };
  }

  const dx = cx2 - cx1;
  const dy = cy2 - cy1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  const curveOff = offset * 30;

  const mx = (cx1 + cx2) / 2 + nx * curveOff;
  const my = (cy1 + cy2) / 2 + ny * curveOff;

  const [sx, sy] = edgePoint(cx1, cy1, mx, my);
  const [ex, ey] = edgePoint(cx2, cy2, mx, my);

  const angle = Math.atan2(ey - my, ex - mx) * (180 / Math.PI);

  return {
    path: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`,
    midX: (sx + 2 * mx + ex) / 4,
    midY: (sy + 2 * my + ey) / 4,
    angle,
  };
}

// ── Component ────────────────────────────────────────────────

interface Interaction {
  type: "idle" | "drag" | "pan";
  stateId?: string;
  sx?: number;
  sy?: number;
  ox?: number;
  oy?: number;
  px?: number;
  py?: number;
}

export default function StateMachinePage() {
  const initial = buildPreset(PRESETS[0]);
  const [states, setStates] = useState<SMState[]>(initial.states);
  const [transitions, setTransitions] = useState<SMTransition[]>(initial.transitions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTransId, setSelectedTransId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [machineName, setMachineName] = useState("Enemy AI");
  const [savedMachines, setSavedMachines] = useState<SavedMachine[]>([]);
  const [activeStateId, setActiveStateId] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  const [addStateOpen, setAddStateOpen] = useState(false);
  const [newStateName, setNewStateName] = useState("");
  const [newStateColor, setNewStateColor] = useState(STATE_COLORS[0]);

  const [addTransOpen, setAddTransOpen] = useState(false);
  const [transFrom, setTransFrom] = useState("");
  const [transTo, setTransTo] = useState("");
  const [transCondition, setTransCondition] = useState("");

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");

  const [stateDescriptions, setStateDescriptions] = useState<Record<string, string>>({});
  const [aiDescLoading, setAiDescLoading] = useState<string | null>(null);
  const [aiSmNamingLoading, setAiSmNamingLoading] = useState(false);
  const [aiSmNamingResult, setAiSmNamingResult] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const interRef = useRef<Interaction>({ type: "idle" });
  const panRef = useRef(pan);
  panRef.current = pan;
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedState = selectedId ? states.find((s) => s.id === selectedId) || null : null;
  const selectedTrans = selectedTransId ? transitions.find((t) => t.id === selectedTransId) || null : null;

  // ── Load saved machines ────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedMachines(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  // ── Keyboard ───────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          setStates((p) => p.filter((s) => s.id !== selectedId));
          setTransitions((p) => p.filter((t) => t.fromId !== selectedId && t.toId !== selectedId));
          setSelectedId(null);
        } else if (selectedTransId) {
          setTransitions((p) => p.filter((t) => t.id !== selectedTransId));
          setSelectedTransId(null);
        }
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setSelectedTransId(null);
        setAddStateOpen(false);
        setAddTransOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, selectedTransId]);

  // ── Mouse handlers ─────────────────────────────────────

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const i = interRef.current;
      if (i.type === "drag" && i.stateId) {
        setStates((prev) =>
          prev.map((s) =>
            s.id === i.stateId ? { ...s, x: i.ox! + e.clientX - i.sx!, y: i.oy! + e.clientY - i.sy! } : s,
          ),
        );
      } else if (i.type === "pan") {
        setPan({ x: i.px! + e.clientX - i.sx!, y: i.py! + e.clientY - i.sy! });
      }
    };
    const handleUp = () => { interRef.current = { type: "idle" }; };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const stateEl = target.closest("[data-state-id]") as HTMLElement | null;
    const transEl = target.closest("[data-trans-id]") as HTMLElement | null;

    if (stateEl) {
      e.preventDefault();
      const sid = stateEl.dataset.stateId!;
      setSelectedId(sid);
      setSelectedTransId(null);
      const st = states.find((s) => s.id === sid)!;
      interRef.current = { type: "drag", stateId: sid, sx: e.clientX, sy: e.clientY, ox: st.x, oy: st.y };
      return;
    }

    if (transEl) {
      e.preventDefault();
      setSelectedTransId(transEl.dataset.transId!);
      setSelectedId(null);
      return;
    }

    setSelectedId(null);
    setSelectedTransId(null);
    interRef.current = { type: "pan", sx: e.clientX, sy: e.clientY, px: panRef.current.x, py: panRef.current.y };
  }, [states]);

  // ── State CRUD ─────────────────────────────────────────

  const addState = useCallback(() => {
    if (!newStateName.trim()) return;
    const isFirst = states.length === 0;
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 - pan.x - STATE_W / 2 : 300;
    const cy = rect ? rect.height / 2 - pan.y - STATE_H / 2 : 200;
    const s: SMState = {
      id: uid(),
      name: newStateName.trim(),
      color: newStateColor,
      x: cx + (Math.random() - 0.5) * 100,
      y: cy + (Math.random() - 0.5) * 80,
      isStart: isFirst,
    };
    setStates((p) => [...p, s]);
    setNewStateName("");
    setAddStateOpen(false);
    setSelectedId(s.id);
  }, [newStateName, newStateColor, states.length, pan]);

  const addTransition = useCallback(() => {
    if (!transFrom || !transTo) return;
    const t: SMTransition = { id: uid(), fromId: transFrom, toId: transTo, condition: transCondition };
    setTransitions((p) => [...p, t]);
    setTransCondition("");
    setAddTransOpen(false);
  }, [transFrom, transTo, transCondition]);

  const updateState = useCallback((id: string, updates: Partial<SMState>) => {
    setStates((p) => {
      let next = p.map((s) => (s.id === id ? { ...s, ...updates } : s));
      if (updates.isStart) {
        next = next.map((s) => (s.id === id ? s : { ...s, isStart: false }));
      }
      return next;
    });
  }, []);

  const updateTransition = useCallback((id: string, updates: Partial<SMTransition>) => {
    setTransitions((p) => p.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteState = useCallback((id: string) => {
    setStates((p) => p.filter((s) => s.id !== id));
    setTransitions((p) => p.filter((t) => t.fromId !== id && t.toId !== id));
    setSelectedId(null);
    if (activeStateId === id) setActiveStateId(null);
  }, [activeStateId]);

  const deleteTransition = useCallback((id: string) => {
    setTransitions((p) => p.filter((t) => t.id !== id));
    setSelectedTransId(null);
  }, []);

  // ── Save / Load / Export ───────────────────────────────

  const saveMachine = useCallback(() => {
    const machine: SavedMachine = { id: `m_${Date.now()}`, name: machineName, states, transitions, createdAt: Date.now() };
    setSavedMachines((prev) => {
      const updated = [...prev.filter((m) => m.name !== machineName), machine];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [machineName, states, transitions]);

  const saveAsNew = useCallback(() => {
    const name = saveAsName.trim();
    if (!name) return;
    const machine: SavedMachine = { id: `m_${Date.now()}`, name, states, transitions, createdAt: Date.now() };
    setSavedMachines((prev) => {
      const updated = [...prev, machine];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setMachineName(name);
    setSaveAsName("");
    setSaveAsOpen(false);
  }, [saveAsName, states, transitions]);

  const loadMachine = useCallback((m: SavedMachine) => {
    setStates(m.states);
    setTransitions(m.transitions);
    setMachineName(m.name);
    setSelectedId(null);
    setSelectedTransId(null);
    setActiveStateId(null);
    setPan({ x: 0, y: 0 });
  }, []);

  const loadPreset = useCallback((p: typeof PRESETS[number]) => {
    const { states: s, transitions: t } = buildPreset(p);
    setStates(s);
    setTransitions(t);
    setMachineName(p.name);
    setSelectedId(null);
    setSelectedTransId(null);
    setActiveStateId(null);
    setPan({ x: 0, y: 0 });
  }, []);

  const deleteSaved = useCallback((id: string) => {
    setSavedMachines((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const exportJSON = useCallback(() => {
    const startState = states.find((s) => s.isStart);
    const data = {
      name: machineName,
      format: "gameforge_statemachine_v1",
      startState: startState?.name || null,
      states: states.map((s) => ({
        id: s.id,
        name: s.name,
        isStart: s.isStart,
        position: { x: Math.round(s.x), y: Math.round(s.y) },
      })),
      transitions: transitions.map((t) => {
        const from = states.find((s) => s.id === t.fromId);
        const to = states.find((s) => s.id === t.toId);
        return { from: from?.name || t.fromId, to: to?.name || t.toId, condition: t.condition };
      }),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${machineName.replace(/\s+/g, "_")}_statemachine.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [machineName, states, transitions]);

  const importJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.format === "gameforge_statemachine_v1" && Array.isArray(data.states)) {
          const imported: SMState[] = data.states.map((s: { id?: string; name: string; isStart?: boolean; position?: { x: number; y: number } }, i: number) => ({
            id: s.id || uid(),
            name: s.name,
            color: STATE_COLORS[i % STATE_COLORS.length],
            x: s.position?.x ?? 100 + i * 200,
            y: s.position?.y ?? 200,
            isStart: !!s.isStart,
          }));
          const importedTrans: SMTransition[] = (data.transitions || []).map((t: { from: string; to: string; condition?: string }) => {
            const fromState = imported.find((s) => s.name === t.from);
            const toState = imported.find((s) => s.name === t.to);
            return { id: uid(), fromId: fromState?.id || "", toId: toState?.id || "", condition: t.condition || "" };
          }).filter((t: SMTransition) => t.fromId && t.toId);
          setStates(imported);
          setTransitions(importedTrans);
          setMachineName(data.name || "Imported");
          setPan({ x: 0, y: 0 });
        }
      } catch { /* invalid json */ }
    };
    input.click();
  }, []);

  const clearCanvas = useCallback(() => {
    setStates([]);
    setTransitions([]);
    setSelectedId(null);
    setSelectedTransId(null);
    setActiveStateId(null);
  }, []);

  // ── Simulator ──────────────────────────────────────────

  const toggleSim = useCallback(() => {
    if (simRunning) {
      setSimRunning(false);
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      simTimerRef.current = null;
      setActiveStateId(null);
      return;
    }
    const start = states.find((s) => s.isStart);
    if (!start) return;
    setActiveStateId(start.id);
    setSimRunning(true);
  }, [simRunning, states]);

  const stepSim = useCallback(() => {
    if (!activeStateId) return;
    const outgoing = transitions.filter((t) => t.fromId === activeStateId);
    if (outgoing.length === 0) return;
    const next = outgoing[Math.floor(Math.random() * outgoing.length)];
    setActiveStateId(next.toId);
  }, [activeStateId, transitions]);

  useEffect(() => {
    if (simRunning && activeStateId) {
      simTimerRef.current = setInterval(() => {
        setActiveStateId((prev) => {
          if (!prev) return prev;
          const outgoing = transitions.filter((t) => t.fromId === prev);
          if (outgoing.length === 0) return prev;
          return outgoing[Math.floor(Math.random() * outgoing.length)].toId;
        });
      }, 1500);
      return () => { if (simTimerRef.current) clearInterval(simTimerRef.current); };
    }
  }, [simRunning, transitions, activeStateId]);

  // ── AI Generate ────────────────────────────────────────

  const aiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiNotice("");

    const prompt = `Generate a state machine for game AI based on this description: "${aiPrompt}".

Return ONLY a JSON object (no markdown, no explanation) with this exact format:
{
  "states": ["StateName1", "StateName2", ...],
  "transitions": [{"from": "StateName1", "to": "StateName2", "condition": "some condition"}, ...],
  "startState": "StateName1"
}

Keep state names short (1-2 words). Include 4-8 states and relevant transitions between them. Make sure every state has at least one transition.`;

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
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed.states) || parsed.states.length === 0) throw new Error("No states");

      const cols = STATE_COLORS;
      const count = parsed.states.length;
      const radius = Math.max(150, count * 35);
      const cx = 350;
      const cy = 280;

      const newStates: SMState[] = parsed.states.map((name: string, i: number) => ({
        id: uid(),
        name: String(name),
        color: cols[i % cols.length],
        x: cx + radius * Math.cos((2 * Math.PI * i) / count - Math.PI / 2) - STATE_W / 2,
        y: cy + radius * Math.sin((2 * Math.PI * i) / count - Math.PI / 2) - STATE_H / 2,
        isStart: String(name) === String(parsed.startState) || i === 0,
      }));

      const newTransitions: SMTransition[] = [];
      if (Array.isArray(parsed.transitions)) {
        for (const t of parsed.transitions) {
          const fromS = newStates.find((s) => s.name === String(t.from));
          const toS = newStates.find((s) => s.name === String(t.to));
          if (fromS && toS) {
            newTransitions.push({ id: uid(), fromId: fromS.id, toId: toS.id, condition: String(t.condition || "") });
          }
        }
      }

      setStates(newStates);
      setTransitions(newTransitions);
      setMachineName(aiPrompt.slice(0, 40));
      setPan({ x: 0, y: 0 });
      setSelectedId(null);
      setSelectedTransId(null);
      setAiPrompt("");
    } catch {
      setAiNotice("AI couldn't generate -- try a clearer description");
    }
    setAiLoading(false);
  }, [aiPrompt]);

  const aiDescribeState = useCallback(async (stateId: string) => {
    const state = states.find((s) => s.id === stateId);
    if (!state || aiDescLoading) return;
    setAiDescLoading(stateId);
    try {
      const outgoing = transitions.filter((t) => t.fromId === stateId);
      const targets = outgoing
        .map((t) => {
          const to = states.find((s) => s.id === t.toId);
          return to ? `${to.name}${t.condition ? ` (${t.condition})` : ""}` : null;
        })
        .filter(Boolean)
        .join(", ") || "none";
      const prompt = `Describe what a game entity should do in the '${state.name}' state (transitions to: ${targets}). 1 sentence max.`;
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
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const desc = content.replace(/[*"]/g, "").trim().split("\n")[0].trim();
      if (desc) setStateDescriptions((prev) => ({ ...prev, [stateId]: desc }));
    } catch {
      // silently fail
    } finally {
      setAiDescLoading(null);
    }
  }, [states, transitions, aiDescLoading]);

  // ── Transition offset map (for parallel edges) ─────────

  const transOffsets = useMemo(() => {
    const pairCount: Record<string, number> = {};
    const pairIdx: Record<string, number> = {};
    const offsets: Record<string, number> = {};

    for (const t of transitions) {
      const key = [t.fromId, t.toId].sort().join(":");
      pairCount[key] = (pairCount[key] || 0) + 1;
    }
    for (const t of transitions) {
      const key = [t.fromId, t.toId].sort().join(":");
      const idx = pairIdx[key] || 0;
      pairIdx[key] = idx + 1;
      const total = pairCount[key];
      offsets[t.id] = total === 1 ? 0 : idx - (total - 1) / 2;
    }
    return offsets;
  }, [transitions]);

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0F0F0F] text-white overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#2A2A2A] shrink-0 bg-[#0F0F0F]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tools" className="p-1.5 rounded-lg hover:bg-[#1A1A1A] text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-white">State Machine Designer</h1>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F59E0B]/15 text-[#F59E0B]">
              {states.length} states
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#3B82F6]/15 text-[#3B82F6]">
              {transitions.length} transitions
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-amber-500/50"
            value={machineName}
            onChange={(e) => setMachineName(e.target.value)}
            placeholder="Machine name..."
          />
          <button onClick={saveMachine} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm hover:border-amber-500/50 transition-colors">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={() => { setSaveAsOpen(true); setSaveAsName(machineName); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-sm text-amber-400 hover:bg-amber-500/30 transition-colors">
            <Save className="w-3.5 h-3.5" /> Save As
          </button>
          <button onClick={exportJSON} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm hover:border-amber-500/50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={importJSON} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm hover:border-amber-500/50 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button
            onClick={toggleSim}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${simRunning ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30" : "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30"}`}
          >
            {simRunning ? <><X className="w-3.5 h-3.5" /> Stop</> : <><Play className="w-3.5 h-3.5" /> Simulate</>}
          </button>
          {simRunning && (
            <button onClick={stepSim} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm hover:border-amber-500/50 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Step
            </button>
          )}
          <button
            onClick={async () => {
              if (aiSmNamingLoading) return;
              setAiSmNamingLoading(true); setAiSmNamingResult("");
              try {
                const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
                  method: "POST",
                  headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
                  body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Suggest a name for this state machine: ${states.length} states, ${transitions.length} transitions. Use a descriptive name like 'Enemy Patrol AI'. Just the name.` }], stream: false, max_tokens: 64, temperature: 0.7 }),
                });
                const data = await response.json();
                setAiSmNamingResult(data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "");
              } catch {} finally { setAiSmNamingLoading(false); }
            }}
            disabled={aiSmNamingLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#F59E0B]/30 bg-[#F59E0B]/10 rounded-lg text-sm text-[#F59E0B] hover:bg-[#F59E0B]/20 disabled:opacity-50 transition-colors"
          >
            {aiSmNamingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Name It
          </button>
        </div>
        {aiSmNamingResult && (
          <div className="mx-4 mt-1 mb-2 flex items-center gap-2 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-1.5">
            <Sparkles className="h-3 w-3 shrink-0 text-[#F59E0B]" />
            <span className="text-xs text-[#F59E0B]">{aiSmNamingResult}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-56 border-r border-[#2A2A2A] flex flex-col shrink-0 bg-[#0F0F0F]">
          {/* Add state */}
          <div className="p-3 border-b border-[#2A2A2A]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Add State</h3>
            {addStateOpen ? (
              <div className="space-y-2">
                <input
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                  placeholder="State name..."
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") addState(); if (e.key === "Escape") setAddStateOpen(false); }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {STATE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewStateColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: newStateColor === c ? "white" : "transparent" }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={addState} className="flex-1 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/30 transition-colors">
                    Add
                  </button>
                  <button onClick={() => setAddStateOpen(false)} className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddStateOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-[#2A2A2A] rounded-lg text-sm text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" /> New State
              </button>
            )}
          </div>

          {/* Add transition */}
          <div className="p-3 border-b border-[#2A2A2A]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Add Transition</h3>
            {addTransOpen ? (
              <div className="space-y-2">
                <select
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                  value={transFrom}
                  onChange={(e) => setTransFrom(e.target.value)}
                >
                  <option value="">From...</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                  value={transTo}
                  onChange={(e) => setTransTo(e.target.value)}
                >
                  <option value="">To...</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                  value={transCondition}
                  onChange={(e) => setTransCondition(e.target.value)}
                  placeholder="Condition label..."
                  onKeyDown={(e) => { if (e.key === "Enter") addTransition(); }}
                />
                <div className="flex gap-1.5">
                  <button onClick={addTransition} className="flex-1 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/30 transition-colors">
                    Add
                  </button>
                  <button onClick={() => setAddTransOpen(false)} className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAddTransOpen(true); if (states.length > 0) { setTransFrom(states[0].id); setTransTo(states.length > 1 ? states[1].id : states[0].id); } }}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-[#2A2A2A] rounded-lg text-sm text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Transition
              </button>
            )}
          </div>

          {/* Presets */}
          <div className="p-3 border-b border-[#2A2A2A]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Presets</h3>
            <div className="space-y-1">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => loadPreset(p)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1A1A1A] transition-colors group/pre"
                >
                  <div className="text-xs text-gray-300 font-medium group-hover/pre:text-white transition-colors">{p.name}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Generate */}
          <div className="p-3 border-b border-[#2A2A2A]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" /> AI Generate
            </h3>
            <div className="space-y-2">
              <textarea
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500/50 resize-none"
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe a behavior... e.g. 'shopkeeper who gets angry when you steal'"
              />
              <button
                onClick={aiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition-colors disabled:opacity-40"
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiLoading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Saved machines */}
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Saved Machines</h3>
            {savedMachines.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <FolderOpen className="h-8 w-8 text-[#2A2A2A]" />
                <p className="text-[11px] text-gray-600">No saved machines</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {savedMachines.map((m) => (
                  <div key={m.id} className="group/saved rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] bg-[#111] p-2.5 transition-colors">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
                      <button onClick={() => loadMachine(m)} className="flex-1 text-left text-xs text-gray-200 font-medium truncate hover:text-white">
                        {m.name}
                      </button>
                      <button onClick={() => deleteSaved(m.id)} className="opacity-0 group-hover/saved:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 pl-6 text-[10px] text-gray-600">
                      <span>{m.states.length} states</span>
                      <span>{m.transitions.length} trans</span>
                      <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#2A2A2A]">
            <button onClick={clearCanvas} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-3 h-3" /> Clear All
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ backgroundImage: "radial-gradient(circle, #1A1A1A 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          onMouseDown={handleCanvasMouseDown}
        >
          {aiNotice && (
            <div className="absolute top-3 right-3 z-50 flex items-center gap-2 rounded-lg border border-[#F59E0B]/20 bg-[#1A1A1A]/95 px-3 py-2 text-xs text-[#F59E0B] shadow-lg backdrop-blur-sm">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {aiNotice}
              <button onClick={() => setAiNotice("")} className="ml-1 text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
          )}

          {aiLoading && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border border-purple-500/30 bg-[#1A1A1A]/95 px-4 py-2 text-xs text-purple-400 shadow-lg backdrop-blur-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI is generating state machine...
            </div>
          )}

          <div className="absolute" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
            {/* SVG transitions */}
            <svg className="absolute top-0 left-0 pointer-events-none" style={{ overflow: "visible", width: 1, height: 1 }}>
              <defs>
                <marker id="sm-arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                </marker>
                <marker id="sm-arrow-active" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" />
                </marker>
                <marker id="sm-arrow-sel" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="white" />
                </marker>
              </defs>

              {transitions.map((t) => {
                const fromS = states.find((s) => s.id === t.fromId);
                const toS = states.find((s) => s.id === t.toId);
                if (!fromS || !toS) return null;

                const offset = transOffsets[t.id] || 0;
                const { path, midX, midY } = transitionPath(fromS, toS, offset);
                const isActive = activeStateId === t.fromId;
                const isSel = selectedTransId === t.id;
                const strokeColor = isSel ? "white" : isActive ? "#F59E0B" : "#555";
                const markerEnd = isSel ? "url(#sm-arrow-sel)" : isActive ? "url(#sm-arrow-active)" : "url(#sm-arrow)";

                return (
                  <g key={t.id}>
                    {/* Hit area */}
                    <path
                      d={path}
                      stroke="transparent"
                      strokeWidth={16}
                      fill="none"
                      className="cursor-pointer pointer-events-auto"
                      data-trans-id={t.id}
                    />
                    <path
                      d={path}
                      stroke={strokeColor}
                      strokeWidth={isSel ? 2.5 : 2}
                      fill="none"
                      opacity={isActive ? 1 : 0.7}
                      markerEnd={markerEnd}
                      className="pointer-events-none"
                    />
                    {t.condition && (
                      <foreignObject
                        x={midX - 60}
                        y={midY - 11}
                        width={120}
                        height={22}
                        className="pointer-events-none"
                      >
                        <div className="flex justify-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap ${isSel ? "bg-white/20 text-white" : isActive ? "bg-amber-500/20 text-amber-400" : "bg-[#1A1A1A]/90 text-gray-400 border border-[#2A2A2A]"}`}
                          >
                            {t.condition}
                          </span>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* State nodes */}
            {states.map((s) => {
              const isSelected = selectedId === s.id;
              const isActive = activeStateId === s.id;
              return (
                <div
                  key={s.id}
                  data-state-id={s.id}
                  className={`group absolute select-none cursor-grab active:cursor-grabbing transition-shadow ${isActive ? "z-10" : ""}`}
                  style={{
                    left: s.x,
                    top: s.y,
                    width: STATE_W,
                    height: STATE_H,
                  }}
                >
                  {/* Outer glow for active state */}
                  {isActive && (
                    <div
                      className="absolute -inset-2 rounded-2xl animate-pulse"
                      style={{ background: `${s.color}20`, border: `2px solid ${s.color}40` }}
                    />
                  )}

                  <div
                    className={`relative w-full h-full rounded-2xl border-2 flex items-center justify-center gap-2 overflow-hidden ${isSelected ? "ring-2 ring-white/40" : ""}`}
                    style={{
                      background: `${s.color}15`,
                      borderColor: isActive ? s.color : isSelected ? s.color : `${s.color}40`,
                      boxShadow: isActive ? `0 0 20px ${s.color}30` : "none",
                      ...(s.isStart ? { outline: `3px solid ${s.color}60`, outlineOffset: "3px" } : {}),
                    }}
                  >
                    {/* Start indicator */}
                    {s.isStart && (
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                        <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[10px] border-transparent" style={{ borderLeftColor: s.color }} />
                      </div>
                    )}

                    <Circle className="w-3 h-3 shrink-0" style={{ color: s.color, fill: isActive ? s.color : "transparent" }} />
                    <span className="text-sm font-semibold truncate" style={{ color: isActive ? s.color : "#E5E7EB" }}>
                      {s.name}
                    </span>
                  </div>

                  {/* AI description label */}
                  {stateDescriptions[s.id] && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                      style={{ top: STATE_H + 4, width: STATE_W + 40 }}
                    >
                      <p className="text-center text-[9px] leading-tight text-gray-500 bg-[#111]/90 rounded px-1.5 py-0.5 border border-[#2A2A2A]/60 truncate">
                        {stateDescriptions[s.id]}
                      </p>
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-20 shadow-lg"
                    onClick={(e) => { e.stopPropagation(); deleteState(s.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom stats */}
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-[#1A1A1A]/80 rounded text-[10px] text-gray-500">
            {states.length} states &middot; {transitions.length} transitions
            {activeStateId && <> &middot; Active: <span className="text-amber-400">{states.find((s) => s.id === activeStateId)?.name}</span></>}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 right-3 flex items-center gap-3 px-3 py-1.5 bg-[#1A1A1A]/80 rounded-lg text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-amber-500/60" style={{ outline: "2px solid #F59E0B40", outlineOffset: "2px" }} /> Start</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500" /> Active</span>
            <span>Drag to reposition</span>
          </div>
        </div>

        {/* Right panel — editor */}
        {(selectedState || selectedTrans) && (
          <div className="w-72 border-l border-[#2A2A2A] flex flex-col shrink-0 bg-[#0F0F0F]">
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {selectedState ? "Edit State" : "Edit Transition"}
              </span>
              <button
                onClick={() => { setSelectedId(null); setSelectedTransId(null); }}
                className="p-1 hover:bg-[#1A1A1A] rounded text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedState && (
                <>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Name</label>
                    <input
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedState.name}
                      onChange={(e) => updateState(selectedState.id, { name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">AI Behavior</label>
                    <button
                      onClick={() => aiDescribeState(selectedState.id)}
                      disabled={aiDescLoading === selectedState.id}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] rounded-lg text-xs hover:bg-[#F59E0B]/20 transition-colors disabled:opacity-50"
                    >
                      {aiDescLoading === selectedState.id ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Describing...</>
                      ) : (
                        <><Sparkles className="w-3 h-3" /> AI Describe</>
                      )}
                    </button>
                    {stateDescriptions[selectedState.id] && (
                      <p className="mt-1.5 text-[11px] text-gray-400 leading-snug bg-[#1A1A1A] rounded-lg px-2.5 py-2 border border-[#2A2A2A]">
                        {stateDescriptions[selectedState.id]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {STATE_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateState(selectedState.id, { color: c })}
                          className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                          style={{ backgroundColor: c, borderColor: selectedState.color === c ? "white" : "transparent" }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedState.isStart}
                        onChange={(e) => updateState(selectedState.id, { isStart: e.target.checked })}
                        className="rounded border-[#2A2A2A] bg-[#1A1A1A] text-amber-500 focus:ring-amber-500/50"
                      />
                      <span className="text-gray-300">Start State</span>
                    </label>
                    <p className="text-[10px] text-gray-600 mt-1">Marked with double border and arrow</p>
                  </div>

                  {/* Connections from this state */}
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Outgoing Transitions</label>
                    {(() => {
                      const out = transitions.filter((t) => t.fromId === selectedState.id);
                      if (out.length === 0) return <p className="text-xs text-gray-600 italic">No outgoing transitions</p>;
                      return (
                        <div className="space-y-1">
                          {out.map((t) => {
                            const target = states.find((s) => s.id === t.toId);
                            return (
                              <div key={t.id} className="flex items-center gap-1.5 p-1.5 bg-[#1A1A1A] rounded text-xs">
                                <span className="text-gray-400 flex-1 truncate">{target?.name || "?"}</span>
                                <span className="text-gray-600 truncate max-w-[80px]">{t.condition || "---"}</span>
                                <button onClick={() => deleteTransition(t.id)} className="p-0.5 text-gray-600 hover:text-red-400">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Incoming Transitions</label>
                    {(() => {
                      const inc = transitions.filter((t) => t.toId === selectedState.id);
                      if (inc.length === 0) return <p className="text-xs text-gray-600 italic">No incoming transitions</p>;
                      return (
                        <div className="space-y-1">
                          {inc.map((t) => {
                            const source = states.find((s) => s.id === t.fromId);
                            return (
                              <div key={t.id} className="flex items-center gap-1.5 p-1.5 bg-[#1A1A1A] rounded text-xs">
                                <span className="text-gray-400 flex-1 truncate">{source?.name || "?"}</span>
                                <span className="text-gray-600 truncate max-w-[80px]">{t.condition || "---"}</span>
                                <button onClick={() => deleteTransition(t.id)} className="p-0.5 text-gray-600 hover:text-red-400">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    onClick={() => deleteState(selectedState.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete State
                  </button>
                </>
              )}

              {selectedTrans && (
                <>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">From</label>
                    <select
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedTrans.fromId}
                      onChange={(e) => updateTransition(selectedTrans.id, { fromId: e.target.value })}
                    >
                      {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">To</label>
                    <select
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedTrans.toId}
                      onChange={(e) => updateTransition(selectedTrans.id, { toId: e.target.value })}
                    >
                      {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Condition</label>
                    <input
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedTrans.condition}
                      onChange={(e) => updateTransition(selectedTrans.id, { condition: e.target.value })}
                      placeholder="Condition label..."
                    />
                  </div>
                  <button
                    onClick={() => deleteTransition(selectedTrans.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Transition
                  </button>
                </>
              )}

              <p className="text-[10px] text-gray-600 text-center">Press Delete key to remove</p>
            </div>
          </div>
        )}
      </div>

      {saveAsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-96 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Save As</h2>
            <input
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 mb-4"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="State machine name..."
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveAsNew(); if (e.key === "Escape") setSaveAsOpen(false); }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSaveAsOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAsNew}
                disabled={!saveAsName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
