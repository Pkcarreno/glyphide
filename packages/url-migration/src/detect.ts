import { MigrationError } from "./errors.ts";
import { detectVersion as detectVersionFromUrl } from "./handlers/registry.ts";
import type { VersionLiteral } from "./types.ts";

/**
 * Public string-based version detection. Throws `MigrationError` with
 * code `EMPTY_INPUT` or `INVALID_URL` for malformed inputs, and
 * `UNKNOWN_VERSION` when the URL structure is valid but no handler
 * matches.
 *
 * @public
 */
export function detectVersion(input: string): VersionLiteral {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new MigrationError(
      "EMPTY_INPUT",
      "The provided URL is empty or whitespace-only."
    );
  }
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch (error) {
    // biome-ignore lint/style/useErrorCause: MigrationError has cause as the third argument
    throw new MigrationError(
      "INVALID_URL",
      "The provided string is not a valid URL.",
      { cause: error }
    );
  }
  return detectVersionFromUrl(url);
}
