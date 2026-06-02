// biome-ignore lint/correctness/noUnresolvedImports: lz-string lacks exports field
import LZString from "lz-string";
import type { CodecPort } from "../ports/codec.ts";

/**
 * Adapter that implements `CodecPort` using `lz-string`.
 * Compresses to a URL-safe Base64-like string.
 */
export function createLzStringCodecAdapter(): CodecPort {
  return {
    encode(value: string): string {
      return LZString.compressToEncodedURIComponent(value);
    },
    decode(value: string): string | null {
      return LZString.decompressFromEncodedURIComponent(value);
    },
  };
}
