"use client";

import { useState } from "react";
import Link from "next/link";
import { Gamepad2, Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { auth, sendPasswordResetEmail } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] px-4">
      <div className="animate-fade-in w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F59E0B]/10 shadow-lg shadow-[#F59E0B]/5">
            <Gamepad2 className="h-7 w-7 text-[#F59E0B]" />
          </div>
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            We&apos;ll send you a link to get back in
          </p>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8">
          {sent ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-[#F5F5F5]">Check your inbox</h2>
              <p className="text-sm text-[#9CA3AF]">
                If an account exists with that email, we&apos;ve sent a reset link.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#F59E0B] hover:text-[#D97706]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          ) : (
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

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B] py-3 text-sm font-bold text-[#0F0F0F] transition-colors hover:bg-[#D97706] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <p className="mt-6 text-center text-sm text-[#9CA3AF]">
            <Link href="/login" className="inline-flex items-center gap-1 font-medium text-[#F59E0B] hover:text-[#D97706]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
