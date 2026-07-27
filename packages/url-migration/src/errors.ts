import type { MigrationErrorCode, MigrationErrorShape } from "./types.ts";

/**
 * Typed error thrown internally by the library.
 * Public APIs ({@link migrateUrl}, {@link buildCurrentUrl}) catch these
 * and surface them via the `MigrationResult` discriminated union
 * or as a `BuildResult.warning` payload.
 * @public
 */
export class MigrationError extends Error implements MigrationErrorShape {
  readonly code: MigrationErrorCode;

  constructor(
    code: MigrationErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "MigrationError";
    this.code = code;
    // Maintain prototype chain across transpilation targets.
    Object.setPrototypeOf(this, MigrationError.prototype);
  }
}
