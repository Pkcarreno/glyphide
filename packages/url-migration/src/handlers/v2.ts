import { decode as base64Decode } from "js-base64";
import { MigrationError } from "../errors.ts";
import type { CanonicalState } from "../types.ts";
import { isValidBase64Url } from "./base64.ts";

const DEFAULT_ENGINE = "quickjs";
const DEFAULT_LANGUAGE = "javascript";

/**
 * Parses a v2 share URL (`https://glyphide.com/?c=...&t=...`) into canonical
 * state. Both `c` (code) and `t` (title) are independently base64url-encoded
 * plaintext strings — NOT JSON.
 *
 * v2 has no engine metadata, so this handler defaults engine and language
 * to the legacy QuickJS / JavaScript values. A missing `t` param yields
 * an empty name.
 *
 * @public
 */
export function handleV2(url: URL): CanonicalState {
  const rawCode = url.searchParams.get("c") ?? "";
  const rawTitle = url.searchParams.get("t") ?? "";

  let code = "";
  let name = "";

  if (rawCode && !isValidBase64Url(rawCode)) {
    throw new MigrationError(
      "DECODE_FAILED",
      "Failed to decode v2 'c' param: not valid base64url."
    );
  }
  if (rawTitle && !isValidBase64Url(rawTitle)) {
    throw new MigrationError(
      "DECODE_FAILED",
      "Failed to decode v2 't' param: not valid base64url."
    );
  }

  try {
    code = rawCode ? base64Decode(rawCode) : "";
  } catch (error) {
    throw new MigrationError(
      "DECODE_FAILED",
      `Failed to decode v2 'c' param: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  try {
    name = rawTitle ? base64Decode(rawTitle) : "";
  } catch (error) {
    throw new MigrationError(
      "DECODE_FAILED",
      `Failed to decode v2 't' param: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  return {
    code,
    name,
    engine: DEFAULT_ENGINE,
    language: DEFAULT_LANGUAGE,
  };
}
