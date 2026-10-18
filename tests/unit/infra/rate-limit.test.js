import { createRateLimiter } from "infra/rate-limit.js";

describe("`createRateLimiter()`", () => {
  test("Blocks the request that passes the limit inside the window", () => {
    let currentTime = 1_000;
    const consume = createRateLimiter({
      limit: 2,
      windowMs: 10_000,
      now: () => currentTime,
    });

    expect(consume("ip").allowed).toBe(true);
    expect(consume("ip").allowed).toBe(true);

    const blocked = consume("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(10_000);
  });

  test("Starts a new window after the interval and keeps keys apart", () => {
    let currentTime = 1_000;
    const consume = createRateLimiter({
      limit: 1,
      windowMs: 10_000,
      now: () => currentTime,
    });

    expect(consume("um").allowed).toBe(true);
    expect(consume("outro").allowed).toBe(true);
    expect(consume("um").allowed).toBe(false);

    currentTime += 10_000;
    expect(consume("um").allowed).toBe(true);
  });
});
