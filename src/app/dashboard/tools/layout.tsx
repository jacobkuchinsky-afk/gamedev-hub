"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const USAGE_KEY = "gameforge_tool_usage";

export function getToolUsage(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function trackToolVisit(path: string) {
  const usage = getToolUsage();
  usage[path] = (usage[path] || 0) + 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    if (pathname && pathname !== "/dashboard/tools" && pathname !== tracked.current) {
      tracked.current = pathname;
      trackToolVisit(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}
