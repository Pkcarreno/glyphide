import type { CodecPort } from "../ports/codec.ts";
import type { UrlStatePort } from "../ports/url-state.ts";

/**
 * Decorator that transparently encodes/decodes specific keys
 * before passing them to the underlying URL state port.
 */
export function composeCompressedUrlState(
  base: UrlStatePort,
  codec: CodecPort,
  keysToCompress: string[]
): UrlStatePort {
  const keys = new Set(keysToCompress);

  return {
    get(key: string): string | null {
      const value = base.get(key);
      if (value === null) {
        return null;
      }

      if (keys.has(key)) {
        return codec.decode(value) ?? value;
      }
      return value;
    },
    remove(key: string): void {
      base.remove(key);
    },
    set(key: string, value: string): void {
      const finalValue = keys.has(key) ? codec.encode(value) : value;
      base.set(key, finalValue);
    },
  };
}
