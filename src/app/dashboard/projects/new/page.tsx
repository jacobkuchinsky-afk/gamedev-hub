"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { addProject, type Project } from "@/lib/store";

const ENGINES = ["Unity", "Unreal", "Godot", "GameMaker", "Custom"];
const GENRES = [
  "RPG",
  "Platformer",
  "FPS",
  "Puzzle",
  "Strategy",
  "Simulation",
  "Horror",
  "Racing",
  "Other",
];
const COVER_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#84CC16",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [engine, setEngine] = useState("Godot");
  const [genre, setGenre] = useState("RPG");
  const [coverColor, setCoverColor] = useState("#6366F1");
  const [submitting, setSubmitting] = useState(false);

  console.log("[NewProjectPage] rendered");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const project = addProject({
      name: name.trim(),
      description: description.trim(),
      engine,
      genre,
      status: "concept" as Project["status"],
      coverColor,
    });
    console.log("[NewProjectPage] created project:", project.id);
    router.push(`/dashboard/projects/${project.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] transition-colors hover:text-[#F59E0B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Create New Project</h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Set up a new game development project
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Game"
              required
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this game about?"
              rows={3}
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm text-[#F5F5F5] placeholder-[#6B7280] outline-none transition-colors focus:border-[#F59E0B]/50 resize-none"
            />
          </div>

          {/* Engine */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Engine
            </label>
            <div className="flex flex-wrap gap-2">
              {ENGINES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEngine(e)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    engine === e
                      ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#6B7280] hover:text-[#F5F5F5]"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Genre */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Genre
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(g)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    genre === g
                      ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#6B7280] hover:text-[#F5F5F5]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Cover Color */}
          <div>
            <label className="block text-sm font-medium text-[#D1D5DB] mb-1.5">
              Cover Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverColor(c)}
                  className={`h-8 w-8 rounded-lg border-2 transition-all ${
                    coverColor === c
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="h-2" style={{ backgroundColor: coverColor }} />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${coverColor}20` }}
              >
                <Gamepad2 className="h-5 w-5" style={{ color: coverColor }} />
              </div>
              <div>
                <p className="font-semibold">
                  {name || "Project Name"}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {engine} &middot; {genre} &middot; Concept
                </p>
              </div>
            </div>
            {description && (
              <p className="mt-3 text-sm text-[#9CA3AF]">{description}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full rounded-lg bg-[#F59E0B] py-3 text-sm font-semibold text-black transition-colors hover:bg-[#F59E0B]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
}
