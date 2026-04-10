"use client";

import { useState } from "react";

type Props = {
  organisationId: string;
  /** Superadmins may invite users with the org admin role. */
  allowAdminRole: boolean;
};

export function AdminInviteForm({ organisationId, allowAdminRole }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setWarning(null);
    setError(null);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role: role.trim(),
          organisation_id: organisationId,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        message?: string;
        warning?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Invite failed");
        setPending(false);
        return;
      }

      if (data.warning) {
        setWarning(data.warning);
      }
      setMessage(data.message ?? "Invitation email sent.");
      setEmail("");
      setRole("");
    } catch {
      setError("Network error — try again.");
    }
    setPending(false);
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
      >
        <input type="hidden" name="organisation_id" value={organisationId} />
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          inputMode="email"
          autoComplete="email"
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm"
        />
        <select
          name="role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm md:col-span-2"
        >
          <option value="" disabled>
            Select role…
          </option>
          <option value="clinician">Clinician</option>
          <option value="manager">Manager</option>
          {allowAdminRole ? (
            <option value="admin">Admin</option>
          ) : null}
        </select>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60 md:min-h-0 md:w-auto md:py-2.5 md:text-sm"
          >
            {pending ? "Sending…" : "Invite user"}
          </button>
        </div>
      </form>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {warning ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warning}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
