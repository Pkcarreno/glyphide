import { describe, expect, it } from "vitest";
import type { EditorAction, OverlayId } from "./types.ts";

describe("EditorAction — trust mode types", () => {
  it("GRANT_TRUST is a valid EditorAction member with no payload", () => {
    const action: EditorAction = { type: "GRANT_TRUST" };
    // Runtime check: verify the discriminator is a non-empty string
    expect(typeof action.type).toBe("string");
    expect(action.type.length).toBeGreaterThan(0);
    // GRANT_TRUST is a no-payload action
    expect(Object.keys(action)).toEqual(["type"]);
    expect(action).not.toHaveProperty("payload");
  });

  it("CLOSE_OVERLAY with trust-required is a valid EditorAction member", () => {
    const action: EditorAction = {
      overlayId: "trust-required",
      type: "CLOSE_OVERLAY",
    };
    expect(typeof action.type).toBe("string");
    expect(action.type.length).toBeGreaterThan(0);
    expect(action.overlayId).toBe("trust-required");
  });

  it("OPEN_OVERLAY with trust-required is a valid EditorAction member", () => {
    const action: EditorAction = {
      overlayId: "trust-required",
      type: "OPEN_OVERLAY",
    };
    expect(typeof action.type).toBe("string");
    expect(action.type.length).toBeGreaterThan(0);
    expect(action.overlayId).toBe("trust-required");
  });

  it("trust-required is assignable to OverlayId", () => {
    const id: OverlayId = "trust-required";
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

describe("EditorAction — file backup flow types", () => {
  it("LOAD_FILE_FROM_DISK carries name, content, engineId, and language", () => {
    const action: EditorAction = {
      content: "console.log(1)",
      engineId: "quickjs",
      language: "javascript",
      name: "script.js",
      type: "LOAD_FILE_FROM_DISK",
    };
    expect(action.type).toBe("LOAD_FILE_FROM_DISK");
    expect(action.name).toBe("script.js");
    expect(action.content).toBe("console.log(1)");
    expect(action.engineId).toBe("quickjs");
    expect(action.language).toBe("javascript");
  });

  it("DOWNLOAD_BUFFER_TO_FILE has no extra payload", () => {
    const action: EditorAction = { type: "DOWNLOAD_BUFFER_TO_FILE" };
    expect(action.type).toBe("DOWNLOAD_BUFFER_TO_FILE");
    expect(Object.keys(action)).toEqual(["type"]);
  });

  it("RESET_PROJECT_STATE has no extra payload", () => {
    const action: EditorAction = { type: "RESET_PROJECT_STATE" };
    expect(action.type).toBe("RESET_PROJECT_STATE");
    expect(Object.keys(action)).toEqual(["type"]);
  });
});
