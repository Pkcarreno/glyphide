import type { Accessor } from "solid-js";
import { createSignal } from "solid-js";
import type { EngineId } from "../engine/registry.ts";
import type { FileReadResult } from "../ports/file-io.ts";

/**
 * Resolved engine entry for a given file extension.
 * @public
 */
export interface ResolvedEngine {
  engineId: EngineId;
  language: string;
}

/**
 * Pure model for the file-load flow.
 * Holds the pending file picked by the user, the inline error state,
 * and a static extension→engine mapping used during dispatch.
 * @public
 */
export interface FileLoadModel {
  /** Reactive accessor for the current error message, or null. */
  error: Accessor<string | null>;
  /** Reactive accessor for the file awaiting confirmation, or null. */
  pendingFile: Accessor<FileReadResult | null>;
  /**
   * Resolves a file extension to its target engine and language.
   * Returns null for unsupported extensions.
   */
  resolveEngine: (extension: string) => ResolvedEngine | null;
  /** Clears the current error. */
  setError: (message: string | null) => void;
  /** Sets the file that the user picked from disk. */
  setPendingFile: (file: FileReadResult | null) => void;
}

/** Hardcoded extension→engine map. Add entries here to support more types. */
const EXTENSION_MAP: Record<string, ResolvedEngine> = {
  ".js": { engineId: "quickjs", language: "javascript" },
  ".py": { engineId: "micropython", language: "python" },
};

/** Creates a new `FileLoadModel`. */
export function createFileLoadModel(): FileLoadModel {
  const [pendingFile, setPendingFileSignal] =
    createSignal<FileReadResult | null>(null);
  const [error, setErrorSignal] = createSignal<string | null>(null);

  function setPendingFile(file: FileReadResult | null): void {
    setPendingFileSignal(file);
  }

  function setError(message: string | null): void {
    setErrorSignal(message);
  }

  function resolveEngine(extension: string): ResolvedEngine | null {
    return EXTENSION_MAP[extension.toLowerCase()] ?? null;
  }

  return {
    error,
    pendingFile,
    resolveEngine,
    setError,
    setPendingFile,
  };
}
