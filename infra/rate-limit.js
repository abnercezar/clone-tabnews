// Limite em memória, por processo. Em produção com várias instâncias (Vercel),
// cada instância conta separadamente: reduz abuso, mas não o impede por completo.
export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const buckets = Object.create(null);

  return function consume(key) {
    const currentTime = now();
    const bucket = buckets[key];

    if (!bucket || currentTime - bucket.start >= windowMs) {
      buckets[key] = { start: currentTime, count: 1 };
      return { allowed: true, retryAfterMs: 0 };
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        retryAfterMs: windowMs - (currentTime - bucket.start),
      };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  };
}
