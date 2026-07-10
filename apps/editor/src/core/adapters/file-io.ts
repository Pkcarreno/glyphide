import type { FileIoPort, FileReadResult } from "../ports/file-io.ts";

/** Error message when the user closes the file picker without selecting a file. */
const CANCEL_MESSAGE = "No file selected.";

/** Detects a file's extension from its name, including the leading dot. */
function detectExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

/**
 * Reads the text content of a `File` and resolves with a normalized
 * `FileReadResult`. Centralizes the FileReader + extension logic so
 * `readFile()` and `readFileFromFile()` stay in lockstep.
 */
function parseFile(file: File): Promise<FileReadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        content: typeof reader.result === "string" ? reader.result : "",
        extension: detectExtension(file.name),
        name: file.name,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

/**
 * Reads a file from the user's disk via a hidden `<input type="file">` click.
 * Falls back to `FileReader` for text content extraction.
 */
function pickFile(): Promise<FileReadResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".js,.py";
    input.style.display = "none";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error(CANCEL_MESSAGE));
        return;
      }
      parseFile(file).then(resolve, reject);
    };

    // Some browsers fire `cancel` on the input when the picker is dismissed.
    input.oncancel = () => reject(new Error(CANCEL_MESSAGE));

    input.click();
  });
}

/**
 * Browser-backed implementation of `FileIoPort`.
 * Uses native `<input type="file">` for reads and `Blob` + `URL.createObjectURL` for writes.
 * @public
 */
export function createBrowserFileIoAdapter(): FileIoPort {
  return {
    readFile: () => pickFile(),
    readFileFromFile: (file) => parseFile(file),
    writeFile: (filename, content) =>
      Promise.resolve().then(() => {
        const blob = new Blob([content], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }),
  };
}
