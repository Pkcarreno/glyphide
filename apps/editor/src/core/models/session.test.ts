import type { CanonicalState } from "@glyphide/url-migration/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEngineRegistry,
  type EngineRegistry,
} from "../engine/registry.ts";
import type { UrlPersistencePort } from "../ports/url-persistence.ts";
import { createWorkspaceSession } from "./session.ts";

function createMockUrlPersistence(
  initialState: CanonicalState | null = null
): UrlPersistencePort & {
  savedHistory: CanonicalState[];
} {
  let current: CanonicalState | null = initialState;
  const savedHistory: CanonicalState[] = [];
  return {
    clear: vi.fn(() => {
      current = null;
    }),
    load: vi.fn(() => current),
    save: vi.fn((state: CanonicalState) => {
      current = state;
      savedHistory.push(state);
      return { isShareable: true };
    }),
    savedHistory,
  };
}

describe("WorkspaceSession", () => {
  let engineRegistry: ReturnType<typeof createEngineRegistry>;
  let isDefaultCodeEnabled: () => boolean;

  beforeEach(() => {
    engineRegistry = createEngineRegistry();
    isDefaultCodeEnabled = () => true;
  });

  describe("initialization", () => {
    it("initializes with default values when URL state is empty and default code is enabled", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      expect(session.projectName()).toBe("untitled_project");
      expect(session.displayName()).toBe("Untitled");
      expect(session.isUrlShareable()).toBe(true);
      expect(session.activeEngineId()).toBe("quickjs");
      expect(session.activeLanguage()).toBe("javascript");
      expect(session.isTrustRequired()).toBe(false);
      expect(session.sharedCode()).toBeNull();
      expect(session.isShowingDefaultCode()).toBe(true);
      expect(session.code()).toContain("Welcome to Glyphide");
      expect(session.cursorPosition()).toEqual({
        column: 1,
        line: 1,
        selectionLength: 0,
        selectionLines: 0,
      });
      // URL must not be touched on initial paint
      expect(urlPersistence.save).not.toHaveBeenCalled();
      expect(urlPersistence.clear).not.toHaveBeenCalled();
    });

    it("initializes with empty code when isDefaultCodeEnabled is false", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled: () => false,
        urlPersistence,
      });

      expect(session.code()).toBe("");
      expect(session.isShowingDefaultCode()).toBe(false);
      expect(urlPersistence.save).not.toHaveBeenCalled();
    });

    it("initializes from URL parameters when present", () => {
      const urlPersistence = createMockUrlPersistence({
        code: "console.log('from url');",
        engine: "quickjs",
        language: "javascript",
        name: "my_script",
      });
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      expect(session.projectName()).toBe("my_script");
      expect(session.displayName()).toBe("my_script");
      expect(session.code()).toBe("console.log('from url');");
      expect(session.activeEngineId()).toBe("quickjs");
      expect(session.activeLanguage()).toBe("javascript");
      expect(session.isTrustRequired()).toBe(true);
      expect(session.sharedCode()).toBe("console.log('from url');");
      // Shared code is user-owned, so pristine default code flag must be false
      expect(session.isShowingDefaultCode()).toBe(false);
    });

    it("falls back to default engine when URL contains unknown engine", () => {
      const urlPersistence = createMockUrlPersistence({
        code: "",
        engine: "unknown_engine",
        language: "",
        name: "",
      });
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      expect(session.activeEngineId()).toBe("quickjs");
    });
  });

  describe("code updates", () => {
    it("updates code, clears pristine flag, and persists code and engine to URL", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.setCode("const x = 42;");

      expect(session.code()).toBe("const x = 42;");
      expect(session.isShowingDefaultCode()).toBe(false);
      expect(urlPersistence.save).toHaveBeenCalledWith({
        code: "const x = 42;",
        engine: "quickjs",
        language: "javascript",
        name: "",
      });
    });

    it("clears URL when code is cleared to empty", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.setCode("");

      expect(session.code()).toBe("");
      expect(session.isShowingDefaultCode()).toBe(false);
      expect(urlPersistence.clear).toHaveBeenCalled();
    });

    it("arms pristine flag and clears URL when setCode is called with source default", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.setCode("print('hello')", { source: "default" });

      expect(session.isShowingDefaultCode()).toBe(true);
      expect(urlPersistence.clear).toHaveBeenCalled();
    });
  });

  describe("cursor position", () => {
    it("updates cursor coordinates and selection metrics", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.setCursorPosition(10, 5, 12, 2);

      expect(session.cursorPosition()).toEqual({
        column: 5,
        line: 10,
        selectionLength: 12,
        selectionLines: 2,
      });
    });
  });

  describe("project name and shareability", () => {
    it("updates and sanitizes project name and updates displayName", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      // User adds code first
      session.setCode("console.log(1);");
      session.setProjectName("  awesome_demo  ");

      expect(session.projectName()).toBe("awesome_demo");
      expect(session.displayName()).toBe("awesome_demo");
      expect(urlPersistence.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "awesome_demo" })
      );

      session.setProjectName("   ");
      expect(session.projectName()).toBe("untitled_project");
      expect(session.displayName()).toBe("Untitled");
      expect(urlPersistence.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "" })
      );
    });

    it("updates shareable state", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.setShareableState(false);
      expect(session.isUrlShareable()).toBe(false);

      session.setShareableState(true);
      expect(session.isUrlShareable()).toBe(true);
    });
  });

  describe("engine selection and pristine buffer rule", () => {
    it("swaps code with new engine default snippet when buffer is pristine", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      expect(session.isShowingDefaultCode()).toBe(true);

      session.selectEngine("micropython", "python");

      expect(session.activeEngineId()).toBe("micropython");
      expect(session.activeLanguage()).toBe("python");
      expect(session.code()).toContain("MicroPython");
      expect(session.isShowingDefaultCode()).toBe(true);
      expect(urlPersistence.clear).toHaveBeenCalled();
    });

    it("preserves user-edited code when engine is swapped", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.setCode("const custom = true;");
      expect(session.isShowingDefaultCode()).toBe(false);

      session.selectEngine("micropython", "python");

      expect(session.activeEngineId()).toBe("micropython");
      expect(session.activeLanguage()).toBe("python");
      expect(session.code()).toBe("const custom = true;");
      expect(session.isShowingDefaultCode()).toBe(false);
      expect(urlPersistence.save).toHaveBeenCalledWith({
        code: "const custom = true;",
        engine: "micropython",
        language: "python",
        name: "",
      });
    });

    it("serializes multi-language engines with correct engine and language", () => {
      const mockRegistry: EngineRegistry = {
        ...engineRegistry,
        getDefinition: (id: string) => {
          if (id === "polyglot") {
            return {
              defaultInitParams: { timeout: 30_000 },
              fileExtensions: [".js", ".ts"],
              id: "polyglot",
              label: "Polyglot Engine",
              loadFactory: vi.fn(),
              paramDescriptors: [],
              supportedLanguages: ["javascript", "typescript"],
            };
          }
          return engineRegistry.getDefinition(id);
        },
      };

      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry: mockRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.setCode("let x = 1;");
      session.selectEngine("polyglot", "typescript");

      expect(urlPersistence.save).toHaveBeenCalledWith({
        code: "let x = 1;",
        engine: "polyglot",
        language: "typescript",
        name: "",
      });
    });
  });

  describe("reset", () => {
    it("clears URL, restores default code, resets cursor, name, and trust", () => {
      const urlPersistence = createMockUrlPersistence({
        code: "custom code",
        engine: "quickjs",
        language: "javascript",
        name: "my_project",
      });
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.setCursorPosition(5, 10, 4, 1);
      expect(session.isTrustRequired()).toBe(true);

      session.reset();

      expect(urlPersistence.clear).toHaveBeenCalled();
      expect(session.projectName()).toBe("untitled_project");
      expect(session.displayName()).toBe("Untitled");
      expect(session.cursorPosition()).toEqual({
        column: 1,
        line: 1,
        selectionLength: 0,
        selectionLines: 0,
      });
      expect(session.isTrustRequired()).toBe(false);
      expect(session.isShowingDefaultCode()).toBe(true);
      expect(session.code()).toContain("Welcome to Glyphide");
    });
  });

  describe("loadFile", () => {
    it("loads file content, strips extension for project name, switches engine, and arms trust gate", () => {
      const urlPersistence = createMockUrlPersistence(null);
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      session.loadFile({
        content: "print('imported from file')",
        engineId: "micropython",
        language: "python",
        name: "algorithm.py",
      });

      expect(session.code()).toBe("print('imported from file')");
      expect(session.projectName()).toBe("algorithm");
      expect(session.displayName()).toBe("algorithm");
      expect(session.activeEngineId()).toBe("micropython");
      expect(session.activeLanguage()).toBe("python");
      expect(session.isShowingDefaultCode()).toBe(false);
      expect(session.isTrustRequired()).toBe(true);

      expect(urlPersistence.save).toHaveBeenCalledWith({
        code: "print('imported from file')",
        engine: "micropython",
        language: "python",
        name: "algorithm",
      });
    });
  });

  describe("trust management", () => {
    it("grants trust and re-arms trust gate when requested", () => {
      const urlPersistence = createMockUrlPersistence({
        code: "alert('hi')",
        engine: "quickjs",
        language: "javascript",
        name: "",
      });
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlPersistence,
      });

      expect(session.isTrustRequired()).toBe(true);

      session.grantTrust();
      expect(session.isTrustRequired()).toBe(false);

      session.markTrustRequired();
      expect(session.isTrustRequired()).toBe(true);
    });
  });
});
