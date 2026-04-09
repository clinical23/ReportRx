"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  inviteUserFormAction,
  type InviteFormState,
} from "@/app/actions/admin";

const initial: InviteFormState = { ok: false, message: "", error: "" };

type Props = {
  organisationId: string;
  /** When false, only Clinician and Manager roles are shown (matches server rules). */
  isSuperadmin: boolean;
};

export function AdminInviteForm({ organisationId, isSuperadmin }: Props) {
  const [state, formAction, isPending] = useActionState(
    inviteUserFormAction,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <div className="space-y-3">
      <form
        ref={formRef}
        action={formAction}
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
      >
        <input type="hidden" name="organisation_id" value={organisationId} />
        <input
          type="email"
          name="email"
          required
          placeholder="Email address"
          inputMode="email"
          autoComplete="email"
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm"
        />
        <input
          type="text"
          name="full_name"
          required
          placeholder="Full name"
          autoComplete="name"
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm"
        />
        <select
          name="role"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 md:py-2.5 md:text-sm md:col-span-2"
        >
          <option value="" disabled>
            Select role…
          </option>
          <option value="clinician">Clinician</option>
          <option value="manager">Manager</option>
          {isSuperadmin ? (
            <>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </>
          ) : null}
        </select>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60 md:w-auto md:py-2.5 md:text-sm"
          >
            {isPending ? "Sending…" : "Invite user"}
          </button>
        </div>
      </form>

      {state.ok && state.message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          User invited successfully. {state.message}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
