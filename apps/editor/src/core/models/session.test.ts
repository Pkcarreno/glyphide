import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEngineRegistry,
  type EngineRegistry,
} from "../engine/registry.ts";
import type { UrlStatePort } from "../ports/url-state.ts";
import { createWorkspaceSession } from "./session.ts";

function createMockUrlState(
  initialState: Record<string, string> = {}
): UrlStatePort & {
  store: Map<string, string>;
} {
  const store = new Map<string, string>(Object.entries(initialState));
  return {
    get: vi.fn((key: string) => store.get(key) ?? null),
    remove: vi.fn((key: string) => {
      store.delete(key);
    }),
    set: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    store,
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
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
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
      expect(urlState.set).not.toHaveBeenCalled();
    });

    it("initializes with empty code when isDefaultCodeEnabled is false", () => {
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled: () => false,
        urlState,
      });

      expect(session.code()).toBe("");
      expect(session.isShowingDefaultCode()).toBe(false);
      expect(urlState.set).not.toHaveBeenCalled();
    });

    it("initializes from URL parameters when present", () => {
      const urlState = createMockUrlState({
        code: "console.log('from url');",
        engine: "quickjs:javascript",
        name: "my_script",
      });
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
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
      const urlState = createMockUrlState({ engine: "unknown_engine" });
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      expect(session.activeEngineId()).toBe("quickjs");
    });
  });

  describe("code updates", () => {
    it("updates code, clears pristine flag, and persists code and engine to URL", () => {
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      session.setCode("const x = 42;");

      expect(session.code()).toBe("const x = 42;");
      expect(session.isShowingDefaultCode()).toBe(false);
      expect(urlState.set).toHaveBeenCalledWith("code", "const x = 42;");
      expect(urlState.set).toHaveBeenCalledWith("engine", "quickjs");
    });

    it("removes engine from URL when code is cleared to empty", () => {
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      session.setCode("");

      expect(session.code()).toBe("");
      expect(session.isShowingDefaultCode()).toBe(false);
      expect(urlState.remove).toHaveBeenCalledWith("engine");
    });

    it("arms pristine flag when setCode is called with source default and non-empty content", () => {
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      session.setCode("print('hello')", { source: "default" });

      expect(session.isShowingDefaultCode()).toBe(true);
    });
  });

  describe("cursor position", () => {
    it("updates cursor coordinates and selection metrics", () => {
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
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
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      session.setProjectName("  awesome_demo  ");

      expect(session.projectName()).toBe("awesome_demo");
      expect(session.displayName()).toBe("awesome_demo");
      expect(urlState.set).toHaveBeenCalledWith("name", "awesome_demo");

      session.setProjectName("   ");
      expect(session.projectName()).toBe("untitled_project");
      expect(session.displayName()).toBe("Untitled");
    });

    it("updates shareable state", () => {
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      session.setShareableState(false);
      expect(session.isUrlShareable()).toBe(false);

      session.setShareableState(true);
      expect(session.isUrlShareable()).toBe(true);
    });
  });

  describe("engine selection and pristine buffer rule", () => {
    it("swaps code with new engine default snippet when buffer is pristine", () => {
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      expect(session.isShowingDefaultCode()).toBe(true);

      session.selectEngine("micropython", "python");

      expect(session.activeEngineId()).toBe("micropython");
      expect(session.activeLanguage()).toBe("python");
      expect(session.code()).toContain("MicroPython");
      expect(session.isShowingDefaultCode()).toBe(true);
    });

    it("preserves user-edited code when engine is swapped", () => {
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      session.setCode("const custom = true;");
      expect(session.isShowingDefaultCode()).toBe(false);

      session.selectEngine("micropython", "python");

      expect(session.activeEngineId()).toBe("micropython");
      expect(session.activeLanguage()).toBe("python");
      expect(session.code()).toBe("const custom = true;");
      expect(session.isShowingDefaultCode()).toBe(false);
    });

    it("serializes multi-language engines with language suffix", () => {
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

      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry: mockRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      session.setCode("let x = 1;");
      session.selectEngine("polyglot", "typescript");

      expect(urlState.set).toHaveBeenCalledWith(
        "engine",
        "polyglot:typescript"
      );
    });
  });

  describe("reset", () => {
    it("clears URL params, restores default code, resets cursor, name, and trust", () => {
      const urlState = createMockUrlState({
        code: "custom code",
        engine: "quickjs:javascript",
        name: "my_project",
      });
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      session.setCursorPosition(5, 10, 4, 1);
      expect(session.isTrustRequired()).toBe(true);

      session.reset();

      expect(urlState.remove).toHaveBeenCalledWith("code");
      expect(urlState.remove).toHaveBeenCalledWith("name");
      expect(urlState.remove).toHaveBeenCalledWith("engine");

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
      const urlState = createMockUrlState();
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
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

      expect(urlState.set).toHaveBeenCalledWith(
        "code",
        "print('imported from file')"
      );
      expect(urlState.set).toHaveBeenCalledWith("name", "algorithm");
      expect(urlState.set).toHaveBeenCalledWith("engine", "micropython");
    });
  });

  describe("trust management", () => {
    it("grants trust and re-arms trust gate when requested", () => {
      const urlState = createMockUrlState({ code: "alert('hi')" });
      const session = createWorkspaceSession({
        engineRegistry,
        isDefaultCodeEnabled,
        urlState,
      });

      expect(session.isTrustRequired()).toBe(true);

      session.grantTrust();
      expect(session.isTrustRequired()).toBe(false);

      session.markTrustRequired();
      expect(session.isTrustRequired()).toBe(true);
    });
  });
});
