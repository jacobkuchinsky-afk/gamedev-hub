"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Users,
  GitBranch,
  Zap,
  Plus,
  Trash2,
  Save,
  Download,
  Play,
  RotateCcw,
  X,
  FolderOpen,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────

type NodeType = "npc" | "choice" | "condition" | "action";
type EmotionType = "Neutral" | "Happy" | "Angry" | "Sad" | "Scared" | "Excited" | "Mysterious";

interface DialogueNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  character: string;
  text: string;
  choices: string[];
  condition: string;
  conditionParam: string;
  action: string;
  actionParam: string;
  emotion?: EmotionType;
}

interface Connection {
  id: string;
  fromNodeId: string;
  fromPortIndex: number;
  toNodeId: string;
}

interface SavedTree {
  id: string;
  name: string;
  nodes: DialogueNode[];
  connections: Connection[];
  createdAt: number;
}

interface SimEntry {
  char: string;
  text: string;
  isPlayer: boolean;
}

// ── Constants ────────────────────────────────────────────────

const NODE_WIDTH = 240;
const NODE_BASE_HEIGHT = 92;
const CHOICE_ROW_H = 20;
const STORAGE_KEY = "gameforge_dialogue_trees";

const TYPE_COLORS: Record<NodeType, string> = {
  npc: "#3B82F6",
  choice: "#F59E0B",
  condition: "#22C55E",
  action: "#EF4444",
};

const TYPE_META: Record<
  NodeType,
  { label: string; Icon: typeof MessageSquare }
> = {
  npc: { label: "NPC Dialogue", Icon: MessageSquare },
  choice: { label: "Player Choice", Icon: Users },
  condition: { label: "Condition", Icon: GitBranch },
  action: { label: "Action", Icon: Zap },
};

const EMOTIONS: Record<EmotionType, { emoji: string; color: string }> = {
  Neutral: { emoji: "\u{1F610}", color: "#9CA3AF" },
  Happy: { emoji: "\u{1F60A}", color: "#22C55E" },
  Angry: { emoji: "\u{1F621}", color: "#EF4444" },
  Sad: { emoji: "\u{1F622}", color: "#3B82F6" },
  Scared: { emoji: "\u{1F628}", color: "#A855F7" },
  Excited: { emoji: "\u{1F929}", color: "#F59E0B" },
  Mysterious: { emoji: "\u{1F52E}", color: "#6366F1" },
};

const VOICE_OPTIONS = [
  "Wise Elder",
  "Grumpy Merchant",
  "Nervous Guard",
  "Cheerful Innkeeper",
  "Mysterious Stranger",
  "Custom...",
];

// ── Helpers ──────────────────────────────────────────────────

function nodeHeight(n: DialogueNode): number {
  if (n.type === "choice")
    return NODE_BASE_HEIGHT + Math.max(n.choices.length, 1) * CHOICE_ROW_H;
  return NODE_BASE_HEIGHT;
}

function outputCount(n: DialogueNode): number {
  if (n.type === "choice") return Math.max(n.choices.length, 1);
  if (n.type === "condition") return 2;
  return 1;
}

function inputPos(n: DialogueNode): [number, number] {
  return [n.x + NODE_WIDTH / 2, n.y];
}

function outputPos(n: DialogueNode, idx: number): [number, number] {
  const h = nodeHeight(n);
  const c = outputCount(n);
  if (c === 1) return [n.x + NODE_WIDTH / 2, n.y + h];
  const sp = NODE_WIDTH / (c + 1);
  return [n.x + sp * (idx + 1), n.y + h];
}

function bezier(x1: number, y1: number, x2: number, y2: number): string {
  const cp = Math.max(40, Math.abs(y2 - y1) * 0.4);
  return `M ${x1} ${y1} C ${x1} ${y1 + cp}, ${x2} ${y2 - cp}, ${x2} ${y2}`;
}

