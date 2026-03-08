"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Square,
  CheckSquare,
  Rocket,
  Store,
  Hammer,
  Megaphone,
  Scale,
  Users,
  CalendarClock,
  RotateCcw,
  PartyPopper,
  Plus,
  MessageSquare,
  X,
  Target,
  Check,
  Sparkles,
  Loader2,
  Copy,
  Mic,
  Film,
  FileText,
  Download,
  Eye,
  AlertTriangle as TriangleAlert,
  CheckCircle2,
  XCircle,
  Hash,
  Camera,
  Music,
  Gamepad2,
  Share2,
  DollarSign,
  MousePointerClick,
  Star,
  Printer,
} from "lucide-react";
import { getProject, type Project } from "@/lib/store";
import Breadcrumbs from "@/components/Breadcrumbs";

interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
  isCustom?: boolean;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  items: ChecklistItem[];
}

const DEFAULT_CHECKLIST: ChecklistCategory[] = [
  {
    id: "storePage",
    title: "Store Page",
    icon: Store,
    color: "#3B82F6",
    items: [
      { id: "sp_title", label: "Title finalized", detail: "Confirmed no trademark conflicts" },
      { id: "sp_desc", label: "Store description written", detail: "Short and long descriptions, localized if needed" },
      { id: "sp_screenshots", label: "Screenshots ready (5+)", detail: "High-res, showcasing core gameplay moments" },
      { id: "sp_trailer", label: "Trailer uploaded", detail: "60-90 seconds, gameplay-focused, no spoilers" },
      { id: "sp_capsule", label: "Capsule art designed", detail: "Header, small capsule, library hero, logo" },
      { id: "sp_tags", label: "Tags & categories set", detail: "Genre, features, controller support, etc." },
      { id: "sp_sysreq", label: "System requirements listed", detail: "Minimum and recommended specs" },
    ],
  },
  {
    id: "build",
    title: "Build",
    icon: Hammer,
    color: "#F59E0B",
    items: [
      { id: "b_release", label: "Release build tested", detail: "Not a debug build — final, optimized binary" },
      { id: "b_nodebug", label: "No debug code remaining", detail: "Console logs, debug UI, dev cheats removed" },
      { id: "b_perf", label: "Performance profiled", detail: "Meets target FPS on min-spec hardware" },
      { id: "b_crash", label: "Crash reporting enabled", detail: "Sentry, Backtrace, or platform-native crash reporter" },
      { id: "b_install", label: "Install/uninstall tested", detail: "Clean install, verify all files present" },
      { id: "b_saves", label: "Save/load regression test", detail: "Old saves still load correctly" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: Megaphone,
    color: "#EC4899",
    items: [
      { id: "m_presskit", label: "Press kit ready", detail: "Screenshots, logos, fact sheet, team bios" },
      { id: "m_influencers", label: "Influencer list compiled", detail: "YouTubers, streamers, journalists — keys sent" },
      { id: "m_social", label: "Social media posts scheduled", detail: "Launch day, day-1 patch, first week content plan" },
      { id: "m_landing", label: "Landing page / website live", detail: "With trailer, store links, mailing list signup" },
      { id: "m_devlog", label: "Launch devlog / blog post written", detail: "Behind-the-scenes, lessons learned, thank yous" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    icon: Scale,
    color: "#8B5CF6",
    items: [
      { id: "l_eula", label: "EULA / Terms of Service drafted", detail: "Reviewed by legal if possible" },
      { id: "l_privacy", label: "Privacy policy published", detail: "Required for most storefronts and GDPR compliance" },
      { id: "l_rating", label: "Age rating obtained", detail: "ESRB, PEGI, or IARC rating via platform" },
      { id: "l_credits", label: "Credits screen complete", detail: "All team members, middleware, assets, licenses" },
      { id: "l_licenses", label: "Third-party licenses reviewed", detail: "Fonts, music, middleware — all license-compliant" },
    ],
  },
  {
    id: "community",
    title: "Community",
    icon: Users,
    color: "#10B981",
    items: [
      { id: "c_discord", label: "Discord server set up", detail: "Channels, roles, welcome message, moderation bots" },
      { id: "c_guidelines", label: "Community guidelines posted", detail: "Code of conduct, reporting process" },
      { id: "c_bugreport", label: "Bug report form ready", detail: "Template with repro steps, specs, screenshots" },
      { id: "c_feedback", label: "Feedback channel created", detail: "Dedicated space for suggestions and feature requests" },
      { id: "c_faq", label: "FAQ / known issues page", detail: "Common questions and workarounds" },
    ],
  },
  {
    id: "postLaunch",
    title: "Post-Launch",
    icon: CalendarClock,
    color: "#F97316",
    items: [
      { id: "pl_dayone", label: "Day-1 patch plan documented", detail: "Known issues to fix, timeline for first patch" },
      { id: "pl_monitoring", label: "Monitoring dashboard set up", detail: "Crash rates, player counts, performance metrics" },
      { id: "pl_hotfix", label: "Hotfix process established", detail: "Who can deploy? How fast? Rollback plan?" },
      { id: "pl_roadmap", label: "Roadmap published", detail: "Public-facing plan for updates and content" },
      { id: "pl_support", label: "Support email / system ready", detail: "Player-facing contact for bugs and refunds" },
    ],
  },
];

function getChecklistKey(projectId: string) {
  return `gameforge_launch_${projectId}`;
}
function getCustomItemsKey(projectId: string) {
  return `gameforge_launch_custom_${projectId}`;
}
function getNotesKey(projectId: string) {
  return `gameforge_launch_notes_${projectId}`;
}

function loadData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function saveData(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getScoreColor(pct: number): string {
  if (pct >= 80) return "#10B981";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function getScoreLabel(pct: number): string {
  if (pct === 100) return "You're Ready to Launch!";
  if (pct >= 80) return "Looking Good!";
  if (pct >= 50) return "Almost There";
  if (pct >= 25) return "Making Progress";
  if (pct > 0) return "Just Getting Started";
  return "No Items Checked";
}

function parseMarketingSections(text: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  const lines = text.split("\n");
  let currentTitle = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (headerMatch) {
      if (currentTitle && currentContent.length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join("\n").trim() });
      }
      currentTitle = headerMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentTitle && currentContent.length > 0) {
    sections.push({ title: currentTitle, content: currentContent.join("\n").trim() });
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({ title: "Marketing Copy", content: text.trim() });
  }

  return sections;
}

const SOCIAL_PLATFORM_META: { name: string; icon: React.ElementType; color: string; charLimit?: number }[] = [
  { name: "Twitter/X", icon: Hash, color: "#1DA1F2", charLimit: 280 },
  { name: "Instagram", icon: Camera, color: "#E1306C" },
  { name: "Reddit", icon: MessageSquare, color: "#FF4500" },
  { name: "TikTok", icon: Music, color: "#00F2EA" },
  { name: "Steam", icon: Gamepad2, color: "#66C0F4" },
];

function parseSocialPosts(text: string): { platform: string; content: string }[] {
  const posts: { platform: string; content: string }[] = [];
  const lines = text.split("\n");
  let currentPlatform = "";
  let currentContent: string[] = [];
  const platformKeys = ["twitter", "instagram", "reddit", "tiktok", "steam"];
  const platformNames: Record<string, string> = {
    twitter: "Twitter/X",
    instagram: "Instagram",
    reddit: "Reddit",
    tiktok: "TikTok",
    steam: "Steam",
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    const matched = platformKeys.find((k) => lower.includes(k));
    const isHeader =
      matched &&
      (/^\s*\*\*/.test(line) || /^\s*#{1,4}\s/.test(line) || /^\s*\d+[\.\)]/.test(line));

    if (isHeader && matched) {
      if (currentPlatform && currentContent.length > 0) {
        posts.push({
          platform: currentPlatform,
          content: currentContent.join("\n").replace(/^\s*\n|\n\s*$/g, "").trim(),
        });
      }
      currentPlatform = platformNames[matched];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentPlatform && currentContent.length > 0) {
    posts.push({
      platform: currentPlatform,
      content: currentContent.join("\n").replace(/^\s*\n|\n\s*$/g, "").trim(),
    });
  }

  if (posts.length === 0 && text.trim()) {
    posts.push({ platform: "Social Post", content: text.trim() });
  }

  return posts;
}

interface MockReview {
  reviewer: string;
  score: number;
  text: string;
}

function parseReviews(raw: string): MockReview[] {
  const reviews: MockReview[] = [];
  const chunks = raw.split(/\n(?=\d[\.\)]\s|\*\*\d|\*\*(?:Positive|Mixed|Negative|Review))/i).filter(s => s.trim());
  for (const chunk of chunks) {
    const scoreMatch = chunk.match(/(\d+)\s*\/\s*10/);
    if (!scoreMatch) continue;
    const score = Math.min(10, Math.max(1, parseInt(scoreMatch[1])));
    let reviewer = "";
    const namePatterns = [
      /[-\u2013\u2014]\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)/,
      /(?:Reviewer|Name|By)[:\s]+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)/i,
      /\*\*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)+)\*\*/,
    ];
    for (const p of namePatterns) {
      const m = chunk.match(p);
      if (m && !m[1].match(/^(Positive|Mixed|Negative|Review|Score)/i)) {
        reviewer = m[1].trim();
        break;
      }
    }
    if (!reviewer) reviewer = `Reviewer ${reviews.length + 1}`;
    const text = chunk
      .replace(/^\d[\.\)]\s*/, "")
      .replace(/\*\*[^*]*\*\*/g, "")
      .replace(/(\d+)\s*\/\s*10/g, "")
      .split("\n")
      .map(l => l.replace(/^[-*]\s*/, "").trim())
      .filter(l => l && !l.match(/^(Reviewer|Name|By|Score)[:\s]/i))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) reviews.push({ reviewer, score, text });
  }
  if (reviews.length === 0 && raw.trim()) {
    reviews.push({ reviewer: "Anonymous Reviewer", score: 7, text: raw.trim() });
  }
  return reviews;
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 2);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < stars ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#4B5563]"}`}
        />
      ))}
    </div>
  );
}

