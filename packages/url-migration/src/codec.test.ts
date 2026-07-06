import { describe, expect, it } from "vitest";
import { decode, encode } from "./codec.ts";

const URL_UNSAFE_CHARS = /[+/=]/;

describe("codec", () => {
  it("encodes and decodes a string successfully", () => {
    const original = "console.log('Hello, World!');\nreturn 42;";
    const encoded = encode(original);

    expect(encoded).not.toBe(original);
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decode(encoded);
    expect(decoded).toBe(original);
  });

  it("handles empty strings", () => {
    const encoded = encode("");
    const decoded = decode(encoded);
    expect(decoded).toBe("");
  });

  it("returns null for invalid compressed input", () => {
    const decoded = decode("not-valid-base64!!");
    expect(decoded).toBeNull();
  });

  it("produces URL-safe output (no +, /, or = characters)", () => {
    const original = "const x = 1;\nconst y = 2;\nconsole.log(x + y);";
    const encoded = encode(original);
    expect(encoded).not.toMatch(URL_UNSAFE_CHARS);
  });

  it("matches the editor codec byte-for-byte for the same input", () => {
    const original = "console.log(1)";
    // Snapshot of the editor's fflate-codec output to guarantee encoder parity.
    // Both encoders must produce this exact string for the same input.
    const sharedEncoded = "S87PK87PSdXLyU_XMNQEAA";

    expect(encode(original)).toBe(sharedEncoded);
    expect(decode(sharedEncoded)).toBe(original);
  });
});
