import { describe, expect, it } from "vitest";
import type { FileReadResult } from "../ports/file-io.ts";
import { createFileLoadModel } from "./file-load.ts";

describe("FileLoadModel — extension → engine resolution", () => {
  it("maps '.js' to the quickjs engine with javascript language", () => {
    const model = createFileLoadModel();
    expect(model.resolveEngine(".js")).toEqual({
      engineId: "quickjs",
      language: "javascript",
    });
  });

  it("maps '.py' to the micropython engine with python language", () => {
    const model = createFileLoadModel();
    expect(model.resolveEngine(".py")).toEqual({
      engineId: "micropython",
      language: "python",
    });
  });

  it("returns null for unsupported extensions", () => {
    const model = createFileLoadModel();
    expect(model.resolveEngine(".txt")).toBeNull();
    expect(model.resolveEngine(".json")).toBeNull();
    expect(model.resolveEngine("")).toBeNull();
  });
});

describe("FileLoadModel — state accessors", () => {
  it("starts with no pending file and no error", () => {
    const model = createFileLoadModel();
    expect(model.pendingFile()).toBeNull();
    expect(model.error()).toBeNull();
  });

  it("setPendingFile updates the pendingFile accessor", () => {
    const model = createFileLoadModel();
    const file: FileReadResult = {
      name: "script.js",
      content: "console.log(1)",
      extension: ".js",
    };
    model.setPendingFile(file);
    expect(model.pendingFile()).toEqual(file);
  });

  it("setPendingFile(null) clears the pending file", () => {
    const model = createFileLoadModel();
    model.setPendingFile({ name: "a.js", content: "x", extension: ".js" });
    model.setPendingFile(null);
    expect(model.pendingFile()).toBeNull();
  });

  it("setError updates the error accessor", () => {
    const model = createFileLoadModel();
    model.setError("Unsupported file type");
    expect(model.error()).toBe("Unsupported file type");
  });

  it("setError(null) clears the error", () => {
    const model = createFileLoadModel();
    model.setError("oops");
    model.setError(null);
    expect(model.error()).toBeNull();
  });
});
