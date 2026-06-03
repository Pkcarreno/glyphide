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
  /** Reactive accessor for the current cursor position. */
  cursorPosition: Accessor<{
    line: number;
    column: number;
    selectionLength: number;
    selectionLines: number;
  }>;
  /** Replaces the buffer content entirely. */
  setContent(code: string): void;
  /** Updates the cursor position. */
  setCursorPosition(
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ): void;
}

/** Creates a new `BufferModel` synced with URL state. */
export function createBufferModel(
  urlState: UrlStatePort,
  initialContent = ""
): BufferModel {
  const startContent = urlState.get("code") ?? initialContent;
  const [content, setContentSignal] = createSignal(startContent);
  const [cursorPosition, setCursorPositionSignal] = createSignal({
    line: 1,
    column: 1,
    selectionLength: 0,
    selectionLines: 0,
  });

  function setContent(code: string): void {
    setContentSignal(code);
    urlState.set("code", code);
  }

  function setCursorPosition(
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ): void {
    setCursorPositionSignal({ line, column, selectionLength, selectionLines });
  }

  return { content, cursorPosition, setContent, setCursorPosition };
}