function uid(): string {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function makeNode(type: NodeType, x: number, y: number): DialogueNode {
  return {
    id: uid(),
    type,
    x: Math.round(x),
    y: Math.round(y),
    character: type === "npc" ? "Character" : type === "choice" ? "Player" : "",
    text:
      type === "npc"
        ? "Enter dialogue..."
        : type === "choice"
          ? "Choose:"
          : "",
    choices: type === "choice" ? ["Option 1", "Option 2"] : [],
    condition: type === "condition" ? "has_flag" : "",
    conditionParam: "",
    action: type === "action" ? "set_flag" : "",
    actionParam: "",
    emotion: type === "npc" ? "Neutral" : undefined,
  };
}

// ── Templates ────────────────────────────────────────────────

const TAVERN_NODES: DialogueNode[] = [
  { id: "s1", type: "npc", x: 340, y: 40, character: "Tavern Keeper", text: "Welcome to the Golden Tankard! What brings you here?", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "s2", type: "choice", x: 300, y: 200, character: "Player", text: "Choose your response:", choices: ["I'll have an ale.", "Tell me about the ruins.", "Any work available?"], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "s3", type: "npc", x: 40, y: 430, character: "Tavern Keeper", text: "Coming right up! That'll be 5 gold.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "s4", type: "condition", x: 320, y: 430, character: "", text: "", choices: [], condition: "has_flag", conditionParam: "talked_to_elder", action: "", actionParam: "" },
  { id: "s5", type: "npc", x: 610, y: 430, character: "Tavern Keeper", text: "Rats in my cellar! Clear them out for 20 gold.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "s6", type: "action", x: 40, y: 590, character: "", text: "", choices: [], condition: "", conditionParam: "", action: "give_item", actionParam: "Ale" },
  { id: "s7", type: "npc", x: 220, y: 590, character: "Tavern Keeper", text: "The elder sent you? Take the north road past the bridge.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "s8", type: "npc", x: 450, y: 590, character: "Tavern Keeper", text: "The ruins? Talk to the village elder first.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "s9", type: "action", x: 630, y: 590, character: "", text: "", choices: [], condition: "", conditionParam: "", action: "set_flag", actionParam: "cellar_quest" },
];

const TAVERN_CONNS: Connection[] = [
  { id: "c1", fromNodeId: "s1", fromPortIndex: 0, toNodeId: "s2" },
  { id: "c2", fromNodeId: "s2", fromPortIndex: 0, toNodeId: "s3" },
  { id: "c3", fromNodeId: "s2", fromPortIndex: 1, toNodeId: "s4" },
  { id: "c4", fromNodeId: "s2", fromPortIndex: 2, toNodeId: "s5" },
  { id: "c5", fromNodeId: "s3", fromPortIndex: 0, toNodeId: "s6" },
  { id: "c6", fromNodeId: "s4", fromPortIndex: 0, toNodeId: "s7" },
  { id: "c7", fromNodeId: "s4", fromPortIndex: 1, toNodeId: "s8" },
  { id: "c8", fromNodeId: "s5", fromPortIndex: 0, toNodeId: "s9" },
];

const SHOP_NODES: DialogueNode[] = [
  { id: "sh1", type: "npc", x: 340, y: 40, character: "Merchant", text: "Welcome to my shop! What can I get for you today?", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "sh2", type: "choice", x: 300, y: 200, character: "Player", text: "What would you like?", choices: ["Buy a Health Potion", "Buy an Iron Sword", "Just browsing"], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "sh3", type: "action", x: 40, y: 420, character: "", text: "", choices: [], condition: "", conditionParam: "", action: "give_item", actionParam: "Health_Potion" },
  { id: "sh4", type: "npc", x: 40, y: 560, character: "Merchant", text: "Here's your potion. Stay safe out there!", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "sh5", type: "npc", x: 300, y: 420, character: "Merchant", text: "A fine blade! That'll be 50 gold pieces.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "sh6", type: "npc", x: 560, y: 420, character: "Merchant", text: "Take your time! Let me know if anything catches your eye.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
];

const SHOP_CONNS: Connection[] = [
  { id: "shc1", fromNodeId: "sh1", fromPortIndex: 0, toNodeId: "sh2" },
  { id: "shc2", fromNodeId: "sh2", fromPortIndex: 0, toNodeId: "sh3" },
  { id: "shc3", fromNodeId: "sh2", fromPortIndex: 1, toNodeId: "sh5" },
  { id: "shc4", fromNodeId: "sh2", fromPortIndex: 2, toNodeId: "sh6" },
  { id: "shc5", fromNodeId: "sh3", fromPortIndex: 0, toNodeId: "sh4" },
];

const QUEST_NODES: DialogueNode[] = [
  { id: "q1", type: "npc", x: 340, y: 40, character: "Village Elder", text: "Brave adventurer! Our village needs your help.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "q2", type: "condition", x: 320, y: 200, character: "", text: "", choices: [], condition: "has_flag", conditionParam: "wolves_cleared", action: "", actionParam: "" },
  { id: "q3", type: "npc", x: 80, y: 380, character: "Village Elder", text: "You've already proven yourself! A dragon has been spotted near the mountains.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "q4", type: "npc", x: 500, y: 380, character: "Village Elder", text: "Wolves have been attacking our livestock at night. Can you help us?", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "q5", type: "choice", x: 440, y: 540, character: "Player", text: "Your response:", choices: ["I'll take care of it", "Not right now"], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "q6", type: "action", x: 360, y: 700, character: "", text: "", choices: [], condition: "", conditionParam: "", action: "set_flag", actionParam: "wolf_quest_accepted" },
  { id: "q7", type: "npc", x: 580, y: 700, character: "Village Elder", text: "I understand. Come back when you're ready.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
];

const QUEST_CONNS: Connection[] = [
  { id: "qc1", fromNodeId: "q1", fromPortIndex: 0, toNodeId: "q2" },
  { id: "qc2", fromNodeId: "q2", fromPortIndex: 0, toNodeId: "q3" },
  { id: "qc3", fromNodeId: "q2", fromPortIndex: 1, toNodeId: "q4" },
  { id: "qc4", fromNodeId: "q4", fromPortIndex: 0, toNodeId: "q5" },
  { id: "qc5", fromNodeId: "q5", fromPortIndex: 0, toNodeId: "q6" },
  { id: "qc6", fromNodeId: "q5", fromPortIndex: 1, toNodeId: "q7" },
];

const GUARD_NODES: DialogueNode[] = [
  { id: "g1", type: "npc", x: 340, y: 40, character: "Castle Guard", text: "Halt! State your business. No one enters without authorization.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "g2", type: "choice", x: 300, y: 220, character: "Player", text: "Your response:", choices: ["I have a royal summons", "I'll come back later"], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "g3", type: "condition", x: 120, y: 420, character: "", text: "", choices: [], condition: "has_flag", conditionParam: "royal_summons", action: "", actionParam: "" },
  { id: "g4", type: "npc", x: 20, y: 590, character: "Castle Guard", text: "So you do. The king awaits in the throne room. Don't keep him waiting.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "g5", type: "npc", x: 280, y: 590, character: "Castle Guard", text: "Nice try. Come back with a proper summons from the steward.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
  { id: "g6", type: "npc", x: 520, y: 420, character: "Castle Guard", text: "Move along then.", choices: [], condition: "", conditionParam: "", action: "", actionParam: "" },
];

const GUARD_CONNS: Connection[] = [
  { id: "gc1", fromNodeId: "g1", fromPortIndex: 0, toNodeId: "g2" },
  { id: "gc2", fromNodeId: "g2", fromPortIndex: 0, toNodeId: "g3" },
  { id: "gc3", fromNodeId: "g2", fromPortIndex: 1, toNodeId: "g6" },
  { id: "gc4", fromNodeId: "g3", fromPortIndex: 0, toNodeId: "g4" },
  { id: "gc5", fromNodeId: "g3", fromPortIndex: 1, toNodeId: "g5" },
];

const TEMPLATES = [
  { key: "tavern", name: "Tavern Keeper", desc: "Branching tavern dialogue with conditions", nodes: TAVERN_NODES, connections: TAVERN_CONNS },
  { key: "shop", name: "Shop Keeper", desc: "Buy items from a merchant", nodes: SHOP_NODES, connections: SHOP_CONNS },
  { key: "quest", name: "Quest Giver", desc: "Quest with condition gates", nodes: QUEST_NODES, connections: QUEST_CONNS },
  { key: "guard", name: "Guard", desc: "Gate check with authorization", nodes: GUARD_NODES, connections: GUARD_CONNS },
];

// ── Component ────────────────────────────────────────────────

interface Interaction {
  type: "idle" | "drag" | "pan";
  nodeId?: string;
  sx?: number;
  sy?: number;
  nx?: number;
  ny?: number;
  px?: number;
  py?: number;
}

export default function DialoguePage() {
  const [nodes, setNodes] = useState<DialogueNode[]>(TAVERN_NODES);
  const [connections, setConnections] = useState<Connection[]>(TAVERN_CONNS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [treeName, setTreeName] = useState("Tavern Keeper");
  const [savedTrees, setSavedTrees] = useState<SavedTree[]>([]);

  const [connectFrom, setConnectFrom] = useState<{
    nodeId: string;
    portIndex: number;
  } | null>(null);
  const [tempEnd, setTempEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  const [simOpen, setSimOpen] = useState(false);
  const [simCurrentId, setSimCurrentId] = useState<string | null>(null);
  const [simFlags, setSimFlags] = useState<Record<string, boolean>>({});
  const [simInventory, setSimInventory] = useState<string[]>([]);
  const [simHistory, setSimHistory] = useState<SimEntry[]>([]);

  const [aiWriteLoading, setAiWriteLoading] = useState(false);
  const [aiWriteNotice, setAiWriteNotice] = useState("");
  const [voiceSelection, setVoiceSelection] = useState("Wise Elder");
  const [customVoice, setCustomVoice] = useState("");
  const [aiRewriteLoading, setAiRewriteLoading] = useState(false);
  const [aiEmotionLoading, setAiEmotionLoading] = useState(false);
  const [aiBranchLoading, setAiBranchLoading] = useState(false);
  const [aiBranchSuggestions, setAiBranchSuggestions] = useState<string[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const interRef = useRef<Interaction>({ type: "idle" });
  const panRef = useRef(pan);
  const nodesRef = useRef(nodes);
  const connsRef = useRef(connections);
  const connectFromRef = useRef(connectFrom);
  const selectedIdRef = useRef(selectedId);
  const simHistRef = useRef<HTMLDivElement>(null);

  panRef.current = pan;
  nodesRef.current = nodes;
  connsRef.current = connections;
  connectFromRef.current = connectFrom;
  selectedIdRef.current = selectedId;

  const selectedNode = selectedId
    ? nodes.find((n) => n.id === selectedId) || null
    : null;

  const nodeCounts = (["npc", "choice", "condition", "action"] as NodeType[]).map((type) => ({
    type,
    count: nodes.filter((n) => n.type === type).length,
    color: TYPE_COLORS[type],
  }));

  // ── Load saved trees ────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedTrees(JSON.parse(raw));
    } catch {}
  }, []);

  // ── Auto-scroll sim history ─────────────────────────────

  useEffect(() => {
    simHistRef.current?.scrollTo({
      top: simHistRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [simHistory]);

  // ── Keyboard shortcuts ──────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      if (e.key === "Delete" || e.key === "Backspace") {
        const id = selectedIdRef.current;
        if (id) {
          setNodes((p) => p.filter((n) => n.id !== id));
          setConnections((p) =>
            p.filter((c) => c.fromNodeId !== id && c.toNodeId !== id),
          );
          setSelectedId(null);
        }
      }
      if (e.key === "Escape") {
        setConnectFrom(null);
        setTempEnd(null);
        setSelectedId(null);
        setSimOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Document mouse handlers ─────────────────────────────

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const i = interRef.current;
      if (i.type === "drag" && i.nodeId) {
        const dx = e.clientX - i.sx!;
        const dy = e.clientY - i.sy!;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === i.nodeId ? { ...n, x: i.nx! + dx, y: i.ny! + dy } : n,
          ),
        );
      } else if (i.type === "pan") {
        setPan({
          x: i.px! + e.clientX - i.sx!,
          y: i.py! + e.clientY - i.sy!,
        });
      }

      if (connectFromRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setTempEnd({
          x: e.clientX - rect.left - panRef.current.x,
          y: e.clientY - rect.top - panRef.current.y,
        });
      }
    };

    const handleUp = (e: MouseEvent) => {
      interRef.current = { type: "idle" };

      if (connectFromRef.current) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const inputEl = (el as HTMLElement)?.closest(
          '[data-port-type="input"]',
        ) as HTMLElement | null;
        if (inputEl) {
          const toId = inputEl.dataset.nodeId!;
          const from = connectFromRef.current;
          if (toId !== from.nodeId) {
            setConnections((prev) => {
              const filtered = prev.filter(
                (c) =>
                  !(
                    c.fromNodeId === from.nodeId &&
                    c.fromPortIndex === from.portIndex
                  ),
              );
              return [
                ...filtered,
                {
                  id: `c_${Date.now()}`,
                  fromNodeId: from.nodeId,
                  fromPortIndex: from.portIndex,
                  toNodeId: toId,
                },
              ];
            });
            setConnectFrom(null);
            setTempEnd(null);
          }
        }
      }
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, []);

  // ── Canvas mouse down ───────────────────────────────────

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const outputEl = target.closest(
        '[data-port-type="output"]',
      ) as HTMLElement | null;
      const inputEl = target.closest(
        '[data-port-type="input"]',
      ) as HTMLElement | null;
      const nodeEl = target.closest("[data-node-id]") as HTMLElement | null;

      if (connectFrom) {
        if (inputEl) {
          const toId = inputEl.dataset.nodeId!;
          if (toId !== connectFrom.nodeId) {
            setConnections((prev) => {
              const filtered = prev.filter(
                (c) =>
                  !(
                    c.fromNodeId === connectFrom.nodeId &&
                    c.fromPortIndex === connectFrom.portIndex
                  ),
              );
              return [
                ...filtered,
                {
                  id: `c_${Date.now()}`,
                  fromNodeId: connectFrom.nodeId,
                  fromPortIndex: connectFrom.portIndex,
                  toNodeId: toId,
                },
              ];
            });
          }
          setConnectFrom(null);
          setTempEnd(null);
          return;
        }
        if (outputEl) {
          setConnectFrom({
            nodeId: outputEl.dataset.nodeId!,
            portIndex: parseInt(outputEl.dataset.portIndex || "0"),
          });
          return;
        }
        setConnectFrom(null);
        setTempEnd(null);
      }

      if (outputEl) {
        e.preventDefault();
        setConnectFrom({
          nodeId: outputEl.dataset.nodeId!,
          portIndex: parseInt(outputEl.dataset.portIndex || "0"),
        });
        return;
      }

      if (nodeEl && !outputEl && !inputEl) {
        e.preventDefault();
        const nid = nodeEl.dataset.nodeId!;
        setSelectedId(nid);
        const nd = nodesRef.current.find((n) => n.id === nid)!;
        interRef.current = {
          type: "drag",
          nodeId: nid,
          sx: e.clientX,
          sy: e.clientY,
          nx: nd.x,
          ny: nd.y,
        };
        return;
      }

      setSelectedId(null);
      interRef.current = {
        type: "pan",
        sx: e.clientX,
        sy: e.clientY,
        px: panRef.current.x,
        py: panRef.current.y,
      };
    },
    [connectFrom],
  );

  // ── Node CRUD ───────────────────────────────────────────

  const addNode = useCallback(
    (type: NodeType) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const cx = rect ? rect.width / 2 - pan.x - NODE_WIDTH / 2 : 200;
      const cy = rect ? rect.height / 2 - pan.y - 50 : 200;
      const n = makeNode(
        type,
        cx + (Math.random() - 0.5) * 80,
        cy + (Math.random() - 0.5) * 60,
      );
      setNodes((p) => [...p, n]);
      setSelectedId(n.id);
    },
    [pan],
  );

  const updateNode = useCallback(
    (id: string, updates: Partial<DialogueNode>) => {
      setNodes((p) => p.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    },
    [],
  );

  const deleteNode = useCallback((id: string) => {
    setNodes((p) => p.filter((n) => n.id !== id));
    setConnections((p) =>
      p.filter((c) => c.fromNodeId !== id && c.toNodeId !== id),
    );
    setSelectedId(null);
  }, []);

  const removeChoice = useCallback((nodeId: string, idx: number) => {
    setNodes((p) =>
      p.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, choices: n.choices.filter((_, i) => i !== idx) };
      }),
    );
    setConnections((p) =>
      p
        .filter(
          (c) => !(c.fromNodeId === nodeId && c.fromPortIndex === idx),
        )
        .map((c) => {
          if (c.fromNodeId === nodeId && c.fromPortIndex > idx)
            return { ...c, fromPortIndex: c.fromPortIndex - 1 };
          return c;
        }),
    );
  }, []);

  const removeConnection = useCallback((connId: string) => {
    setConnections((p) => p.filter((c) => c.id !== connId));
  }, []);

  // ── Save / Load / Export ────────────────────────────────

  const saveTree = useCallback(() => {
    const tree: SavedTree = {
      id: `tree_${Date.now()}`,
      name: treeName,
      nodes,
      connections,
      createdAt: Date.now(),
    };
    setSavedTrees((prev) => {
      const updated = [...prev.filter((t) => t.name !== treeName), tree];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [treeName, nodes, connections]);

  const loadTree = useCallback((tree: SavedTree) => {
    setNodes(tree.nodes);
    setConnections(tree.connections);
    setTreeName(tree.name);
    setSelectedId(null);
    setConnectFrom(null);
    setTempEnd(null);
  }, []);

  const loadTemplate = useCallback((t: typeof TEMPLATES[number]) => {
    setNodes(t.nodes.map((n) => ({ ...n })));
    setConnections(t.connections.map((c) => ({ ...c })));
    setTreeName(t.name);
    setSelectedId(null);
    setConnectFrom(null);
    setTempEnd(null);
    setPan({ x: 0, y: 0 });
  }, []);

  const deleteSavedTree = useCallback((id: string) => {
    setSavedTrees((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const exportJSON = useCallback(() => {
    const withIncoming = new Set(connections.map((c) => c.toNodeId));
    const startNode =
      nodes.find((n) => !withIncoming.has(n.id) && n.type === "npc") || nodes[0];

    const exportNodes: Record<string, Record<string, unknown>> = {};
    for (const n of nodes) {
      const outConns = connections.filter((c) => c.fromNodeId === n.id);

      if (n.type === "npc") {
        exportNodes[n.id] = {
          type: "dialogue",
          speaker: n.character || "NPC",
          text: n.text,
          emotion: n.emotion || "Neutral",
          next: outConns[0]?.toNodeId || null,
        };
      } else if (n.type === "choice") {
        exportNodes[n.id] = {
          type: "choice",
          speaker: n.character || "Player",
          prompt: n.text,
          options: n.choices.map((text, i) => ({
            text,
            next:
              outConns.find((c) => c.fromPortIndex === i)?.toNodeId || null,
          })),
        };
      } else if (n.type === "condition") {
        exportNodes[n.id] = {
          type: "condition",
          check: n.condition,
          param: n.conditionParam,
          if_true:
            outConns.find((c) => c.fromPortIndex === 0)?.toNodeId || null,
          if_false:
            outConns.find((c) => c.fromPortIndex === 1)?.toNodeId || null,
        };
      } else if (n.type === "action") {
        exportNodes[n.id] = {
          type: "action",
          action: n.action,
          param: n.actionParam,
          next: outConns[0]?.toNodeId || null,
        };
      }
    }

    const data = {
      name: treeName,
      format: "gameforge_dialogue_v1",
      start_node: startNode?.id || null,
      node_count: nodes.length,
      nodes: exportNodes,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${treeName.replace(/\s+/g, "_")}_dialogue.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [treeName, nodes, connections]);

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setConnections([]);
    setSelectedId(null);
  }, []);

  const aiWriteDialogue = useCallback(async () => {
    setAiWriteLoading(true);
    setAiWriteNotice("");

    const npcNodes = nodes.filter((n) => n.type === "npc");
    const treeContext = npcNodes.map((n) => `${n.character}: "${n.text}"`).join("\n");
    const templateName = treeName || "general";

    const prompt = `Given this dialogue tree for a ${templateName} scenario:\n${treeContext}\n\nWrite 3 more NPC dialogue lines that would naturally continue the conversation. Format as JSON array of strings.`;

    let lines: string[] = [];
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
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        lines = JSON.parse(jsonMatch[0]);
      } else {
        lines = content.split("\n").map((l: string) => l.replace(/^\d+[\.\)\-]\s*/, "").replace(/^["']|["']$/g, "").trim()).filter((l: string) => l.length > 5);
      }
      if (lines.length === 0) throw new Error("No lines parsed");
    } catch {
      setAiWriteNotice("AI unavailable — added placeholder lines");
      lines = [
        "I've heard rumors about something strange in the forest...",
        "You should be careful out there, adventurer.",
        "Come back anytime if you need supplies.",
      ];
    }

    const lastNpc = [...nodes].reverse().find((n) => n.type === "npc");
    const baseX = lastNpc ? lastNpc.x : 340;
    const baseY = lastNpc ? lastNpc.y + 160 : 200;
    const speaker = lastNpc ? lastNpc.character : "NPC";

    const newNodes: DialogueNode[] = [];
    const newConns: Connection[] = [];

    lines.slice(0, 3).forEach((line, i) => {
      const n = makeNode("npc", baseX + (i - 1) * 280, baseY + 160 * (i + 1));
      n.text = line;
      n.character = speaker;
      newNodes.push(n);

      if (i === 0 && lastNpc) {
        newConns.push({ id: `aic_${Date.now()}_${i}`, fromNodeId: lastNpc.id, fromPortIndex: 0, toNodeId: n.id });
      } else if (i > 0) {
        newConns.push({ id: `aic_${Date.now()}_${i}`, fromNodeId: newNodes[i - 1].id, fromPortIndex: 0, toNodeId: n.id });
      }
    });

    setNodes((prev) => [...prev, ...newNodes]);
    setConnections((prev) => [...prev, ...newConns]);
    setAiWriteLoading(false);
  }, [nodes, treeName]);

  const aiRewriteVoice = useCallback(async () => {
    if (!selectedNode || selectedNode.type !== "npc" || !selectedNode.text.trim()) return;
    setAiRewriteLoading(true);
    const voice = voiceSelection === "Custom..." ? customVoice : voiceSelection;
    if (!voice.trim()) { setAiRewriteLoading(false); return; }
    const prompt = `Rewrite this game dialogue line in the voice of a ${voice}: '${selectedNode.text}'. Keep the same meaning but change the tone, vocabulary, and personality. Return only the rewritten line.`;
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
          max_tokens: 256,
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const cleaned = content.replace(/^["']|["']$/g, "").trim();
      if (cleaned) updateNode(selectedNode.id, { text: cleaned });
    } catch {
      setAiWriteNotice("AI rewrite failed -- try again");
    }
    setAiRewriteLoading(false);
  }, [selectedNode, voiceSelection, customVoice, updateNode]);

  const aiSuggestEmotions = useCallback(async () => {
    const npcNodes = nodes.filter((n) => n.type === "npc" && n.text.trim());
    if (npcNodes.length === 0) return;
    setAiEmotionLoading(true);

    const lines = npcNodes.map((n, i) => `${i + 1}. ${n.text}`).join("\n");
    const prompt = `For each of these dialogue lines, suggest the most fitting emotion (Neutral/Happy/Angry/Sad/Scared/Excited/Mysterious):\n${lines}\n\nReturn ONLY the number and emotion, one per line. Example:\n1. Happy\n2. Angry`;

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
          max_tokens: 256,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";

      const validEmotions: EmotionType[] = ["Neutral", "Happy", "Angry", "Sad", "Scared", "Excited", "Mysterious"];
      const updates: Record<string, EmotionType> = {};

      content.split("\n").forEach((line: string) => {
        const match = line.match(/(\d+)[\.\)\:\-\s]+(\w+)/);
        if (match) {
          const idx = parseInt(match[1]) - 1;
          const emotion = validEmotions.find((e) => e.toLowerCase() === match[2].toLowerCase());
          if (emotion && npcNodes[idx]) updates[npcNodes[idx].id] = emotion;
        }
      });

      const count = Object.keys(updates).length;
      if (count > 0) {
        setNodes((prev) => prev.map((n) => updates[n.id] ? { ...n, emotion: updates[n.id] } : n));
        setAiWriteNotice(`Applied emotions to ${count} node${count > 1 ? "s" : ""}`);
      } else {
        setAiWriteNotice("Could not parse emotion suggestions");
      }
    } catch {
      setAiWriteNotice("AI emotion suggestion failed");
    }
    setAiEmotionLoading(false);
  }, [nodes]);

  const aiBranchSuggest = useCallback(async () => {
    if (!selectedNode || selectedNode.type !== "choice") return;
    setAiBranchLoading(true);
    setAiBranchSuggestions([]);

    const parentConn = connections.find((c) => c.toNodeId === selectedNode.id);
    const parentNode = parentConn ? nodes.find((n) => n.id === parentConn.fromNodeId) : null;
    const context = parentNode?.text || selectedNode.text || "a conversation";

    const prompt = `For a game dialogue where the player is choosing between options after: '${context}'. Suggest 3 player choice options that lead to different outcomes. Just list them, one per line.`;

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
          max_tokens: 128,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const lines = content
        .split("\n")
        .map((l: string) => l.replace(/^\d+[\.\)\-]\s*/, "").replace(/^["'\-*]\s*|["']$/g, "").trim())
        .filter((l: string) => l.length > 3);
      setAiBranchSuggestions(lines.slice(0, 3));
    } catch {
      setAiWriteNotice("AI branch suggestion failed");
    }
    setAiBranchLoading(false);
  }, [selectedNode, connections, nodes]);

  // ── Simulator ───────────────────────────────────────────

  const findStartNode = useCallback((): DialogueNode | null => {
    const withIncoming = new Set(connections.map((c) => c.toNodeId));
    return (
      nodes.find((n) => !withIncoming.has(n.id) && n.type === "npc") ||
      nodes.find((n) => n.type === "npc") ||
      nodes[0] ||
      null
    );
  }, [nodes, connections]);

  const advanceSim = useCallback(
    (
      startId: string,
      flags: Record<string, boolean>,
      inv: string[],
      hist: SimEntry[],
    ) => {
      const localFlags = { ...flags };
      const localInv = [...inv];
      const localHist = [...hist];
      const visited = new Set<string>();

      function step(id: string): string | null {
        if (visited.has(id)) return null;
        visited.add(id);
        const nd = nodesRef.current.find((n) => n.id === id);
        if (!nd) return null;

        if (nd.type === "npc") {
          localHist.push({
            char: nd.character || "NPC",
            text: nd.text,
            isPlayer: false,
          });
          return id;
        }
        if (nd.type === "choice") return id;
        if (nd.type === "condition") {
          let result = false;
          if (nd.condition === "has_flag")
            result = !!localFlags[nd.conditionParam];
          else if (nd.condition === "no_flag")
            result = !localFlags[nd.conditionParam];
          else if (nd.condition === "has_item")
            result = localInv.includes(nd.conditionParam);
          const conn = connsRef.current.find(
            (c) =>
              c.fromNodeId === id && c.fromPortIndex === (result ? 0 : 1),
          );
          return conn ? step(conn.toNodeId) : null;
        }
        if (nd.type === "action") {
          if (nd.action === "set_flag")
            localFlags[nd.actionParam] = true;
          else if (nd.action === "remove_flag")
            delete localFlags[nd.actionParam];
          else if (nd.action === "give_item")
            localInv.push(nd.actionParam);
          else if (nd.action === "remove_item") {
            const idx = localInv.indexOf(nd.actionParam);
            if (idx >= 0) localInv.splice(idx, 1);
          }
          localHist.push({
            char: "System",
            text: `[${nd.action}: ${nd.actionParam}]`,
            isPlayer: false,
          });
          const conn = connsRef.current.find((c) => c.fromNodeId === id);
          return conn ? step(conn.toNodeId) : null;
        }
        return null;
      }

      const resultId = step(startId);
      setSimFlags(localFlags);
      setSimInventory(localInv);
      setSimHistory(localHist);
      setSimCurrentId(resultId);
    },
    [],
  );

  const startSim = useCallback(() => {
    const start = findStartNode();
    if (!start) return;
    setSimOpen(true);
    const initialFlags: Record<string, boolean> = {};
    const initialInv: string[] = [];
    const initialHist: SimEntry[] = [];
    setSimFlags(initialFlags);
    setSimInventory(initialInv);
    setSimHistory(initialHist);
    advanceSim(start.id, initialFlags, initialInv, initialHist);
  }, [findStartNode, advanceSim]);

  const simContinue = useCallback(() => {
    if (!simCurrentId) return;
    const conn = connsRef.current.find((c) => c.fromNodeId === simCurrentId);
    if (conn) advanceSim(conn.toNodeId, simFlags, simInventory, simHistory);
    else setSimCurrentId(null);
  }, [simCurrentId, simFlags, simInventory, simHistory, advanceSim]);

  const simChoose = useCallback(
    (idx: number) => {
      if (!simCurrentId) return;
      const nd = nodesRef.current.find((n) => n.id === simCurrentId);
      if (!nd) return;
      const newHist: SimEntry[] = [
        ...simHistory,
        {
          char: nd.character || "Player",
          text: nd.choices[idx] || "...",
          isPlayer: true,
        },
      ];
      const conn = connsRef.current.find(
        (c) => c.fromNodeId === simCurrentId && c.fromPortIndex === idx,
      );
      if (conn) advanceSim(conn.toNodeId, simFlags, simInventory, newHist);
      else {
        setSimHistory(newHist);
        setSimCurrentId(null);
      }
    },
    [simCurrentId, simFlags, simInventory, simHistory, advanceSim],
  );

  const simRestart = useCallback(() => {
    startSim();
  }, [startSim]);

  // ── Render helpers ──────────────────────────────────────

  const currentSimNode = simCurrentId
    ? nodes.find((n) => n.id === simCurrentId)
    : null;

  function renderNodeCard(n: DialogueNode) {
    const h = nodeHeight(n);
    const oc = outputCount(n);
    const meta = TYPE_META[n.type];
    const color = TYPE_COLORS[n.type];
    const isSelected = selectedId === n.id;

    return (
      <div
        key={n.id}
        data-node-id={n.id}
        className={`group absolute rounded-lg border overflow-visible select-none cursor-grab active:cursor-grabbing ${isSelected ? "ring-2 ring-amber-500/60 border-[#444]" : "border-[#2A2A2A]"}`}
        style={{
          left: n.x,
          top: n.y,
          width: NODE_WIDTH,
          height: h,
          background: "#1A1A1A",
          borderLeftWidth: 4,
          borderLeftColor: color,
        }}
      >
        {/* Delete button on hover */}
        <button
          className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-20 shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(n.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>

        {/* Input port */}
        <div
          className="absolute w-[14px] h-[14px] rounded-full border-2 border-[#555] hover:border-white hover:scale-[1.4] transition-all cursor-crosshair"
          style={{
            left: NODE_WIDTH / 2 - 7,
            top: -7,
            background: "#2A2A2A",
            zIndex: 10,
          }}
          data-port-type="input"
          data-node-id={n.id}
        />

        {/* Content */}
        <div className="p-3 h-full overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <meta.Icon
              className="w-3.5 h-3.5 shrink-0"
              style={{ color }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color }}
            >
              {meta.label}
            </span>
          </div>
          {n.character && (
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-white truncate">
                {n.character}
              </span>
              {n.type === "npc" && (
                <span
                  className="shrink-0 text-[10px] leading-none"
                  style={{ color: EMOTIONS[n.emotion || "Neutral"].color }}
                  title={n.emotion || "Neutral"}
                >
                  {EMOTIONS[n.emotion || "Neutral"].emoji}
                </span>
              )}
            </div>
          )}
          <div className="text-[11px] text-gray-400 line-clamp-2 leading-snug mt-0.5">
            {n.type === "condition"
              ? `IF ${n.condition}: ${n.conditionParam || "..."}`
              : n.type === "action"
                ? `${n.action}: ${n.actionParam || "..."}`
                : n.text
                  ? `\u201C${n.text}\u201D`
                  : "\u2014"}
          </div>
          {n.type === "choice" && n.choices.length > 0 && (
            <div className="mt-1 space-y-px">
              {n.choices.map((c, i) => (
                <div
                  key={i}
                  className="text-[10px] text-gray-500 truncate"
                >
                  {i + 1}. {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output ports */}
        {Array.from({ length: oc }).map((_, i) => {
          const [px] = outputPos(n, i);
          const relX = px - n.x;
          const portColor =
            n.type === "condition"
              ? i === 0
                ? "#22C55E"
                : "#EF4444"
              : "#555";
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: relX - 7, top: h - 7 }}
            >
              <div
                className="w-[14px] h-[14px] rounded-full border-2 hover:scale-[1.4] transition-all cursor-crosshair"
                style={{
                  background: "#2A2A2A",
                  borderColor: portColor,
                  zIndex: 10,
                }}
                data-port-type="output"
                data-node-id={n.id}
                data-port-index={i}
              />
              {n.type === "condition" && (
                <span
                  className="text-[8px] font-bold mt-0.5 pointer-events-none"
                  style={{ color: portColor }}
                >
                  {i === 0 ? "T" : "F"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0F0F0F] text-white overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#2A2A2A] shrink-0 bg-[#0F0F0F]">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tools"
            className="p-1.5 rounded-lg hover:bg-[#1A1A1A] text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-white">
            Dialogue Tree Builder
          </h1>
          {/* Node count stats */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            {nodeCounts.map(({ type, count, color }) =>
              count > 0 ? (
                <span
                  key={type}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: color + "18",
                    color: color,
                  }}
                >
                  {count}{" "}
                  {type === "npc"
                    ? "NPC"
                    : type === "choice"
                      ? "Choice"
                      : type === "condition"
                        ? "Cond"
                        : "Action"}
                </span>
              ) : null,
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-amber-500/50"
            value={treeName}
            onChange={(e) => setTreeName(e.target.value)}
            placeholder="Tree name..."
          />
          <button
            onClick={saveTree}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm hover:border-amber-500/50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm hover:border-amber-500/50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={aiWriteDialogue}
            disabled={aiWriteLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50"
          >
            {aiWriteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiWriteLoading ? "Writing..." : "AI Write"}
          </button>
          <button
            onClick={aiSuggestEmotions}
            disabled={aiEmotionLoading || nodes.filter((n) => n.type === "npc").length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
          >
            {aiEmotionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiEmotionLoading ? "Analyzing..." : "Emotions"}
          </button>
          <button
            onClick={startSim}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Play
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-52 border-r border-[#2A2A2A] flex flex-col shrink-0 bg-[#0F0F0F]">
          <div className="p-3 border-b border-[#2A2A2A]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Add Nodes
            </h3>
            <div className="space-y-1.5">
              {(
                ["npc", "choice", "condition", "action"] as NodeType[]
              ).map((type) => {
                const meta = TYPE_META[type];
                const color = TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[#1A1A1A] transition-colors text-left"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <meta.Icon
                      className="w-4 h-4 shrink-0"
                      style={{ color }}
                    />
                    <span className="text-gray-300">{meta.label}</span>
                    <Plus className="w-3 h-3 ml-auto text-gray-600" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates */}
          <div className="p-3 border-b border-[#2A2A2A]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Templates
            </h3>
            <div className="space-y-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => loadTemplate(t)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1A1A1A] transition-colors group/tpl"
                >
                  <div className="text-xs text-gray-300 font-medium group-hover/tpl:text-white transition-colors">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Saved Trees
            </h3>
            {savedTrees.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <FolderOpen className="h-8 w-8 text-[#2A2A2A]" />
                <p className="text-[11px] text-gray-600">
                  No saved trees yet
                </p>
                <p className="text-[10px] text-gray-700">
                  Name your tree and hit Save to keep it
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {savedTrees.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1 p-2 rounded-lg hover:bg-[#1A1A1A] group/saved"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <button
                      onClick={() => loadTree(t)}
                      className="flex-1 text-left text-xs text-gray-300 truncate hover:text-white"
                    >
                      {t.name}
                    </button>
                    <button
                      onClick={() => deleteSavedTree(t.id)}
                      className="opacity-0 group-hover/saved:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#2A2A2A]">
            <button
              onClick={clearCanvas}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear Canvas
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`flex-1 relative overflow-hidden ${connectFrom ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
          style={{
            backgroundImage:
              "radial-gradient(circle, #1A1A1A 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          onMouseDown={handleCanvasMouseDown}
        >
          {connectFrom && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs text-amber-400 z-50 pointer-events-none">
              Click an input port to connect — Esc to cancel
            </div>
          )}

          <div
            className="absolute"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
            {/* Nodes */}
            {nodes.map((n) => renderNodeCard(n))}

            {/* SVG connections */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ overflow: "visible", width: 1, height: 1 }}
            >
              <defs>
                <marker
                  id="arrow"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 8 3, 0 6"
                    fill="#555"
                  />
                </marker>
              </defs>

              {connections.map((conn) => {
                const fromNode = nodes.find(
                  (n) => n.id === conn.fromNodeId,
                );
                const toNode = nodes.find(
                  (n) => n.id === conn.toNodeId,
                );
                if (!fromNode || !toNode) return null;
                const [x1, y1] = outputPos(
                  fromNode,
                  conn.fromPortIndex,
                );
                const [x2, y2] = inputPos(toNode);
                const d = bezier(x1, y1, x2, y2);
                return (
                  <path
                    key={conn.id}
                    d={d}
                    stroke={TYPE_COLORS[fromNode.type]}
                    strokeWidth={2}
                    fill="none"
                    opacity={0.6}
                    markerEnd="url(#arrow)"
                  />
                );
              })}

              {/* Temp connecting line */}
              {connectFrom && tempEnd && (() => {
                const fromNode = nodes.find(
                  (n) => n.id === connectFrom.nodeId,
                );
                if (!fromNode) return null;
                const [x1, y1] = outputPos(
                  fromNode,
                  connectFrom.portIndex,
                );
                const d = bezier(x1, y1, tempEnd.x, tempEnd.y);
                return (
                  <path
                    d={d}
                    stroke="white"
                    strokeWidth={2}
                    strokeDasharray="6,4"
                    fill="none"
                    opacity={0.5}
                  />
                );
              })()}
            </svg>
          </div>

          {aiWriteNotice && (
            <div className="absolute top-3 right-3 z-50 flex items-center gap-2 rounded-lg border border-[#F59E0B]/20 bg-[#1A1A1A]/95 px-3 py-2 text-xs text-[#F59E0B] shadow-lg backdrop-blur-sm">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {aiWriteNotice}
              <button onClick={() => setAiWriteNotice("")} className="ml-1 text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
          )}

          {aiWriteLoading && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border border-purple-500/30 bg-[#1A1A1A]/95 px-4 py-2 text-xs text-purple-400 shadow-lg backdrop-blur-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI is writing dialogue...
            </div>
          )}

          {aiEmotionLoading && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-[#1A1A1A]/95 px-4 py-2 text-xs text-indigo-400 shadow-lg backdrop-blur-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI is analyzing emotions...
            </div>
          )}

          {/* Node count badge */}
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-[#1A1A1A]/80 rounded text-[10px] text-gray-500">
            {nodes.length} nodes &middot; {connections.length} connections
          </div>
        </div>

        {/* Right panel — node editor */}
        {selectedNode && (
          <div className="w-72 border-l border-[#2A2A2A] flex flex-col shrink-0 bg-[#0F0F0F]">
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const meta = TYPE_META[selectedNode.type];
                  const color = TYPE_COLORS[selectedNode.type];
                  return (
                    <>
                      <meta.Icon
                        className="w-4 h-4"
                        style={{ color }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color }}
                      >
                        {meta.label}
                      </span>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1 hover:bg-[#1A1A1A] rounded text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Character name */}
              {(selectedNode.type === "npc" ||
                selectedNode.type === "choice") && (
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                    Character
                  </label>
                  <input
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                    value={selectedNode.character}
                    onChange={(e) =>
                      updateNode(selectedNode.id, {
                        character: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              {/* Emotion */}
              {selectedNode.type === "npc" && (
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                    Emotion
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedNode.emotion || "Neutral"}
                      onChange={(e) => updateNode(selectedNode.id, { emotion: e.target.value as EmotionType })}
                    >
                      {(Object.keys(EMOTIONS) as EmotionType[]).map((emo) => (
                        <option key={emo} value={emo}>{EMOTIONS[emo].emoji} {emo}</option>
                      ))}
                    </select>
                    <span className="text-lg" title={selectedNode.emotion || "Neutral"}>
                      {EMOTIONS[selectedNode.emotion || "Neutral"].emoji}
                    </span>
                  </div>
                </div>
              )}

              {/* Dialogue text */}
              {(selectedNode.type === "npc" ||
                selectedNode.type === "choice") && (
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                    Dialogue Text
                  </label>
                  <textarea
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                    rows={3}
                    value={selectedNode.text}
                    onChange={(e) =>
                      updateNode(selectedNode.id, {
                        text: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              {/* Character Voice */}
              {selectedNode.type === "npc" && (
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                    Character Voice
                  </label>
                  <div className="space-y-2">
                    <select
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={voiceSelection}
                      onChange={(e) => setVoiceSelection(e.target.value)}
                    >
                      {VOICE_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    {voiceSelection === "Custom..." && (
                      <input
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                        value={customVoice}
                        onChange={(e) => setCustomVoice(e.target.value)}
                        placeholder="e.g. Sarcastic Pirate"
                      />
                    )}
                    <button
                      onClick={aiRewriteVoice}
                      disabled={aiRewriteLoading || !selectedNode.text.trim()}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-lg text-sm hover:bg-amber-500/25 transition-colors disabled:opacity-40"
                    >
                      {aiRewriteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {aiRewriteLoading ? "Rewriting..." : "AI Rewrite"}
                    </button>
                  </div>
                </div>
              )}

              {/* Choices */}
              {selectedNode.type === "choice" && (
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                    Response Options
                  </label>
                  <div className="space-y-1.5">
                    {selectedNode.choices.map((c, i) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="text-xs text-gray-600 mt-2 w-4 text-right shrink-0">
                          {i + 1}.
                        </span>
                        <input
                          className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500/50"
                          value={c}
                          onChange={(e) => {
                            const nc = [...selectedNode.choices];
                            nc[i] = e.target.value;
                            updateNode(selectedNode.id, {
                              choices: nc,
                            });
                          }}
                        />
                        <button
                          onClick={() =>
                            removeChoice(selectedNode.id, i)
                          }
                          className="p-1 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        updateNode(selectedNode.id, {
                          choices: [
                            ...selectedNode.choices,
                            `Option ${selectedNode.choices.length + 1}`,
                          ],
                        })
                      }
                      className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-[#2A2A2A] rounded text-xs text-gray-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Choice
                    </button>
                    <button
                      onClick={aiBranchSuggest}
                      disabled={aiBranchLoading}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded text-xs hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                    >
                      {aiBranchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {aiBranchLoading ? "Thinking..." : "AI Branch"}
                    </button>
                    {aiBranchSuggestions.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-[#2A2A2A]">
                        <span className="text-[10px] text-gray-500">Click to add:</span>
                        {aiBranchSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              updateNode(selectedNode.id, {
                                choices: [...selectedNode.choices, s],
                              });
                              setAiBranchSuggestions((prev) => prev.filter((_, j) => j !== i));
                            }}
                            className="w-full text-left px-2.5 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded text-[11px] text-amber-300/80 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                          >
                            + {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Condition */}
              {selectedNode.type === "condition" && (
                <>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                      Condition Type
                    </label>
                    <select
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedNode.condition}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          condition: e.target.value,
                        })
                      }
                    >
                      <option value="has_flag">Has Flag</option>
                      <option value="no_flag">
                        Does Not Have Flag
                      </option>
                      <option value="has_item">Has Item</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                      Parameter
                    </label>
                    <input
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedNode.conditionParam}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          conditionParam: e.target.value,
                        })
                      }
                      placeholder="flag_name or item_name"
                    />
                  </div>
                </>
              )}

              {/* Action */}
              {selectedNode.type === "action" && (
                <>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                      Action Type
                    </label>
                    <select
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedNode.action}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          action: e.target.value,
                        })
                      }
                    >
                      <option value="set_flag">Set Flag</option>
                      <option value="remove_flag">
                        Remove Flag
                      </option>
                      <option value="give_item">Give Item</option>
                      <option value="remove_item">
                        Remove Item
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                      Parameter
                    </label>
                    <input
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                      value={selectedNode.actionParam}
                      onChange={(e) =>
                        updateNode(selectedNode.id, {
                          actionParam: e.target.value,
                        })
                      }
                      placeholder="flag_name or item_name"
                    />
                  </div>
                </>
              )}

              {/* Connections from this node */}
              <div>
                <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                  Connections Out
                </label>
                {(() => {
                  const outConns = connections.filter(
                    (c) => c.fromNodeId === selectedNode.id,
                  );
                  if (outConns.length === 0)
                    return (
                      <p className="text-xs text-gray-600 italic">
                        No outgoing connections
                      </p>
                    );
                  return (
                    <div className="space-y-1">
                      {outConns.map((c) => {
                        const target = nodes.find(
                          (n) => n.id === c.toNodeId,
                        );
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-1.5 p-1.5 bg-[#1A1A1A] rounded text-xs"
                          >
                            <span className="text-gray-600">
                              [{c.fromPortIndex}]
                            </span>
                            <span className="text-gray-400 flex-1 truncate">
                              {target
                                ? target.character ||
                                  TYPE_META[target.type].label
                                : "?"}
                            </span>
                            <button
                              onClick={() =>
                                removeConnection(c.id)
                              }
                              className="p-0.5 text-gray-600 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Delete node */}
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Node
              </button>

              <p className="text-[10px] text-gray-600 text-center">
                Press Delete key to remove
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Simulator modal overlay */}
      {simOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-lg mx-4 rounded-2xl border border-[#2A2A2A] bg-[#111] shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "75vh" }}
          >
            {/* Sim header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A2A] bg-[#0F0F0F] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Play className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">
                    Dialogue Preview
                  </span>
                  <div className="text-[10px] text-gray-500">
                    {treeName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={simRestart}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1A1A1A] transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSimOpen(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1A1A1A] transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* State badges */}
            {(Object.keys(simFlags).length > 0 ||
              simInventory.length > 0) && (
              <div className="px-5 py-2 border-b border-[#2A2A2A] flex flex-wrap gap-1.5 shrink-0">
                {Object.keys(simFlags).map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 bg-green-500/15 border border-green-500/25 rounded-full text-[10px] text-green-400"
                  >
                    {f}
                  </span>
                ))}
                {simInventory.map((item, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/25 rounded-full text-[10px] text-blue-400"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            {/* Chat history */}
            <div
              ref={simHistRef}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
            >
              {simHistory.map((entry, i) => (
                <div
                  key={i}
                  className={`flex ${entry.isPlayer ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] ${entry.isPlayer ? "text-right" : ""}`}
                  >
                    {!entry.isPlayer && entry.char !== "System" && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                          {entry.char[0]}
                        </div>
                        <span className="text-xs font-semibold text-blue-400">
                          {entry.char}
                        </span>
                      </div>
                    )}
                    {entry.isPlayer && (
                      <div className="text-[10px] font-semibold mb-0.5 text-amber-400">
                        You
                      </div>
                    )}
                    {entry.char === "System" && (
                      <div className="text-[10px] font-semibold mb-0.5 text-gray-600">
                        System
                      </div>
                    )}
                    <div
                      className={`inline-block px-4 py-2.5 text-sm leading-relaxed ${
                        entry.isPlayer
                          ? "bg-amber-500/20 text-amber-200 rounded-2xl rounded-tr-md"
                          : entry.char === "System"
                            ? "bg-[#1A1A1A] text-gray-500 italic text-xs rounded-2xl rounded-tl-md"
                            : "bg-[#1A1A1A] text-gray-300 rounded-2xl rounded-tl-md"
                      }`}
                    >
                      {entry.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action area */}
            <div className="border-t border-[#2A2A2A] p-4 shrink-0 bg-[#0D0D0D]">
              {currentSimNode && currentSimNode.type === "npc" && (
                <button
                  onClick={simContinue}
                  className="w-full py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-gray-300 hover:text-white hover:border-amber-500/40 transition-colors"
                >
                  Continue...
                </button>
              )}
              {currentSimNode && currentSimNode.type === "choice" && (
                <div className="space-y-2">
                  {currentSimNode.choices.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => simChoose(i)}
                      className="w-full text-left px-4 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-sm text-amber-300 hover:bg-amber-500/20 transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {!simCurrentId && simHistory.length > 0 && (
                <div className="text-center py-1">
                  <p className="text-sm text-gray-500 italic mb-2">
                    End of dialogue
                  </p>
                  <button
                    onClick={simRestart}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Restart conversation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
