import { language as cmLanguage } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { render, screen, waitFor } from "@solidjs/testing-library";
import { EditorView } from "codemirror";
import { createSignal, flush } from "solid-js";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeField } from "./CodeField.tsx";
import * as languageModule from "./language.ts";

vi.mock("./language.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./language.ts")>();
  return {
    actualLoadLanguageExtension: actual.loadLanguageExtension,
    loadLanguageExtension: vi.fn((requestedLanguage?: string) =>
      actual.loadLanguageExtension(requestedLanguage)
    ),
  };
});

function getActualLoader() {
  return (
    languageModule as unknown as {
      actualLoadLanguageExtension: typeof languageModule.loadLanguageExtension;
    }
  ).actualLoadLanguageExtension;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function getEditorView(container: HTMLElement): EditorView {
  const cmElement = container.querySelector(".cm-editor");
  if (!cmElement) {
    throw new Error("Expected .cm-editor element to be rendered");
  }
  const view = EditorView.findFromDOM(cmElement as HTMLElement);
  if (!view) {
    throw new Error("Expected CodeMirror EditorView instance");
  }
  return view;
}

async function flushAsyncImports() {
  await Promise.resolve();
  await Promise.resolve();
  flush();
}

function mockLanguagePromises(
  resolvers: Partial<Record<string, () => Promise<Extension>>>
) {
  vi.mocked(languageModule.loadLanguageExtension).mockImplementation(
    (requestedLanguage?: string) => {
      const resolver = requestedLanguage
        ? resolvers[requestedLanguage]
        : undefined;
      return resolver ? resolver() : Promise.resolve([]);
    }
  );
}

async function withMutedConsoleError(
  runTest: (errorSpy: ReturnType<typeof vi.spyOn>) => Promise<void>
) {
  const errorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  try {
    await runTest(errorSpy);
  } finally {
    errorSpy.mockRestore();
  }
}

beforeAll(() => {
  if (typeof window !== "undefined" && typeof window.Range !== "undefined") {
    window.Range.prototype.getBoundingClientRect = () => ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      toJSON: () => {
        /* mock */
      },
      top: 0,
      width: 0,
      x: 0,
      y: 0,
    });
    window.Range.prototype.getClientRects = () =>
      ({
        item: () => null,
        length: 0,
        *[Symbol.iterator]() {
          /* mock */
        },
      }) as unknown as DOMRectList;
  }
});

