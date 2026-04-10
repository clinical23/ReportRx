"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBulkEmails(raw: string): {
  valid: string[];
  invalid: string[];
} {
  const parts = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const seenValid = new Set<string>();
  const invalidSeen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const p of parts) {
    if (EMAIL_RE.test(p)) {
      if (!seenValid.has(p)) {
        seenValid.add(p);
        valid.push(p);
      }
    } else if (!invalidSeen.has(p)) {
      invalidSeen.add(p);
      invalid.push(p);
    }
  }
  return { valid, invalid };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type Props = {
  organisationId: string;
  allowAdminRole: boolean;
  /** Lowercase emails already on team profiles for this org */
  existingOrgEmails: string[];
};

export function AdminBulkInviteForm({
  organisationId,
  allowAdminRole,
  existingOrgEmails,
}: Props) {
  const toast = useToast();
  const orgSet = useMemo(
    () => new Set(existingOrgEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    [existingOrgEmails],
  );

  const [raw, setRaw] = useState("");
  const [role, setRole] = useState("clinician");
  const [sending, setSending] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const { valid, invalid } = useMemo(() => parseBulkEmails(raw), [raw]);
  const alreadyInOrg = useMemo(
    () => valid.filter((e) => orgSet.has(e)),
    [valid, orgSet],
  );
  const toInvite = useMemo(
    () => valid.filter((e) => !orgSet.has(e)),
    [valid, orgSet],
  );

  async function sendInvites() {
    if (toInvite.length === 0) {
      toast.error("No new emails to invite (all invalid, duplicate, or already in org).");
      return;
    }

    setSending(true);
    setProgressTotal(toInvite.length);
    setProgressCurrent(0);

    let success = 0;
    let alreadyExists = 0;
    let failed = 0;

    try {
      for (let i = 0; i < toInvite.length; i++) {
        const email = toInvite[i];
        setProgressCurrent(i + 1);

        const res = await fetch("/api/invite", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            role: role.trim(),
            organisation_id: organisationId,
          }),
        });

        if (res.status === 200) {
          success += 1;
        } else if (res.status === 409) {
          alreadyExists += 1;
        } else {
          failed += 1;
        }

        if (i < toInvite.length - 1) {
          await delay(500);
        }
      }

      const summary = `${success} invited, ${alreadyExists} already existed, ${failed} failed`;
      if (failed > 0) {
        toast.error(summary);
      } else {
        toast.success(summary);
      }
      if (success > 0) {
        setRaw("");
      }
    } catch {
      toast.error("Bulk invite stopped due to a network error.");
    } finally {
      setSending(false);
      setProgressCurrent(0);
      setProgressTotal(0);
    }
  }

  return (
    <div className="space-y-3">
      <label
        className="block text-sm font-medium text-gray-700"
        htmlFor="admin-bulk-invite-emails"
      >
        Email addresses (one per line, or comma / semicolon separated)
      </label>
      <textarea
        id="admin-bulk-invite-emails"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={8}
        disabled={sending}
        placeholder={"clinician1@example.com\nclinician2@example.com"}
        className="min-h-[10rem] w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:text-sm"
      />

      <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
        <span>
          <strong className="font-medium text-gray-900">{valid.length}</strong> valid{" "}
          {valid.length === 1 ? "email" : "emails"} found
        </span>
        {toInvite.length !== valid.length ? (
          <span className="text-amber-800">
            <strong className="font-medium">{alreadyInOrg.length}</strong> already in this
            organisation (skipped)
          </span>
        ) : null}
      </div>

      {invalid.length > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-medium">{invalid.length}</span> invalid{" "}
          {invalid.length === 1 ? "entry" : "entries"} removed:{" "}
          <span className="break-all">{invalid.join(", ")}</span>
        </p>
      ) : null}

      {alreadyInOrg.length > 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          Already in org (will not be sent):{" "}
          <span className="break-all">{alreadyInOrg.join(", ")}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            className="mb-1 block text-sm font-medium text-gray-700"
            htmlFor="admin-bulk-invite-role"
          >
            Role
          </label>
          <select
            id="admin-bulk-invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={sending}
            className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm"
          >
            <option value="clinician">Clinician</option>
            <option value="manager">Manager</option>
            {allowAdminRole ? <option value="admin">Admin</option> : null}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void sendInvites()}
          disabled={sending || toInvite.length === 0}
          className="min-h-11 w-full shrink-0 rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60 sm:w-auto md:py-2.5 md:text-sm"
        >
          {sending ? "Sending…" : "Send invites"}
        </button>
      </div>

      {sending && progressTotal > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800">
            Sending {progressCurrent}/{progressTotal}…
          </p>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={progressCurrent}
            aria-valuemin={0}
            aria-valuemax={progressTotal}
          >
            <div
              className="h-full bg-teal-600 transition-[width] duration-200 ease-out"
              style={{
                width: `${Math.round((progressCurrent / progressTotal) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
