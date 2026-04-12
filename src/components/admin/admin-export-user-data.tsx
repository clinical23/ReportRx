"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast-provider";
import { MoreHorizontal } from "lucide-react";

function parseFilenameFromDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
  return m?.[1]?.trim() ?? null;
}

type Props = {
  userId: string;
  memberName: string;
};

export function AdminExportUserData({ userId, memberName }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const exportUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dsar?userId=${encodeURIComponent(userId)}`,
        { credentials: "include" },
      );

      if (res.status === 403 || res.status === 404) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? "Export not allowed.");
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? "Export failed.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fromHeader = parseFilenameFromDisposition(
        res.headers.get("Content-Disposition"),
      );
      const contentType = res.headers.get("Content-Type") ?? "";
      const defaultExt = contentType.includes("html") ? "html" : "bin";
      a.download =
        fromHeader ??
        `reportrx-data-export-${memberName.replace(/\s+/g, "-").toLowerCase()}.${defaultExt}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started.");
    } catch {
      toast.error("Export failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          className="h-8 w-8 p-0"
          aria-label={`Actions for ${memberName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={loading}
          onSelect={(e) => {
            e.preventDefault();
            void exportUser();
          }}
        >
          Export User Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
