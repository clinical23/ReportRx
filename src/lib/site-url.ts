/**
 * Public site base URL for redirects, emails, and report footers.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://reportrx.co.uk).
 */
export function getPublicSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://reportrx.co.uk"
  );
}
