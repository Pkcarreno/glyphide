import { encode } from "./codec.ts";
import type { BuildResult, CanonicalState } from "./types.ts";

const BASE_URL = "https://glyphide.com/";
const MAX_URL_LENGTH = 8000;
const DEFAULT_LANGUAGE = "javascript";

/**
 * Composes the `engine` field into the URL param string. The editor
 * writes `engineId:language` only for multi-language engines. For
 * QuickJS-style engines where the language is the default, the suffix
 * is omitted so legacy readers can still match.
 */
function composeEngineString(state: CanonicalState): string {
  if (state.language === DEFAULT_LANGUAGE) {
    return state.engine;
  }
  return `${state.engine}:${state.language}`;
}

/**
 * Encodes a {@link CanonicalState} into a share URL using the editor's
 * fflate+URL-safe-base64 transform.
 *
 * @param state - The canonical state to encode
 * @param baseUrl - Optional base URL. Defaults to `https://glyphide.com/`.
 *                  Use this to preserve the current origin in development.
 *
 * If the resulting URL exceeds 8000 characters, a human-readable warning
 * is returned alongside the URL; the URL is never truncated.
 *
 * @public
 */
export function buildCurrentUrl(
  state: CanonicalState,
  baseUrl: string = BASE_URL
): BuildResult {
  const params = new URLSearchParams();
  params.set("code", encode(state.code));
  if (state.name) {
    params.set("name", encode(state.name));
  }
  params.set("engine", encode(composeEngineString(state)));

  const url = `${baseUrl}?${params.toString()}`;

  if (url.length > MAX_URL_LENGTH) {
    return {
      url,
      warning: `URL exceeds ${MAX_URL_LENGTH} characters and may not be shareable (length: ${url.length}).`,
    };
  }

  return { url, warning: null };
}
