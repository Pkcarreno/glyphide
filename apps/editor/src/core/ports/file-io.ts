/**
 * Result of reading a file from disk via {@link FileIoPort.readFile}.
 * @public
 */
export interface FileReadResult {
  /** Raw text content (UTF-8). */
  content: string;
  /** File extension including leading dot, e.g. ".js", ".py". */
  extension: string;
  /** Original filename as picked by the user. */
  name: string;
}

/**
 * Contract for reading and writing local files.
 * Decouples core models from browser-specific file APIs.
 * @public
 */
export interface FileIoPort {
  /**
   * Prompts the user to pick a file and reads its text content.
   * Resolves to the file's name, content, and extension.
   */
  readFile(): Promise<FileReadResult>;
  /**
   * Reads the text content of a `File` object the caller already has
   * (e.g. from a drop or paste). Same shape as {@link readFile}.
   * The file is consumed by the FileReader and cannot be re-read.
   */
  readFileFromFile(file: File): Promise<FileReadResult>;
  /**
   * Triggers a browser download of `content` saved as `filename`.
   * Errors are surfaced to the caller.
   */
  writeFile(filename: string, content: string): Promise<void>;
}
