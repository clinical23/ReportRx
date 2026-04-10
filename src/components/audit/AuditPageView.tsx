"use client";

import { useEffect, useRef } from "react";

import { logAudit, type AuditResource } from "@/lib/audit";
import { createClient } from "@/lib/supabase/client";

type Props = {
  resourceType: AuditResource;
  metadata?: Record<string, unknown>;
  /** Optional segment (e.g. URL filter fingerprint) so the same page logs again when filters change */
  viewKey?: string;
};

export function AuditPageView({ resourceType, metadata, viewKey }: Props) {
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    const signature = `${resourceType}|${viewKey ?? ""}|${JSON.stringify(metadata ?? {})}`;
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;

    const supabase = createClient();
    logAudit({
      supabase,
      action: "view",
      resourceType,
      metadata,
    });
  }, [resourceType, viewKey, metadata]);

  return null;
}
