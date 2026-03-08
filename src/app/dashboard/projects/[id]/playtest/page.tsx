"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Star,
  ClipboardList,
  BarChart3,
  Share2,
  Download,
  X,
  ChevronDown,
  User,
  Bug,
  MessageSquare,
  Monitor,
  ThumbsUp,
  AlertTriangle,
  Eye,
  ExternalLink,
  Tag,
  Sparkles,
  Loader2,
  Plus,
  Clock,
  Calendar,
  ClipboardCopy,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  getProject,
  getPlaytestResponses,
  addPlaytestResponse,
  getSessions,
  addSession,
  type Project,
  type PlaytestResponse,
  type PlaytestSession,
} from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

type ActiveView = "results" | "form" | "playtester";

const DIFFICULTY_LABELS: Record<PlaytestResponse["difficulty"], string> = {
  "too-easy": "Too Easy",
  "just-right": "Just Right",
  "too-hard": "Too Hard",
};

const DIFFICULTY_COLORS: Record<PlaytestResponse["difficulty"], string> = {
  "too-easy": "#10B981",
  "just-right": "#F59E0B",
  "too-hard": "#EF4444",
};

const PLAY_AGAIN_LABELS: Record<PlaytestResponse["playAgain"], string> = {
  yes: "Yes",
  definitely: "Definitely",
  maybe: "Maybe",
  no: "No",
};

const PLAY_AGAIN_COLORS: Record<PlaytestResponse["playAgain"], string> = {
  definitely: "#10B981",
  yes: "#3B82F6",
  maybe: "#F59E0B",
  no: "#EF4444",
};

const COMMON_WORDS = [
  { word: "combat", count: 4 },
  { word: "trading", count: 3 },
  { word: "asteroid", count: 3 },
  { word: "exploration", count: 3 },
  { word: "tutorial", count: 2 },
  { word: "docking", count: 2 },
  { word: "inventory", count: 2 },
  { word: "multiplayer", count: 2 },
  { word: "controller", count: 1 },
  { word: "boss fights", count: 1 },
  { word: "photo mode", count: 1 },
  { word: "minimap", count: 1 },
];

type FeedbackCategory = "bug" | "feature-request" | "ux-issue" | "performance" | "positive";

const CATEGORY_CONFIG: Record<FeedbackCategory, { label: string; color: string }> = {
  bug: { label: "Bug", color: "#EF4444" },
  "feature-request": { label: "Feature Request", color: "#3B82F6" },
  "ux-issue": { label: "UX Issue", color: "#F59E0B" },
  performance: { label: "Performance", color: "#8B5CF6" },
  positive: { label: "Positive", color: "#10B981" },
};

const ALL_CATEGORIES: FeedbackCategory[] = ["bug", "feature-request", "ux-issue", "performance", "positive"];

interface TestCase {
  id: string;
  category: string;
  name: string;
  detail: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "untested" | "passed" | "failed" | "skipped";
}

const PRIORITY_STYLES: Record<TestCase["priority"], string> = {
  Critical: "bg-[#EF4444]/10 text-[#EF4444]",
  High: "bg-[#F97316]/10 text-[#F97316]",
  Medium: "bg-[#F59E0B]/10 text-[#F59E0B]",
  Low: "bg-[#6B7280]/10 text-[#9CA3AF]",
};

