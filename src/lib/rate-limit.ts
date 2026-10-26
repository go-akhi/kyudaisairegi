/**
 * In-memory, single-process rate limiting. Enough to stop someone sitting on
 * the public URL guessing a stall password; resets on restart, which is fine.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();

  // keep the map from growing forever
  if (buckets.size > 5000) {
    for (const [entryKey, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(entryKey);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}
