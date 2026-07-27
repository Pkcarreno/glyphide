/**
 * Contract for encoding and decoding string values.
 * Allows the core to be agnostic of specific compression algorithms.
 */
export interface CodecPort {
  /** Decodes a string back to its original format. Returns null if decoding fails. */
  decode: (value: string) => string | null;
  /** Encodes a string value into a safe transport format. */
  encode: (value: string) => string;
}
