import { encodePayload as codecEncode } from "@glyphide/url-migration/codec";
import { cleanup, render, screen } from "@solidjs/testing-library";
import { resetErrorHalt } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider, useEditor } from "./context.tsx";

const PLUS_GLOBAL_REGEX = /\+/gu;
const SLASH_GLOBAL_REGEX = /\//gu;
const TRAILING_EQUALS_REGEX = /[=]+$/u;
const V3_URL_PREFIX_REGEX = /^https:\/\/glyphide\.com\/\?/u;
const LOCAL_URL_PREFIX_REGEX = /^http:\/\/localhost:3000\/\?/u;

function TestComponent() {
  const core = useEditor();
  return (
    <div data-testid="test-comp">{core ? "Core Injected" : "No Core"}</div>
  );
}

function v1Href(code: string, title: string): string {
  const state = { state: { code, title } };
  const doubleJson = JSON.stringify(JSON.stringify(state));
  const encoded = btoa(doubleJson)
    .replace(PLUS_GLOBAL_REGEX, "-")
    .replace(SLASH_GLOBAL_REGEX, "_")
    .replace(TRAILING_EQUALS_REGEX, "");
  return `https://glyphide.com/#code=${encoded}`;
}

function v2Href(code: string, title: string): string {
  const enc = (s: string) =>
    btoa(s)
      .replace(PLUS_GLOBAL_REGEX, "-")
      .replace(SLASH_GLOBAL_REGEX, "_")
      .replace(TRAILING_EQUALS_REGEX, "");
  return `https://glyphide.com/?c=${enc(code)}&t=${enc(title)}`;
}

function v3Href(code: string, name: string, engine = "quickjs"): string {
  const params = new URLSearchParams();
  params.set("code", codecEncode(code));
  params.set("name", codecEncode(name));
  params.set("engine", codecEncode(engine));
  return `https://glyphide.com/?${params.toString()}`;
}

function setLocationHref(href: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(href),
    writable: true,
  });
}

describe("EditorContext", () => {
  afterEach(() => {
    cleanup();
    resetErrorHalt();
  });

  it("provides EditorCore to children", () => {
    setLocationHref("https://glyphide.com/");
    render(() => (
      <EditorProvider>
        <TestComponent />
      </EditorProvider>
    ));

    expect(screen.getByTestId("test-comp").textContent).toBe("Core Injected");
  });

  it("throws native ContextNotFoundError when useEditor is used outside provider", () => {
    let caught: unknown;
    try {
      render(() => <TestComponent />);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).constructor.name).toBe("ContextNotFoundError");
    expect((caught as Error).message).toContain(
      "has no provider above this read"
    );
  });
});

describe("EditorContext URL migration", () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it("migrates a v1 hash URL to v3 and rewrites browser history", () => {
    setLocationHref(v1Href("console.log(1)", "Hello"));
    replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(() => (
      <EditorProvider>
        <TestComponent />
      </EditorProvider>
    ));

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    const [, , urlArg] = replaceStateSpy.mock.calls[0] as [
      unknown,
      unknown,
      string,
    ];
    // Should preserve the origin from the original URL
    expect(urlArg).toMatch(V3_URL_PREFIX_REGEX);
    const parsed = new URL(urlArg);
    expect(parsed.searchParams.has("code")).toBe(true);
    expect(parsed.searchParams.has("name")).toBe(true);
    expect(parsed.searchParams.has("engine")).toBe(true);
  });

  it("migrates a v2 param URL to v3 and rewrites browser history", () => {
    setLocationHref(v2Href("console.log(1)", "Hello"));
    replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(() => (
      <EditorProvider>
        <TestComponent />
      </EditorProvider>
    ));

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    const [, , urlArg] = replaceStateSpy.mock.calls[0] as [
      unknown,
      unknown,
      string,
    ];
    const parsed = new URL(urlArg);
    expect(parsed.searchParams.has("code")).toBe(true);
    expect(parsed.searchParams.has("name")).toBe(true);
    expect(parsed.searchParams.has("engine")).toBe(true);
  });

  it("does not call replaceState when the URL is already v3", () => {
    setLocationHref(v3Href("console.log(1)", "Hello"));
    replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(() => (
      <EditorProvider>
        <TestComponent />
      </EditorProvider>
    ));

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it("does not crash and does not call replaceState on a corrupted URL", () => {
    setLocationHref("https://glyphide.com/?c=!!!not-base64!!!");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");

    expect(() => {
      render(() => (
        <EditorProvider>
          <TestComponent />
        </EditorProvider>
      ));
    }).not.toThrow();

    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("test-comp").textContent).toBe("Core Injected");
  });

  it("does not crash and does not call replaceState on an unknown URL", () => {
    setLocationHref("https://glyphide.com/?foo=bar");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");

    expect(() => {
      render(() => (
        <EditorProvider>
          <TestComponent />
        </EditorProvider>
      ));
    }).not.toThrow();

    expect(replaceStateSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("test-comp").textContent).toBe("Core Injected");
  });

  it("preserves the origin when migrating in development environments", () => {
    setLocationHref(
      "http://localhost:3000/?c=Y29uc29sZS5sb2coJ2NvbnNvbGUgZmlubycp"
    );
    replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(() => (
      <EditorProvider>
        <TestComponent />
      </EditorProvider>
    ));

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    const [, , urlArg] = replaceStateSpy.mock.calls[0] as [
      unknown,
      unknown,
      string,
    ];
    // Should preserve localhost:3000 origin, not redirect to glyphide.com
    expect(urlArg).toMatch(LOCAL_URL_PREFIX_REGEX);
    const parsed = new URL(urlArg);
    expect(parsed.searchParams.has("code")).toBe(true);
    // name param is omitted when empty (no title in the legacy URL)
    expect(parsed.searchParams.has("name")).toBe(false);
    expect(parsed.searchParams.has("engine")).toBe(true);
  });

  it("omits the name param when the legacy URL has no title", () => {
    setLocationHref(v2Href("console.log(1)", ""));
    replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(() => (
      <EditorProvider>
        <TestComponent />
      </EditorProvider>
    ));

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    const [, , urlArg] = replaceStateSpy.mock.calls[0] as [
      unknown,
      unknown,
      string,
    ];
    const parsed = new URL(urlArg);
    expect(parsed.searchParams.has("code")).toBe(true);
    expect(parsed.searchParams.has("name")).toBe(false);
    expect(parsed.searchParams.has("engine")).toBe(true);
  });
});
