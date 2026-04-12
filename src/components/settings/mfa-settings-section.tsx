"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, Info, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { formatDateTimeUK } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/client";

type VerifiedTotp = {
  id: string;
  friendly_name?: string | null;
  created_at?: string;
};

export function MfaSettingsSection() {
  const router = useRouter();
  const toast = useToast();
  const [verifiedFactor, setVerifiedFactor] = useState<VerifiedTotp | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [unenrollError, setUnenrollError] = useState<string | null>(null);
  const enrolCompleteRef = useRef(false);
  const closedDuringEnrolRef = useRef(false);

  const refreshFactors = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      console.error("[MFA] listFactors", error.message);
      setVerifiedFactor(null);
      return;
    }
    const totpFactor =
      data?.totp?.find((f) => f.status === "verified") ?? null;
    if (!totpFactor?.id) {
      setVerifiedFactor(null);
      return;
    }
    setVerifiedFactor({
      id: totpFactor.id,
      friendly_name: totpFactor.friendly_name,
      created_at: totpFactor.created_at,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingStatus(true);
      await refreshFactors();
      if (!cancelled) setLoadingStatus(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFactors]);

  const cleanupPendingFactor = useCallback(async (factorId: string | null) => {
    if (!factorId) return;
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId });
  }, []);

  const startEnrolment = useCallback(async () => {
    closedDuringEnrolRef.current = false;
    setEnrolling(true);
    setEnrolError(null);
    setQrCode(null);
    setSecret(null);
    setConfirmCode("");
    setPendingFactorId(null);
    enrolCompleteRef.current = false;

    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "ReportRx",
    });

    if (error || !data?.id) {
      setEnrolling(false);
      const msg = error?.message ?? "Could not start 2FA setup.";
      setEnrolError(msg);
      return;
    }

    if (closedDuringEnrolRef.current) {
      await supabase.auth.mfa.unenroll({ factorId: data.id });
      setEnrolling(false);
      return;
    }

    const totp = data.totp as { qr_code?: string; secret?: string } | undefined;
    setPendingFactorId(data.id);
    setQrCode(totp?.qr_code ?? null);
    setSecret(totp?.secret ?? null);
    setEnrolling(false);
  }, []);

  const handleModalOpenChange = (open: boolean) => {
    if (open) {
      closedDuringEnrolRef.current = false;
      setModalOpen(true);
      return;
    }
    closedDuringEnrolRef.current = true;
    if (pendingFactorId && !enrolCompleteRef.current) {
      void cleanupPendingFactor(pendingFactorId);
    }
    setPendingFactorId(null);
    setConfirmCode("");
    setEnrolError(null);
    setQrCode(null);
    setSecret(null);
    enrolCompleteRef.current = false;
    setModalOpen(false);
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel(null), 2000);
    } catch {
      setCopyLabel("Could not copy");
      window.setTimeout(() => setCopyLabel(null), 2000);
    }
  };

  const submitEnrolment = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = confirmCode.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6 || !pendingFactorId) return;

    setSubmitting(true);
    setEnrolError(null);
    const supabase = createClient();

    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: pendingFactorId,
    });
    if (chErr || !challenge?.id) {
      setSubmitting(false);
      setEnrolError("Could not start verification. Please try again.");
      return;
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code: digits,
    });

    setSubmitting(false);

    if (vErr) {
      setEnrolError("Invalid code. Please try again.");
      return;
    }

    enrolCompleteRef.current = true;
    void logAudit("create", "auth", undefined, { mfa: "enrolled" });
    await refreshFactors();
    toast.success("Two-factor authentication enabled");
    handleModalOpenChange(false);
    router.refresh();
  };

  const confirmRemoveMfa = async () => {
    if (!verifiedFactor?.id) return;
    setRemoving(true);
    setUnenrollError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactor.id,
    });
    setRemoving(false);
    if (error) {
      setUnenrollError(error.message);
      return;
    }
    void logAudit("delete", "auth", undefined, { mfa: "unenrolled" });
    setVerifiedFactor(null);
    setRemoveOpen(false);
    toast.success("Two-factor authentication removed");
    router.refresh();
  };

  if (loadingStatus) {
    return (
      <Card id="settings-mfa">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-5 text-teal-600" aria-hidden />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Loading two-factor settings…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card id="settings-mfa">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-5 text-teal-600" aria-hidden />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            {verifiedFactor
              ? "Your account is protected with a code from an authenticator app."
              : "Add an extra layer of security to your account using an authenticator app."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verifiedFactor ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
                <span className="text-sm font-medium text-gray-900">
                  Two-factor authentication is enabled
                </span>
              </div>
              <dl className="grid gap-2 text-sm text-gray-600">
                <div>
                  <dt className="text-xs font-medium text-gray-500">Authenticator</dt>
                  <dd className="mt-0.5 text-gray-900">
                    {verifiedFactor.friendly_name?.trim() || "ReportRx"}
                  </dd>
                </div>
                {verifiedFactor.created_at ? (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Added</dt>
                    <dd className="mt-0.5 text-gray-900">
                      {formatDateTimeUK(verifiedFactor.created_at)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {unenrollError ? (
                <p className="text-sm text-red-600" role="alert">
                  {unenrollError}
                </p>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => {
                  setUnenrollError(null);
                  setRemoveOpen(true);
                }}
              >
                Remove 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-gray-800">
                <Info
                  className="mt-0.5 size-5 shrink-0 text-blue-600"
                  aria-hidden
                />
                <div className="min-w-0 space-y-3">
                  <p className="font-semibold text-gray-900">
                    How to set up two-factor authentication
                  </p>
                  <ol className="list-decimal space-y-2 pl-4 marker:text-gray-600">
                    <li>
                      Download an authenticator app on your phone:
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-gray-700">
                        <li>
                          Google Authenticator (free) — App Store and Google Play
                        </li>
                        <li>
                          Microsoft Authenticator (free) — App Store and Google Play
                        </li>
                      </ul>
                    </li>
                    <li>Click &quot;Set up 2FA&quot; below.</li>
                    <li>
                      Open your authenticator app and tap the &quot;+&quot; button to add a
                      new account.
                    </li>
                    <li>
                      Scan the QR code shown on screen with your phone&apos;s camera
                      (or tap &quot;Can&apos;t scan?&quot; to enter the code manually).
                    </li>
                    <li>
                      Enter the 6-digit code from your authenticator app to confirm
                      setup.
                    </li>
                  </ol>
                  <p className="text-gray-700">
                    Once enabled, you&apos;ll need to enter a code from your app each
                    time you sign in.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  className="min-h-11 w-full bg-teal-600 text-white hover:bg-teal-700 sm:w-auto sm:min-h-0"
                  onClick={() => {
                    setModalOpen(true);
                    void startEnrolment();
                  }}
                >
                  Set up 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up authenticator</DialogTitle>
            <DialogDescription>
              Scan the QR code or enter the secret manually, then enter a 6-digit code to
              confirm.
            </DialogDescription>
          </DialogHeader>

          {enrolling ? (
            <p className="text-sm text-gray-500">Preparing your setup…</p>
          ) : enrolError && !qrCode ? (
            <p className="text-sm text-red-600" role="alert">
              {enrolError}
            </p>
          ) : (
            <form onSubmit={submitEnrolment} className="space-y-4">
              {qrCode ? (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="Authenticator QR code"
                    width={200}
                    height={200}
                    className="h-[200px] w-[200px] object-contain"
                  />
                </div>
              ) : null}

              {secret ? (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-gray-600">Secret key</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={() => void copySecret()}
                    >
                      <Copy className="size-3.5" aria-hidden />
                      Copy
                    </Button>
                  </div>
                  <p className="mt-2 break-all font-mono text-sm text-gray-900">{secret}</p>
                  {copyLabel ? (
                    <p className="mt-1 text-xs text-teal-700" aria-live="polite">
                      {copyLabel}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-1">
                <label htmlFor="mfa-enrol-code" className="text-xs font-medium text-gray-600">
                  Verification code
                </label>
                <input
                  id="mfa-enrol-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={confirmCode}
                  onChange={(e) =>
                    setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-3 text-center font-mono text-xl tracking-[0.25em] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="000000"
                />
              </div>

              {enrolError && qrCode ? (
                <p className="text-sm text-red-600" role="alert">
                  {enrolError}
                </p>
              ) : null}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleModalOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 text-white hover:bg-teal-700"
                  disabled={submitting || confirmCode.length !== 6 || !pendingFactorId}
                >
                  {submitting ? "Enabling…" : "Verify & Enable"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={(o) => !removing && setRemoveOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove two-factor authentication?</DialogTitle>
            <DialogDescription>
              Are you sure? This will remove two-factor authentication from your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={removing}
              onClick={() => setRemoveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => void confirmRemoveMfa()}
            >
              {removing ? "Removing…" : "Remove 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
