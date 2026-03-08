"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Type,
  Square,
  Map,
  Grid3X3,
  Trophy,
  Clock,
  Crosshair,
  Download,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Layers,
  Plus,
  RotateCcw,
} from "lucide-react";

type ElementType =
  | "health-bar"
  | "text-label"
  | "button"
  | "minimap"
  | "inventory"
  | "score"
  | "timer"
  | "ammo";

interface MockupElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  props: Record<string, unknown>;
}

interface PropDef {
  key: string;
  label: string;
  type: "range" | "number" | "text" | "color" | "toggle" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

const ELEMENT_DEFS: {
  type: ElementType;
  icon: typeof Heart;
  label: string;
  w: number;
  h: number;
  defaults: Record<string, unknown>;
}[] = [
  {
    type: "health-bar",
    icon: Heart,
    label: "Health Bar",
    w: 20,
    h: 4,
    defaults: {
      color: "#EF4444",
      bgColor: "#3A3A3A",
      value: 75,
      label: "HP",
      showLabel: true,
    },
  },
  {
    type: "text-label",
    icon: Type,
    label: "Text Label",
    w: 15,
    h: 4,
    defaults: {
      text: "Label",
      fontSize: 16,
      color: "#FFFFFF",
      fontWeight: "bold",
    },
  },
  {
    type: "button",
    icon: Square,
    label: "Button",
    w: 12,
    h: 5,
    defaults: {
      text: "PLAY",
      bgColor: "#F59E0B",
      textColor: "#000000",
      fontSize: 14,
      borderRadius: 6,
    },
  },
  {
    type: "minimap",
    icon: Map,
    label: "Minimap",
    w: 15,
    h: 24,
    defaults: {
      borderColor: "#F59E0B",
      bgColor: "#1A1A1A",
      dotColor: "#22C55E",
    },
  },
  {
    type: "inventory",
    icon: Grid3X3,
    label: "Inventory",
    w: 30,
    h: 14,
    defaults: {
      rows: 2,
      cols: 5,
      cellColor: "#2A2A2A",
      borderColor: "#4A4A4A",
      gap: 2,
    },
  },
  {
    type: "score",
    icon: Trophy,
    label: "Score",
    w: 12,
    h: 5,
    defaults: {
      value: 12500,
      label: "SCORE",
      color: "#F59E0B",
      fontSize: 18,
    },
  },
  {
    type: "timer",
    icon: Clock,
    label: "Timer",
    w: 10,
    h: 5,
    defaults: {
      minutes: 4,
      seconds: 32,
      color: "#FFFFFF",
      fontSize: 20,
      showLabel: true,
    },
  },
  {
    type: "ammo",
    icon: Crosshair,
    label: "Ammo",
    w: 10,
    h: 6,
    defaults: {
      current: 24,
      max: 30,
      color: "#FFFFFF",
      fontSize: 16,
      showIcon: true,
    },
  },
];

const PROP_SCHEMA: Record<ElementType, PropDef[]> = {
  "health-bar": [
    { key: "value", label: "Fill %", type: "range", min: 0, max: 100 },
    { key: "color", label: "Bar Color", type: "color" },
    { key: "bgColor", label: "Track Color", type: "color" },
    { key: "label", label: "Label", type: "text" },
    { key: "showLabel", label: "Show Label", type: "toggle" },
  ],
  "text-label": [
    { key: "text", label: "Text", type: "text" },
    {
      key: "fontSize",
      label: "Font Size",
      type: "number",
      min: 8,
      max: 72,
    },
    { key: "color", label: "Color", type: "color" },
    {
      key: "fontWeight",
      label: "Weight",
      type: "select",
      options: [
        { value: "normal", label: "Normal" },
        { value: "bold", label: "Bold" },
      ],
    },
  ],
  button: [
    { key: "text", label: "Text", type: "text" },
    { key: "bgColor", label: "Background", type: "color" },
    { key: "textColor", label: "Text Color", type: "color" },
    {
      key: "fontSize",
      label: "Font Size",
      type: "number",
      min: 8,
      max: 48,
    },
    {
      key: "borderRadius",
      label: "Radius",
      type: "number",
      min: 0,
      max: 24,
    },
  ],
  minimap: [
    { key: "borderColor", label: "Border", type: "color" },
    { key: "bgColor", label: "Background", type: "color" },
    { key: "dotColor", label: "Player Dot", type: "color" },
  ],
  inventory: [
    { key: "rows", label: "Rows", type: "number", min: 1, max: 10 },
    { key: "cols", label: "Columns", type: "number", min: 1, max: 12 },
    { key: "cellColor", label: "Cell Color", type: "color" },
    { key: "borderColor", label: "Border", type: "color" },
    { key: "gap", label: "Gap", type: "number", min: 0, max: 8 },
  ],
  score: [
    {
      key: "value",
      label: "Score",
      type: "number",
      min: 0,
      max: 999999,
    },
    { key: "label", label: "Label", type: "text" },
    { key: "color", label: "Color", type: "color" },
    {
      key: "fontSize",
      label: "Font Size",
      type: "number",
      min: 8,
      max: 48,
    },
  ],
  timer: [
    { key: "minutes", label: "Minutes", type: "number", min: 0, max: 99 },
    { key: "seconds", label: "Seconds", type: "number", min: 0, max: 59 },
    { key: "color", label: "Color", type: "color" },
    {
      key: "fontSize",
      label: "Font Size",
      type: "number",
      min: 8,
      max: 48,
    },
    { key: "showLabel", label: "Show Label", type: "toggle" },
  ],
  ammo: [
    { key: "current", label: "Current", type: "number", min: 0, max: 999 },
    { key: "max", label: "Max", type: "number", min: 1, max: 999 },
    { key: "color", label: "Color", type: "color" },
    {
      key: "fontSize",
      label: "Font Size",
      type: "number",
      min: 8,
      max: 48,
    },
    { key: "showIcon", label: "Show Icon", type: "toggle" },
  ],
};

const BG_PRESETS = [
  { name: "Void", bg: "#0A0A0A" },
  { name: "Space", bg: "#0C1222" },
  { name: "Forest", bg: "#0A1A0A" },
  { name: "Stone", bg: "#1E1E22" },
  { name: "Ember", bg: "#1A0A08" },
  { name: "Ocean", bg: "#081820" },
];

const PRESETS = [
  {
    name: "Platformer HUD",
    els: [
      {
        type: "health-bar" as ElementType,
        x: 2,
        y: 3,
        w: 22,
        h: 4,
        props: {
          color: "#EF4444",
          bgColor: "#3A3A3A",
          value: 80,
          label: "HP",
          showLabel: true,
        },
      },
      {
        type: "score" as ElementType,
        x: 78,
        y: 2,
        w: 18,
        h: 5,
        props: {
          value: 0,
          label: "SCORE",
          color: "#F59E0B",
          fontSize: 18,
        },
      },
      {
        type: "timer" as ElementType,
        x: 42,
        y: 2,
        w: 16,
        h: 5,
        props: {
          minutes: 5,
          seconds: 0,
          color: "#FFFFFF",
          fontSize: 20,
          showLabel: true,
        },
      },
      {
        type: "ammo" as ElementType,
        x: 84,
        y: 88,
        w: 12,
        h: 8,
        props: {
          current: 6,
          max: 6,
          color: "#FFFFFF",
          fontSize: 18,
          showIcon: true,
        },
      },
    ],
  },
  {
    name: "RPG UI",
    els: [
      {
        type: "health-bar" as ElementType,
        x: 2,
        y: 3,
        w: 25,
        h: 4,
        props: {
          color: "#EF4444",
          bgColor: "#3A3A3A",
          value: 65,
          label: "HP",
          showLabel: true,
        },
      },
      {
        type: "health-bar" as ElementType,
        x: 2,
        y: 9,
        w: 20,
        h: 3,
        props: {
          color: "#3B82F6",
          bgColor: "#3A3A3A",
          value: 40,
          label: "MP",
          showLabel: true,
        },
      },
      {
        type: "minimap" as ElementType,
        x: 80,
        y: 66,
        w: 18,
        h: 30,
        props: {
          borderColor: "#F59E0B",
          bgColor: "#1A1A1A",
          dotColor: "#22C55E",
        },
      },
      {
        type: "inventory" as ElementType,
        x: 15,
        y: 82,
        w: 60,
        h: 14,
        props: {
          rows: 1,
          cols: 8,
          cellColor: "#2A2A2A",
          borderColor: "#4A4A4A",
          gap: 2,
        },
      },
      {
        type: "text-label" as ElementType,
        x: 68,
        y: 3,
        w: 28,
        h: 4,
        props: {
          text: "Quest: Find the Crystal",
          fontSize: 12,
          color: "#F59E0B",
          fontWeight: "normal",
        },
      },
    ],
  },
  {
    name: "FPS HUD",
    els: [
      {
        type: "health-bar" as ElementType,
        x: 3,
        y: 88,
        w: 22,
        h: 4,
        props: {
          color: "#22C55E",
          bgColor: "#3A3A3A",
          value: 100,
          label: "+",
          showLabel: true,
        },
      },
      {
        type: "ammo" as ElementType,
        x: 78,
        y: 84,
        w: 16,
        h: 10,
        props: {
          current: 24,
          max: 30,
          color: "#FFFFFF",
          fontSize: 22,
          showIcon: true,
        },
      },
      {
        type: "minimap" as ElementType,
        x: 80,
        y: 3,
        w: 17,
        h: 28,
        props: {
          borderColor: "#6B7280",
          bgColor: "#1A1A1A",
          dotColor: "#22C55E",
        },
      },
      {
        type: "text-label" as ElementType,
        x: 46,
        y: 46,
        w: 8,
        h: 8,
        props: {
          text: "+",
          fontSize: 24,
          color: "#666666",
          fontWeight: "normal",
        },
      },
      {
        type: "score" as ElementType,
        x: 3,
        y: 3,
        w: 14,
        h: 5,
        props: {
          value: 15,
          label: "KILLS",
          color: "#FFFFFF",
          fontSize: 16,
        },
      },
    ],
  },
];

let _nid = 1;

function makeEl(
  type: ElementType,
  x: number,
  y: number,
  ww?: number,
  hh?: number,
  pp?: Record<string, unknown>
): MockupElement {
  const def = ELEMENT_DEFS.find((d) => d.type === type)!;
  return {
    id: `el_${_nid++}`,
    type,
    name: def.label,
    x,
    y,
    width: ww ?? def.w,
    height: hh ?? def.h,
    visible: true,
    props: { ...def.defaults, ...pp },
  };
}

function safeHex(c: unknown): string {
  if (typeof c === "string" && /^#[0-9a-fA-F]{6}$/i.test(c)) return c;
  if (typeof c === "string" && /^#[0-9a-fA-F]{3}$/i.test(c)) return c;
  return "#000000";
}

/* ------------------------------------------------------------------ */
/*  Element visual renderer                                            */
/* ------------------------------------------------------------------ */

function ElementVisual({ el }: { el: MockupElement }) {
  const p = el.props as Record<string, number | string | boolean>;

  switch (el.type) {
    case "health-bar":
      return (
        <div className="flex h-full w-full flex-col justify-center">
          {p.showLabel && (
            <span
              className="mb-0.5 text-[10px] leading-none opacity-80"
              style={{ color: p.color as string }}
            >
              {p.label as string}
            </span>
          )}
          <div
            className="w-full flex-1 overflow-hidden rounded-sm"
            style={{ backgroundColor: p.bgColor as string }}
          >
            <div
              className="h-full rounded-sm transition-all"
              style={{
                width: `${p.value}%`,
                backgroundColor: p.color as string,
              }}
            />
          </div>
        </div>
      );

    case "text-label":
      return (
        <div
          className="flex h-full w-full items-center overflow-hidden whitespace-nowrap"
          style={{
            color: p.color as string,
            fontSize: p.fontSize as number,
            fontWeight: p.fontWeight as string,
          }}
        >
          {p.text as string}
        </div>
      );

    case "button":
      return (
        <div
          className="flex h-full w-full items-center justify-center font-semibold shadow-md"
          style={{
            backgroundColor: p.bgColor as string,
            color: p.textColor as string,
            fontSize: p.fontSize as number,
            borderRadius: p.borderRadius as number,
          }}
        >
          {p.text as string}
        </div>
      );

    case "minimap":
      return (
        <div
          className="h-full w-full overflow-hidden rounded-md"
          style={{
            backgroundColor: p.bgColor as string,
            border: `2px solid ${p.borderColor}`,
          }}
        >
          <div className="relative h-full w-full">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(${p.borderColor} 1px, transparent 1px), linear-gradient(90deg, ${p.borderColor} 1px, transparent 1px)`,
                backgroundSize: "25% 25%",
              }}
            />
            <div
              className="absolute h-2 w-2 rounded-full"
              style={{
                backgroundColor: p.dotColor as string,
                top: "45%",
                left: "50%",
                boxShadow: `0 0 6px ${p.dotColor}`,
              }}
            />
          </div>
        </div>
      );

    case "inventory": {
      const cells = [];
      for (let r = 0; r < (p.rows as number); r++)
        for (let c = 0; c < (p.cols as number); c++)
          cells.push(
            <div
              key={`${r}-${c}`}
              className="rounded-sm border"
              style={{
                backgroundColor: p.cellColor as string,
                borderColor: p.borderColor as string,
              }}
            />
          );
      return (
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${p.cols}, 1fr)`,
            gridTemplateRows: `repeat(${p.rows}, 1fr)`,
            gap: `${p.gap}px`,
          }}
        >
          {cells}
        </div>
      );
    }

    case "score":
      return (
        <div
          className="flex h-full w-full flex-col justify-center"
          style={{ color: p.color as string, fontSize: p.fontSize as number }}
        >
          <span className="text-[9px] uppercase tracking-wider opacity-60">
            {p.label as string}
          </span>
          <span className="font-bold tabular-nums">
            {String(p.value).padStart(5, "0")}
          </span>
        </div>
      );

    case "timer":
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center"
          style={{ color: p.color as string, fontSize: p.fontSize as number }}
        >
          {p.showLabel && (
            <span className="text-[9px] uppercase tracking-wider opacity-60">
              TIME
            </span>
          )}
          <span className="font-mono font-bold tabular-nums">
            {String(p.minutes).padStart(2, "0")}:
            {String(p.seconds).padStart(2, "0")}
          </span>
        </div>
      );

