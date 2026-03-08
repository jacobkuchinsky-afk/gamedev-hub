"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Trash2,
  Search,
  BookOpen,
  Save,
  Code2,
  Play,
  X,
  ChevronDown,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

type Language = "gdscript" | "csharp" | "lua" | "javascript" | "python";
type Engine = "godot" | "unity" | "love2d" | "phaser" | "custom";
type CodeCategory =
  | "movement"
  | "combat"
  | "ui"
  | "audio"
  | "inventory"
  | "saveload"
  | "ai"
  | "physics";

interface SavedSnippet {
  id: string;
  name?: string;
  language: Language;
  engine: Engine;
  category: CodeCategory;
  description: string;
  code: string;
  timestamp: number;
}

const LANGUAGES: { id: Language; label: string; ext: string }[] = [
  { id: "gdscript", label: "GDScript", ext: "gd" },
  { id: "csharp", label: "C# (Unity)", ext: "cs" },
  { id: "lua", label: "Lua", ext: "lua" },
  { id: "javascript", label: "JavaScript", ext: "js" },
  { id: "python", label: "Python", ext: "py" },
];

const ENGINES: { id: Engine; label: string }[] = [
  { id: "godot", label: "Godot" },
  { id: "unity", label: "Unity" },
  { id: "love2d", label: "Love2D" },
  { id: "phaser", label: "Phaser" },
  { id: "custom", label: "Custom" },
];

const CATEGORIES: { id: CodeCategory; label: string }[] = [
  { id: "movement", label: "Movement" },
  { id: "combat", label: "Combat" },
  { id: "ui", label: "UI" },
  { id: "audio", label: "Audio" },
  { id: "inventory", label: "Inventory" },
  { id: "saveload", label: "Save/Load" },
  { id: "ai", label: "AI / Pathfinding" },
  { id: "physics", label: "Physics" },
];

const STORAGE_KEY = "gameforge_saved_snippets";

const KEYWORD_PATTERNS: Record<Language, RegExp> = {
  gdscript:
    /\b(func|var|const|if|elif|else|for|while|return|class|extends|signal|export|onready|self|true|false|null|in|not|and|or|pass|break|continue|match|enum|static|void|yield|await|preload|load|is|as|class_name|tool|master|puppet|slave|remotesync|sync|setget)\b/g,
  csharp:
    /\b(using|namespace|class|struct|interface|enum|public|private|protected|internal|static|void|int|float|double|string|bool|var|new|return|if|else|for|foreach|while|do|switch|case|break|continue|try|catch|finally|throw|null|true|false|this|base|virtual|override|abstract|sealed|async|await|get|set|readonly|const|ref|out|in|typeof|is|as|delegate|event|partial)\b/g,
  lua: /\b(local|function|end|if|then|else|elseif|for|while|do|repeat|until|return|nil|true|false|and|or|not|in|require|self|pairs|ipairs|print|type|tostring|tonumber|table|math|string|io|os|coroutine|setmetatable|getmetatable)\b/g,
  javascript:
    /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|class|extends|super|import|export|default|from|async|await|yield|typeof|instanceof|null|undefined|true|false|of|in|delete|void|static|get|set|constructor)\b/g,
  python:
    /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|in|is|None|True|False|self|global|nonlocal|assert|del|print|range|len|type|int|float|str|list|dict|set|tuple|super|property|staticmethod|classmethod)\b/g,
};

