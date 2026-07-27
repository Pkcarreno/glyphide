import { decode as base64Decode } from "js-base64";
import { MigrationError } from "../errors.ts";
import type { CanonicalState } from "../types.ts";
import { isValidBase64Url } from "./base64.ts";

const V1_HASH_PREFIX = "#code=";
const DEFAULT_ENGINE = "quickjs";
const DEFAULT_LANGUAGE = "javascript";

/**
 * Parses a v1 share URL (`https://glyphide.com/#code=<base64url>`) into
 * canonical state. The hash payload is `js-base64` encoded and contains a
 * double-JSON-serialized object: `JSON.stringify(JSON.stringify(state))`.
 *
 * v1 has no engine metadata, so this handler defaults engine and language
 * to the legacy QuickJS / JavaScript values.
 *
 * @public
 */
export function handleV1(url: URL): CanonicalState {
  const { hash } = url;
  if (!hash.startsWith(V1_HASH_PREFIX)) {
    throw new MigrationError(
      "UNKNOWN_VERSION",
      "URL does not match v1 format (missing #code= fragment)."
    );
  }

  const payload = hash.slice(V1_HASH_PREFIX.length);

  if (payload.length > 0 && !isValidBase64Url(payload)) {
    throw new MigrationError(
      "DECODE_FAILED",
      "Failed to decode v1 payload: not valid base64url."
    );
  }

  let parsed: unknown;
  try {
    const decoded = base64Decode(payload);
    parsed = JSON.parse(JSON.parse(decoded));
  } catch (error) {
    // biome-ignore lint/style/useErrorCause: MigrationError has cause as the third argument
    throw new MigrationError(
      "DECODE_FAILED",
      `Failed to decode v1 payload: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
      { cause: error }
    );
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new MigrationError(
      "DECODE_FAILED",
      "v1 payload did not decode to an object."
    );
  }

  const { state } = parsed as { state?: unknown };
  const stateObj =
    state !== null && typeof state === "object"
      ? (state as { code?: unknown; title?: unknown })
      : {};

  const code = typeof stateObj.code === "string" ? stateObj.code : "";
  const name = typeof stateObj.title === "string" ? stateObj.title : "";

  return {
    code,
    engine: DEFAULT_ENGINE,
    language: DEFAULT_LANGUAGE,
    name,
  };
}
