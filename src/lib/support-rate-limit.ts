/**
 * Best-effort limit for successful support emails (max 5 per user per UTC day).
 * In serverless, counts reset when the instance recycles.
 */
const buckets = new Map<string, { day: string; count: number }>();

const MAX_PER_DAY = 5;

export function isUnderSupportDailyLimit(userId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const existing = buckets.get(userId);
  if (!existing || existing.day !== day) return true;
  return existing.count < MAX_PER_DAY;
}

export function recordSuccessfulSupportSend(userId: string): void {
  const day = new Date().toISOString().slice(0, 10);
  const existing = buckets.get(userId);
  if (!existing || existing.day !== day) {
    buckets.set(userId, { day, count: 1 });
    return;
  }
  existing.count += 1;
}
