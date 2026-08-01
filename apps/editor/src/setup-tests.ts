import { afterAll } from "vitest";

if (
  typeof (globalThis as unknown as Record<string, unknown>).ResizeObserver ===
  "undefined"
) {
  (globalThis as unknown as Record<string, unknown>).ResizeObserver =
    class ResizeObserver {
      observe() {
        /* mocked */
      }
      unobserve() {
        /* mocked */
      }
      disconnect() {
        /* mocked */
      }
    };
}

// requestAnimationFrame must be asynchronous to match real-browser semantics.
// A synchronous mock fires callbacks before constructors finish assigning
// internal state, which crashes CodeMirror's EditorView during plugin
// initialization ("Cannot read properties of undefined (reading
// 'delayedAndroidKey')").
const pending = new Set<number>();

export function installRAFMock(surface: Record<string, unknown>) {
  surface.requestAnimationFrame = (callback: (time: number) => void) => {
    const id = setTimeout(callback, 0, Date.now()) as unknown as number;
    pending.add(id);
    return id;
  };
  surface.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
    pending.delete(id);
  };
}

for (const surface of [globalThis, window, document.defaultView]) {
  if (surface !== null) {
    installRAFMock(surface as unknown as Record<string, unknown>);
  }
}

afterAll(() => {
  for (const id of pending) {
    clearTimeout(id);
  }
  pending.clear();
});

if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => true,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
    writable: true,
  });
}