function highlightCode(code: string, language: Language): string {
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // strings (double and single quoted)
  escaped = escaped.replace(
    /(["'])(?:(?=(\\?))\2.)*?\1/g,
    '<span style="color:#A5D6A7">$&</span>'
  );

  // single-line comments
  const commentPattern =
    language === "lua" ? /(--[^\n]*)/g : /((?:\/\/|#)[^\n]*)/g;
  escaped = escaped.replace(
    commentPattern,
    '<span style="color:#6B7280;font-style:italic">$&</span>'
  );

  // numbers
  escaped = escaped.replace(
    /\b(\d+\.?\d*f?)\b/g,
    '<span style="color:#CE93D8">$&</span>'
  );

  // keywords
  const kwPattern = KEYWORD_PATTERNS[language];
  escaped = escaped.replace(
    kwPattern,
    '<span style="color:#F59E0B;font-weight:600">$&</span>'
  );

  // function calls
  escaped = escaped.replace(
    /\b([a-zA-Z_]\w*)\s*(?=\()/g,
    '<span style="color:#64B5F6">$&</span>'
  );

  return escaped;
}

export default function CodeSnippetPage() {
  const [language, setLanguage] = useState<Language>("gdscript");
  const [engine, setEngine] = useState<Engine>("godot");
  const [category, setCategory] = useState<CodeCategory>("movement");
  const [description, setDescription] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<SavedSnippet[]>([]);
  const [savedNotice, setSavedNotice] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");
  const [expandedSnippet, setExpandedSnippet] = useState<string | null>(null);
  const [snippetName, setSnippetName] = useState("");
  const [nameGenLoading, setNameGenLoading] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
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

  const generate = useCallback(async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError("");
    setGeneratedCode("");
    setExplanation("");

    const langLabel = LANGUAGES.find((l) => l.id === language)?.label || language;
    const engineLabel = ENGINES.find((e) => e.id === engine)?.label || engine;
    const catLabel = CATEGORIES.find((c) => c.id === category)?.label || category;

    const prompt = `Write a ${langLabel} code snippet for ${engineLabel} that implements: ${description.trim()}. Category: ${catLabel}. Include comments explaining the code. Keep it concise and practical. Return ONLY the code, no markdown fences or extra explanation.`;

    try {
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
            max_tokens: 1024,
            temperature: 0.7,
          }),
        }
      );
      const data = await response.json();
      let content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";

      content = content
        .replace(/^```[\w]*\n?/gm, "")
        .replace(/```$/gm, "")
        .trim();

      if (content) {
        setGeneratedCode(content);
      } else {
        setError("AI returned an empty response. Try again.");
      }
    } catch {
      setError("Failed to reach AI. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [description, language, engine, category]);

  const explainCode = useCallback(async () => {
    if (!generatedCode) return;
    setExplaining(true);
    setExplanation("");

    const prompt = `Explain this code snippet in simple terms. What does each part do? Keep it concise.\n\n${generatedCode}`;

    try {
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
            max_tokens: 1024,
            temperature: 0.5,
          }),
        }
      );
      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning ||
        "";
      setExplanation(content || "Could not generate explanation.");
    } catch {
      setExplanation("Failed to get explanation. Try again.");
    } finally {
      setExplaining(false);
    }
  }, [generatedCode]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [generatedCode]);

  const generateSnippetName = useCallback(async () => {
    if (!description.trim()) return;
    setNameGenLoading(true);
    try {
      const langLabel = LANGUAGES.find((l) => l.id === language)?.label || language;
      const catLabel = CATEGORIES.find((c) => c.id === category)?.label || category;
      const prompt = `Name this game code snippet: language=${langLabel}, category=${catLabel}. Description: '${description.trim()}'. Suggest a file-naming-style name like 'player_jump' or 'inventory_system'. Just the name.`;
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
      const cleaned = content.replace(/[*"'\n`]/g, "").trim();
      if (cleaned) setSnippetName(cleaned);
    } catch {} finally {
      setNameGenLoading(false);
    }
  }, [description, language, category]);

  const saveSnippet = useCallback(() => {
    if (!generatedCode) return;
    const snippet: SavedSnippet = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: snippetName.trim() || undefined,
      language,
      engine,
      category,
      description: description.trim(),
      code: generatedCode,
      timestamp: Date.now(),
    };
    setSaved((prev) => [snippet, ...prev]);
    setSavedNotice(true);
    setSnippetName("");
    setTimeout(() => setSavedNotice(false), 1500);
  }, [generatedCode, language, engine, category, description, snippetName]);

  const deleteSnippet = useCallback((id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id));
    setExpandedSnippet((prev) => (prev === id ? null : prev));
  }, []);

  const copySnippetCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
  }, []);

  const loadSnippet = useCallback((snippet: SavedSnippet) => {
    setLanguage(snippet.language);
    setEngine(snippet.engine);
    setCategory(snippet.category);
    setDescription(snippet.description);
    setGeneratedCode(snippet.code);
    setExplanation("");
    setActiveTab("generate");
  }, []);

  const filteredSaved = saved.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.language.includes(q) ||
      s.engine.includes(q) ||
      s.category.includes(q) ||
      s.code.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generate();
    }
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
          <h1 className="text-2xl font-bold">Code Snippets</h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF]">
            Generate game dev code with AI for any engine or language
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-1">
        <button
          onClick={() => setActiveTab("generate")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "generate"
              ? "bg-[#F59E0B] text-[#0F0F0F]"
              : "text-[#9CA3AF] hover:text-[#F5F5F5]"
          }`}
        >
          <Code2 className="h-4 w-4" />
          Generate
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "saved"
              ? "bg-[#F59E0B] text-[#0F0F0F]"
              : "text-[#9CA3AF] hover:text-[#F5F5F5]"
          }`}
        >
          <Save className="h-4 w-4" />
          Saved
          {saved.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === "saved"
                  ? "bg-[#0F0F0F]/20 text-[#0F0F0F]"
                  : "bg-[#F59E0B]/15 text-[#F59E0B]"
              }`}
            >
              {saved.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "generate" ? (
        <div className="space-y-4">
          {/* Config Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Language */}
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Language
              </label>
              <div className="space-y-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      language === l.id
                        ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {l.label}
                    <span className="font-mono text-[10px] opacity-50">
                      .{l.ext}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Engine */}
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Engine
              </label>
              <div className="space-y-1.5">
                {ENGINES.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEngine(e.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all ${
                      engine === e.id
                        ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
              <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Category
              </label>
              <div className="space-y-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all ${
                      category === c.id
                        ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description + Generate */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              What do you need?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. player jump with double jump, inventory system with drag and drop, enemy AI with patrol and chase states..."
              rows={3}
              className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-3 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#F59E0B]/50"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] text-[#4B5563]">
                Ctrl+Enter to generate
              </p>
              <button
                onClick={generate}
                disabled={loading || !description.trim()}
                className="flex items-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-2.5 text-sm font-bold text-[#0F0F0F] transition-all hover:bg-[#D97706] active:scale-[0.97] disabled:opacity-40 disabled:hover:bg-[#F59E0B]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Generated Code */}
          {generatedCode && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
                {/* Code header */}
                <div className="flex items-center justify-between border-b border-[#2A2A2A] px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-[#EF4444]/60" />
                      <div className="h-3 w-3 rounded-full bg-[#F59E0B]/60" />
                      <div className="h-3 w-3 rounded-full bg-[#22C55E]/60" />
                    </div>
                    <span className="text-xs font-medium text-[#6B7280]">
                      {LANGUAGES.find((l) => l.id === language)?.label} —{" "}
                      {ENGINES.find((e) => e.id === engine)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copyCode}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#22C55E]" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Code body */}
                <div className="overflow-x-auto p-4">
                  <pre
                    ref={codeRef}
                    className="font-mono text-sm leading-relaxed text-[#E0E0E0]"
                    dangerouslySetInnerHTML={{
                      __html: highlightCode(generatedCode, language),
                    }}
                  />
                </div>
              </div>

              {/* Save row with AI name */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={snippetName}
                    onChange={(e) => setSnippetName(e.target.value)}
                    placeholder="Snippet name (optional)..."
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 pr-8 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none transition-colors focus:border-[#F59E0B]/40"
                  />
                  <button
                    onClick={generateSnippetName}
                    disabled={nameGenLoading || !description.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#555] hover:text-[#F59E0B] transition-colors disabled:opacity-40"
                    title="AI Name"
                  >
                    {nameGenLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <button
                  onClick={saveSnippet}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B]/10 px-4 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
                >
                  {savedNotice ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#22C55E]" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </>
                  )}
                </button>
              </div>

              {/* Explain button */}
              <button
                onClick={explainCode}
                disabled={explaining}
                className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-[#9CA3AF] transition-all hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              >
                {explaining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                {explaining ? "Thinking..." : "Explain This Code"}
              </button>

              {/* Explanation */}
              {explanation && (
                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                      <BookOpen className="h-3.5 w-3.5" />
                      Explanation
                    </h3>
                    <button
                      onClick={() => setExplanation("")}
                      className="text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                    {explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Saved Snippets Tab */
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved snippets..."
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
            />
          </div>

          {filteredSaved.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16 text-center">
              <Code2 className="h-10 w-10 text-[#2A2A2A]" />
              <p className="mt-4 text-sm text-[#6B7280]">
                {saved.length === 0
                  ? "No saved snippets yet. Generate some code and hit Save!"
                  : "No snippets match your search."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSaved.map((snippet) => {
                const isExpanded = expandedSnippet === snippet.id;
                return (
                  <div
                    key={snippet.id}
                    className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-all"
                  >
                    <button
                      onClick={() =>
                        setExpandedSnippet(isExpanded ? null : snippet.id)
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#1F1F1F]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#F5F5F5]">
                          {snippet.name || snippet.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#F59E0B]">
                            {LANGUAGES.find((l) => l.id === snippet.language)
                              ?.label || snippet.language}
                          </span>
                          <span className="rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                            {ENGINES.find((e) => e.id === snippet.engine)
                              ?.label || snippet.engine}
                          </span>
                          <span className="rounded bg-[#0F0F0F] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                            {CATEGORIES.find((c) => c.id === snippet.category)
                              ?.label || snippet.category}
                          </span>
                          <span className="text-[10px] text-[#4B5563]">
                            {new Date(snippet.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        className={`ml-3 h-4 w-4 shrink-0 text-[#6B7280] transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#2A2A2A]">
                        <div className="overflow-x-auto p-4">
                          <pre
                            className="font-mono text-sm leading-relaxed text-[#E0E0E0]"
                            dangerouslySetInnerHTML={{
                              __html: highlightCode(
                                snippet.code,
                                snippet.language
                              ),
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 border-t border-[#2A2A2A] px-4 py-2.5">
                          <button
                            onClick={() => copySnippetCode(snippet.code)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                          <button
                            onClick={() => loadSnippet(snippet)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F59E0B]"
                          >
                            <Code2 className="h-3.5 w-3.5" />
                            Load
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => deleteSnippet(snippet.id)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#EF4444]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
