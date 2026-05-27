import { describe, expect, it } from "vitest";
import { createProjectModel } from "./project";
import type { UrlStatePort } from "../ports/url-state";

function createMockUrlState(initialData: Record<string, string> = {}): UrlStatePort {
  const data = new Map(Object.entries(initialData));
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, val) => data.set(key, val),
    remove: (key) => data.delete(key),
  };
}

describe("ProjectModel", () => {
  it("initializes with default name if url param is missing", () => {
    const urlState = createMockUrlState();
    const model = createProjectModel(urlState);
    expect(model.name()).toBe("untitled_project");
  });

  it("loads name from url port on init", () => {
    const urlState = createMockUrlState({ name: "my_cool_script" });
    const model = createProjectModel(urlState);
    expect(model.name()).toBe("my_cool_script");
  });

  it("updates name and syncs with url port", () => {
    const urlState = createMockUrlState();
    const model = createProjectModel(urlState);

    model.setName("new_name");
    expect(model.name()).toBe("new_name");
    expect(urlState.get("name")).toBe("new_name");
  });

  it("falls back to default if name is empty", () => {
    const urlState = createMockUrlState();
    const model = createProjectModel(urlState);

    model.setName("   ");
    expect(model.name()).toBe("untitled_project");
    expect(urlState.get("name")).toBe("untitled_project");
  });
});
