import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";
import type { UrlStatePort } from "../ports/url-state.ts";

/**
 * Pure model for the single code buffer.
 * Manages the source code string as a reactive signal.
 * Syncs the code to the URL state.
 * Has no knowledge of the editor UI, DOM, browser APIs, or compression.
 */
export interface BufferModel {
  /** Reactive accessor for the current code content. */
  content: Accessor<string>;
  /** Replaces the buffer content entirely. */
  setContent(code: string): void;
}

/** Creates a new `BufferModel` synced with URL state. */
export function createBufferModel(
  urlState: UrlStatePort,
  initialContent = ""
): BufferModel {
  const startContent = urlState.get("code") ?? initialContent;
  const [content, setContentSignal] = createSignal(startContent);

  function setContent(code: string): void {
    setContentSignal(code);
    urlState.set("code", code);
  }

  return { content, setContent };
}
