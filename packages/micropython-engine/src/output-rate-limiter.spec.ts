import { describe, expect, it, vi } from "vitest";
import { OutputRateLimiter } from "./output-rate-limiter.ts";

describe("Micropython OutputRateLimiter", () => {
  it("allows messages under the threshold", () => {
    const limiter = new OutputRateLimiter({ maxMessagesPerWindow: 5 });
    for (let i = 0; i < 5; i += 1) {
      expect(limiter.shouldAllowMessage()).toBe(true);
    }
  });

  it("suppresses messages exceeding the threshold within the window", () => {
    const limiter = new OutputRateLimiter({ maxMessagesPerWindow: 3 });
    expect(limiter.shouldAllowMessage()).toBe(true);
    expect(limiter.shouldAllowMessage()).toBe(true);
    expect(limiter.shouldAllowMessage()).toBe(true);
    expect(limiter.shouldAllowMessage()).toBe(false);
  });

  it("flushes suppressed count on flushSuppressedNotice", () => {
    const flushHandler = vi.fn();
    const limiter = new OutputRateLimiter({
      maxMessagesPerWindow: 2,
      onSuppressedFlush: flushHandler,
    });

    limiter.shouldAllowMessage();
    limiter.shouldAllowMessage();
    limiter.shouldAllowMessage();

    expect(flushHandler).not.toHaveBeenCalled();

    limiter.flushSuppressedNotice();
    expect(flushHandler).toHaveBeenCalledTimes(1);
    expect(flushHandler).toHaveBeenCalledWith(1);
  });

  it("updates max messages per window dynamically", () => {
    const limiter = new OutputRateLimiter({ maxMessagesPerWindow: 2 });
    expect(limiter.shouldAllowMessage()).toBe(true);
    expect(limiter.shouldAllowMessage()).toBe(true);
    expect(limiter.shouldAllowMessage()).toBe(false);

    limiter.updateMaxMessagesPerWindow(4);
    expect(limiter.shouldAllowMessage()).toBe(true);
    expect(limiter.shouldAllowMessage()).toBe(true);
    expect(limiter.shouldAllowMessage()).toBe(false);
  });

  it("resets limits cleanly", () => {
    const flushHandler = vi.fn();
    const limiter = new OutputRateLimiter({
      maxMessagesPerWindow: 2,
      onSuppressedFlush: flushHandler,
    });

    limiter.shouldAllowMessage();
    limiter.shouldAllowMessage();
    limiter.shouldAllowMessage();

    limiter.resetLimits();
    limiter.flushSuppressedNotice();
    expect(flushHandler).not.toHaveBeenCalled();

    expect(limiter.shouldAllowMessage()).toBe(true);
  });

  it("resets emitted count when time window advances", () => {
    vi.useFakeTimers();
    try {
      const flushHandler = vi.fn();
      const limiter = new OutputRateLimiter({
        maxMessagesPerWindow: 2,
        onSuppressedFlush: flushHandler,
        windowDurationMs: 500,
      });

      expect(limiter.shouldAllowMessage()).toBe(true);
      expect(limiter.shouldAllowMessage()).toBe(true);
      expect(limiter.shouldAllowMessage()).toBe(false);

      vi.advanceTimersByTime(501);

      expect(limiter.shouldAllowMessage()).toBe(true);
      expect(flushHandler).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
