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
      type: "CLOSE_OVERLAY",
      overlayId: "trust-required",
    };
    expect(typeof action.type).toBe("string");
    expect(action.type.length).toBeGreaterThan(0);
    expect(action.overlayId).toBe("trust-required");
  });

  it("OPEN_OVERLAY with trust-required is a valid EditorAction member", () => {
    const action: EditorAction = {
      type: "OPEN_OVERLAY",
      overlayId: "trust-required",
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