function parseTestCases(raw: string): TestCase[] {
  const cases: TestCase[] = [];
  let category = "General";
  let idx = 0;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^#{1,3}\s+(.+?)(?:\s*\(.*\))?\s*$/);
    if (headingMatch) {
      category = headingMatch[1].replace(/\*\*/g, "").trim();
      continue;
    }

    const boldHeading = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
    if (boldHeading && !/^\d/.test(trimmed)) {
      category = boldHeading[1].trim();
      continue;
    }

    const itemMatch = trimmed.match(/^\d+[\.\)]\s*\**(.+)/);
    if (itemMatch) {
      const content = itemMatch[1].replace(/\*\*/g, "").trim();
      let priority: TestCase["priority"] = "Medium";
      if (/\bcritical\b/i.test(content)) priority = "Critical";
      else if (/\bhigh\b/i.test(content)) priority = "High";
      else if (/\blow\b/i.test(content)) priority = "Low";

      const nameEnd = content.search(/[-:]/);
      const name = nameEnd > 0 ? content.slice(0, nameEnd).trim() : content.slice(0, 80).trim();
      const detail = nameEnd > 0 ? content.slice(nameEnd + 1).trim() : "";

      cases.push({ id: `tc-${idx++}`, category, name, detail, priority, status: "untested" });
    }
  }

  if (cases.length === 0) {
    const lines = raw.split("\n").filter((l) => l.trim().length > 5);
    for (const line of lines.slice(0, 20)) {
      cases.push({
        id: `tc-${idx++}`,
        category: "General",
        name: line.trim().replace(/^[-*#>\d.)\s]+/, "").slice(0, 80),
        detail: "",
        priority: "Medium",
        status: "untested",
      });
    }
  }

  return cases;
}

function categorizeResponse(r: PlaytestResponse): FeedbackCategory[] {
  const cats: FeedbackCategory[] = [];
  const text = `${r.favoriteMoment} ${r.frustratingMoment} ${r.suggestions} ${r.bugDescription}`.toLowerCase();
  if (r.bugEncountered) cats.push("bug");
  if (/feature|add\b|wish|want|should have|would love|need\b|implement/.test(text)) cats.push("feature-request");
  if (/confus|unclear|hard to|couldn't find|frustrat|unintuitive|clunky|awkward/.test(text)) cats.push("ux-issue");
  if (/lag|fps|slow|crash|freeze|stutter|frame|performance|load/.test(text)) cats.push("performance");
  if (r.overallRating >= 4 && !r.bugEncountered) cats.push("positive");
  if (cats.length === 0) cats.push("positive");
  return cats;
}

export default function PlaytestPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [responses, setResponses] = useState<PlaytestResponse[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("results");
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FeedbackCategory | "all">("all");
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState("");
  const [aiQuestionsLoading, setAiQuestionsLoading] = useState(false);
  const [showAiQuestions, setShowAiQuestions] = useState(false);
  const [questionsCopied, setQuestionsCopied] = useState(false);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testPlanLoading, setTestPlanLoading] = useState(false);
  const [showTestPlan, setShowTestPlan] = useState(false);

  const [sessions, setSessions] = useState<PlaytestSession[]>([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [filterSessionId, setFilterSessionId] = useState<string | "all">("all");
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [newSessionTester, setNewSessionTester] = useState("");
  const [newSessionDuration, setNewSessionDuration] = useState(30);
  const [newSessionPlatform, setNewSessionPlatform] = useState("PC");
  const [newSessionBuild, setNewSessionBuild] = useState("");
  const [newSessionNotes, setNewSessionNotes] = useState("");

  const handleAiSummary = async () => {
    if (responses.length === 0) return;
    setAiSummaryLoading(true);
    try {
      const allFeedback = responses
        .map(
          (r) =>
            `Tester: ${r.testerName}, Rating: ${r.overallRating}/5, Difficulty: ${DIFFICULTY_LABELS[r.difficulty]}, Favorite: ${r.favoriteMoment || "N/A"}, Frustrating: ${r.frustratingMoment || "N/A"}, Bug: ${r.bugEncountered ? r.bugDescription || "Yes" : "No"}, Play Again: ${PLAY_AGAIN_LABELS[r.playAgain]}, Suggestions: ${r.suggestions || "N/A"}`
        )
        .join("\n");
      const prompt = `Summarize this playtesting feedback for a game:\n${allFeedback}\n\nIdentify: top 3 issues, top 3 things players liked, overall sentiment (positive/negative/mixed), and 3 actionable next steps. Be brief.`;
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
      setAiSummary(content || "Could not generate a summary. Try again later.");
    } catch {
      setAiSummary("Failed to generate summary. Check your connection and try again.");
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleAiQuestions = async () => {
    if (!project) return;
    setAiQuestionsLoading(true);
    setShowAiQuestions(true);
    try {
      const prompt = `Generate 10 playtest feedback questions for a ${project.genre} game in ${project.status} stage. Include: 5 rating questions (1-5 scale) and 5 open-ended questions. Focus on: controls feel, difficulty, visual clarity, audio, fun factor, and bugs. Format as a numbered list.`;
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
      setAiQuestions(content || "Could not generate questions. Try again later.");
    } catch {
      setAiQuestions("Failed to generate questions. Check your connection and try again.");
    } finally {
      setAiQuestionsLoading(false);
    }
  };

  const copyQuestions = () => {
    if (!aiQuestions) return;
    navigator.clipboard.writeText(aiQuestions).then(() => {
      setQuestionsCopied(true);
      setTimeout(() => setQuestionsCopied(false), 2000);
    });
  };

  const handleAiTestPlan = async () => {
    if (!project) return;
    setTestPlanLoading(true);
    setShowTestPlan(true);
    try {
      const prompt = `Create a QA testing checklist for a ${project.genre} game called '${project.name}'. Include 20 test cases grouped by: Functionality (5 tests), Performance (3 tests), Edge Cases (4 tests), UI/UX (4 tests), Platform-Specific (4 tests). For each test case, format as a numbered list item with: test name, steps to test, expected result, and priority (Critical/High/Medium/Low). Use markdown headers for each group.`;
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
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      if (content) {
        setTestCases(parseTestCases(content));
      } else {
        setTestCases([]);
      }
    } catch {
      setTestCases([]);
    } finally {
      setTestPlanLoading(false);
    }
  };

  const toggleTestStatus = (id: string, status: TestCase["status"]) => {
    setTestCases((prev) =>
      prev.map((tc) =>
        tc.id === id ? { ...tc, status: tc.status === status ? "untested" : status } : tc
      )
    );
  };

  const exportTestReport = () => {
    if (testCases.length === 0) return;
    const passed = testCases.filter((t) => t.status === "passed").length;
    const failed = testCases.filter((t) => t.status === "failed").length;
    const skipped = testCases.filter((t) => t.status === "skipped").length;
    const untested = testCases.length - passed - failed - skipped;

    const statusIcon: Record<TestCase["status"], string> = {
      passed: "[PASS]",
      failed: "[FAIL]",
      skipped: "[SKIP]",
      untested: "[    ]",
    };

    const categories = Array.from(new Set(testCases.map((t) => t.category)));
    let md = `# QA Test Report: ${project?.name || "Game"}\n\n`;
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    md += `## Summary\n\n`;
    md += `| Status | Count |\n|--------|-------|\n`;
    md += `| Passed | ${passed} |\n| Failed | ${failed} |\n| Skipped | ${skipped} |\n| Untested | ${untested} |\n| **Total** | **${testCases.length}** |\n\n`;
    md += `**Completion:** ${Math.round(((passed + failed + skipped) / testCases.length) * 100)}%\n\n`;

    for (const cat of categories) {
      md += `## ${cat}\n\n`;
      for (const tc of testCases.filter((t) => t.category === cat)) {
        md += `- ${statusIcon[tc.status]} **${tc.name}** (${tc.priority})`;
        if (tc.detail) md += ` - ${tc.detail}`;
        md += "\n";
      }
      md += "\n";
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-report-${project?.name || "game"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Playtester form state
  const [ptName, setPtName] = useState("");
  const [ptRating, setPtRating] = useState(0);
  const [ptHoverRating, setPtHoverRating] = useState(0);
  const [ptDifficulty, setPtDifficulty] = useState<PlaytestResponse["difficulty"]>("just-right");
  const [ptFavorite, setPtFavorite] = useState("");
  const [ptFrustrating, setPtFrustrating] = useState("");
  const [ptBugFound, setPtBugFound] = useState(false);
  const [ptBugDesc, setPtBugDesc] = useState("");
  const [ptPlayAgain, setPtPlayAgain] = useState<PlaytestResponse["playAgain"]>("yes");
  const [ptSuggestions, setPtSuggestions] = useState("");
  const [ptPlatform, setPtPlatform] = useState<PlaytestResponse["platform"]>("PC");
  const [ptSessionId, setPtSessionId] = useState("");
  const [ptSubmitted, setPtSubmitted] = useState(false);

  const reload = useCallback(() => {
    console.log("[PlaytestPage] reloading responses for", projectId);
    setResponses(getPlaytestResponses(projectId));
    setSessions(getSessions(projectId));
  }, [projectId]);

  useEffect(() => {
    console.log("[PlaytestPage] rendered, id:", projectId);
    const p = getProject(projectId);
    if (p) setProject(p);
    reload();
  }, [projectId, reload]);

  const stats = useMemo(() => {
    if (responses.length === 0) return null;
    const avgRating = responses.reduce((sum, r) => sum + r.overallRating, 0) / responses.length;
    const difficultyDist: Record<PlaytestResponse["difficulty"], number> = { "too-easy": 0, "just-right": 0, "too-hard": 0 };
    const playAgainDist: Record<PlaytestResponse["playAgain"], number> = { yes: 0, definitely: 0, maybe: 0, no: 0 };
    const platformDist: Record<string, number> = {};
    let bugsReported = 0;

    responses.forEach((r) => {
      difficultyDist[r.difficulty]++;
      playAgainDist[r.playAgain]++;
      platformDist[r.platform] = (platformDist[r.platform] || 0) + 1;
      if (r.bugEncountered) bugsReported++;
    });

    return { avgRating, difficultyDist, playAgainDist, platformDist, bugsReported, total: responses.length };
  }, [responses]);

  const responseCategories = useMemo(() => {
    const map = new Map<string, FeedbackCategory[]>();
    responses.forEach((r) => {
      map.set(r.id, categorizeResponse(r));
    });
    return map;
  }, [responses]);

  const filteredResponses = useMemo(() => {
    let result = responses;
    if (filterCategory !== "all") {
      result = result.filter((r) => responseCategories.get(r.id)?.includes(filterCategory));
    }
    if (filterSessionId !== "all") {
      result = result.filter((r) => r.sessionId === filterSessionId);
    }
    return result;
  }, [responses, filterCategory, filterSessionId, responseCategories]);

  const handleSubmitPlaytest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptName.trim() || ptRating === 0) return;
    console.log("[PlaytestPage] submitting playtest from:", ptName);
    addPlaytestResponse({
      projectId,
      testerName: ptName.trim(),
      sessionId: ptSessionId || undefined,
      overallRating: ptRating,
      difficulty: ptDifficulty,
      favoriteMoment: ptFavorite,
      frustratingMoment: ptFrustrating,
      bugEncountered: ptBugFound,
      bugDescription: ptBugDesc,
      playAgain: ptPlayAgain,
      suggestions: ptSuggestions,
      platform: ptPlatform,
    });
    setPtSubmitted(true);
    reload();
  };

  const resetForm = () => {
    setPtName("");
    setPtRating(0);
    setPtDifficulty("just-right");
    setPtFavorite("");
    setPtFrustrating("");
    setPtBugFound(false);
    setPtBugDesc("");
    setPtPlayAgain("yes");
    setPtSuggestions("");
    setPtPlatform("PC");
    setPtSessionId("");
    setPtSubmitted(false);
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTester.trim() || !newSessionBuild.trim()) return;
    addSession({
      projectId,
      date: newSessionDate,
      testerName: newSessionTester.trim(),
      durationMinutes: newSessionDuration,
      platform: newSessionPlatform,
      buildVersion: newSessionBuild.trim(),
      notes: newSessionNotes,
    });
    setShowSessionForm(false);
    setNewSessionTester("");
    setNewSessionDuration(30);
    setNewSessionBuild("");
    setNewSessionNotes("");
    reload();
  };

  const exportCSV = () => {
    console.log("[PlaytestPage] exporting CSV");
    const headers = ["Tester", "Rating", "Difficulty", "Favorite Moment", "Frustrating Moment", "Bug Found", "Bug Description", "Play Again", "Suggestions", "Platform", "Submitted"];
    const rows = responses.map((r) => [
      r.testerName,
      r.overallRating.toString(),
      DIFFICULTY_LABELS[r.difficulty],
      `"${r.favoriteMoment.replace(/"/g, '""')}"`,
      `"${r.frustratingMoment.replace(/"/g, '""')}"`,
      r.bugEncountered ? "Yes" : "No",
      `"${r.bugDescription.replace(/"/g, '""')}"`,
      PLAY_AGAIN_LABELS[r.playAgain],
      `"${r.suggestions.replace(/"/g, '""')}"`,
      r.platform,
      new Date(r.submitted_at).toLocaleString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playtest-results-${project?.name || "project"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    console.log("[PlaytestPage] CSV downloaded");
  };

  const handleShareLink = () => {
    console.log("[PlaytestPage] share link clicked");
    setShowShareModal(true);
    setLinkCopied(false);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/dashboard/projects/${projectId}/playtest?view=form`;
    navigator.clipboard.writeText(link).then(() => {
      console.log("[PlaytestPage] link copied");
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  if (!project) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "Playtest" },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Playtesting</h1>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
              <button
                onClick={() => {
                  console.log("[PlaytestPage] view: results");
                  setActiveView("results");
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                  activeView === "results" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "text-[#6B7280] hover:text-[#9CA3AF]"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Results
              </button>
              <button
                onClick={() => {
                  console.log("[PlaytestPage] view: playtester form");
                  setActiveView("playtester");
                  resetForm();
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                  activeView === "playtester" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "text-[#6B7280] hover:text-[#9CA3AF]"
                }`}
              >
                <Eye className="h-4 w-4" />
                Playtester View
              </button>
            </div>
            <button
              onClick={handleAiQuestions}
              disabled={aiQuestionsLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiQuestionsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Questions
            </button>
            <button
              onClick={handleAiTestPlan}
              disabled={testPlanLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testPlanLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              AI Test Plan
            </button>
            <button
              onClick={handleShareLink}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            {responses.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── AI QUESTIONS PANEL ─── */}
      {showAiQuestions && (
        <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="text-sm font-semibold text-[#F59E0B]">AI Playtest Questions</h3>
              <span className="rounded bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                {project.genre} &middot; {project.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {aiQuestions && !aiQuestionsLoading && (
                <button
                  onClick={copyQuestions}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    questionsCopied
                      ? "bg-[#10B981]/10 text-[#10B981]"
                      : "bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20"
                  }`}
                >
                  {questionsCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="h-3.5 w-3.5" />
                      Copy as Survey
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowAiQuestions(false)}
                className="rounded p-1 text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {aiQuestionsLoading ? (
            <div className="flex items-center gap-3 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
              <span className="text-sm text-[#9CA3AF]">Generating playtest questions...</span>
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-[#D1D5DB] whitespace-pre-wrap">{aiQuestions}</div>
          )}
        </div>
      )}

      {/* ─── AI TEST PLAN PANEL ─── */}
      {showTestPlan && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="text-sm font-semibold">AI QA Test Plan</h3>
              {testCases.length > 0 && (
                <span className="rounded bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                  {testCases.filter((t) => t.status !== "untested").length}/{testCases.length} tested
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {testCases.length > 0 && !testPlanLoading && (
                <button
                  onClick={exportTestReport}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export MD
                </button>
              )}
              <button
                onClick={() => setShowTestPlan(false)}
                className="rounded p-1 text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {testPlanLoading ? (
            <div className="flex items-center justify-center gap-3 px-5 py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
              <span className="text-sm text-[#9CA3AF]">Generating QA test plan...</span>
            </div>
          ) : testCases.length > 0 ? (
            <>
              {(() => {
                const passed = testCases.filter((t) => t.status === "passed").length;
                const failed = testCases.filter((t) => t.status === "failed").length;
                const skipped = testCases.filter((t) => t.status === "skipped").length;
                const total = testCases.length;
                const testedPct = Math.round(((passed + failed + skipped) / total) * 100);
                return (
                  <div className="border-b border-[#2A2A2A] px-5 py-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[#10B981]">{passed} passed</span>
                        <span className="text-[#EF4444]">{failed} failed</span>
                        <span className="text-[#6B7280]">{skipped} skipped</span>
                        <span className="text-[#9CA3AF]">{total - passed - failed - skipped} remaining</span>
                      </div>
                      <span className="font-medium tabular-nums text-[#F5F5F5]">{testedPct}%</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
                      {passed > 0 && (
                        <div
                          className="h-full bg-[#10B981] transition-all"
                          style={{ width: `${(passed / total) * 100}%` }}
                        />
                      )}
                      {failed > 0 && (
                        <div
                          className="h-full bg-[#EF4444] transition-all"
                          style={{ width: `${(failed / total) * 100}%` }}
                        />
                      )}
                      {skipped > 0 && (
                        <div
                          className="h-full bg-[#6B7280] transition-all"
                          style={{ width: `${(skipped / total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })()}

              <div>
                {Array.from(new Set(testCases.map((t) => t.category))).map((cat) => (
                  <div key={cat}>
                    <div className="bg-[#0F0F0F] px-5 py-2">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                        {cat}
                      </h4>
                    </div>
                    <div className="divide-y divide-[#2A2A2A]/50">
                      {testCases
                        .filter((t) => t.category === cat)
                        .map((tc) => (
                          <div
                            key={tc.id}
                            className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#1F1F1F]"
                          >
                            <div className="flex shrink-0 items-center gap-1 pt-0.5">
                              <button
                                onClick={() => toggleTestStatus(tc.id, "passed")}
                                className={`rounded p-1 transition-all ${
                                  tc.status === "passed"
                                    ? "bg-[#10B981]/20 text-[#10B981]"
                                    : "text-[#2A2A2A] hover:text-[#10B981]/60"
                                }`}
                                title="Pass"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => toggleTestStatus(tc.id, "failed")}
                                className={`rounded p-1 transition-all ${
                                  tc.status === "failed"
                                    ? "bg-[#EF4444]/20 text-[#EF4444]"
                                    : "text-[#2A2A2A] hover:text-[#EF4444]/60"
                                }`}
                                title="Fail"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => toggleTestStatus(tc.id, "skipped")}
                                className={`rounded px-1.5 py-1 text-[10px] font-medium transition-all ${
                                  tc.status === "skipped"
                                    ? "bg-[#6B7280]/20 text-[#9CA3AF]"
                                    : "text-[#2A2A2A] hover:text-[#6B7280]"
                                }`}
                                title="Skip"
                              >
                                SKIP
                              </button>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`text-sm font-medium ${
                                    tc.status === "passed"
                                      ? "text-[#10B981] line-through opacity-70"
                                      : tc.status === "failed"
                                        ? "text-[#EF4444]"
                                        : tc.status === "skipped"
                                          ? "text-[#6B7280] line-through"
                                          : "text-[#F5F5F5]"
                                  }`}
                                >
                                  {tc.name}
                                </p>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[tc.priority]}`}
                                >
                                  {tc.priority}
                                </span>
                              </div>
                              {tc.detail && (
                                <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                                  {tc.detail}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ─── RESULTS DASHBOARD ─── */}
      {activeView === "results" && (
        <>
          {stats && (
            <>
              {/* Hero Rating + Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-5xl font-bold text-[#F59E0B]">{stats.avgRating.toFixed(1)}</span>
                      <span className="ml-1 text-lg text-[#6B7280]">/5</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className="h-6 w-6"
                            style={{
                              color: s <= Math.round(stats.avgRating) ? "#F59E0B" : "#2A2A2A",
                              fill: s <= Math.round(stats.avgRating) ? "#F59E0B" : "none",
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-[#9CA3AF]">Average from <span className="font-medium text-[#D1D5DB]">{stats.total}</span> playtesters</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                  <div className="flex items-center justify-between">
                    <Bug className="h-4 w-4 text-[#EF4444]" />
                    <span className="text-xl font-bold">{stats.bugsReported}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#9CA3AF]">Bugs Reported</p>
                  <p className="mt-0.5 text-[10px] text-[#6B7280]">{stats.total > 0 ? Math.round((stats.bugsReported / stats.total) * 100) : 0}% of sessions</p>
                </div>
                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                  <div className="flex items-center justify-between">
                    <ThumbsUp className="h-4 w-4 text-[#10B981]" />
                    <span className="text-xl font-bold">
                      {Math.round(
                        ((stats.playAgainDist.definitely + stats.playAgainDist.yes) / stats.total) * 100
                      )}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#9CA3AF]">Would Play Again</p>
                  <p className="mt-0.5 text-[10px] text-[#6B7280]">{stats.playAgainDist.definitely + stats.playAgainDist.yes} of {stats.total}</p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Difficulty Distribution */}
                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <h3 className="text-sm font-medium mb-4">Difficulty Distribution</h3>
                  <div className="space-y-3">
                    {(Object.keys(stats.difficultyDist) as PlaytestResponse["difficulty"][]).map((d) => {
                      const pct = stats.total > 0 ? (stats.difficultyDist[d] / stats.total) * 100 : 0;
                      return (
                        <div key={d}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[#9CA3AF]">{DIFFICULTY_LABELS[d]}</span>
                            <span className="text-xs font-medium" style={{ color: DIFFICULTY_COLORS[d] }}>
                              {stats.difficultyDist[d]} ({Math.round(pct)}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#2A2A2A]">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, backgroundColor: DIFFICULTY_COLORS[d] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Play Again */}
                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <h3 className="text-sm font-medium mb-4">Would Play Again</h3>
                  <div className="space-y-3">
                    {(["definitely", "yes", "maybe", "no"] as PlaytestResponse["playAgain"][]).map((pa) => {
                      const pct = stats.total > 0 ? (stats.playAgainDist[pa] / stats.total) * 100 : 0;
                      return (
                        <div key={pa}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[#9CA3AF]">{PLAY_AGAIN_LABELS[pa]}</span>
                            <span className="text-xs font-medium" style={{ color: PLAY_AGAIN_COLORS[pa] }}>
                              {stats.playAgainDist[pa]} ({Math.round(pct)}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#2A2A2A]">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, backgroundColor: PLAY_AGAIN_COLORS[pa] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Word Cloud */}
                <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
                  <h3 className="text-sm font-medium mb-4">Common Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_WORDS.map((w) => {
                      const size = Math.max(11, Math.min(20, 10 + w.count * 3));
                      const opacity = Math.max(0.4, Math.min(1, 0.3 + w.count * 0.2));
                      return (
                        <span
                          key={w.word}
                          className="rounded-md bg-[#F59E0B]/10 px-2 py-1 font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
                          style={{ fontSize: `${size}px`, opacity }}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Ratings Over Time */}
          {responses.length > 0 && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
              <h3 className="text-sm font-medium mb-4">Ratings Over Time</h3>
              <div className="flex items-end gap-1 h-32">
                {responses.map((r) => {
                  const colors = ["#EF4444", "#F97316", "#F59E0B", "#3B82F6", "#10B981"];
                  return (
                    <div
                      key={r.id}
                      className="flex-1 flex flex-col items-center gap-1 group"
                      title={`${r.testerName}: ${r.overallRating}/5`}
                    >
                      <span className="text-[9px] text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity">
                        {r.overallRating}
                      </span>
                      <div
                        className="w-full min-w-[6px] max-w-[32px] rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${(r.overallRating / 5) * 100}%`,
                          backgroundColor: colors[r.overallRating - 1] || "#6B7280",
                        }}
                      />
                      <span className="text-[8px] text-[#6B7280] truncate max-w-full">
                        {r.testerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {responses.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={handleAiSummary}
                disabled={aiSummaryLoading}
                className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-2.5 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiSummaryLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {aiSummaryLoading ? "Analyzing feedback..." : "AI Summary"}
              </button>
              {aiSummary && (
                <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                      <h3 className="text-sm font-semibold text-[#F59E0B]">AI Feedback Summary</h3>
                    </div>
                    <button
                      onClick={() => setAiSummary("")}
                      className="rounded p-1 text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-sm leading-relaxed text-[#D1D5DB] whitespace-pre-wrap">{aiSummary}</div>
                </div>
              )}
            </div>
          )}

          {/* Playtest Sessions */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Playtest Sessions ({sessions.length})</h2>
              <button
                onClick={() => setShowSessionForm(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
              >
                <Plus className="h-3.5 w-3.5" />
                New Session
              </button>
            </div>
            {sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-left text-xs text-[#6B7280]">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Tester</th>
                      <th className="px-4 py-3 font-medium">Duration</th>
                      <th className="px-4 py-3 font-medium">Platform</th>
                      <th className="px-4 py-3 font-medium">Build</th>
                      <th className="px-4 py-3 font-medium">Responses</th>
                      <th className="px-4 py-3 font-medium">Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {sessions.map((s) => {
                      const sessionResponses = responses.filter(r => r.sessionId === s.id);
                      const avgRating = sessionResponses.length > 0
                        ? (sessionResponses.reduce((sum, r) => sum + r.overallRating, 0) / sessionResponses.length).toFixed(1)
                        : "\u2014";
                      const bugsInSession = sessionResponses.filter(r => r.bugEncountered).length;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setFilterSessionId(filterSessionId === s.id ? "all" : s.id)}
                          className={`cursor-pointer transition-colors ${
                            filterSessionId === s.id
                              ? "bg-[#F59E0B]/5"
                              : "hover:bg-[#1F1F1F]"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-[#6B7280]" />
                              {new Date(s.date + "T00:00:00").toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{s.testerName}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                              <Clock className="h-3.5 w-3.5" />
                              {s.durationMinutes}m
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-sm text-[#9CA3AF]">
                              <Monitor className="h-3.5 w-3.5" />
                              {s.platform}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-[#F59E0B]/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#F59E0B]">
                              {s.buildVersion}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm">
                              {sessionResponses.length}
                              {bugsInSession > 0 && (
                                <span className="ml-1.5 text-[10px] text-[#EF4444]">
                                  ({bugsInSession} bug{bugsInSession > 1 ? "s" : ""})
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-[#F59E0B]">{avgRating}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-[#6B7280]">
                No sessions recorded yet. Click &ldquo;New Session&rdquo; to start tracking.
              </div>
            )}
          </div>

          {/* Session Filter Indicator */}
          {filterSessionId !== "all" && (
            <div className="flex items-center gap-2 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-2">
              <span className="text-xs text-[#F59E0B]">
                Filtering by session: {sessions.find(s => s.id === filterSessionId)?.testerName} &mdash; {sessions.find(s => s.id === filterSessionId)?.buildVersion}
              </span>
              <button
                onClick={() => setFilterSessionId("all")}
                className="ml-auto rounded p-0.5 text-[#F59E0B] hover:bg-[#F59E0B]/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-[#6B7280]" />
            <button
              onClick={() => setFilterCategory("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterCategory === "all"
                  ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "text-[#6B7280] hover:text-[#9CA3AF]"
              }`}
            >
              All ({responses.length})
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const count = responses.filter((r) => responseCategories.get(r.id)?.includes(cat)).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: filterCategory === cat ? `${CATEGORY_CONFIG[cat].color}15` : "transparent",
                    color: filterCategory === cat ? CATEGORY_CONFIG[cat].color : "#6B7280",
                  }}
                >
                  {CATEGORY_CONFIG[cat].label} ({count})
                </button>
              );
            })}
          </div>

          {/* Individual Responses */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
            <div className="border-b border-[#2A2A2A] px-5 py-4">
              <h2 className="font-semibold">Individual Responses ({filteredResponses.length})</h2>
            </div>
            <div className="divide-y divide-[#2A2A2A]">
              {filteredResponses.map((r) => (
                <div key={r.id}>
                  <div
                    onClick={() => {
                      console.log("[PlaytestPage] toggling response:", r.testerName);
                      setExpandedResponse(expandedResponse === r.id ? null : r.id);
                    }}
                    className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-[#1F1F1F]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2A2A2A] text-sm font-medium text-[#D1D5DB]">
                      {r.testerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.testerName}</span>
                        <span className="text-xs text-[#6B7280]">
                          {new Date(r.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className="h-3 w-3"
                              style={{
                                color: s <= r.overallRating ? "#F59E0B" : "#2A2A2A",
                                fill: s <= r.overallRating ? "#F59E0B" : "none",
                              }}
                            />
                          ))}
                        </div>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${DIFFICULTY_COLORS[r.difficulty]}15`,
                            color: DIFFICULTY_COLORS[r.difficulty],
                          }}
                        >
                          {DIFFICULTY_LABELS[r.difficulty]}
                        </span>
                        {r.bugEncountered && (
                          <span className="flex items-center gap-1 text-[10px] text-[#EF4444]">
                            <Bug className="h-3 w-3" />
                            Bug
                          </span>
                        )}
                        <span className="text-[10px] text-[#6B7280]">{r.platform}</span>
                        {responseCategories.get(r.id)?.map((cat) => (
                          <span
                            key={cat}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${CATEGORY_CONFIG[cat].color}15`,
                              color: CATEGORY_CONFIG[cat].color,
                            }}
                          >
                            {CATEGORY_CONFIG[cat].label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-[#6B7280] transition-transform ${
                        expandedResponse === r.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {expandedResponse === r.id && (
                    <div className="border-t border-[#2A2A2A]/50 bg-[#151515] px-5 py-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <span className="text-xs text-[#6B7280]">Favorite Moment</span>
                          <p className="mt-1 text-sm text-[#D1D5DB] leading-relaxed">{r.favoriteMoment || "—"}</p>
                        </div>
                        <div>
                          <span className="text-xs text-[#6B7280]">Frustrating Moment</span>
                          <p className="mt-1 text-sm text-[#D1D5DB] leading-relaxed">{r.frustratingMoment || "—"}</p>
                        </div>
                      </div>
                      {r.bugEncountered && r.bugDescription && (
                        <div>
                          <span className="flex items-center gap-1 text-xs text-[#EF4444]">
                            <AlertTriangle className="h-3 w-3" />
                            Bug Report
                          </span>
                          <p className="mt-1 text-sm text-[#D1D5DB] leading-relaxed">{r.bugDescription}</p>
                        </div>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <span className="text-xs text-[#6B7280]">Would Play Again</span>
                          <p className="mt-1">
                            <span
                              className="rounded-md px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${PLAY_AGAIN_COLORS[r.playAgain]}15`,
                                color: PLAY_AGAIN_COLORS[r.playAgain],
                              }}
                            >
                              {PLAY_AGAIN_LABELS[r.playAgain]}
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-[#6B7280]">Platform</span>
                          <p className="mt-1 flex items-center gap-1 text-sm text-[#D1D5DB]">
                            <Monitor className="h-3.5 w-3.5" />
                            {r.platform}
                          </p>
                        </div>
                      </div>
                      {r.suggestions && (
                        <div>
                          <span className="flex items-center gap-1 text-xs text-[#6B7280]">
                            <MessageSquare className="h-3 w-3" />
                            Suggestions
                          </span>
                          <p className="mt-1 text-sm text-[#D1D5DB] leading-relaxed">{r.suggestions}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {filteredResponses.length === 0 && (
                <div className="py-12 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-[#6B7280]" />
                  <p className="mt-2 text-sm text-[#6B7280]">No responses yet</p>
                  <button
                    onClick={() => {
                      setActiveView("playtester");
                      resetForm();
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-[#F59E0B] hover:underline"
                  >
                    Preview the playtester form
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── PLAYTESTER FORM VIEW ─── */}
      {activeView === "playtester" && (
        <div className="mx-auto max-w-2xl">
          {!ptSubmitted ? (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold">{project.name} — Playtest Feedback</h2>
                <p className="mt-1 text-sm text-[#9CA3AF]">
                  Help us improve by sharing your honest experience
                </p>
              </div>

              <form onSubmit={handleSubmitPlaytest} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Your Name</label>
                  <input
                    type="text"
                    value={ptName}
                    onChange={(e) => setPtName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Overall Experience</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setPtHoverRating(s)}
                        onMouseLeave={() => setPtHoverRating(0)}
                        onClick={() => {
                          console.log("[PlaytestPage] rating set:", s);
                          setPtRating(s);
                        }}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className="h-8 w-8"
                          style={{
                            color: s <= (ptHoverRating || ptRating) ? "#F59E0B" : "#2A2A2A",
                            fill: s <= (ptHoverRating || ptRating) ? "#F59E0B" : "none",
                          }}
                        />
                      </button>
                    ))}
                    {ptRating > 0 && (
                      <span className="ml-2 text-sm text-[#9CA3AF]">
                        {ptRating}/5
                      </span>
                    )}
                  </div>
                  {ptRating === 0 && (
                    <p className="mt-1 text-xs text-[#6B7280]">Click a star to rate</p>
                  )}
                </div>

                {/* Difficulty */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Difficulty</label>
                  <div className="flex gap-2">
                    {(["too-easy", "just-right", "too-hard"] as PlaytestResponse["difficulty"][]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          console.log("[PlaytestPage] difficulty:", d);
                          setPtDifficulty(d);
                        }}
                        className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                          ptDifficulty === d
                            ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                            : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#3A3A3A]"
                        }`}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Favorite Moment */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Favorite Moment</label>
                  <textarea
                    value={ptFavorite}
                    onChange={(e) => setPtFavorite(e.target.value)}
                    placeholder="What did you enjoy most?"
                    rows={2}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                  />
                </div>

                {/* Frustrating Moment */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Frustrating Moment</label>
                  <textarea
                    value={ptFrustrating}
                    onChange={(e) => setPtFrustrating(e.target.value)}
                    placeholder="What was frustrating or confusing?"
                    rows={2}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                  />
                </div>

                {/* Bug Encountered */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Did you encounter any bugs?</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log("[PlaytestPage] bug found: yes");
                        setPtBugFound(true);
                      }}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        ptBugFound
                          ? "border-[#EF4444]/50 bg-[#EF4444]/10 text-[#EF4444]"
                          : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#3A3A3A]"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log("[PlaytestPage] bug found: no");
                        setPtBugFound(false);
                        setPtBugDesc("");
                      }}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        !ptBugFound
                          ? "border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]"
                          : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#3A3A3A]"
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {ptBugFound && (
                    <textarea
                      value={ptBugDesc}
                      onChange={(e) => setPtBugDesc(e.target.value)}
                      placeholder="Describe the bug(s) you encountered..."
                      rows={2}
                      className="mt-2 w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                    />
                  )}
                </div>

                {/* Play Again */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Would you play again?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["definitely", "yes", "maybe", "no"] as PlaytestResponse["playAgain"][]).map((pa) => (
                      <button
                        key={pa}
                        type="button"
                        onClick={() => {
                          console.log("[PlaytestPage] play again:", pa);
                          setPtPlayAgain(pa);
                        }}
                        className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-all ${
                          ptPlayAgain === pa
                            ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                            : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#3A3A3A]"
                        }`}
                      >
                        {PLAY_AGAIN_LABELS[pa]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Suggestions</label>
                  <textarea
                    value={ptSuggestions}
                    onChange={(e) => setPtSuggestions(e.target.value)}
                    placeholder="Any features, improvements, or ideas?"
                    rows={3}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                  />
                </div>

                {/* Platform */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">Platform</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["PC", "Mac", "Mobile", "Console"] as PlaytestResponse["platform"][]).map((pl) => (
                      <button
                        key={pl}
                        type="button"
                        onClick={() => {
                          console.log("[PlaytestPage] platform:", pl);
                          setPtPlatform(pl);
                        }}
                        className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-all ${
                          ptPlatform === pl
                            ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                            : "border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:border-[#3A3A3A]"
                        }`}
                      >
                        {pl}
                      </button>
                    ))}
                  </div>
                </div>

                {sessions.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#D1D5DB]">
                      Link to Session (optional)
                    </label>
                    <select
                      value={ptSessionId}
                      onChange={(e) => setPtSessionId(e.target.value)}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                    >
                      <option value="">No session</option>
                      {sessions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.testerName} &mdash; {new Date(s.date + "T00:00:00").toLocaleDateString()} ({s.buildVersion})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={ptRating === 0}
                  className="w-full rounded-lg bg-[#F59E0B] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Feedback
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/10">
                <ThumbsUp className="h-8 w-8 text-[#10B981]" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Thanks for your feedback!</h2>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                Your response has been recorded. It helps make {project.name} better.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    console.log("[PlaytestPage] submitting another");
                    resetForm();
                  }}
                  className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                >
                  Submit Another
                </button>
                <button
                  onClick={() => setActiveView("results")}
                  className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
                >
                  View Results
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── NEW SESSION MODAL ─── */}
      {showSessionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Playtest Session</h3>
              <button
                onClick={() => setShowSessionForm(false)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">Date</label>
                  <input
                    type="date"
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">Duration (min)</label>
                  <input
                    type="number"
                    value={newSessionDuration}
                    onChange={(e) => setNewSessionDuration(Number(e.target.value))}
                    min={1}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">Tester Name</label>
                <input
                  type="text"
                  value={newSessionTester}
                  onChange={(e) => setNewSessionTester(e.target.value)}
                  placeholder="Who's testing?"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">Platform</label>
                  <select
                    value={newSessionPlatform}
                    onChange={(e) => setNewSessionPlatform(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#F59E0B]/50"
                  >
                    <option value="PC">PC</option>
                    <option value="Mac">Mac</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Console">Console</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#6B7280]">Build Version</label>
                  <input
                    type="text"
                    value={newSessionBuild}
                    onChange={(e) => setNewSessionBuild(e.target.value)}
                    placeholder="e.g. 0.9.2-beta"
                    required
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6B7280]">Notes</label>
                <textarea
                  value={newSessionNotes}
                  onChange={(e) => setNewSessionNotes(e.target.value)}
                  placeholder="Session goals, focus areas, test plan..."
                  rows={2}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90"
              >
                Create Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── SHARE MODAL ─── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Share Playtest Form</h3>
              <button onClick={() => setShowShareModal(false)} className="rounded-lg p-1 text-[#9CA3AF] hover:text-[#F5F5F5]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[#9CA3AF] mb-4">
              Share this link with your playtesters to collect feedback.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-xs text-[#9CA3AF] font-mono truncate">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/dashboard/projects/${projectId}/playtest?view=form`
                  : `/dashboard/projects/${projectId}/playtest?view=form`}
              </div>
              <button
                onClick={copyLink}
                className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  linkCopied
                    ? "bg-[#10B981] text-white"
                    : "bg-[#F59E0B] text-black hover:bg-[#F59E0B]/90"
                }`}
              >
                {linkCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setActiveView("playtester");
                  resetForm();
                }}
                className="flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
