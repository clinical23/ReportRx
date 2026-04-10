"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { formatDateTimeUK } from "@/lib/datetime";

type Props = {
  lastExportAt: string | null;
};

function parseFilenameFromDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
  return m?.[1]?.trim() ?? null;
}

export function DsarExportCard({ lastExportAt }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dsar", {
        credentials: "include",
      });

      if (res.status === 429) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.warning(
          body?.error ??
            "You already exported your data recently. Please try again after 24 hours.",
        );
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? "Export failed. Please try again.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fromHeader = parseFilenameFromDisposition(
        res.headers.get("Content-Disposition"),
      );
      a.download =
        fromHeader ?? `reportrx-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started.");
      router.refresh();
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your Data</CardTitle>
        <CardDescription>
          Download a copy of all personal data we hold about you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm text-gray-600">
          {lastExportAt ? (
            <p>
              Last export:{" "}
              <span className="font-medium text-gray-800">
                {formatDateTimeUK(lastExportAt)}
              </span>
            </p>
          ) : (
            <p>You have not downloaded an export yet.</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void download()}
          className="w-full shrink-0 sm:w-auto"
        >
          {loading ? "Preparing…" : "Download My Data"}
        </Button>
      </CardContent>
    </Card>
  );
}
