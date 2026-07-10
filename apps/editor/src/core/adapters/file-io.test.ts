import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserFileIoAdapter } from "./file-io.ts";

const CANCEL_RE = /no file selected|canceled|cancelled/i;

/**
 * Tests for the browser-backed FileIoPort implementation.
 * Mocks DOM APIs (`document.createElement`, `FileReader`, `URL.createObjectURL`)
 * to keep the test synchronous and hermetic.
 */
describe("BrowserFileIoAdapter — readFile", () => {
  let originalCreateElement: typeof document.createElement;
  let clickSpy: ReturnType<typeof vi.fn>;
  let latestInput: HTMLInputElement | null;

  beforeEach(() => {
    latestInput = null;
    clickSpy = vi.fn(function (this: HTMLInputElement) {
      // Simulate user picking a file synchronously
      const file = new File(["console.log(1)"], "script.js", {
        type: "text/javascript",
      });
      Object.defineProperty(this, "files", {
        configurable: true,
        value: [file],
      });
      this.onchange?.(new Event("change"));
    });

    originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      if (tag === "input") {
        const el = originalCreateElement("input") as HTMLInputElement;
        latestInput = el;
        el.click = clickSpy as () => void;
        return el;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement;
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    vi.restoreAllMocks();
  });

  it("returns a FileReadResult with name, content, and extension", async () => {
    const adapter = createBrowserFileIoAdapter();
    const result = await adapter.readFile();
    expect(result.name).toBe("script.js");
    expect(result.content).toBe("console.log(1)");
    expect(result.extension).toBe(".js");
  });

  it("creates a hidden file input with .js and .py accept attributes", async () => {
    const adapter = createBrowserFileIoAdapter();
    await adapter.readFile();
    expect(latestInput).not.toBeNull();
    expect(latestInput?.type).toBe("file");
    expect(latestInput?.accept).toBe(".js,.py");
    expect(latestInput?.style.display).toBe("none");
  });

  it("rejects with empty message when user cancels the file picker", async () => {
    document.createElement = vi.fn((tag: string) => {
      if (tag === "input") {
        const el = originalCreateElement("input") as HTMLInputElement;
        el.click = vi.fn(function (this: HTMLInputElement) {
          // Simulate cancel: no file selected
          Object.defineProperty(this, "files", {
            configurable: true,
            value: [],
          });
          this.onchange?.(new Event("change"));
        });
        return el;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement;

    const adapter = createBrowserFileIoAdapter();
    await expect(adapter.readFile()).rejects.toThrow(CANCEL_RE);
  });
});

describe("BrowserFileIoAdapter — readFileFromFile", () => {
  let originalFileReader: typeof FileReader;

  /**
   * A controllable FileReader. By default it delegates `readAsText` to
   * the real jsdom FileReader so unrelated `readFile` tests in this
   * file continue to work asynchronously. Tests that need deterministic
   * sync results call `setReadBehavior` to override.
   */
  interface FakeFileReader {
    onerror: ((ev: ProgressEvent) => void) | null;
    onload: ((ev: ProgressEvent) => void) | null;
    readAsText: (file: File) => void;
    result: string | ArrayBuffer | null;
  }

  function setReadBehavior(
    behavior: (self: FakeFileReader, file: File) => void
  ): void {
    const FakeCtor =
      globalThis.FileReader as unknown as new () => FakeFileReader;
    FakeCtor.prototype.readAsText = function (this: unknown, file: File) {
      behavior(this as FakeFileReader, file);
    };
  }

  beforeEach(() => {
    originalFileReader = globalThis.FileReader;
    class FakeReader {
      onload: ((ev: ProgressEvent) => void) | null = null;
      onerror: ((ev: ProgressEvent) => void) | null = null;
      result: string | ArrayBuffer | null = null;
      // Default: delegate to the real FileReader so async reads still
      // resolve. Per-test overrides via `setReadBehavior`.
      readAsText(file: File): void {
        const real = new originalFileReader();
        real.onload = () => {
          this.result = real.result;
          this.onload?.({} as ProgressEvent);
        };
        real.onerror = () => {
          this.onerror?.({} as ProgressEvent);
        };
        real.readAsText(file);
      }
    }
    globalThis.FileReader = FakeReader as unknown as typeof FileReader;
  });

  afterEach(() => {
    globalThis.FileReader = originalFileReader;
    vi.restoreAllMocks();
  });

  it("returns a FileReadResult with name, content, and extension", async () => {
    setReadBehavior((self) => {
      self.result = "print(1)";
      self.onload?.({} as ProgressEvent);
    });

    const adapter = createBrowserFileIoAdapter();
    const file = new File(["print(1)"], "script.py", { type: "text/x-python" });
    const result = await adapter.readFileFromFile(file);

    expect(result.name).toBe("script.py");
    expect(result.content).toBe("print(1)");
    expect(result.extension).toBe(".py");
  });

  it("lowercases the detected extension (script.PY -> .py)", async () => {
    setReadBehavior((self) => {
      self.result = "x";
      self.onload?.({} as ProgressEvent);
    });

    const adapter = createBrowserFileIoAdapter();
    const file = new File(["x"], "script.PY", { type: "text/x-python" });
    const result = await adapter.readFileFromFile(file);

    expect(result.extension).toBe(".py");
  });

  it("rejects when FileReader fires onerror", async () => {
    setReadBehavior((self) => {
      self.onerror?.({} as ProgressEvent);
    });

    const adapter = createBrowserFileIoAdapter();
    const file = new File(["x"], "broken.js");

    await expect(adapter.readFileFromFile(file)).rejects.toThrow();
  });
});

describe("BrowserFileIoAdapter — writeFile", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let lastAnchor: HTMLAnchorElement | null;

  beforeEach(() => {
    lastAnchor = null;
    clickSpy = vi.fn();
    createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock-url");
    revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      if (tag === "a") {
        const el = originalCreateElement("a") as HTMLAnchorElement;
        lastAnchor = el;
        el.click = clickSpy as () => void;
        return el;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a Blob, downloads it as the given filename, and revokes the URL", async () => {
    const adapter = createBrowserFileIoAdapter();
    await adapter.writeFile("myproject.js", "console.log('hi')");

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
    expect(lastAnchor?.download).toBe("myproject.js");
    expect(lastAnchor?.href).toBe("blob:mock-url");
  });

  it("propagates errors when URL.createObjectURL throws", async () => {
    createObjectURLSpy.mockImplementation(() => {
      throw new Error("blocked");
    });
    const adapter = createBrowserFileIoAdapter();
    await expect(adapter.writeFile("a.js", "x")).rejects.toThrow("blocked");
  });
});
