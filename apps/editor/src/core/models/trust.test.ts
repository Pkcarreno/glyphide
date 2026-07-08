import { describe, expect, it, vi } from "vitest";
import type { UrlStatePort } from "../ports/url-state.ts";
import { createTrustModel } from "./trust.ts";

function createMockUrlState(
  overrides: Partial<Record<string, string | null>> = {}
): UrlStatePort {
  const store = new Map<string, string | null>();
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      store.set(key, value);
    }
  }
  return {
    get: vi.fn((key: string) => store.get(key) ?? null),
    set: vi.fn(),
    remove: vi.fn(),
  };
}

describe("TrustModel", () => {
  describe("detection: URL contains code parameter", () => {
    it("sets isTrustRequired to true when code param is present", () => {
      const urlState = createMockUrlState({ code: "console.log(1)" });
      const trust = createTrustModel(urlState);

      expect(trust.isTrustRequired()).toBe(true);
    });

    it("sets sharedCode to the decoded URL code value", () => {
      const urlState = createMockUrlState({
        code: "console.log('hello')",
      });
      const trust = createTrustModel(urlState);

      expect(trust.sharedCode()).toBe("console.log('hello')");
    });
  });

  describe("detection: URL has no code parameter", () => {
    it("sets isTrustRequired to false when no code param", () => {
      const urlState = createMockUrlState({});
      const trust = createTrustModel(urlState);

      expect(trust.isTrustRequired()).toBe(false);
    });

    it("sets sharedCode to null when no code param", () => {
      const urlState = createMockUrlState({});
      const trust = createTrustModel(urlState);

      expect(trust.sharedCode()).toBeNull();
    });

    it("sets isTrustRequired to false when code param is empty string", () => {
      const urlState = createMockUrlState({ code: "" });
      const trust = createTrustModel(urlState);

      expect(trust.isTrustRequired()).toBe(false);
    });
  });

  describe("grantTrust()", () => {
    it("sets isTrustRequired to false after granting trust", () => {
      const urlState = createMockUrlState({
        code: "console.log('shared')",
      });
      const trust = createTrustModel(urlState);

      expect(trust.isTrustRequired()).toBe(true);

      trust.grantTrust();

      expect(trust.isTrustRequired()).toBe(false);
    });

    it("leaves sharedCode unchanged after granting trust", () => {
      const urlState = createMockUrlState({
        code: "console.log('shared')",
      });
      const trust = createTrustModel(urlState);

      trust.grantTrust();

      expect(trust.sharedCode()).toBe("console.log('shared')");
    });

    it("is a no-op when trust is not required", () => {
      const urlState = createMockUrlState({});
      const trust = createTrustModel(urlState);

      expect(trust.isTrustRequired()).toBe(false);

      trust.grantTrust();

      expect(trust.isTrustRequired()).toBe(false);
    });
  });

  describe("markTrustRequired()", () => {
    it("re-arms the trust gate even when initially not required", () => {
      const urlState = createMockUrlState({});
      const trust = createTrustModel(urlState);

      expect(trust.isTrustRequired()).toBe(false);

      trust.markTrustRequired();

      expect(trust.isTrustRequired()).toBe(true);
    });

    it("re-arms the trust gate after grantTrust was called", () => {
      const urlState = createMockUrlState({
        code: "console.log('shared')",
      });
      const trust = createTrustModel(urlState);

      trust.grantTrust();
      expect(trust.isTrustRequired()).toBe(false);

      trust.markTrustRequired();
      expect(trust.isTrustRequired()).toBe(true);
    });
  });
});
