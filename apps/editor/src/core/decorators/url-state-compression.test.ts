import { describe, expect, it, vi } from "vitest";
import { composeCompressedUrlState } from "./url-state-compression";
import type { UrlStatePort } from "../ports/url-state";
import type { CodecPort } from "../ports/codec";

describe("composeCompressedUrlState", () => {
  const mockBasePort: UrlStatePort = {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  };

  const mockCodec: CodecPort = {
    encode: vi.fn((val) => `ENCODED_${val}`),
    decode: vi.fn((val) => val.replace("ENCODED_", "")),
  };

  const keysToCompress = ["code", "engine"];
  const decorator = composeCompressedUrlState(
    mockBasePort,
    mockCodec,
    keysToCompress,
  );

  it("encodes only specified keys when setting", () => {
    decorator.set("code", "myCode");
    expect(mockCodec.encode).toHaveBeenCalledWith("myCode");
    expect(mockBasePort.set).toHaveBeenCalledWith("code", "ENCODED_myCode");

    decorator.set("uncompressed", "plain");
    expect(mockBasePort.set).toHaveBeenCalledWith("uncompressed", "plain");
  });

  it("decodes only specified keys when getting", () => {
    vi.mocked(mockBasePort.get).mockImplementation((key) => {
      if (key === "code") return "ENCODED_myCode";
      if (key === "uncompressed") return "plain";
      return null;
    });

    const code = decorator.get("code");
    expect(mockCodec.decode).toHaveBeenCalledWith("ENCODED_myCode");
    expect(code).toBe("myCode");

    const uncompressed = decorator.get("uncompressed");
    expect(uncompressed).toBe("plain");
  });

  it("returns null when key is not found", () => {
    vi.mocked(mockBasePort.get).mockReturnValue(null);
    expect(decorator.get("code")).toBeNull();
    expect(decorator.get("missing")).toBeNull();
  });

  it("passes remove calls transparently", () => {
    decorator.remove("code");
    expect(mockBasePort.remove).toHaveBeenCalledWith("code");
  });
});
