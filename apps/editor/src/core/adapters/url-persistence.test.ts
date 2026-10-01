import { buildCurrentUrl } from "@glyphide/url-migration/build-url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserUrlPersistenceAdapter } from "./url-persistence.ts";

const PLUS_GLOBAL_REGEX = /\+/g;
const SLASH_GLOBAL_REGEX = /\//g;
const TRAILING_EQUALS_REGEX = /[=]+$/;

describe("createBrowserUrlPersistenceAdapter", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "http://localhost:3000/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("load", () => {
    it("returns null when the address bar has no query parameters or hash", () => {
      window.history.replaceState(null, "", "http://localhost:3000/");
      const adapter = createBrowserUrlPersistenceAdapter();

      expect(adapter.load()).toBeNull();
    });

    it("loads and parses a canonical state from a v3 share URL", () => {
      const canonical = {
        code: 'console.log("hello")',
        engine: "quickjs",
        language: "javascript",
        name: "test_project",
      };
      const built = buildCurrentUrl(canonical, "http://localhost:3000/");
      window.history.replaceState(null, "", built.url);

      const adapter = createBrowserUrlPersistenceAdapter();
      const loaded = adapter.load();

      expect(loaded).toEqual(canonical);
    });

    it("transparently migrates legacy v1 hash URLs and updates the address bar to v3", () => {
      // v1 format uses #code=<base64url(JSON.stringify(JSON.stringify({ state: { code, title } })))>
      const stateObj = { state: { code: "const x = 42;", title: "legacy" } };
      const doubleJson = JSON.stringify(JSON.stringify(stateObj));
      const base64 = btoa(doubleJson)
        .replace(PLUS_GLOBAL_REGEX, "-")
        .replace(SLASH_GLOBAL_REGEX, "_")
        .replace(TRAILING_EQUALS_REGEX, "");
      window.history.replaceState(
        null,
        "",
        `http://localhost:3000/#code=${base64}`
      );

      const adapter = createBrowserUrlPersistenceAdapter();
      const loaded = adapter.load();

      expect(loaded?.code).toBe("const x = 42;");
      expect(loaded?.name).toBe("legacy");
      expect(loaded?.engine).toBe("quickjs");
      // Address bar should now have query params, not hash
      expect(window.location.hash).toBe("");
      expect(window.location.search).toContain("code=");
    });

    it("synthesizes partial canonical state when query params contain engine or name without code", () => {
      window.history.replaceState(
        null,
        "",
        "http://localhost:3000/?engine=micropython&name=my_script"
      );
      const adapter = createBrowserUrlPersistenceAdapter();
      const loaded = adapter.load();

      expect(loaded).toEqual({
        code: "",
        engine: "micropython",
        language: "python",
        name: "my_script",
      });
    });

    it("synthesizes partial canonical state with compound engine:language string", () => {
      window.history.replaceState(
        null,
        "",
        "http://localhost:3000/?engine=micropython:python"
      );
      const adapter = createBrowserUrlPersistenceAdapter();
      const loaded = adapter.load();

      expect(loaded).toEqual({
        code: "",
        engine: "micropython",
        language: "python",
        name: "",
      });
    });
  });

  describe("save", () => {
    it("serializes canonical state and updates the address bar, returning isShareable: true", () => {
      const adapter = createBrowserUrlPersistenceAdapter();
      const state = {
        code: 'console.log("persisted")',
        engine: "quickjs",
        language: "javascript",
        name: "test_save",
      };

      const result = adapter.save(state);

      expect(result.isShareable).toBe(true);
      expect(window.location.search).toContain("code=");
      expect(window.location.search).toContain("engine=");
      expect(window.location.search).toContain("name=");

      const loaded = adapter.load();
      expect(loaded).toEqual(state);
    });

    it("clears URL query and returns isShareable: false when serialized length exceeds limit", () => {
      const warnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      const adapter = createBrowserUrlPersistenceAdapter();
      // Generate high-entropy string to exceed 8000 characters when compressed
      let massiveCode = "";
      for (let i = 0; i < 2000; i += 1) {
        massiveCode += `${Math.random().toString(36)}-`;
      }
      const state = {
        code: massiveCode,
        engine: "quickjs",
        language: "javascript",
        name: "overflow",
      };

      const result = adapter.save(state);

      expect(result.isShareable).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("URL exceeds 8000 characters")
      );
      // Query parameters must be stripped to prevent broken state
      expect(window.location.search).toBe("");
    });
  });

  describe("clear", () => {
    it("removes all query parameters from the address bar", () => {
      window.history.replaceState(
        null,
        "",
        "http://localhost:3000/?code=123&name=foo"
      );
      const adapter = createBrowserUrlPersistenceAdapter();

      adapter.clear();

      expect(window.location.search).toBe("");
      expect(window.location.pathname).toBe("/");
    });
  });
});
