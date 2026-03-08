"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gamepad2, Mail, Lock, User, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import { signup, getCurrentUser } from "@/lib/auth";

const GAME_TYPES = ["2D", "3D", "Mobile", "VR", "Tabletop", "Other"];

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gameType, setGameType] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    console.log("[SignupPage] rendered");
    const user = getCurrentUser();
    if (user) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const result = signup(username, email, password, gameType || "Other");
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Signup failed.");
        setSubmitting(false);
      }
    }, 500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] px-4 py-12">
      <div className="animate-fade-in w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F59E0B]/10 shadow-lg shadow-[#F59E0B]/5">
            <Gamepad2 className="h-7 w-7 text-[#F59E0B]" />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">Start building with GameForge</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-[#9CA3AF]">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="PlayerOne"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 pl-11 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#9CA3AF]">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gamedev.io"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 pl-11 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#9CA3AF]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 pl-11 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#9CA3AF]">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 pl-11 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="gameType" className="mb-1.5 block text-sm font-medium text-[#9CA3AF]">
                What kind of games do you make?{" "}
                <span className="text-[#6B7280]">(optional)</span>
              </label>
              <div className="relative">
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <select
                  id="gameType"
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 pl-4 pr-10 text-sm text-[#F5F5F5] transition-colors focus:border-[#F59E0B] focus:outline-none"
                >
                  <option value="">Select a type...</option>
                  {GAME_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-3 text-sm font-bold text-[#0F0F0F] transition-colors hover:bg-[#D97706] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#9CA3AF]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#F59E0B] hover:text-[#D97706]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
