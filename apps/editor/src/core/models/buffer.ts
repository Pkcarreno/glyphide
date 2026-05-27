import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";

/**
 * Pure model for the single code buffer.
 * Manages the source code string as a reactive signal.
 * Has no knowledge of the editor UI, DOM, or browser APIs.
 */
export interface BufferModel {
  /** Reactive accessor for the current code content. */
  content: Accessor<string>;
  /** Replaces the buffer content entirely. */
  setContent(code: string): void;
}

/** Creates a new `BufferModel` with optional initial content. */
export function createBufferModel(initialContent = ""): BufferModel {
  const [content, setContent] = createSignal(initialContent);

  return { content, setContent };
}
