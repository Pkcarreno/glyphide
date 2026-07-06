// biome-ignore-all lint/performance/noBarrelFile: Public API surface for the library; required for consumers to import from the package root.
/** @public */

/** @public */
export { buildCurrentUrl } from "./build-url.ts";
/** @public */
export { decode as decodePayload, encode as encodePayload } from "./codec.ts";
/** @public */
export { detectVersion } from "./detect.ts";
export { MigrationError } from "./errors.ts";
/** @public */
export type { VersionHandler } from "./handlers/registry.ts";
/** @public */
export { handleV1 } from "./handlers/v1.ts";
/** @public */
export { handleV2 } from "./handlers/v2.ts";
/** @public */
export { handleV3 } from "./handlers/v3.ts";
/** @public */
export { migrateUrl } from "./migrate.ts";

/** @public */
export type {
  BuildResult,
  CanonicalState,
  MigrationErrorCode,
  MigrationErrorShape,
  MigrationResult,
  VersionLiteral,
} from "./types.ts";
