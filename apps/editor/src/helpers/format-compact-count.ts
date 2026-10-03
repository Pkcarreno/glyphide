/**
 * Formats a count into a compact lowercase string (such as 100, 1k, 1.2k, 1m).
 *
 * @param count - Integer count to format.
 * @returns Compact lowercase number string.
 */
export function formatCompactCount(count: number): string {
  if (count < 1000) {
    return String(count);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  })
    .format(count)
    .toLowerCase();
}
