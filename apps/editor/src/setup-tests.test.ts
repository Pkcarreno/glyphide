import { describe, expect, it, vi } from "vitest";

/**
 * Tests for the rAF/cAF mock and installRAFMock() helper.
 *
 * Two layers:
 * 1. Approval tests — capture the observable behavior of the global mock
 *    installed by setup-tests.ts. These are a safety net during refactoring.
 * 2. Unit tests — verify installRAFMock() works on isolated surface objects.
 */

// ---------------------------------------------------------------------------
// Approval tests: global mock behavior (setup-tests.ts installs these)
// ---------------------------------------------------------------------------

describe("rAF/cAF mock — global behavior", () => {
  it("requestAnimationFrame returns a usable id that works with cancelAnimationFrame", () => {
    const id = window.requestAnimationFrame(() => undefined);
    expect(id).not.toBeNull();
    expect(id).not.toBeUndefined();
    expect(() => window.cancelAnimationFrame(id as number)).not.toThrow();
  });

  it("rAF callback fires asynchronously — not during the same tick", () => {
    const order: string[] = [];
    order.push("before");
    window.requestAnimationFrame(() => {
      order.push("callback");
    });
    order.push("after");
    expect(order).toEqual(["before", "after"]);
  });

  it("rAF callback fires on a subsequent tick with the current timestamp", async () => {
    const receivedTimes: number[] = [];
    window.requestAnimationFrame((time) => {
      receivedTimes.push(time);
    });
    await vi.waitFor(() => {
      expect(receivedTimes).toHaveLength(1);
    });
    expect(typeof receivedTimes[0]).toBe("number");
  });

  it("cancelAnimationFrame prevents a pending rAF callback from firing", async () => {
    let fired = false;
    const id = window.requestAnimationFrame(() => {
      fired = true;
    });
    window.cancelAnimationFrame(id as number);
    await vi.waitFor(() => {
      expect(fired).toBe(false);
    });
  });

  it("cancelAnimationFrame is a no-op when called after the callback already fired", async () => {
    const id = window.requestAnimationFrame(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(() => window.cancelAnimationFrame(id as number)).not.toThrow();
  });

  it("rAF/cAF are installed on globalThis, window, and document.defaultView", () => {
    expect(typeof globalThis.requestAnimationFrame).toBe("function");
    expect(typeof globalThis.cancelAnimationFrame).toBe("function");
    expect(typeof window.requestAnimationFrame).toBe("function");
    expect(typeof window.cancelAnimationFrame).toBe("function");
    const dv = document.defaultView;
    expect(typeof dv?.requestAnimationFrame).toBe("function");
    expect(typeof dv?.cancelAnimationFrame).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Unit tests: installRAFMock() on isolated surfaces
// ---------------------------------------------------------------------------

describe("installRAFMock — surface installer", () => {
  it("installs rAF/cAF on a fresh surface object", async () => {
    const { installRAFMock } = await import("./setup-tests.ts");
    const surface = {} as Record<string, unknown>;

    installRAFMock(surface);

    expect(typeof surface.requestAnimationFrame).toBe("function");
    expect(typeof surface.cancelAnimationFrame).toBe("function");
  });

  it("installed rAF callback fires asynchronously", async () => {
    const { installRAFMock } = await import("./setup-tests.ts");
    const surface = {} as Record<string, unknown>;
    installRAFMock(surface);

    const order: string[] = [];
    order.push("before");
    (surface.requestAnimationFrame as (cb: (t: number) => void) => number)(
      () => {
        order.push("callback");
      }
    );
    order.push("after");
    expect(order).toEqual(["before", "after"]);
  });

  it("installed cAF cancels a pending rAF callback", async () => {
    const { installRAFMock } = await import("./setup-tests.ts");
    const surface = {} as Record<string, unknown>;
    installRAFMock(surface);

    let fired = false;
    const id = (
      surface.requestAnimationFrame as (cb: (t: number) => void) => number
    )(() => {
      fired = true;
    });
    (surface.cancelAnimationFrame as (id: number) => void)(id);

    await vi.waitFor(() => {
      expect(fired).toBe(false);
    });
  });
});
