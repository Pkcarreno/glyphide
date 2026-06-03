import { deflateSync, inflateSync } from "fflate";
import type { CodecPort } from "../ports/codec.ts";

/**
 * Converts a URL-safe Base64 string back to a standard Base64 string.
 * Reverses the substitutions applied by `toUrlSafeBase64`.
 */
function fromUrlSafeBase64(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/");
}

/**
 * Converts a standard Base64 string to a URL-safe Base64 string.
 * Substitutes `+` → `-`, `/` → `_`, and strips `=` padding.
 */
function toUrlSafeBase64(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Adapter that implements `CodecPort` using `fflate`.
 * Compresses with deflate (zlib) and encodes to a URL-safe Base64 string.
 */
export function createFflateCodecAdapter(): CodecPort {
  return {
    encode(value: string): string {
      const bytes = new TextEncoder().encode(value);
      const compressed = deflateSync(bytes);
      const binaryString = String.fromCharCode(...compressed);
      return toUrlSafeBase64(btoa(binaryString));
    },
    decode(value: string): string | null {
      try {
        const standardBase64 = fromUrlSafeBase64(value);
        const binaryString = atob(standardBase64);
        const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
        const decompressed = inflateSync(bytes);
        return new TextDecoder().decode(decompressed);
      } catch {
        return null;
      }
    },
  };
}
