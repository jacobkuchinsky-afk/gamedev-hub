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
} from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────

type NodeType = "npc" | "choice" | "condition" | "action";

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
  };
}

// ── Sample Data ──────────────────────────────────────────────

const SAMPLE_NODES: DialogueNode[] = [
  {
    id: "s1",
    type: "npc",
    x: 340,
    y: 40,
    character: "Tavern Keeper",
    text: "Welcome to the Golden Tankard! What brings you here?",
    choices: [],
    condition: "",
    conditionParam: "",
    action: "",
    actionParam: "",
  },
  {
    id: "s2",
    type: "choice",
    x: 300,
    y: 200,
    character: "Player",
    text: "Choose your response:",
    choices: [
      "I'll have an ale.",
      "Tell me about the ruins.",
      "Any work available?",
    ],
    condition: "",
    conditionParam: "",
    action: "",
    actionParam: "",
  },
  {
    id: "s3",
    type: "npc",
    x: 40,
    y: 430,
    character: "Tavern Keeper",
    text: "Coming right up! That'll be 5 gold.",
    choices: [],
    condition: "",
    conditionParam: "",
    action: "",
    actionParam: "",
  },
  {
    id: "s4",
    type: "condition",
    x: 320,
    y: 430,
    character: "",
    text: "",
    choices: [],
    condition: "has_flag",
    conditionParam: "talked_to_elder",
    action: "",
    actionParam: "",
  },
  {
    id: "s5",
    type: "npc",
    x: 610,
    y: 430,
    character: "Tavern Keeper",
    text: "Rats in my cellar! Clear them out for 20 gold.",
    choices: [],
    condition: "",
    conditionParam: "",
    action: "",
    actionParam: "",
  },
  {
    id: "s6",
    type: "action",
    x: 40,
    y: 590,
    character: "",
    text: "",
    choices: [],
    condition: "",
    conditionParam: "",
    action: "give_item",
    actionParam: "Ale",
  },
  {
    id: "s7",
    type: "npc",
    x: 220,
    y: 590,
    character: "Tavern Keeper",
    text: "The elder sent you? Take the north road past the bridge.",
    choices: [],
    condition: "",
    conditionParam: "",
    action: "",
    actionParam: "",
  },
  {
    id: "s8",
    type: "npc",
    x: 450,
    y: 590,
    character: "Tavern Keeper",
    text: "The ruins? Talk to the village elder first.",
    choices: [],
    condition: "",
    conditionParam: "",
    action: "",
    actionParam: "",
  },
  {
    id: "s9",
    type: "action",
    x: 630,
    y: 590,
    character: "",
    text: "",
    choices: [],
    condition: "",
    conditionParam: "",
    action: "set_flag",
    actionParam: "cellar_quest",
  },
];

const SAMPLE_CONNS: Connection[] = [
  { id: "c1", fromNodeId: "s1", fromPortIndex: 0, toNodeId: "s2" },
  { id: "c2", fromNodeId: "s2", fromPortIndex: 0, toNodeId: "s3" },
  { id: "c3", fromNodeId: "s2", fromPortIndex: 1, toNodeId: "s4" },
  { id: "c4", fromNodeId: "s2", fromPortIndex: 2, toNodeId: "s5" },
  { id: "c5", fromNodeId: "s3", fromPortIndex: 0, toNodeId: "s6" },
  { id: "c6", fromNodeId: "s4", fromPortIndex: 0, toNodeId: "s7" },
  { id: "c7", fromNodeId: "s4", fromPortIndex: 1, toNodeId: "s8" },
  { id: "c8", fromNodeId: "s5", fromPortIndex: 0, toNodeId: "s9" },
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
  const [nodes, setNodes] = useState<DialogueNode[]>(SAMPLE_NODES);
  const [connections, setConnections] = useState<Connection[]>(SAMPLE_CONNS);
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

  const deleteSavedTree = useCallback((id: string) => {
    setSavedTrees((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const exportJSON = useCallback(() => {
    const data = { name: treeName, nodes, connections };
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
        className={`absolute rounded-lg border overflow-visible select-none cursor-grab active:cursor-grabbing ${isSelected ? "ring-2 ring-amber-500/60 border-[#444]" : "border-[#2A2A2A]"}`}
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
            <div className="text-[13px] font-bold text-white truncate">
              {n.character}
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
    <div className="flex flex-col h-screen bg-[#0F0F0F] text-white overflow-hidden">
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

          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Saved Trees
            </h3>
            {savedTrees.length === 0 ? (
              <p className="text-xs text-gray-600 italic">
                No saved trees yet
              </p>
            ) : (
              <div className="space-y-1">
                {savedTrees.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1 p-2 rounded-lg hover:bg-[#1A1A1A] group"
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
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all"
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

      {/* Simulator panel */}
      {simOpen && (
        <div className="h-80 border-t border-[#2A2A2A] shrink-0 bg-[#111] flex flex-col">
          {/* Sim header */}
          <div className="h-10 flex items-center justify-between px-4 border-b border-[#2A2A2A] shrink-0">
            <div className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400">
                Dialogue Preview
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(Object.keys(simFlags).length > 0 ||
                simInventory.length > 0) && (
                <div className="flex items-center gap-2 mr-4">
                  {Object.keys(simFlags).map((f) => (
                    <span
                      key={f}
                      className="px-1.5 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-[10px] text-green-400"
                    >
                      {f}
                    </span>
                  ))}
                  {simInventory.map((item, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-[10px] text-blue-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={simRestart}
                className="p-1 text-gray-500 hover:text-white transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSimOpen(false)}
                className="p-1 text-gray-500 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sim content */}
          <div className="flex-1 flex overflow-hidden">
            {/* History */}
            <div
              ref={simHistRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {simHistory.map((entry, i) => (
                <div
                  key={i}
                  className={`flex ${entry.isPlayer ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] ${entry.isPlayer ? "text-right" : ""}`}
                  >
                    <div
                      className={`text-[10px] font-semibold mb-0.5 ${entry.isPlayer ? "text-amber-400" : entry.char === "System" ? "text-gray-600" : "text-blue-400"}`}
                    >
                      {entry.char}
                    </div>
                    <div
                      className={`inline-block px-3 py-1.5 rounded-lg text-sm ${
                        entry.isPlayer
                          ? "bg-amber-500/20 text-amber-200"
                          : entry.char === "System"
                            ? "bg-[#1A1A1A] text-gray-500 italic text-xs"
                            : "bg-[#1A1A1A] text-gray-300"
                      }`}
                    >
                      {entry.text}
                    </div>
                  </div>
                </div>
              ))}

              {/* Current interaction */}
              {currentSimNode && currentSimNode.type === "npc" && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={simContinue}
                    className="px-4 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-gray-400 hover:text-white hover:border-amber-500/40 transition-colors"
                  >
                    Continue &rarr;
                  </button>
                </div>
              )}
              {currentSimNode &&
                currentSimNode.type === "choice" && (
                  <div className="pt-2 space-y-1.5 max-w-[80%] ml-auto">
                    {currentSimNode.choices.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => simChoose(i)}
                        className="w-full text-left px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-300 hover:bg-amber-500/20 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              {!simCurrentId && simHistory.length > 0 && (
                <div className="flex justify-center pt-2">
                  <div className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-gray-500 italic">
                    End of dialogue
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
