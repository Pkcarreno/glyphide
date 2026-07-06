import { decodePayload as codecDecode } from "../codec.ts";
import { MigrationError } from "../errors.ts";
import type { CanonicalState } from "../types.ts";

const DEFAULT_ENGINE = "quickjs";
const DEFAULT_LANGUAGE = "javascript";

/**
 * Decodes a single fflate+base64url-encoded param, returning `null` when
 * the param is absent (not when it fails to decode — that's an error).
 */
function decodeParam(url: URL, name: string): string | null {
  const raw = url.searchParams.get(name);
  if (raw === null) {
    return null;
  }
  const decoded = codecDecode(raw);
  if (decoded === null) {
    throw new MigrationError(
      "DECOMPRESSION_FAILED",
      `Failed to decompress '${name}' param: invalid fflate payload.`
    );
  }
  return decoded;
}

/**
 * Splits an engine string of the form `engineId:language` into its parts.
 * Returns the engine string and default language when no `:` separator exists.
 */
function splitEngine(engine: string): { engine: string; language: string } {
  const colon = engine.indexOf(":");
  if (colon === -1) {
    return { engine, language: DEFAULT_LANGUAGE };
  }
  return {
    engine: engine.slice(0, colon),
    language: engine.slice(colon + 1),
  };
}

/**
 * Parses a v3 (current) share URL into canonical state. v3 URLs use
 * fflate-compressed, URL-safe base64 params `code`, `name`, and optionally
 * `engine`. The engine string may embed a language suffix
 * (`engineId:language`); when absent, the language defaults to
 * `javascript`.
 *
 * @public
 */
export function handleV3(url: URL): CanonicalState {
  const code = decodeParam(url, "code") ?? "";
  const name = decodeParam(url, "name") ?? "";
  const engineRaw = decodeParam(url, "engine");

  let engine = DEFAULT_ENGINE;
  let language = DEFAULT_LANGUAGE;

  if (engineRaw !== null) {
    const split = splitEngine(engineRaw);
    engine = split.engine || DEFAULT_ENGINE;
    language = split.language || DEFAULT_LANGUAGE;
  }

  return { code, name, engine, language };
}
