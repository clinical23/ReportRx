"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/client";

const IDLE_MS = 15 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const THROTTLE_MS = 30 * 1000;
const STORAGE_KEY = "rr-last-activity-at";

function readLastActivityAt(): number {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) return n;
    }
  } catch {
    /* private mode */
  }
  return Date.now();
}

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const showWarningRef = useRef(false);
  const warningDeadlineRef = useRef<number | null>(null);
  const lastThrottleRef = useRef(0);

  const bumpActivity = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastThrottleRef.current < THROTTLE_MS) return;
    lastThrottleRef.current = now;
    try {
      sessionStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      /* ignore */
    }
    showWarningRef.current = false;
    warningDeadlineRef.current = null;
    setShowWarning(false);
  }, []);

  const signOutAndRedirect = useCallback(async () => {
    try {
      await logAudit("logout", "auth");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* still redirect */
    }
    router.replace("/login?idle=1");
  }, [router]);

  useEffect(() => {
    bumpActivity(true);
  }, [bumpActivity]);

  useEffect(() => {
    const onActivity = () => bumpActivity(false);
    const scrollOpts: AddEventListenerOptions = { passive: true };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    window.addEventListener("scroll", onActivity, scrollOpts);
    window.addEventListener("touchstart", onActivity, scrollOpts);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [bumpActivity]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const lastAt = readLastActivityAt();

      if (showWarningRef.current) {
        const deadline = warningDeadlineRef.current;
        if (deadline != null && Date.now() >= deadline) {
          void signOutAndRedirect();
        }
        return;
      }

      if (Date.now() - lastAt >= IDLE_MS) {
        showWarningRef.current = true;
        warningDeadlineRef.current = Date.now() + WARNING_MS;
        setShowWarning(true);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [signOutAndRedirect]);

  const handleStayLoggedIn = () => {
    bumpActivity(true);
  };

  return (
    <>
      {children}
      {showWarning ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="idle-timeout-title"
          aria-describedby="idle-timeout-desc"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 id="idle-timeout-title" className="text-lg font-semibold text-gray-900">
              Session expiring
            </h2>
            <p id="idle-timeout-desc" className="mt-2 text-sm text-gray-600">
              Your session will expire in 60 seconds due to inactivity. Choose Stay logged in to
              continue working.
            </p>
            <button
              type="button"
              onClick={handleStayLoggedIn}
              className="mt-6 w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Stay logged in
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
