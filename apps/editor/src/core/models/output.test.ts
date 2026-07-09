import { waitFor } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { createOutputModel } from "./output.ts";

describe("OutputModel", () => {
  it("initializes empty", () => {
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
});
