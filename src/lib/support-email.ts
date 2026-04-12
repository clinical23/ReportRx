/** Escape user-controlled strings for HTML email bodies. */
export function escapeHtmlForEmail(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const SUPPORT_CATEGORIES = [
  "Bug report",
  "Feature request",
  "Account issue",
  "Data query",
  "Other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export function isValidSupportCategory(v: unknown): v is SupportCategory {
  return (
    typeof v === "string" &&
    (SUPPORT_CATEGORIES as readonly string[]).includes(v)
  );
}
