import { MigrationError } from "./errors.ts";
import { detectVersion, parseByRegistry } from "./handlers/registry.ts";
import type {
  CanonicalState,
  MigrationResult,
  VersionLiteral,
} from "./types.ts";

/**
 * Public entry point: converts any supported share URL into a canonical
 * state, surfacing typed errors via a `Result` union. Never throws.
 *
 * @public
 */
export function migrateUrl(input: string): MigrationResult {
  if (typeof input !== "string" || input.trim().length === 0) {
    return {
      error: new MigrationError(
        "EMPTY_INPUT",
        "The provided URL is empty or whitespace-only."
      ),
      ok: false,
    };
  }

  const trimmed = input.trim();

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      error: new MigrationError(
        "INVALID_URL",
        "The provided string is not a valid URL."
      ),
      ok: false,
    };
  }

  let state: CanonicalState;
  let version: VersionLiteral;
  try {
    ({ state, version } = parseByRegistry(url));
  } catch (error) {
    if (error instanceof MigrationError) {
      return { error, ok: false };
    }
    return {
      error: new MigrationError(
        "UNKNOWN_VERSION",
        `Could not parse URL: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      ),
      ok: false,
    };
  }

  // Re-derive the detected version for the public surface; ensures the
  // returned `version` matches the input shape even when handlers change.
  try {
    version = detectVersion(url);
  } catch {
    // parseByRegistry already validated; this is a safety net.
  }

  return { ok: true, state, version };
}
