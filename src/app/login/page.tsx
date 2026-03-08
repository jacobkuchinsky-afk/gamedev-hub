"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gamepad2, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { login, getCurrentUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    console.log("[LoginPage] rendered");
    const user = getCurrentUser();
    if (user) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Login failed.");
        setSubmitting(false);
      }
    } catch {
      setError("Login failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] px-4">
      <div className="animate-fade-in w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F59E0B]/10 shadow-lg shadow-[#F59E0B]/5">
            <Gamepad2 className="h-7 w-7 text-[#F59E0B]" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">Sign in to GameForge</p>
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
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 pl-11 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B] focus:outline-none"
                />
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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 space-y-2 text-center text-sm text-[#9CA3AF]">
          <p>
            <Link href="/forgot-password" className="font-medium text-[#F59E0B] hover:text-[#D97706]">
              Forgot password?
            </Link>
          </p>
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-[#F59E0B] hover:text-[#D97706]">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
