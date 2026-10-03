import { waitFor } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { createOutputModel, DEFAULT_MAX_OUTPUT_ENTRIES } from "./output.ts";

describe("OutputModel", () => {
  it("initializes empty with default max entries", () => {
    expect(DEFAULT_MAX_OUTPUT_ENTRIES).toBe(5000);
    const model = createOutputModel();
    expect(model.entries()).toEqual([]);
  });

  it("appends entries with auto-incrementing ids", async () => {
    const model = createOutputModel();
    model.appendEntry("log", "hello");
    model.appendEntry("error", "oops");

    // Flush is scheduled via requestAnimationFrame; wait for it to complete.
    await waitFor(() => {
      const entries = model.entries();
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe(0);
      expect(entries[0].type).toBe("log");
      expect(entries[0].data).toBe("hello");
      expect(entries[0].timestamp).toBeTypeOf("number");

      expect(entries[1].id).toBe(1);
      expect(entries[1].type).toBe("error");
    });
  });

  it("clears entries and resets ids", async () => {
    const model = createOutputModel();
    model.appendEntry("log", "1");
    model.clearEntries();

    expect(model.entries()).toEqual([]);

    model.appendEntry("log", "2");
    await waitFor(() => {
      expect(model.entries()[0].id).toBe(0);
    });
  });

  it("caps entries to maxEntries and updates bufferDropped in stats", async () => {
    const model = createOutputModel(5);
    for (let i = 0; i < 8; i += 1) {
      model.appendEntry("log", `msg-${i}`);
    }

    await waitFor(() => {
      const entries = model.entries();
      expect(entries).toHaveLength(5);
      // Clean entries: no synthetic system truncation notice
      expect(entries[0].type).toBe("log");
      expect(entries[0].data).toBe("msg-3");
      expect(entries[4].data).toBe("msg-7");

      expect(model.stats()).toEqual({
        bufferDropped: 3,
        totalDropped: 3,
        workerDropped: 0,
      });
    });
  });

  it("accumulates omitted count across multiple batches in stats", async () => {
    const model = createOutputModel(5);
    for (let i = 0; i < 6; i += 1) {
      model.appendEntry("log", `msg-${i}`);
    }

    await waitFor(() => {
      expect(model.entries()).toHaveLength(5);
      expect(model.entries()[0].data).toBe("msg-1");
      expect(model.stats().bufferDropped).toBe(1);
    });

    model.appendEntry("log", "msg-6");
    model.appendEntry("log", "msg-7");

    await waitFor(() => {
      expect(model.entries()).toHaveLength(5);
      expect(model.entries()[0].data).toBe("msg-3");
      expect(model.entries()[4].data).toBe("msg-7");
      expect(model.stats()).toEqual({
        bufferDropped: 3,
        totalDropped: 3,
        workerDropped: 0,
      });
    });
  });

  it("intercepts worker omitted notice without polluting entries", async () => {
    const model = createOutputModel(10);
    model.appendEntry("log", "msg-1");
    model.appendEntry("system", "1250 messages omitted due to high frequency.");
    model.appendEntry("log", "msg-2");

    await waitFor(() => {
      const entries = model.entries();
      expect(entries).toHaveLength(2);
      expect(entries[0].data).toBe("msg-1");
      expect(entries[1].data).toBe("msg-2");

      expect(model.stats()).toEqual({
        bufferDropped: 0,
        totalDropped: 1250,
        workerDropped: 1250,
      });
    });
  });

  it("resets stats on clearEntries", async () => {
    const model = createOutputModel(5);
    model.appendEntry("log", "msg-1");
    model.reportWorkerDropped(100);
    model.appendEntry("system", "50 messages omitted due to high frequency.");

    await waitFor(() => {
      expect(model.stats().workerDropped).toBe(150);
    });

    model.clearEntries();
    expect(model.entries()).toEqual([]);
    expect(model.stats()).toEqual({
      bufferDropped: 0,
      totalDropped: 0,
      workerDropped: 0,
    });
  });

  it("prunes pending entries when rapid additions exceed twice the max entries", async () => {
    const model = createOutputModel(5);
    for (let i = 0; i < 20; i += 1) {
      model.appendEntry("log", `msg-${i}`);
    }

    await waitFor(() => {
      const entries = model.entries();
      expect(entries).toHaveLength(5);
      expect(entries[0].type).toBe("log");
      expect(entries[4].data).toBe("msg-19");
      expect(model.stats().bufferDropped).toBe(15);
      expect(model.stats().totalDropped).toBe(15);
    });
  });
});
