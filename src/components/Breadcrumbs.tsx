"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-xs">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-[#4B5563]" />
            )}
            {isLast || !item.href ? (
              <span
                className={
                  isLast
                    ? "font-medium text-[#D1D5DB]"
                    : "text-[#6B7280]"
                }
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-[#6B7280] transition-colors hover:text-[#F59E0B]"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
