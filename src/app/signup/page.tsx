"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gamepad2, Mail, Lock, User, ChevronDown, AlertCircle, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { signup, getCurrentUser } from "@/lib/auth";

const GAME_TYPES = ["2D", "3D", "Mobile", "VR", "Tabletop", "Other"];

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["#2A2A2A", "#EF4444", "#F59E0B", "#84CC16", "#22C55E"];

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gameType, setGameType] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.replace("/dashboard");
  }, [router]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const requirements = useMemo(() => [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Has a number", met: /[0-9]/.test(password) },
    { label: "Has a special character", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    try {
      const result = await signup(username, email, password, gameType || "Other");
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Signup failed.");
        setSubmitting(false);
      }
    } catch {
      setError("Signup failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] px-4 py-12">
      <div className="animate-fade-in w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F59E0B]/10 shadow-lg shadow-[#F59E0B]/5">
            <Gamepad2 className="h-7 w-7 text-[#F59E0B]" />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">Start building with GameForge</p>
        </div>

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

            {/* Password with strength indicator */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#9CA3AF]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 pl-11 pr-11 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-2.5 space-y-2.5">
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                          style={{
                            backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : "#2A2A2A",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-xs font-medium transition-colors duration-300"
                      style={{ color: STRENGTH_COLORS[strength] }}
                    >
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </div>

                  {/* Requirements checklist */}
                  <div className="space-y-1">
                    {requirements.map((req) => (
                      <div key={req.label} className="flex items-center gap-2">
                        <Check
                          className="h-3.5 w-3.5 transition-colors duration-200"
                          style={{ color: req.met ? "#22C55E" : "#4B5563" }}
                        />
                        <span
                          className="text-xs transition-colors duration-200"
                          style={{ color: req.met ? "#9CA3AF" : "#6B7280" }}
                        >
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#9CA3AF]">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] py-3 pl-11 pr-11 text-sm text-[#F5F5F5] placeholder-[#6B7280] transition-colors focus:border-[#F59E0B] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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

            <p className="text-center text-xs text-[#6B7280]">
              By signing up, you agree to our{" "}
              <span className="text-[#9CA3AF] underline underline-offset-2 cursor-pointer hover:text-[#F5F5F5]">
                Terms of Service
              </span>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#9CA3AF]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#F59E0B] hover:text-[#D97706]">
            Sign in
          </Link>
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#6B7280]">
          {["200+ AI Features", "23 Game Dev Tools", "Free Forever"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <span className="h-1 w-1 shrink-0 rounded-full bg-[#F59E0B]" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
