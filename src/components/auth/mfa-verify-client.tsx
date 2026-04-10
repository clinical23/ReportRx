"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function MfaVerifyClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const startChallenge = useCallback(async (fid: string) => {
    const supabase = createClient();
    const { data, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: fid,
    });
    if (chErr || !data?.id) {
      setInitError("Could not start verification. Please refresh the page.");
      return;
    }
    setChallengeId(data.id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const supabase = createClient();
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;

      if (aal?.currentLevel === "aal2") {
        router.replace("/");
        return;
      }

      const { data: factorsData, error: listErr } =
        await supabase.auth.mfa.listFactors();
      if (cancelled) return;

      if (listErr) {
        setInitError("Could not load your security settings.");
        setLoading(false);
        return;
      }

      const totpVerified =
        factorsData?.totp?.find((f) => f.status === "verified") ?? null;
      if (!totpVerified?.id) {
        router.replace("/");
        return;
      }

      setFactorId(totpVerified.id);
      await startChallenge(totpVerified.id);
      if (!cancelled) setLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, startChallenge]);

  const verifyWithCode = useCallback(
    async (raw: string) => {
      const digits = raw.replace(/\D/g, "").slice(0, 6);
      if (digits.length !== 6 || !factorId || !challengeId) return;

      setError(null);
      setVerifying(true);
      const supabase = createClient();
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: digits,
      });
      setVerifying(false);

      if (vErr) {
        setError("Invalid code. Please try again.");
        await startChallenge(factorId);
        setCode("");
        inputRef.current?.focus();
        return;
      }

      router.push("/");
      router.refresh();
    },
    [challengeId, factorId, router, startChallenge],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void verifyWithCode(code);
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-red-700">{initError}</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 text-sm font-medium text-teal-700 underline hover:text-teal-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600">
            <span className="text-lg font-bold text-white">Rx</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Two-Factor Authentication
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              setError(null);
              if (v.length === 6 && challengeId && factorId && !verifying) {
                void verifyWithCode(v);
              }
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-4 text-center font-mono text-2xl tracking-[0.35em] text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            placeholder="••••••"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "mfa-code-error" : undefined}
          />

          {error ? (
            <p id="mfa-code-error" className="text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={verifying || code.replace(/\D/g, "").length !== 6 || !challengeId}
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
