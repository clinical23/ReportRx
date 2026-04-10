"use client";

import { useEffect } from "react";

import { logAudit, type AuditResourceType } from "@/lib/audit";

/** Registers a `view` audit once when the host page mounts (for server-rendered routes). */
export function RegisterPageView({ resource }: { resource: AuditResourceType }) {
  useEffect(() => {
    void logAudit("view", resource);
  }, [resource]);

  return null;
}
