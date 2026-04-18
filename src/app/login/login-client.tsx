"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stage = "email" | "code";

const RESEND_COOLDOWN_SECONDS = 60;

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<
    | { type: "success" | "error"; text: string }
    | null
  >(null);
  const [cooldown, setCooldown] = useState(0);

  // Honour query-param hints surfaced by middleware / callback
  useEffect(() => {
    if (searchParams.get("deactivated") === "1") {
      setMessage({
        type: "error",
        text: "Your account has been deactivated. Contact your administrator.",
      });
    } else if (searchParams.get("idle") === "1") {
      setMessage({
        type: "error",
        text: "You were signed out after a period of inactivity. Sign in again to continue.",
      });
    } else if (searchParams.get("error") === "auth_failed") {
      setMessage({
        type: "error",
        text:
          "That sign-in link didn't work — this sometimes happens with NHS or corporate email. Enter your email below and we'll send you a 6-digit code instead.",
      });
    }
  }, [searchParams]);

  // Auto-redirect if already signed in
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled && session?.user) {
        router.replace("/");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  // Cooldown tick for the "Resend code" link
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = async (targetEmail: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        // Don't silently create fresh auth users from random emails.
        // All ReportRx clinicians are created server-side via /api/invite,
        // which uses admin.inviteUserByEmail and provisions the auth user
        // at invite time — so the user ALWAYS exists before first sign-in.
        shouldCreateUser: false,
        // We intentionally do NOT set emailRedirectTo. The email template
        // still contains a fallback link for environments where it works,
        // but the primary UX is the 6-digit code the user types here.
      },
    });
    return error;
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || loading || cooldown > 0) return;
    setLoading(true);
    setMessage(null);

    const error = await sendCode(email.trim());

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setStage("code");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setMessage({
      type: "success",
      text: "Check your email — we sent you a 6-digit code. It's valid for 60 minutes.",
    });
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    if (data.session?.user) {
      // Middleware handles any onward redirects (onboarding, MFA, etc.)
      router.replace("/");
      return;
    }

    setMessage({
      type: "error",
      text: "Something went wrong verifying that code. Please try again.",
    });
    setLoading(false);
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setCode("");
    setMessage(null);
    setLoading(true);

    const error = await sendCode(email.trim());

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    setMessage({
      type: "success",
      text: "New code sent — check your email.",
    });
    setLoading(false);
  };

  const handleChangeEmail = () => {
    setStage("email");
    setCode("");
    setCooldown(0);
    setMessage(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-4 w-full max-w-sm md:mx-auto">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600">
            <span className="text-lg font-bold text-white">Rx</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">ReportRx</h1>
          <p className="mt-1 text-sm text-gray-500">
            Clinical activity tracking for primary care
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {stage === "email" ? (
            <>
              <h2 className="mb-1 text-lg font-medium text-gray-900">Sign in</h2>
              <p className="mb-6 text-sm text-gray-500">
                Enter your email and we&apos;ll send you a 6-digit sign-in code.
              </p>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@nhs.net"
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Sending code..." : "Send sign-in code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-medium text-gray-900">
                Enter your code
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-gray-900">{email}</span>. Check
                your inbox (and spam folder if needed).
              </p>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="code"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    6-digit code
                  </label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] text-gray-900 placeholder:text-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.trim().length < 6}
                  className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading}
                  className="font-medium text-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </>
          )}

          {message ? (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "border border-green-200 bg-green-50 text-green-800"
                  : "border border-red-200 bg-red-50 text-red-800"
              }`}
              role={message.type === "error" ? "alert" : "status"}
            >
              {message.text}
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By signing in, you agree to our{" "}
          <Link
            href="/privacy"
            className="font-medium text-teal-700 underline hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
