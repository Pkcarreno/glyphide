/**
 * @public
 */
export type VersionLiteral = "v1" | "v2" | "v3";

/**
 * @public
 */
export type MigrationErrorCode =
  | "UNKNOWN_VERSION"
  | "DECODE_FAILED"
  | "DECOMPRESSION_FAILED"
  | "EMPTY_INPUT"
  | "INVALID_URL"
  | "OUTPUT_TOO_LONG";

/**
 * Structural shape of a migration error. Implemented by the
 * `MigrationError` class exported from `./errors.ts` and used as
 * the `error` field on the `MigrationResult` union.
 * @public
 */
export interface MigrationErrorShape {
  readonly code: MigrationErrorCode;
  readonly message: string;
  readonly name: string;
}

/**
 * Canonical, version-agnostic representation of a shareable buffer state.
 * All version handlers MUST return this shape from their `parse` step.
 * @public
 */
export interface CanonicalState {
  code: string;
  engine: string;
  language: string;
  name: string;
}

/**
 * Discriminated union returned by {@link migrateUrl}.
 * The library never throws from public APIs — failures are surfaced as values.
 * @public
 */
export type MigrationResult =
  | { ok: true; state: CanonicalState; version: VersionLiteral }
  | { ok: false; error: MigrationErrorShape };

/**
 * Successful build result for {@link buildCurrentUrl}.
 * `warning` is set when the URL exceeds 8000 chars; the URL is never truncated.
 * @public
 */
export interface BuildResult {
  url: string;
  warning: string | null;
}
