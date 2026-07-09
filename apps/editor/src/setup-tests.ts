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
if (
  typeof (globalThis as unknown as Record<string, unknown>)
    .requestAnimationFrame === "undefined"
) {
  (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = (
    callback: (time: number) => void
  ) => setTimeout(callback, 0, Date.now()) as unknown as number;
  (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame = (
    id: number
  ) => {
    clearTimeout(id);
  };
} else {
  // If jsdom provides it, override it for asynchronous test execution
  (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = (
    callback: (time: number) => void
  ) => setTimeout(callback, 0, Date.now()) as unknown as number;
  (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame = (
    id: number
  ) => {
    clearTimeout(id);
  };
}

if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    }),
  });
}
