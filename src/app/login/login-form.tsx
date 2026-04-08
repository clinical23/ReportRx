"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pill } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.refresh();
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-900/20">
          <Pill className="size-6" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-teal-500/80" />
        <div className="mt-5 text-2xl font-semibold tracking-tight text-slate-800">
          ReportRx
        </div>
        <p className="mt-1.5 text-sm font-normal text-slate-600">
          Clinical activity and reporting
        </p>
      </div>

      <Card className="w-full rounded-2xl border-slate-200 shadow-lg">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight text-slate-800">
            Sign in
          </CardTitle>
          <CardDescription>
            Use your work email and password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-medium text-slate-600"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-medium text-slate-600"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                disabled={loading}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
