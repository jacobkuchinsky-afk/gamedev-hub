"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, ListTodo, Bug } from "lucide-react";
import {
  getProjects,
  getTasks,
  getBugs,
  getStatusColor,
  type Project,
} from "@/lib/store";

const STATUS_BADGE_STYLES: Record<Project["status"], string> = {
  concept: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
  prototype: "bg-[#3B82F6]/10 text-[#3B82F6]",
  alpha: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  beta: "bg-[#F59E0B]/10 text-[#F59E0B]",
  gold: "bg-[#10B981]/10 text-[#10B981]",
  released: "bg-[#22C55E]/10 text-[#22C55E]",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [bugCounts, setBugCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    console.log("[ProjectsPage] rendered");
    const allProjects = getProjects();
    setProjects(allProjects);

    const tc: Record<string, number> = {};
    const bc: Record<string, number> = {};
    allProjects.forEach((p) => {
      tc[p.id] = getTasks(p.id).length;
      bc[p.id] = getBugs(p.id).filter((b) => b.status !== "closed").length;
    });
    setTaskCounts(tc);
    setBugCounts(bc);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Manage your game development projects
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-20">
          <FolderKanban className="h-12 w-12 text-[#6B7280]" />
          <p className="mt-4 text-lg font-medium text-[#9CA3AF]">
            No projects yet
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create your first game project to get started
          </p>
          <Link
            href="/dashboard/projects/new"
            className="mt-6 flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#F59E0B]/90"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] transition-all hover:border-[#F59E0B]/30"
            >
              <div
                className="h-2 rounded-t-xl"
                style={{ backgroundColor: project.coverColor }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-[#F5F5F5] group-hover:text-[#F59E0B] transition-colors">
                    {project.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_STYLES[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-[#9CA3AF]">
                  {project.description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-[#6B7280]">
                  <span className="rounded bg-[#2A2A2A] px-2 py-0.5">
                    {project.engine}
                  </span>
                  <span className="rounded bg-[#2A2A2A] px-2 py-0.5">
                    {project.genre}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-[#2A2A2A] pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                    <ListTodo className="h-3.5 w-3.5" />
                    {taskCounts[project.id] || 0} tasks
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                    <Bug className="h-3.5 w-3.5" />
                    {bugCounts[project.id] || 0} bugs
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
