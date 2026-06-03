import { describe, expect, it } from "vitest";
import { createFflateCodecAdapter } from "./fflate-codec.ts";

const URL_UNSAFE_CHARS = /[+/=]/;

describe("FflateCodecAdapter", () => {
  const codec = createFflateCodecAdapter();

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

  it("returns null for invalid compressed input", () => {
    const decoded = codec.decode("not-valid-base64!!");
    expect(decoded).toBeNull();
  });

  it("produces URL-safe output (no +, /, or = characters)", () => {
    const original = "const x = 1;\nconst y = 2;\nconsole.log(x + y);";
    const encoded = codec.encode(original);
    expect(encoded).not.toMatch(URL_UNSAFE_CHARS);
  });
});
