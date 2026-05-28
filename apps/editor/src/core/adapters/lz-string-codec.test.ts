import { describe, expect, it } from "vitest";
import { createLzStringCodecAdapter } from "./lz-string-codec";

describe("LzStringCodecAdapter", () => {
  const codec = createLzStringCodecAdapter();

  it("encodes and decodes a string successfully", () => {
    const original = "console.log('Hello, World!');\nreturn 42;";
    const encoded = codec.encode(original);

    expect(encoded).not.toBe(original);
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = codec.decode(encoded);
    expect(decoded).toBe(original);
  });

  it("handles empty strings", () => {
    const encoded = codec.encode("");
    const decoded = codec.decode(encoded);
    expect(decoded).toBe("");
  });

  it("returns null or unreadable for invalid inputs if not compressed", () => {
    const decoded = codec.decode("not-valid-base64");
    expect(() => codec.decode("invalid")).not.toThrow();
  });
});
