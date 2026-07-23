import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";
import type { UrlStatePort } from "../ports/url-state.ts";

/**
 * Source of a buffer content change.
 * - `"default"`: armed by an engine's curated default snippet. The pristine
 *   flag is set; an engine switch is allowed to replace the buffer again.
 * - `"user"`: produced by user input, file load, or URL-shared code. The
 *   pristine flag is cleared; the buffer is treated as user-owned.
 * @public
 */
export type BufferContentSource = "default" | "user";

/**
 * Options accepted by `setContent`.
 * @public
 */
export interface SetContentOptions {
  /** Where the new content came from. Defaults to `"user"`. */
  source?: BufferContentSource;
}

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
  /**
   * True when the buffer is currently showing an engine's curated default
   * snippet and has not been edited by the user. Used by engine-switch
   * logic to decide whether the buffer may be replaced.
   */
  isShowingDefaultCode: Accessor<boolean>;
  /**
   * Replaces the buffer content entirely.
   * `source: "default"` arms the pristine flag; anything else disarms it.
   */
  setContent: (code: string, options?: SetContentOptions) => void;
  /** Updates the cursor position. */
  setCursorPosition: (
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ) => void;
}

/**
 * Creates a new `BufferModel` synced with URL state.
 *
 * @param urlState URL query-parameter port.
 * @param initialContent Content to seed when the URL has no `code` param.
 * @param options.source When `"default"`, the initial content is treated as
 *   an engine's curated snippet and the pristine flag is armed. URL-shared
 *   code always wins and disarms the flag.
 */
export function createBufferModel(
  urlState: UrlStatePort,
  initialContent = "",
  options: SetContentOptions = {}
): BufferModel {
  const urlCode = urlState.get("code");
  const startContent = urlCode ?? initialContent;
  // URL-shared code is always user-owned, regardless of the source hint.
  const initialSource: BufferContentSource =
    urlCode === null ? (options.source ?? "user") : "user";
  const [content, setContentSignal] = createSignal(startContent);
  const [cursorPosition, setCursorPositionSignal] = createSignal({
    column: 1,
    line: 1,
    selectionLength: 0,
    selectionLines: 0,
  });
  // Armed only when the initial content came from an engine default and is
  // non-empty. Empty buffers are never pristine — there is nothing to
  // "replace" the engine's default against.
  const [isShowingDefaultCode, setIsShowingDefaultCode] = createSignal(
    initialSource === "default" && startContent.length > 0
  );

  function setContent(code: string, setOptions: SetContentOptions = {}): void {
    const source = setOptions.source ?? "user";
    setContentSignal(code);
    urlState.set("code", code);
    // Empty content can never be pristine — there is no engine default to
    // re-swap against on the next engine switch.
    setIsShowingDefaultCode(source === "default" && code.length > 0);
  }

  function setCursorPosition(
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ): void {
    setCursorPositionSignal({ column, line, selectionLength, selectionLines });
  }

  return {
    content,
    cursorPosition,
    isShowingDefaultCode,
    setContent,
    setCursorPosition,
  };
}
