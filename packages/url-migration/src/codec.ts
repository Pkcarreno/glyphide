import { deflateSync, inflateSync } from "fflate";

/**
 * Reverses URL-safe base64 substitutions applied by {@link toUrlSafeBase64}.
 */
function fromUrlSafeBase64(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/");
}

/**
 * Converts standard base64 to URL-safe base64 by substituting
 * `+` → `-`, `/` → `_`, and stripping `=` padding.
 */
function toUrlSafeBase64(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Encodes a UTF-8 string into a URL-safe base64 of its deflate-compressed bytes.
 * This mirrors `apps/editor/src/core/adapters/fflate-codec.ts` exactly to
 * guarantee round-trip parity with the editor's share-URL codec.
 *
 * @public
 */
export function encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const compressed = deflateSync(bytes);
  const binaryString = String.fromCharCode(...compressed);
  return toUrlSafeBase64(btoa(binaryString));
}

/**
 * Decodes a URL-safe base64 string previously produced by {@link encode}.
 * Returns `null` when the input is malformed or the bytes are not valid
 * deflate-compressed UTF-8.
 *
 * @public
 */
export function decode(value: string): string | null {
  try {
    const standardBase64 = fromUrlSafeBase64(value);
    const binaryString = atob(standardBase64);
    const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
    const decompressed = inflateSync(bytes);
    return new TextDecoder().decode(decompressed);
  } catch {
    return null;
  }
}
