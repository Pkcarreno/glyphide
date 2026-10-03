import { describe, expect, it } from "vitest";
import { formatCompactCount } from "./format-compact-count.ts";

describe("formatCompactCount", () => {
  it("returns numbers below 1000 unchanged as strings", () => {
    expect(formatCompactCount(0)).toBe("0");
    expect(formatCompactCount(42)).toBe("42");
    expect(formatCompactCount(100)).toBe("100");
    expect(formatCompactCount(999)).toBe("999");
  });

  it("formats thousands with lowercase k suffix", () => {
    expect(formatCompactCount(1000)).toBe("1k");
    expect(formatCompactCount(1200)).toBe("1.2k");
    expect(formatCompactCount(10_000)).toBe("10k");
    expect(formatCompactCount(85_500)).toBe("85.5k");
  });

  it("formats millions with lowercase m suffix", () => {
    expect(formatCompactCount(1_000_000)).toBe("1m");
    expect(formatCompactCount(2_500_000)).toBe("2.5m");
  });
});
