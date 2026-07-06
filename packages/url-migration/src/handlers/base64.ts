/**
 * Pre-compiled strict base64url pattern. Accepts only `A-Z a-z 0-9 - _`
 * plus optional `=` padding. Used by `isValidBase64Url` and shared across
 * handlers for performance.
 */
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

/**
 * Returns true when the value is a well-formed base64url string (or empty).
 */
export function isValidBase64Url(value: string): boolean {
  if (value.length === 0) {
    return true;
  }
  return BASE64URL_PATTERN.test(value);
}