describe("CodeField", () => {
  beforeEach(() => {
    const mockLoader = vi.mocked(languageModule.loadLanguageExtension);
    const actualLoader = getActualLoader();
    mockLoader.mockReset();
    mockLoader.mockImplementation((requestedLanguage?: string) =>
      actualLoader(requestedLanguage)
    );
  });

  it("renders without crashing", () => {
    const { container } = render(() => <CodeField />);
    expect(container.querySelector(".cm-editor")).not.toBeNull();
  });

  it("initializes with default value", () => {
    const { container } = render(() => <CodeField value="const a = 1;" />);
    expect(container.textContent).toContain("const a = 1;");
  });

  it("updates when the value prop changes", () => {
    const onValueChange = vi.fn();
    render(() => <CodeField onValueChange={onValueChange} value="test" />);
    expect(screen.queryByText("test")).not.toBeNull();
  });

  it("fires onCursorChange when editor updates", async () => {
    const onCursorChange = vi.fn();
    const [val, setVal] = createSignal("test");
    render(() => <CodeField onCursorChange={onCursorChange} value={val()} />);

    setVal("new test");
    await waitFor(() => {
      expect(onCursorChange).toHaveBeenCalled();
      const [callArgs] = onCursorChange.mock.calls;
      // Expected to be called with at least line and column
      expect(callArgs[0]).toBe(1);
    });
  });

  it("applies syntax highlighting correctly", async () => {
    const { container } = render(() => (
      <CodeField language="javascript" value="const a = 1;" />
    ));

    await waitFor(() => {
      const highlightSpans = container.querySelectorAll(
        ".cm-content span[class^='ͼ']"
      );
      expect(highlightSpans.length).toBeGreaterThan(0);
    });
  });

  it("enables word wrap when isWordWrapEnabled is true", async () => {
    const { container } = render(() => (
      <CodeField isWordWrapEnabled={true} value="long text" />
    ));
    await waitFor(() => {
      expect(container.querySelector(".cm-lineWrapping")).not.toBeNull();
    });
  });

  it("disables word wrap when isWordWrapEnabled is false", async () => {
    const { container } = render(() => (
      <CodeField isWordWrapEnabled={false} value="long text" />
    ));
    await waitFor(() => {
      expect(container.querySelector(".cm-lineWrapping")).toBeNull();
    });
  });

  it("does not call onValueChange when value prop is updated programmatically", async () => {
    const onValueChange = vi.fn();
    const [val, setVal] = createSignal("initial");
    render(() => <CodeField onValueChange={onValueChange} value={val()} />);

    setVal("updated programmatically");
    await waitFor(() => {
      expect(screen.queryByText("updated programmatically")).not.toBeNull();
    });

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("calls onValueChange when user edits document directly in CodeMirror", () => {
    const onValueChange = vi.fn();
    const { container } = render(() => (
      <CodeField onValueChange={onValueChange} value="hello" />
    ));

    const cmElement = container.querySelector(".cm-editor");
    expect(cmElement).not.toBeNull();

    const view = EditorView.findFromDOM(cmElement as HTMLElement);
    expect(view).toBeDefined();

    view?.dispatch({
      changes: { from: 5, insert: " world" },
      userEvent: "input",
    });

    expect(onValueChange).toHaveBeenCalledWith("hello world");
  });

  it("ignores stale language import that resolves after a newer language selection", async () => {
    const actualLoader = getActualLoader();
    const javascriptDeferred = createDeferred<Extension>();
    const pythonDeferred = createDeferred<Extension>();

    mockLanguagePromises({
      javascript: () => javascriptDeferred.promise,
      python: () => pythonDeferred.promise,
    });

    const [selectedLanguage, setSelectedLanguage] =
      createSignal<string>("javascript");
    const { container } = render(() => (
      <CodeField language={selectedLanguage()} value="def run(): pass" />
    ));
    const view = getEditorView(container);

    setSelectedLanguage("python");
    flush();

    pythonDeferred.resolve(await actualLoader("python"));
    await waitFor(() => {
      expect(view.state.facet(cmLanguage)?.name).toBe("python");
    });

    javascriptDeferred.resolve(await actualLoader("javascript"));
    await flushAsyncImports();

    expect(view.state.facet(cmLanguage)?.name).toBe("python");
  });

  it("switches languages dynamically and falls back to plaintext for unsupported languages", async () => {
    const [selectedLanguage, setSelectedLanguage] = createSignal<
      string | undefined
    >("javascript");
    const { container } = render(() => (
      <CodeField language={selectedLanguage()} value="const x = 1;" />
    ));
    const view = getEditorView(container);

    await waitFor(() => {
      expect(view.state.facet(cmLanguage)?.name).toBe("javascript");
    });

    setSelectedLanguage("python");
    flush();
    await waitFor(() => {
      expect(view.state.facet(cmLanguage)?.name).toBe("python");
    });

    setSelectedLanguage("plaintext");
    flush();
    await waitFor(() => {
      expect(view.state.facet(cmLanguage)).toBeNull();
    });

    setSelectedLanguage("javascript");
    flush();
    await waitFor(() => {
      expect(view.state.facet(cmLanguage)?.name).toBe("javascript");
    });

    setSelectedLanguage("unknown-language");
    flush();
    await waitFor(() => {
      expect(view.state.facet(cmLanguage)).toBeNull();
    });
  });

  it("handles rapid multi-switch chains and only applies the final language", async () => {
    const actualLoader = getActualLoader();
    const firstJavascriptDeferred = createDeferred<Extension>();
    const secondPythonDeferred = createDeferred<Extension>();
    const thirdJavascriptDeferred = createDeferred<Extension>();
    let javascriptLoadCount = 0;

    mockLanguagePromises({
      javascript: () => {
        javascriptLoadCount += 1;
        return javascriptLoadCount === 1
          ? firstJavascriptDeferred.promise
          : thirdJavascriptDeferred.promise;
      },
      python: () => secondPythonDeferred.promise,
    });

    const [selectedLanguage, setSelectedLanguage] =
      createSignal<string>("javascript");
    const { container } = render(() => (
      <CodeField language={selectedLanguage()} value="const x = 1;" />
    ));
    const view = getEditorView(container);

    setSelectedLanguage("python");
    flush();
    setSelectedLanguage("javascript");
    flush();

    thirdJavascriptDeferred.resolve(await actualLoader("javascript"));
    await waitFor(() => {
      expect(view.state.facet(cmLanguage)?.name).toBe("javascript");
    });

    secondPythonDeferred.resolve(await actualLoader("python"));
    firstJavascriptDeferred.resolve(await actualLoader("javascript"));
    await flushAsyncImports();

    expect(view.state.facet(cmLanguage)?.name).toBe("javascript");
  });

  it("falls back to plaintext and logs an error when active language import fails", async () => {
    await withMutedConsoleError(async (errorSpy) => {
      const [selectedLanguage, setSelectedLanguage] =
        createSignal<string>("python");
      const { container } = render(() => (
        <CodeField language={selectedLanguage()} value="def run(): pass" />
      ));
      const view = getEditorView(container);

      await waitFor(() => {
        expect(view.state.facet(cmLanguage)?.name).toBe("python");
      });

      vi.mocked(languageModule.loadLanguageExtension).mockRejectedValueOnce(
        new Error("Chunk load failed")
      );

      setSelectedLanguage("javascript");
      flush();

      await waitFor(() => {
        expect(view.state.facet(cmLanguage)).toBeNull();
      });

      expect(errorSpy).toHaveBeenCalledWith(
        "Error loading language engine for javascript:",
        expect.any(Error)
      );
    });
  });

  it("does not log or reconfigure when a superseded language import rejects", async () => {
    const actualLoader = getActualLoader();
    const javascriptDeferred = createDeferred<Extension>();
    const pythonDeferred = createDeferred<Extension>();

    await withMutedConsoleError(async (errorSpy) => {
      mockLanguagePromises({
        javascript: () => javascriptDeferred.promise,
        python: () => pythonDeferred.promise,
      });

      const [selectedLanguage, setSelectedLanguage] =
        createSignal<string>("javascript");
      const { container } = render(() => (
        <CodeField language={selectedLanguage()} value="def run(): pass" />
      ));
      const view = getEditorView(container);

      setSelectedLanguage("python");
      flush();

      pythonDeferred.resolve(await actualLoader("python"));
      await waitFor(() => {
        expect(view.state.facet(cmLanguage)?.name).toBe("python");
      });

      javascriptDeferred.reject(new Error("Stale chunk error"));
      await flushAsyncImports();

      expect(view.state.facet(cmLanguage)?.name).toBe("python");
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  it("cancels in-flight language import on unmount without dispatching to destroyed view", async () => {
    const actualLoader = getActualLoader();
    const javascriptDeferred = createDeferred<Extension>();

    await withMutedConsoleError(async (errorSpy) => {
      mockLanguagePromises({
        javascript: () => javascriptDeferred.promise,
      });

      const { container, unmount } = render(() => (
        <CodeField language="javascript" value="const a = 1;" />
      ));
      const view = getEditorView(container);
      const dispatchSpy = vi.spyOn(view, "dispatch");

      unmount();
      expect(dispatchSpy).not.toHaveBeenCalled();

      javascriptDeferred.resolve(await actualLoader("javascript"));
      await flushAsyncImports();

      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
