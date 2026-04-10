"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
import { createClient } from "@/lib/supabase/client";

export function MfaSettingsSection() {
  const router = useRouter();
  const toast = useToast();
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const enrolCompleteRef = useRef(false);
  const closedDuringEnrolRef = useRef(false);

  const refreshFactors = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      console.error("[MFA] listFactors", error.message);
      setVerifiedFactorId(null);
      return;
    }
    const verified = data?.totp?.find((f) => f.status === "verified") ?? null;
    setVerifiedFactorId(verified?.id ?? null);
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
      toast.error(msg);
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
  }, [toast]);

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

  const submitEnrolment = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = confirmCode.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6 || !pendingFactorId) return;

    setSubmitting(true);
    setEnrolError(null);
    const supabase = createClient();

    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: pendingFactorId,
    });
    if (chErr || !ch?.id) {
      setSubmitting(false);
      setEnrolError("Could not verify the code. Try again.");
      toast.error("Could not verify the code. Try again.");
      return;
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: ch.id,
      code: digits,
    });

    setSubmitting(false);

    if (vErr) {
      setEnrolError("Invalid code. Check your app and try again.");
      toast.error("Invalid code. Check your app and try again.");
      return;
    }

    enrolCompleteRef.current = true;
    await refreshFactors();
    toast.success("Two-factor authentication enabled");
    handleModalOpenChange(false);
    router.refresh();
  };

  const disableMfa = async () => {
    if (
      !window.confirm(
        "Are you sure? This will reduce the security of your account.",
      )
    ) {
      return;
    }
    if (!verifiedFactorId) return;

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactorId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setVerifiedFactorId(null);
    toast.success("Two-factor authentication disabled");
    router.refresh();
  };

  if (loadingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>Loading two-factor settings…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>
            Protect your account with a code from an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verifiedFactorId ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Two-Factor Authentication
                </span>
                <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                  Enabled
                </span>
              </div>
              <Button type="button" variant="outline" onClick={() => void disableMfa()}>
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Two-Factor Authentication
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Add an extra layer of security to your account using an authenticator app.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setModalOpen(true);
                  void startEnrolment();
                }}
              >
                Enable 2FA
              </Button>
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
                  {/* TOTP QR is a data: URI from Supabase — use native img */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="Authenticator QR code"
                    className="h-[200px] w-[200px] max-h-[200px] max-w-[200px] object-contain"
                  />
                </div>
              ) : null}

              {secret ? (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-600">Secret key</p>
                  <p className="mt-1 break-all font-mono text-sm text-gray-900">{secret}</p>
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
                  disabled={submitting || confirmCode.length !== 6 || !pendingFactorId}
                >
                  {submitting ? "Confirming…" : "Confirm"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