    case "ammo":
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center"
          style={{ color: p.color as string, fontSize: p.fontSize as number }}
        >
          {p.showIcon && (
            <Crosshair className="mb-0.5 h-3 w-3 opacity-60" />
          )}
          <span className="font-mono font-bold tabular-nums">
            {p.current as number}
            <span className="text-[0.7em] opacity-40">
              /{p.max as number}
            </span>
          </span>
        </div>
      );

    default:
      return <div className="h-full w-full rounded bg-[#2A2A2A]" />;
  }
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

const HANDLES = [
  { key: "nw", cls: "-left-1 -top-1 cursor-nwse-resize" },
  { key: "ne", cls: "-right-1 -top-1 cursor-nesw-resize" },
  { key: "sw", cls: "-bottom-1 -left-1 cursor-nesw-resize" },
  { key: "se", cls: "-bottom-1 -right-1 cursor-nwse-resize" },
];

export default function UIMockupPage() {
  const [elements, setElements] = useState<MockupElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasBg, setCanvasBg] = useState("#0C1222");
  const canvasRef = useRef<HTMLDivElement>(null);

  const selected = elements.find((el) => el.id === selectedId) ?? null;

  const dragRef = useRef<{
    mode: "move" | "resize";
    elId: string;
    mx: number;
    my: number;
    ex: number;
    ey: number;
    ew: number;
    eh: number;
    handle: string;
  } | null>(null);

  const pct = useCallback((e: MouseEvent | React.MouseEvent) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  }, []);

  const onMove = useCallback(
    (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const p = pct(e);
      const dx = p.x - d.mx;
      const dy = p.y - d.my;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== d.elId) return el;
          if (d.mode === "move") {
            return {
              ...el,
              x: Math.max(0, Math.min(100 - el.width, d.ex + dx)),
              y: Math.max(0, Math.min(100 - el.height, d.ey + dy)),
            };
          }
          let nx = d.ex,
            ny = d.ey,
            nw = d.ew,
            nh = d.eh;
          if (d.handle.includes("e")) nw = Math.max(3, d.ew + dx);
          if (d.handle.includes("w")) {
            nw = Math.max(3, d.ew - dx);
            nx = d.ex + (d.ew - nw);
          }
          if (d.handle.includes("s")) nh = Math.max(2, d.eh + dy);
          if (d.handle.includes("n")) {
            nh = Math.max(2, d.eh - dy);
            ny = d.ey + (d.eh - nh);
          }
          return { ...el, x: nx, y: ny, width: nw, height: nh };
        })
      );
    },
    [pct]
  );

  const onUp = useCallback(() => {
    dragRef.current = null;
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onMove, onUp]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
      if (e.key === "Escape") setSelectedId(null);
      if (e.key === "d" && (e.ctrlKey || e.metaKey) && selectedId) {
        e.preventDefault();
        const newId = `el_${_nid++}`;
        setElements((prev) => {
          const src = prev.find((el) => el.id === selectedId);
          if (!src) return prev;
          return [
            ...prev,
            {
              ...src,
              id: newId,
              name: `${src.name} copy`,
              x: src.x + 3,
              y: src.y + 3,
              props: { ...src.props },
            },
          ];
        });
        setSelectedId(newId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId]);

  const addElement = (type: ElementType) => {
    const el = makeEl(
      type,
      30 + Math.random() * 20,
      30 + Math.random() * 20
    );
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const deleteEl = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const duplicateEl = () => {
    if (!selected) return;
    const dup: MockupElement = {
      ...selected,
      id: `el_${_nid++}`,
      name: `${selected.name} copy`,
      x: selected.x + 3,
      y: selected.y + 3,
      props: { ...selected.props },
    };
    setElements((prev) => [...prev, dup]);
    setSelectedId(dup.id);
  };

  const moveLayer = (id: string, dir: 1 | -1) => {
    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleVis = (id: string) => {
    setElements((prev) =>
      prev.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e))
    );
  };

  const updateProp = (key: string, value: unknown) => {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((e) =>
        e.id === selectedId ? { ...e, props: { ...e.props, [key]: value } } : e
      )
    );
  };

  const updatePos = (
    key: "x" | "y" | "width" | "height",
    value: number
  ) => {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((e) => (e.id === selectedId ? { ...e, [key]: value } : e))
    );
  };

  const loadPreset = (preset: (typeof PRESETS)[number]) => {
    const newEls = preset.els.map((p) =>
      makeEl(p.type, p.x, p.y, p.w, p.h, p.props)
    );
    setElements(newEls);
    setSelectedId(null);
  };

  const clearAll = () => {
    setElements([]);
    setSelectedId(null);
  };

  const exportJSON = () => {
    const data = {
      version: 1,
      background: canvasBg,
      elements: elements.map(
        ({ type, name, x, y, width, height, props }) => ({
          type,
          name,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          width: Math.round(width * 10) / 10,
          height: Math.round(height * 10) / 10,
          props,
        })
      ),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ui-mockup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const startMove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = elements.find((x) => x.id === id)!;
    const p = pct(e.nativeEvent);
    dragRef.current = {
      mode: "move",
      elId: id,
      mx: p.x,
      my: p.y,
      ex: el.x,
      ey: el.y,
      ew: el.width,
      eh: el.height,
      handle: "",
    };
    document.body.style.userSelect = "none";
    setSelectedId(id);
  };

  const startResize = (
    e: React.MouseEvent,
    id: string,
    handle: string
  ) => {
    e.stopPropagation();
    const el = elements.find((x) => x.id === id)!;
    const p = pct(e.nativeEvent);
    dragRef.current = {
      mode: "resize",
      elId: id,
      mx: p.x,
      my: p.y,
      ex: el.x,
      ey: el.y,
      ew: el.width,
      eh: el.height,
      handle,
    };
    document.body.style.userSelect = "none";
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#2A2A2A] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tools"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A] text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F5]">
              UI Mockup Builder
            </h1>
            <p className="text-xs text-[#6B7280]">
              Design game HUD & menu layouts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {PRESETS.map((pr) => (
            <button
              key={pr.name}
              onClick={() => loadPreset(pr)}
              className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              {pr.name}
            </button>
          ))}
          <div className="mx-1 h-6 w-px bg-[#2A2A2A]" />
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#EF4444]/30 hover:text-[#EF4444]"
          >
            <RotateCcw className="h-3 w-3" /> Clear
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#D97706]"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="flex w-52 shrink-0 flex-col border-r border-[#2A2A2A] bg-[#0F0F0F]">
          <div className="border-b border-[#2A2A2A] p-3">
            <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
              <Plus className="h-3 w-3" /> Elements
            </h2>
            <div className="grid grid-cols-2 gap-1.5">
              {ELEMENT_DEFS.map((d) => (
                <button
                  key={d.type}
                  onClick={() => addElement(d.type)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-2 text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                >
                  <d.icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium leading-tight text-center">
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden p-3">
            <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
              <Layers className="h-3 w-3" /> Layers
            </h2>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {[...elements].reverse().map((el) => {
                const def = ELEMENT_DEFS.find((d) => d.type === el.type)!;
                const Icon = def.icon;
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedId(el.id)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                      selectedId === el.id
                        ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "text-[#9CA3AF] hover:bg-[#1A1A1A]"
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="flex-1 truncate">{el.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVis(el.id);
                      }}
                      className="opacity-50 hover:opacity-100"
                    >
                      {el.visible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(el.id, 1);
                      }}
                      className="opacity-50 hover:opacity-100"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(el.id, -1);
                      }}
                      className="opacity-50 hover:opacity-100"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {elements.length === 0 && (
                <p className="py-4 text-center text-[10px] text-[#4A4A4A]">
                  Add elements from the palette above
                </p>
              )}
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#080808] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] font-medium text-[#6B7280]">
              BG:
            </span>
            {BG_PRESETS.map((bp) => (
              <button
                key={bp.name}
                onClick={() => setCanvasBg(bp.bg)}
                className={`h-5 w-5 rounded border transition-all ${
                  canvasBg === bp.bg
                    ? "border-[#F59E0B] ring-1 ring-[#F59E0B]/40"
                    : "border-[#2A2A2A] hover:border-[#4A4A4A]"
                }`}
                style={{ backgroundColor: bp.bg }}
                title={bp.name}
              />
            ))}
            <input
              type="color"
              value={safeHex(canvasBg)}
              onChange={(e) => setCanvasBg(e.target.value)}
              className="h-5 w-5 cursor-pointer rounded border border-[#2A2A2A] bg-transparent"
              title="Custom color"
            />
          </div>

          <div
            ref={canvasRef}
            className="relative w-full max-w-4xl overflow-hidden rounded-lg shadow-2xl ring-1 ring-[#2A2A2A]"
            style={{ aspectRatio: "16/9", backgroundColor: canvasBg }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null);
            }}
          >
            {elements
              .filter((el) => el.visible)
              .map((el) => (
                <div
                  key={el.id}
                  className={`absolute cursor-move ${selectedId === el.id ? "z-10" : ""}`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    height: `${el.height}%`,
                  }}
                  onMouseDown={(e) => startMove(e, el.id)}
                >
                  <ElementVisual el={el} />
                  {selectedId === el.id && (
                    <>
                      <div className="pointer-events-none absolute inset-0 rounded border-2 border-[#F59E0B]" />
                      {HANDLES.map((h) => (
                        <div
                          key={h.key}
                          className={`absolute h-2.5 w-2.5 rounded-full border-2 border-[#F59E0B] bg-[#0F0F0F] ${h.cls}`}
                          onMouseDown={(e) =>
                            startResize(e, el.id, h.key)
                          }
                        />
                      ))}
                    </>
                  )}
                </div>
              ))}
          </div>

          <p className="mt-2 text-[10px] text-[#4A4A4A]">
            Click to select &middot; Drag to move &middot; Corner handles
            to resize &middot; Del to remove &middot; Ctrl+D to duplicate
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-60 shrink-0 overflow-y-auto border-l border-[#2A2A2A] bg-[#0F0F0F] p-3">
          {selected ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Properties
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={duplicateEl}
                    className="rounded p-1 text-[#6B7280] transition-colors hover:bg-[#1A1A1A] hover:text-[#F5F5F5]"
                    title="Duplicate (Ctrl+D)"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={deleteEl}
                    className="rounded p-1 text-[#6B7280] transition-colors hover:bg-[#1A1A1A] hover:text-[#EF4444]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <label className="mb-3 block">
                <span className="mb-1 block text-[10px] font-medium text-[#6B7280]">
                  Name
                </span>
                <input
                  value={selected.name}
                  onChange={(e) =>
                    setElements((prev) =>
                      prev.map((el) =>
                        el.id === selectedId
                          ? { ...el, name: e.target.value }
                          : el
                      )
                    )
                  }
                  className="w-full rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                />
              </label>

              <div className="mb-3 grid grid-cols-2 gap-2">
                {(["x", "y", "width", "height"] as const).map((k) => (
                  <label key={k}>
                    <span className="mb-0.5 block text-[10px] font-medium text-[#6B7280]">
                      {k === "width"
                        ? "W %"
                        : k === "height"
                          ? "H %"
                          : `${k.toUpperCase()} %`}
                    </span>
                    <input
                      type="number"
                      value={Math.round(selected[k] * 10) / 10}
                      onChange={(e) =>
                        updatePos(k, parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                      step={0.5}
                    />
                  </label>
                ))}
              </div>

              <div className="mb-3 h-px bg-[#2A2A2A]" />

              <div className="space-y-2.5">
                {PROP_SCHEMA[selected.type]?.map((def) => (
                  <label key={def.key} className="block">
                    <span className="mb-0.5 block text-[10px] font-medium text-[#6B7280]">
                      {def.label}
                    </span>

                    {def.type === "text" && (
                      <input
                        value={
                          (selected.props[def.key] as string) ?? ""
                        }
                        onChange={(e) =>
                          updateProp(def.key, e.target.value)
                        }
                        className="w-full rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                      />
                    )}

                    {def.type === "number" && (
                      <input
                        type="number"
                        value={
                          (selected.props[def.key] as number) ?? 0
                        }
                        min={def.min}
                        max={def.max}
                        step={def.step ?? 1}
                        onChange={(e) =>
                          updateProp(
                            def.key,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                      />
                    )}

                    {def.type === "range" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          value={
                            (selected.props[def.key] as number) ?? 0
                          }
                          min={def.min ?? 0}
                          max={def.max ?? 100}
                          onChange={(e) =>
                            updateProp(
                              def.key,
                              parseFloat(e.target.value)
                            )
                          }
                          className="flex-1 accent-[#F59E0B]"
                        />
                        <span className="w-8 text-right text-[10px] tabular-nums text-[#9CA3AF]">
                          {selected.props[def.key] as number}
                        </span>
                      </div>
                    )}

                    {def.type === "color" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={safeHex(
                            selected.props[def.key]
                          )}
                          onChange={(e) =>
                            updateProp(def.key, e.target.value)
                          }
                          className="h-6 w-6 cursor-pointer rounded border border-[#2A2A2A] bg-transparent"
                        />
                        <input
                          value={
                            (selected.props[def.key] as string) ??
                            ""
                          }
                          onChange={(e) =>
                            updateProp(def.key, e.target.value)
                          }
                          className="flex-1 rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                        />
                      </div>
                    )}

                    {def.type === "toggle" && (
                      <button
                        onClick={() =>
                          updateProp(
                            def.key,
                            !selected.props[def.key]
                          )
                        }
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          selected.props[def.key]
                            ? "bg-[#F59E0B]"
                            : "bg-[#2A2A2A]"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            selected.props[def.key]
                              ? "left-[18px]"
                              : "left-0.5"
                          }`}
                        />
                      </button>
                    )}

                    {def.type === "select" && (
                      <select
                        value={
                          (selected.props[def.key] as string) ?? ""
                        }
                        onChange={(e) =>
                          updateProp(def.key, e.target.value)
                        }
                        className="w-full rounded border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-1 text-xs text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                      >
                        {def.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-xl bg-[#1A1A1A] p-6">
                <Layers className="mx-auto h-8 w-8 text-[#2A2A2A]" />
                <p className="mt-3 text-xs text-[#6B7280]">
                  Select an element to
                  <br />
                  edit its properties
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