function AccessibilityResults({ text }: { text: string }) {
  const sections: { category: string; rating: "pass" | "warning" | "fail"; lines: string[] }[] = [];
  let current: { category: string; rating: "pass" | "warning" | "fail"; lines: string[] } | null = null;

  for (const line of text.split("\n")) {
    const ratingMatch = line.match(/\*\*(.+?)\*\*[:\s\-–]*(Pass|Warning|Fail)/i)
      || line.match(/^#{1,4}\s*(.+?)[:\s\-–]+(Pass|Warning|Fail)/i)
      || line.match(/^(.+?)[:\s\-–]+(Pass|Warning|Fail)\s*$/i);

    if (ratingMatch) {
      if (current) sections.push(current);
      current = {
        category: ratingMatch[1].replace(/[*#]/g, "").trim(),
        rating: ratingMatch[2].toLowerCase() as "pass" | "warning" | "fail",
        lines: [],
      };
    } else if (current && line.trim()) {
      current.lines.push(line.replace(/^[-*]\s*/, "").trim());
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
        {text}
      </div>
    );
  }

  const ratingConfig = {
    pass: { icon: CheckCircle2, color: "#10B981", bg: "bg-[#10B981]/10", label: "Pass" },
    warning: { icon: TriangleAlert, color: "#F59E0B", bg: "bg-[#F59E0B]/10", label: "Warning" },
    fail: { icon: XCircle, color: "#EF4444", bg: "bg-[#EF4444]/10", label: "Fail" },
  };

  return (
    <div className="space-y-3">
      {sections.map((s) => {
        const cfg = ratingConfig[s.rating];
        const Icon = cfg.icon;
        return (
          <div key={s.category} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0" style={{ color: cfg.color }} />
              <span className="flex-1 text-sm font-semibold text-[#F5F5F5]">{s.category}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg}`}
                style={{ color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
            {s.lines.length > 0 && (
              <ul className="mt-2.5 space-y-1.5 pl-8">
                {s.lines.map((l, i) => (
                  <li key={i} className="text-sm leading-relaxed text-[#9CA3AF]">
                    <span className="mr-1.5 text-[#4B5563]">&bull;</span>
                    {l}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UxReviewResults({ text }: { text: string }) {
  const sections: { category: string; rating: "good" | "needs_work" | "critical"; lines: string[] }[] = [];
  let current: { category: string; rating: "good" | "needs_work" | "critical"; lines: string[] } | null = null;

  for (const line of text.split("\n")) {
    const ratingMatch = line.match(/\*\*(.+?)\*\*[:\s\-–]*(Good|Needs\s*Work|Critical)/i)
      || line.match(/^#{1,4}\s*(.+?)[:\s\-–]+(Good|Needs\s*Work|Critical)/i)
      || line.match(/^(.+?)[:\s\-–]+(Good|Needs\s*Work|Critical)\s*$/i);

    if (ratingMatch) {
      if (current) sections.push(current);
      const raw = ratingMatch[2].toLowerCase().replace(/\s+/g, "_");
      const rating = raw === "good" ? "good" : raw.startsWith("needs") ? "needs_work" : "critical";
      current = {
        category: ratingMatch[1].replace(/[*#]/g, "").trim(),
        rating,
        lines: [],
      };
    } else if (current && line.trim()) {
      current.lines.push(line.replace(/^[-*]\s*/, "").trim());
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
        {text}
      </div>
    );
  }

  const ratingConfig = {
    good: { icon: CheckCircle2, color: "#10B981", bg: "bg-[#10B981]/10", label: "Good" },
    needs_work: { icon: TriangleAlert, color: "#F59E0B", bg: "bg-[#F59E0B]/10", label: "Needs Work" },
    critical: { icon: XCircle, color: "#EF4444", bg: "bg-[#EF4444]/10", label: "Critical" },
  };

  return (
    <div className="space-y-3">
      {sections.map((s) => {
        const cfg = ratingConfig[s.rating];
        const Icon = cfg.icon;
        return (
          <div key={s.category} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0" style={{ color: cfg.color }} />
              <span className="flex-1 text-sm font-semibold text-[#F5F5F5]">{s.category}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg}`}
                style={{ color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
            {s.lines.length > 0 && (
              <ul className="mt-2.5 space-y-1.5 pl-8">
                {s.lines.map((l, i) => (
                  <li key={i} className="text-sm leading-relaxed text-[#9CA3AF]">
                    <span className="mr-1.5 text-[#4B5563]">&bull;</span>
                    {l}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LaunchChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [customItems, setCustomItems] = useState<Record<string, ChecklistItem[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [aiPlan, setAiPlan] = useState<string>("");
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiPlanOpen, setAiPlanOpen] = useState(false);
  const [aiMarketing, setAiMarketing] = useState<string>("");
  const [aiMarketingLoading, setAiMarketingLoading] = useState(false);
  const [aiMarketingOpen, setAiMarketingOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [aiPitch, setAiPitch] = useState<string>("");
  const [aiPitchLoading, setAiPitchLoading] = useState(false);
  const [aiPitchOpen, setAiPitchOpen] = useState(false);
  const [aiTrailer, setAiTrailer] = useState<string>("");
  const [aiTrailerLoading, setAiTrailerLoading] = useState(false);
  const [aiTrailerOpen, setAiTrailerOpen] = useState(false);
  const [aiPressKit, setAiPressKit] = useState<string>("");
  const [aiPressKitLoading, setAiPressKitLoading] = useState(false);
  const [aiPressKitOpen, setAiPressKitOpen] = useState(false);
  const [aiAccessibility, setAiAccessibility] = useState<string>("");
  const [aiAccessibilityLoading, setAiAccessibilityLoading] = useState(false);
  const [aiAccessibilityOpen, setAiAccessibilityOpen] = useState(false);
  const [aiSocial, setAiSocial] = useState<string>("");
  const [aiSocialLoading, setAiSocialLoading] = useState(false);
  const [aiSocialOpen, setAiSocialOpen] = useState(false);
  const [aiMonetization, setAiMonetization] = useState<string>("");
  const [aiMonetizationLoading, setAiMonetizationLoading] = useState(false);
  const [aiMonetizationOpen, setAiMonetizationOpen] = useState(false);
  const [aiUxReview, setAiUxReview] = useState<string>("");
  const [aiUxReviewLoading, setAiUxReviewLoading] = useState(false);
  const [aiUxReviewOpen, setAiUxReviewOpen] = useState(false);
  const [aiReviews, setAiReviews] = useState<string>("");
  const [aiReviewsLoading, setAiReviewsLoading] = useState(false);
  const [aiReviewsOpen, setAiReviewsOpen] = useState(false);
  const [aiDayChecklist, setAiDayChecklist] = useState<string>("");
  const [aiDayChecklistLoading, setAiDayChecklistLoading] = useState(false);
  const [aiCountdownLoading, setAiCountdownLoading] = useState(false);
  const [aiCountdownResult, setAiCountdownResult] = useState("");

  useEffect(() => {
    const p = getProject(projectId);
    if (!p) {
      router.replace("/dashboard/projects");
      return;
    }
    setProject(p);
    setChecked(loadData(getChecklistKey(projectId), {}));
    setCustomItems(loadData(getCustomItemsKey(projectId), {}));
    setNotes(loadData(getNotesKey(projectId), {}));
    const initial: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach((c) => (initial[c.id] = true));
    setExpanded(initial);
  }, [projectId, router]);

  const effectiveChecklist = DEFAULT_CHECKLIST.map((cat) => ({
    ...cat,
    items: [
      ...cat.items,
      ...(customItems[cat.id] || []).map((i) => ({ ...i, isCustom: true })),
    ],
  }));

  const allItemIds = new Set(effectiveChecklist.flatMap((c) => c.items.map((i) => i.id)));
  const totalItems = effectiveChecklist.reduce((acc, c) => acc + c.items.length, 0);
  const totalChecked = Object.entries(checked).filter(([id, v]) => v && allItemIds.has(id)).length;
  const overallPct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;
  const allDone = totalChecked === totalItems && totalItems > 0;
  const scoreColor = getScoreColor(overallPct);

  const generateLaunchPlan = useCallback(async () => {
    if (!project || aiPlanLoading) return;
    setAiPlanLoading(true);
    setAiPlanOpen(true);
    setAiPlan("");
    try {
      const prompt = `Create a 7-day launch plan for an indie game called '${project.name}' (${project.genre || "unknown genre"}, currently in ${project.status || "development"} with ${overallPct}% complete). Include: Day 1-2: Pre-launch prep, Day 3-4: Marketing push, Day 5: Launch day tasks, Day 6-7: Post-launch tasks. Be specific and actionable. Format with bold day headers.`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate a launch plan. Please try again.";
      setAiPlan(content);
    } catch {
      setAiPlan("Failed to generate launch plan. Check your API key and try again.");
    } finally {
      setAiPlanLoading(false);
    }
  }, [project, aiPlanLoading, overallPct]);

  const generateMarketingCopy = useCallback(async () => {
    if (!project || aiMarketingLoading) return;
    setAiMarketingLoading(true);
    setAiMarketingOpen(true);
    setAiMarketing("");
    try {
      const prompt = `Write marketing copy for an indie game called '${project.name}'. Genre: ${project.genre || "unknown"}. Description: ${project.description || "An indie game in development."}. Include: 1) A store page description (2 paragraphs), 2) Three catchy taglines, 3) Five feature bullet points, 4) A press kit summary (1 paragraph). Format with bold headers.`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate marketing copy. Please try again.";
      setAiMarketing(content);
    } catch {
      setAiMarketing("Failed to generate marketing copy. Check your API key and try again.");
    } finally {
      setAiMarketingLoading(false);
    }
  }, [project, aiMarketingLoading]);

  const generatePitch = useCallback(async () => {
    if (!project || aiPitchLoading) return;
    setAiPitchLoading(true);
    setAiPitchOpen(true);
    setAiPitch("");
    try {
      const gddRaw = localStorage.getItem(`gameforge_gdd_${projectId}`);
      const gddData: Record<string, string> | null = gddRaw ? JSON.parse(gddRaw) : null;
      const description = gddData?.elevatorPitch || gddData?.tagline || project.description || "An indie game in development.";
      const features = gddData
        ? [gddData.coreVerbs, gddData.gameplayLoop, gddData.visualStyle, gddData.setting]
            .filter(Boolean)
            .map((v) => v!.slice(0, 100))
            .join(". ")
        : "";
      const prompt = `Write a game pitch for '${project.name}', a ${project.genre || "unknown genre"} game. Description: ${description}. ${features ? `Key features: ${features}.` : ""} Include: 1) A 30-second elevator pitch, 2) Unique selling points (3 bullets), 3) Target audience, 4) Comparable games ('X meets Y'). Format with bold headers.`;
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
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate a pitch. Please try again.";
      setAiPitch(content);
    } catch {
      setAiPitch("Failed to generate pitch. Check your API key and try again.");
    } finally {
      setAiPitchLoading(false);
    }
  }, [project, aiPitchLoading, projectId]);

  const generateTrailerScript = useCallback(async () => {
    if (!project || aiTrailerLoading) return;
    setAiTrailerLoading(true);
    setAiTrailerOpen(true);
    setAiTrailer("");
    try {
      const gddRaw = localStorage.getItem(`gameforge_gdd_${projectId}`);
      const gddData: Record<string, string> | null = gddRaw ? JSON.parse(gddRaw) : null;
      const features = gddData
        ? [gddData.coreVerbs, gddData.gameplayLoop, gddData.visualStyle]
            .filter(Boolean)
            .map((v) => v!.slice(0, 100))
            .join(", ")
        : project.description || "unique mechanics and engaging gameplay";
      const visualStyle = gddData?.visualStyle || "stylized";
      const prompt = `Write a 60-second game trailer script for '${project.name}', a ${project.genre || "unknown genre"} game. Key features: ${features}. Visual style: ${visualStyle}. Include: opening hook (5 seconds), gameplay montage directions (20 seconds), feature highlights with text overlays (20 seconds), closing with logo and release info (15 seconds). Format as a shot-by-shot script with timecodes.`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate a trailer script. Please try again.";
      setAiTrailer(content);
    } catch {
      setAiTrailer("Failed to generate trailer script. Check your API key and try again.");
    } finally {
      setAiTrailerLoading(false);
    }
  }, [project, aiTrailerLoading, projectId]);

  const generatePressKit = useCallback(async () => {
    if (!project || aiPressKitLoading) return;
    setAiPressKitLoading(true);
    setAiPressKitOpen(true);
    setAiPressKit("");
    try {
      const prompt = `Write a press kit for indie game '${project.name}'. Genre: ${project.genre || "unknown"}. Description: ${project.description || "An indie game in development."}. Include: 1) Factsheet (developer, release date, platform, price point, press contact), 2) Game description (3 paragraphs), 3) Key Features (5 bullets), 4) Developer story (1 paragraph about the team/solo dev journey). Format with bold headers.`;
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
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate a press kit. Please try again.";
      setAiPressKit(content);
    } catch {
      setAiPressKit("Failed to generate press kit. Check your API key and try again.");
    } finally {
      setAiPressKitLoading(false);
    }
  }, [project, aiPressKitLoading]);

  const exportPressKitAsMarkdown = useCallback(() => {
    if (!aiPressKit || !project) return;
    const blob = new Blob([`# ${project.name} — Press Kit\n\n${aiPressKit}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-press-kit.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [aiPressKit, project]);

  const generateAccessibilityCheck = useCallback(async () => {
    if (!project || aiAccessibilityLoading) return;
    setAiAccessibilityLoading(true);
    setAiAccessibilityOpen(true);
    setAiAccessibility("");
    try {
      const gddRaw = localStorage.getItem(`gameforge_gdd_${projectId}`);
      const gddData: Record<string, string> | null = gddRaw ? JSON.parse(gddRaw) : null;
      const genre = project.genre || gddData?.genre || "unknown genre";
      const controls = gddData?.controls || "not specified";
      const features = gddData
        ? [gddData.coreVerbs, gddData.gameplayLoop, gddData.elevatorPitch].filter(Boolean).join(". ")
        : project.description || "not specified";
      const prompt = `Review this ${genre} game for accessibility. Controls: ${controls}. Features: ${features}. Check for: visual accessibility (color blindness, text size, contrast), motor accessibility (rebindable controls, difficulty options, auto-aim), audio accessibility (subtitles, visual cues for audio), cognitive accessibility (tutorials, UI clarity). Rate each area Pass/Warning/Fail and suggest specific improvements. Be brief. Format each area as: **Area Name**: Rating\n- suggestion`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate accessibility review. Please try again.";
      setAiAccessibility(content);
    } catch {
      setAiAccessibility("Failed to generate accessibility review. Check your API key and try again.");
    } finally {
      setAiAccessibilityLoading(false);
    }
  }, [project, aiAccessibilityLoading, projectId]);

  const generateSocialPosts = useCallback(async () => {
    if (!project || aiSocialLoading) return;
    setAiSocialLoading(true);
    setAiSocialOpen(true);
    setAiSocial("");
    try {
      const prompt = `Write 5 social media posts for announcing the indie game '${project.name}' (${project.genre || "unknown genre"}). Include: 1) Twitter/X post (max 280 chars, with hashtags), 2) Instagram caption (with emojis), 3) Reddit post title + body, 4) TikTok video caption (trendy, short), 5) Steam community announcement. Each should have different tone and target different audiences. Format each with a bold header like **1) Twitter/X Post**`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate social posts. Please try again.";
      setAiSocial(content);
    } catch {
      setAiSocial("Failed to generate social posts. Check your API key and try again.");
    } finally {
      setAiSocialLoading(false);
    }
  }, [project, aiSocialLoading]);

  const generateMonetizationAdvice = useCallback(async () => {
    if (!project || aiMonetizationLoading) return;
    setAiMonetizationLoading(true);
    setAiMonetizationOpen(true);
    setAiMonetization("");
    try {
      const prompt = `Advise on monetization strategy for '${project.name}', a ${project.genre || "unknown genre"} indie game. Consider: pricing (free, $5-$20, $20+), platform (Steam, itch.io, mobile stores), monetization model (premium, F2P with IAP, DLC, subscription). Recommend the best approach with reasoning. Also suggest: price point, launch discount, wishlist strategy, and early access considerations. Be practical and specific. Format each section with bold headers like **Section Name**`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate monetization advice. Please try again.";
      setAiMonetization(content);
    } catch {
      setAiMonetization("Failed to generate monetization advice. Check your API key and try again.");
    } finally {
      setAiMonetizationLoading(false);
    }
  }, [project, aiMonetizationLoading]);

  const generateUxReview = useCallback(async () => {
    if (!project || aiUxReviewLoading) return;
    setAiUxReviewLoading(true);
    setAiUxReviewOpen(true);
    setAiUxReview("");
    try {
      const prompt = `Review the UX (user experience) of a ${project.genre || "unknown genre"} game called '${project.name}'. Check for: onboarding clarity, control intuitiveness, UI information density, feedback quality (visual/audio), menu navigation, loading times perception, and first-time user experience. Rate each area Good/Needs Work/Critical and give one specific suggestion per area. Format each area as: **Area Name**: Rating\n- suggestion`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate UX review. Please try again.";
      setAiUxReview(content);
    } catch {
      setAiUxReview("Failed to generate UX review. Check your API key and try again.");
    } finally {
      setAiUxReviewLoading(false);
    }
  }, [project, aiUxReviewLoading]);

  const generateMockReviews = useCallback(async () => {
    if (!project || aiReviewsLoading) return;
    setAiReviewsLoading(true);
    setAiReviewsOpen(true);
    setAiReviews("");
    try {
      const prompt = `Write 3 simulated game reviews for '${project.name}', a ${project.genre || "unknown genre"} indie game. Include: 1) A positive review (8/10, 3 sentences, highlights strengths), 2) A mixed review (6/10, 3 sentences, praises gameplay but critiques polish), 3) A negative review (4/10, 3 sentences, identifies major issues). For each include: reviewer name (made up), score, and text. These help developers anticipate feedback.`;
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
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "Could not generate reviews. Please try again.";
      setAiReviews(content);
    } catch {
      setAiReviews("Failed to generate mock reviews. Check your API key and try again.");
    } finally {
      setAiReviewsLoading(false);
    }
  }, [project, aiReviewsLoading]);

  const handleAiCountdown = useCallback(async () => {
    if (aiCountdownLoading || !project) return;
    setAiCountdownLoading(true);
    setAiCountdownResult("");
    try {
      const totalItems = checklist.length + customItems.length;
      const doneItems = checklist.filter((c) => checked[c.id]).length + customItems.filter((c) => checked[c.id]).length;
      const completion = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `How many days until ready to launch a ${project.genre || "indie"} game at ${completion}% complete? Just the number.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
      });
      const data = await response.json();
      setAiCountdownResult((data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim());
    } catch { /* silently fail */ }
    finally { setAiCountdownLoading(false); }
  }, [project, aiCountdownLoading, checklist, customItems, checked]);

  const generateLaunchDayChecklist = useCallback(async () => {
    if (aiDayChecklistLoading) return;
    setAiDayChecklistLoading(true);
    try {
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: "List 5 things to do on game launch day. Just the list." }], stream: false, max_tokens: 128, temperature: 0.7 }),
      });
      const data = await response.json();
      const content = (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "").trim();
      setAiDayChecklist(content || "Could not generate checklist.");
    } catch { setAiDayChecklist("Failed to generate checklist."); }
    finally { setAiDayChecklistLoading(false); }
  }, [aiDayChecklistLoading]);

  const copyToClipboard = useCallback((text: string, sectionTitle: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionTitle);
    setTimeout(() => setCopiedSection(null), 2000);
  }, []);

  const toggleItem = useCallback(
    (itemId: string) => {
      setChecked((prev) => {
        const next = { ...prev, [itemId]: !prev[itemId] };
        saveData(getChecklistKey(projectId), next);
        return next;
      });
    },
    [projectId]
  );

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleNote = useCallback((itemId: string) => {
    setOpenNotes((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const updateNote = useCallback(
    (itemId: string, text: string) => {
      setNotes((prev) => {
        const next = { ...prev, [itemId]: text };
        saveData(getNotesKey(projectId), next);
        return next;
      });
    },
    [projectId]
  );

  const addCustomItem = useCallback(
    (categoryId: string) => {
      const label = (newItemInputs[categoryId] || "").trim();
      if (!label) return;
      const newItem: ChecklistItem = {
        id: `custom_${categoryId}_${Date.now()}`,
        label,
        isCustom: true,
      };
      setCustomItems((prev) => {
        const next = {
          ...prev,
          [categoryId]: [...(prev[categoryId] || []), newItem],
        };
        saveData(getCustomItemsKey(projectId), next);
        return next;
      });
      setNewItemInputs((prev) => ({ ...prev, [categoryId]: "" }));
    },
    [projectId, newItemInputs]
  );

  const removeCustomItem = useCallback(
    (categoryId: string, itemId: string) => {
      setCustomItems((prev) => {
        const next = {
          ...prev,
          [categoryId]: (prev[categoryId] || []).filter((i) => i.id !== itemId),
        };
        saveData(getCustomItemsKey(projectId), next);
        return next;
      });
      setChecked((prev) => {
        const next = { ...prev };
        delete next[itemId];
        saveData(getChecklistKey(projectId), next);
        return next;
      });
      setNotes((prev) => {
        const next = { ...prev };
        delete next[itemId];
        saveData(getNotesKey(projectId), next);
        return next;
      });
    },
    [projectId]
  );

  const handleReset = useCallback(() => {
    if (!confirm("Reset all checklist items? This cannot be undone.")) return;
    setChecked({});
    saveData(getChecklistKey(projectId), {});
  }, [projectId]);

  const exportChecklist = useCallback(() => {
    if (!project) return;
    let md = `# ${project.name} \u2014 Launch Checklist\n\n`;
    md += `**Overall Readiness: ${overallPct}% (${totalChecked}/${totalItems})**\n\n---\n\n`;
    for (const cat of effectiveChecklist) {
      const catChecked = cat.items.filter((i) => checked[i.id]).length;
      const catPct = cat.items.length > 0 ? Math.round((catChecked / cat.items.length) * 100) : 0;
      md += `## ${cat.title} \u2014 ${catPct}% (${catChecked}/${cat.items.length})\n\n`;
      for (const item of cat.items) {
        md += `- ${checked[item.id] ? "\u2705" : "\u274c"} ${item.label}\n`;
      }
      md += `\n`;
    }
    const slug = project.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-launch-checklist.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [project, effectiveChecklist, checked, overallPct, totalChecked, totalItems]);

  if (!project) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name, href: `/dashboard/projects/${projectId}` },
            { label: "Launch" },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Launch Checklist</h1>
              <Rocket className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              Everything you need to ship {project.name}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateLaunchPlan}
              disabled={aiPlanLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20 disabled:opacity-50"
            >
              {aiPlanLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {aiPlanLoading ? "Generating..." : "AI Launch Plan"}
            </button>
            <button
              onClick={handleAiCountdown}
              disabled={aiCountdownLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-2 text-sm font-medium text-[#8B5CF6] transition-colors hover:bg-[#8B5CF6]/20 disabled:opacity-50"
            >
              {aiCountdownLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {aiCountdownLoading ? "Predicting..." : "AI Countdown"}
            </button>
            {aiCountdownResult && <span className="flex items-center gap-1 self-center text-sm font-medium text-[#8B5CF6]"><Sparkles className="h-3.5 w-3.5" />~{aiCountdownResult} days to launch</span>}
            <button
              onClick={generatePitch}
              disabled={aiPitchLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#06B6D4]/40 bg-[#06B6D4]/10 px-3 py-2 text-sm font-medium text-[#06B6D4] transition-colors hover:bg-[#06B6D4]/20 disabled:opacity-50"
            >
              {aiPitchLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
              {aiPitchLoading ? "Generating..." : "AI Pitch"}
            </button>
            <button
              onClick={generateMarketingCopy}
              disabled={aiMarketingLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#EC4899]/40 bg-[#EC4899]/10 px-3 py-2 text-sm font-medium text-[#EC4899] transition-colors hover:bg-[#EC4899]/20 disabled:opacity-50"
            >
              {aiMarketingLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Megaphone className="h-3.5 w-3.5" />
              )}
              {aiMarketingLoading ? "Generating..." : "AI Marketing"}
            </button>
            <button
              onClick={generateTrailerScript}
              disabled={aiTrailerLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-2 text-sm font-medium text-[#10B981] transition-colors hover:bg-[#10B981]/20 disabled:opacity-50"
            >
              {aiTrailerLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Film className="h-3.5 w-3.5" />
              )}
              {aiTrailerLoading ? "Generating..." : "AI Trailer Script"}
            </button>
            <button
              onClick={generatePressKit}
              disabled={aiPressKitLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-2 text-sm font-medium text-[#8B5CF6] transition-colors hover:bg-[#8B5CF6]/20 disabled:opacity-50"
            >
              {aiPressKitLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              {aiPressKitLoading ? "Generating..." : "AI Press Kit"}
            </button>
            <button
              onClick={generateAccessibilityCheck}
              disabled={aiAccessibilityLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#14B8A6]/40 bg-[#14B8A6]/10 px-3 py-2 text-sm font-medium text-[#14B8A6] transition-colors hover:bg-[#14B8A6]/20 disabled:opacity-50"
            >
              {aiAccessibilityLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {aiAccessibilityLoading ? "Checking..." : "AI Accessibility"}
            </button>
            <button
              onClick={generateSocialPosts}
              disabled={aiSocialLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#6366F1]/40 bg-[#6366F1]/10 px-3 py-2 text-sm font-medium text-[#6366F1] transition-colors hover:bg-[#6366F1]/20 disabled:opacity-50"
            >
              {aiSocialLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              {aiSocialLoading ? "Generating..." : "AI Social Posts"}
            </button>
            <button
              onClick={generateMonetizationAdvice}
              disabled={aiMonetizationLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-2 text-sm font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20 disabled:opacity-50"
            >
              {aiMonetizationLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <DollarSign className="h-3.5 w-3.5" />
              )}
              {aiMonetizationLoading ? "Analyzing..." : "AI Monetization"}
            </button>
            <button
              onClick={generateUxReview}
              disabled={aiUxReviewLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#A855F7]/40 bg-[#A855F7]/10 px-3 py-2 text-sm font-medium text-[#A855F7] transition-colors hover:bg-[#A855F7]/20 disabled:opacity-50"
            >
              {aiUxReviewLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MousePointerClick className="h-3.5 w-3.5" />
              )}
              {aiUxReviewLoading ? "Reviewing..." : "AI UX Review"}
            </button>
            <button
              onClick={generateMockReviews}
              disabled={aiReviewsLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-2 text-sm font-medium text-[#F97316] transition-colors hover:bg-[#F97316]/20 disabled:opacity-50"
            >
              {aiReviewsLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Star className="h-3.5 w-3.5" />
              )}
              {aiReviewsLoading ? "Generating..." : "AI Mock Reviews"}
            </button>
            <button
              onClick={generateLaunchDayChecklist}
              disabled={aiDayChecklistLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 px-3 py-2 text-sm text-[#10B981] transition-colors hover:bg-[#10B981]/10 disabled:opacity-50"
            >
              {aiDayChecklistLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {aiDayChecklistLoading ? "Generating..." : "Launch Day Checklist"}
            </button>
            <button
              onClick={exportChecklist}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Download className="h-3.5 w-3.5" />
              Export Checklist
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm text-[#9CA3AF] transition-colors hover:border-red-500/30 hover:text-red-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All
            </button>
          </div>
        </div>
      </div>

      {aiDayChecklist && (
        <div className="rounded-xl border border-[#10B981]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#10B981]">Launch Day Checklist</h3>
            </div>
            <button onClick={() => setAiDayChecklist("")} className="rounded-lg p-1 text-[#6B7280] hover:text-[#F5F5F5]"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-5 py-4">
            {aiDayChecklistLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#9CA3AF]"><Loader2 className="h-4 w-4 animate-spin" /> Generating...</div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">{aiDayChecklist}</p>
            )}
          </div>
        </div>
      )}

      {/* AI Launch Plan Panel */}
      {aiPlanOpen && (
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="text-sm font-semibold text-[#F59E0B]">AI Launch Plan</h3>
            </div>
            <button
              onClick={() => setAiPlanOpen(false)}
              className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {aiPlanLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
                <p className="text-sm text-[#9CA3AF]">Generating a 7-day launch plan for {project.name}...</p>
              </div>
            ) : (
              <div className="prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                {aiPlan.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={i} className="text-[#F59E0B]">{part.slice(2, -2)}</strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Marketing Copy Panel */}
      {aiMarketingOpen && (
        <div className="rounded-xl border border-[#EC4899]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#EC4899]" />
              <h3 className="text-sm font-semibold text-[#EC4899]">AI Marketing Copy</h3>
            </div>
            <div className="flex items-center gap-2">
              {!aiMarketingLoading && aiMarketing && (
                <button
                  onClick={() => copyToClipboard(aiMarketing, "__all__")}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                >
                  {copiedSection === "__all__" ? (
                    <Check className="h-3 w-3 text-[#10B981]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedSection === "__all__" ? "Copied!" : "Copy All"}
                </button>
              )}
              <button
                onClick={() => setAiMarketingOpen(false)}
                className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            {aiMarketingLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#EC4899]" />
                <p className="text-sm text-[#9CA3AF]">Generating marketing copy for {project.name}...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {parseMarketingSections(aiMarketing).map((section) => (
                  <div key={section.title} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[#EC4899]">{section.title}</h4>
                      <button
                        onClick={() => copyToClipboard(section.content, section.title)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                      >
                        {copiedSection === section.title ? (
                          <Check className="h-3 w-3 text-[#10B981]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedSection === section.title ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Pitch Panel */}
      {aiPitchOpen && (
        <div className="rounded-xl border border-[#06B6D4]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-[#06B6D4]" />
              <h3 className="text-sm font-semibold text-[#06B6D4]">AI Game Pitch</h3>
            </div>
            <div className="flex items-center gap-2">
              {!aiPitchLoading && aiPitch && (
                <button
                  onClick={() => copyToClipboard(aiPitch, "__pitch_all__")}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                >
                  {copiedSection === "__pitch_all__" ? (
                    <Check className="h-3 w-3 text-[#10B981]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedSection === "__pitch_all__" ? "Copied!" : "Copy All"}
                </button>
              )}
              <button
                onClick={() => setAiPitchOpen(false)}
                className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            {aiPitchLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#06B6D4]" />
                <p className="text-sm text-[#9CA3AF]">Crafting the perfect pitch for {project.name}...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {parseMarketingSections(aiPitch).map((section) => (
                  <div key={section.title} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[#06B6D4]">{section.title}</h4>
                      <button
                        onClick={() => copyToClipboard(section.content, `pitch_${section.title}`)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                      >
                        {copiedSection === `pitch_${section.title}` ? (
                          <Check className="h-3 w-3 text-[#10B981]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedSection === `pitch_${section.title}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Trailer Script Panel */}
      {aiTrailerOpen && (
        <div className="rounded-xl border border-[#10B981]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#10B981]">AI Trailer Script</h3>
            </div>
            <div className="flex items-center gap-2">
              {!aiTrailerLoading && aiTrailer && (
                <button
                  onClick={() => copyToClipboard(aiTrailer, "__trailer_all__")}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                >
                  {copiedSection === "__trailer_all__" ? (
                    <Check className="h-3 w-3 text-[#10B981]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedSection === "__trailer_all__" ? "Copied!" : "Copy All"}
                </button>
              )}
              <button
                onClick={() => setAiTrailerOpen(false)}
                className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            {aiTrailerLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
                <p className="text-sm text-[#9CA3AF]">Writing a trailer script for {project.name}...</p>
              </div>
            ) : (
              <div className="prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                {aiTrailer.split(/(\*\*[^*]+\*\*|\[\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\]|\[0:\d{2}\s*[-–]\s*\d:\d{2}\])/).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={i} className="text-[#10B981]">{part.slice(2, -2)}</strong>
                  ) : part.startsWith("[") && /\d:\d{2}/.test(part) ? (
                    <span key={i} className="inline-block rounded bg-[#10B981]/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-[#10B981]">{part}</span>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Press Kit Panel */}
      {aiPressKitOpen && (
        <div className="rounded-xl border border-[#8B5CF6]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-semibold text-[#8B5CF6]">AI Press Kit</h3>
            </div>
            <div className="flex items-center gap-2">
              {!aiPressKitLoading && aiPressKit && (
                <>
                  <button
                    onClick={exportPressKitAsMarkdown}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  >
                    <Download className="h-3 w-3" />
                    Export .md
                  </button>
                  <button
                    onClick={() => copyToClipboard(aiPressKit, "__presskit_all__")}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                  >
                    {copiedSection === "__presskit_all__" ? (
                      <Check className="h-3 w-3 text-[#10B981]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copiedSection === "__presskit_all__" ? "Copied!" : "Copy All"}
                  </button>
                </>
              )}
              <button
                onClick={() => setAiPressKitOpen(false)}
                className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            {aiPressKitLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#8B5CF6]" />
                <p className="text-sm text-[#9CA3AF]">Generating press kit for {project.name}...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {parseMarketingSections(aiPressKit).map((section) => (
                  <div key={section.title} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[#8B5CF6]">{section.title}</h4>
                      <button
                        onClick={() => copyToClipboard(section.content, `pk_${section.title}`)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                      >
                        {copiedSection === `pk_${section.title}` ? (
                          <Check className="h-3 w-3 text-[#10B981]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedSection === `pk_${section.title}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Accessibility Panel */}
      {aiAccessibilityOpen && (
        <div className="rounded-xl border border-[#14B8A6]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#14B8A6]" />
              <h3 className="text-sm font-semibold text-[#14B8A6]">AI Accessibility Review</h3>
            </div>
            <button
              onClick={() => setAiAccessibilityOpen(false)}
              className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {aiAccessibilityLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#14B8A6]" />
                <p className="text-sm text-[#9CA3AF]">Running accessibility audit for {project.name}...</p>
              </div>
            ) : (
              <AccessibilityResults text={aiAccessibility} />
            )}
          </div>
        </div>
      )}

      {/* AI Social Posts Panel */}
      {aiSocialOpen && (
        <div className="rounded-xl border border-[#6366F1]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[#6366F1]" />
              <h3 className="text-sm font-semibold text-[#6366F1]">AI Social Posts</h3>
            </div>
            <button
              onClick={() => setAiSocialOpen(false)}
              className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {aiSocialLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#6366F1]" />
                <p className="text-sm text-[#9CA3AF]">Generating social posts for {project.name}...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {parseSocialPosts(aiSocial).map((post, idx) => {
                  const meta = SOCIAL_PLATFORM_META.find((p) => p.name === post.platform);
                  const PlatformIcon = meta?.icon || Share2;
                  const platformColor = meta?.color || "#6366F1";
                  const charLimit = meta?.charLimit;
                  const cleanContent = post.content.replace(/\*\*/g, "");
                  return (
                    <div key={idx} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-md"
                            style={{ backgroundColor: `${platformColor}15` }}
                          >
                            <PlatformIcon className="h-3.5 w-3.5" style={{ color: platformColor }} />
                          </div>
                          <span className="text-sm font-semibold" style={{ color: platformColor }}>
                            {post.platform}
                          </span>
                          {charLimit && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums ${
                                cleanContent.length > charLimit
                                  ? "bg-[#EF4444]/10 text-[#EF4444]"
                                  : "bg-[#10B981]/10 text-[#10B981]"
                              }`}
                            >
                              {cleanContent.length}/{charLimit}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(cleanContent, `social_${idx}`)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                        >
                          {copiedSection === `social_${idx}` ? (
                            <Check className="h-3 w-3 text-[#10B981]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {copiedSection === `social_${idx}` ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                        {post.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={i} className="text-[#F5F5F5]">{part.slice(2, -2)}</strong>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Monetization Advisor Panel */}
      {aiMonetizationOpen && (
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#F59E0B]" />
              <h3 className="text-sm font-semibold text-[#F59E0B]">AI Monetization Advisor</h3>
            </div>
            <div className="flex items-center gap-2">
              {!aiMonetizationLoading && aiMonetization && (
                <button
                  onClick={() => copyToClipboard(aiMonetization, "__monetization_all__")}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9CA3AF] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                >
                  {copiedSection === "__monetization_all__" ? (
                    <Check className="h-3 w-3 text-[#10B981]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedSection === "__monetization_all__" ? "Copied!" : "Copy All"}
                </button>
              )}
              <button
                onClick={() => setAiMonetizationOpen(false)}
                className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            {aiMonetizationLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
                <p className="text-sm text-[#9CA3AF]">Analyzing monetization strategies for {project.name}...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {parseMarketingSections(aiMonetization).map((section) => (
                  <div key={section.title} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[#F59E0B]">{section.title}</h4>
                      <button
                        onClick={() => copyToClipboard(section.content, `mon_${section.title}`)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                      >
                        {copiedSection === `mon_${section.title}` ? (
                          <Check className="h-3 w-3 text-[#10B981]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedSection === `mon_${section.title}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#D1D5DB]">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI UX Review Panel */}
      {aiUxReviewOpen && (
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-[#A855F7]" />
              <h3 className="text-sm font-semibold text-[#A855F7]">AI UX Review</h3>
            </div>
            <button
              onClick={() => setAiUxReviewOpen(false)}
              className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {aiUxReviewLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#A855F7]" />
                <p className="text-sm text-[#9CA3AF]">Running UX review for {project.name}...</p>
              </div>
            ) : (
              <UxReviewResults text={aiUxReview} />
            )}
          </div>
        </div>
      )}

      {/* AI Mock Reviews Panel */}
      {aiReviewsOpen && (
        <div className="rounded-xl border border-[#F97316]/30 bg-[#1A1A1A] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-[#F97316]" />
              <h3 className="text-sm font-semibold text-[#F97316]">AI Mock Reviews</h3>
            </div>
            <button
              onClick={() => setAiReviewsOpen(false)}
              className="rounded-md p-1 text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {aiReviewsLoading ? (
              <div className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#F97316]" />
                <p className="text-sm text-[#9CA3AF]">Generating mock reviews for {project.name}...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {parseReviews(aiReviews).map((review, idx) => {
                  const reviewColor = review.score >= 7 ? "#10B981" : review.score >= 5 ? "#F59E0B" : "#EF4444";
                  const reviewLabel = review.score >= 7 ? "Positive" : review.score >= 5 ? "Mixed" : "Negative";
                  return (
                    <div key={idx} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${reviewColor}15` }}
                          >
                            <span className="text-sm font-bold" style={{ color: reviewColor }}>
                              {review.score}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#F5F5F5]">{review.reviewer}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <StarRating score={review.score} />
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{ backgroundColor: `${reviewColor}15`, color: reviewColor }}
                              >
                                {reviewLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(review.text, `review_${idx}`)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#6B7280] transition-colors hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                        >
                          {copiedSection === `review_${idx}` ? (
                            <Check className="h-3 w-3 text-[#10B981]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {copiedSection === `review_${idx}` ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed text-[#D1D5DB]">{review.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Launch Readiness Score */}
      <div
        className={`relative overflow-hidden rounded-xl border p-6 transition-all ${
          allDone
            ? "border-[#10B981]/40 bg-[#10B981]/5"
            : "border-[#2A2A2A] bg-[#1A1A1A]"
        }`}
      >
        {allDone && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-transparent" />
        )}
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          {/* Score circle */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full border-4"
              style={{
                borderColor: scoreColor,
                backgroundColor: `${scoreColor}10`,
              }}
            >
              {allDone ? (
                <PartyPopper className="h-10 w-10" style={{ color: scoreColor }} />
              ) : (
                <span
                  className="text-4xl font-black tabular-nums"
                  style={{ color: scoreColor }}
                >
                  {overallPct}
                </span>
              )}
            </div>
            {!allDone && (
              <span className="text-xs font-medium text-[#6B7280]">
                Readiness
              </span>
            )}
          </div>

          {/* Score details */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <Target className="h-4 w-4" style={{ color: scoreColor }} />
              <h2 className="text-lg font-bold" style={{ color: scoreColor }}>
                {getScoreLabel(overallPct)}
              </h2>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              {totalChecked} of {totalItems} items completed
            </p>
            {/* Progress bar */}
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#2A2A2A]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${overallPct}%`,
                  backgroundColor: scoreColor,
                }}
              />
            </div>
            {allDone && (
              <p className="mt-3 text-sm text-[#10B981]/80">
                Every item is checked off. Time to ship it!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {effectiveChecklist.map((cat) => {
          const catChecked = cat.items.filter((i) => checked[i.id]).length;
          const catPct = cat.items.length > 0 ? Math.round((catChecked / cat.items.length) * 100) : 0;
          const catDone = catChecked === cat.items.length && cat.items.length > 0;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setExpanded((prev) => ({ ...prev, [cat.id]: true }));
                document.getElementById(`section-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 text-left transition-colors hover:border-[#3A3A3A]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                  <span className="text-sm font-medium">{cat.title}</span>
                </div>
                {catDone && (
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                )}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${catPct}%`,
                    backgroundColor: catDone ? "#10B981" : cat.color,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[#6B7280]">
                {catChecked}/{cat.items.length}
              </p>
            </button>
          );
        })}
      </div>

      {/* Checklist Sections */}
      <div className="space-y-3">
        {effectiveChecklist.map((cat) => {
          const isOpen = expanded[cat.id] ?? false;
          const catChecked = cat.items.filter((i) => checked[i.id]).length;
          const catDone = catChecked === cat.items.length && cat.items.length > 0;

          return (
            <div
              key={cat.id}
              id={`section-${cat.id}`}
              className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]"
            >
              {/* Category header */}
              <button
                onClick={() => toggleSection(cat.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1F1F1F]"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${cat.color}15` }}
                >
                  <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold">{cat.title}</span>
                  <span className="ml-2 text-xs text-[#6B7280]">
                    {catChecked}/{cat.items.length}
                  </span>
                </div>
                {catDone && (
                  <span className="mr-2 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs font-medium text-[#10B981]">
                    Done
                  </span>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280]" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-[#2A2A2A]">
                  {cat.items.map((item, idx) => {
                    const isChecked = checked[item.id] || false;
                    const hasNote = !!notes[item.id];
                    const noteOpen = openNotes[item.id] || false;

                    return (
                      <div
                        key={item.id}
                        className={
                          idx < cat.items.length - 1
                            ? "border-b border-[#2A2A2A]/50"
                            : ""
                        }
                      >
                        <div className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#1F1F1F]">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="mt-0.5 shrink-0"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-[#10B981]" />
                            ) : (
                              <Square className="h-4 w-4 text-[#6B7280] hover:text-[#9CA3AF]" />
                            )}
                          </button>

                          {/* Label & detail */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p
                              className={`text-sm font-medium transition-colors ${
                                isChecked
                                  ? "text-[#6B7280] line-through"
                                  : "text-[#F5F5F5]"
                              }`}
                            >
                              {item.label}
                            </p>
                            {item.detail && (
                              <p className="mt-0.5 text-xs text-[#6B7280]">
                                {item.detail}
                              </p>
                            )}
                          </button>

                          {/* Note toggle */}
                          <button
                            onClick={() => toggleNote(item.id)}
                            className="mt-0.5 shrink-0 rounded p-1 transition-colors hover:bg-[#2A2A2A]"
                            title={noteOpen ? "Hide note" : "Add note"}
                          >
                            <MessageSquare
                              className={`h-3.5 w-3.5 ${
                                hasNote
                                  ? "text-[#F59E0B]"
                                  : "text-[#4B5563] hover:text-[#9CA3AF]"
                              }`}
                            />
                          </button>

                          {/* Delete custom item */}
                          {item.isCustom && (
                            <button
                              onClick={() => removeCustomItem(cat.id, item.id)}
                              className="mt-0.5 shrink-0 rounded p-1 text-[#4B5563] transition-colors hover:bg-red-500/10 hover:text-red-400"
                              title="Remove custom item"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Note textarea */}
                        {noteOpen && (
                          <div className="px-5 pb-3 pl-12">
                            <textarea
                              value={notes[item.id] || ""}
                              onChange={(e) =>
                                updateNote(item.id, e.target.value)
                              }
                              placeholder="Write a note..."
                              rows={2}
                              className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#D1D5DB] placeholder-[#4B5563] outline-none transition-colors focus:border-[#F59E0B]/40"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add custom item */}
                  <div className="flex items-center gap-2 border-t border-[#2A2A2A]/50 px-5 py-3">
                    <Plus className="h-3.5 w-3.5 shrink-0 text-[#4B5563]" />
                    <input
                      type="text"
                      value={newItemInputs[cat.id] || ""}
                      onChange={(e) =>
                        setNewItemInputs((prev) => ({
                          ...prev,
                          [cat.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCustomItem(cat.id);
                      }}
                      placeholder="Add custom item..."
                      className="min-w-0 flex-1 bg-transparent text-sm text-[#D1D5DB] placeholder-[#4B5563] outline-none"
                    />
                    {(newItemInputs[cat.id] || "").trim() && (
                      <button
                        onClick={() => addCustomItem(cat.id)}
                        className="shrink-0 rounded-md bg-[#F59E0B]/10 px-2.5 py-1 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
