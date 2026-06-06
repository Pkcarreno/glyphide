import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";
import type { UrlStatePort } from "../ports/url-state.ts";

const PROJECT_NAME_PARAM = "name";
const DEFAULT_PROJECT_NAME = "untitled_project";

/**
 * Pure model for shareable project metadata.
 * Reads the initial name from URL state and syncs changes back.
 */
export interface ProjectModel {
  /** Reactive accessor that returns a human-readable name, defaulting to 'Untitled'. */
  displayName: Accessor<string>;
  /** Indicates whether the project state is small enough to be shared via URL. */
  isUrlShareable: Accessor<boolean>;
  /** Reactive accessor for the project name. */
  name: Accessor<string>;
  /** Updates the project name and persists it to URL state. */
  setName(newName: string): void;
  /** Sets the shareability state of the URL. */
  setShareableState(isShareable: boolean): void;
}

/** Creates a `ProjectModel` backed by the given URL state port. */
export function createProjectModel(urlState: UrlStatePort): ProjectModel {
  const initialName = urlState.get(PROJECT_NAME_PARAM) ?? DEFAULT_PROJECT_NAME;
  const [name, setNameSignal] = createSignal(initialName);
  const [isUrlShareable, setIsUrlShareableSignal] = createSignal(true);

  const displayName = () =>
    name() === DEFAULT_PROJECT_NAME ? "Untitled" : name();

  function setName(newName: string): void {
    const sanitized = newName.trim() || DEFAULT_PROJECT_NAME;
    setNameSignal(sanitized);
    urlState.set(PROJECT_NAME_PARAM, sanitized);
  }

  function setShareableState(isShareable: boolean): void {
    setIsUrlShareableSignal(isShareable);
  }

  return { name, displayName, isUrlShareable, setName, setShareableState };
}
