import { describe, expect, it } from "vitest";
import type { UrlStatePort } from "../ports/url-state.ts";
import { createProjectModel } from "./project.ts";

function createMockUrlState(
  initialData: Record<string, string> = {}
): UrlStatePort {
  const data = new Map(Object.entries(initialData));
  return {
    get: (key) => data.get(key) ?? null,
    remove: (key) => data.delete(key),
    set: (key, val) => data.set(key, val),
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

  it("initializes with isUrlShareable true by default", () => {
    const urlState = createMockUrlState();
    const model = createProjectModel(urlState);
    expect(model.isUrlShareable()).toBe(true);
  });

  it("updates shareable state when setShareableState is called", () => {
    const urlState = createMockUrlState();
    const model = createProjectModel(urlState);

    model.setShareableState(false);
    expect(model.isUrlShareable()).toBe(false);

    model.setShareableState(true);
    expect(model.isUrlShareable()).toBe(true);
  });
  it("returns 'Untitled' as displayName when name is default", () => {
    const urlState = createMockUrlState();
    const model = createProjectModel(urlState);
    expect(model.displayName()).toBe("Untitled");
  });

  it("returns the custom name as displayName when name is not default", () => {
    const urlState = createMockUrlState({ name: "my_cool_script" });
    const model = createProjectModel(urlState);
    expect(model.displayName()).toBe("my_cool_script");
  });
});
