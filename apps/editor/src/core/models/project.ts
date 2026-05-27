import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { UrlStatePort } from "../ports/url-state";

const PROJECT_NAME_PARAM = "name";
const DEFAULT_PROJECT_NAME = "untitled_project";

/**
 * Pure model for shareable project metadata.
 * Reads the initial name from URL state and syncs changes back.
 */
export interface ProjectModel {
  /** Reactive accessor for the project name. */
  name: Accessor<string>;
  /** Updates the project name and persists it to URL state. */
  setName(newName: string): void;
}

/** Creates a `ProjectModel` backed by the given URL state port. */
export function createProjectModel(urlState: UrlStatePort): ProjectModel {
  const initialName =
    urlState.get(PROJECT_NAME_PARAM) ?? DEFAULT_PROJECT_NAME;
  const [name, setNameSignal] = createSignal(initialName);

  function setName(newName: string): void {
    const sanitized = newName.trim() || DEFAULT_PROJECT_NAME;
    setNameSignal(sanitized);
    urlState.set(PROJECT_NAME_PARAM, sanitized);
  }

  return { name, setName };
}
