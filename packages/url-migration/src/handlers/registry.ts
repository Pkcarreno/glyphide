import { MigrationError } from "../errors.ts";
import type { VersionLiteral } from "../types.ts";
import { handleV1 } from "./v1.ts";
import { handleV2 } from "./v2.ts";
import { handleV3 } from "./v3.ts";

/**
 * Internal contract every version handler implements. Handlers are pure
 * functions over an already-parsed `URL` object so the same parser can
 * be reused by the public `migrateUrl` API and any future tooling.
 */
export interface VersionHandler {
  canHandle: (url: URL) => boolean;
  parse: (url: URL) => import("../types.ts").CanonicalState;
  readonly version: VersionLiteral;
}

const v1Handler: VersionHandler = {
  canHandle: (url) => url.hash.startsWith("#code="),
  parse: handleV1,
  version: "v1",
};

const v2Handler: VersionHandler = {
  canHandle: (url) => url.searchParams.has("c") || url.searchParams.has("t"),
  parse: handleV2,
  version: "v2",
};

const v3Handler: VersionHandler = {
  canHandle: (url) => url.searchParams.has("code"),
  parse: handleV3,
  version: "v3",
};

/**
 * Ordered registry. The first handler whose `canHandle` returns true
 * wins. Order matters: v1 (hash) must be checked before v3 (query param
 * `code`) because a URL can technically have both.
 */
export const HANDLERS: readonly VersionHandler[] = [
  v1Handler,
  v2Handler,
  v3Handler,
];

/**
 * Inspects the URL structure and returns the detected share-URL version.
 * Throws `MigrationError(UNKNOWN_VERSION)` when no handler matches.
 */
export function detectVersion(url: URL): VersionLiteral {
  for (const handler of HANDLERS) {
    if (handler.canHandle(url)) {
      return handler.version;
    }
  }
  throw new MigrationError(
    "UNKNOWN_VERSION",
    "Could not determine the share-URL format. Expected v1 (#code=), v2 (?c/?t), or v3 (?code=)."
  );
}

/**
 * Runs the registry to detect, parse, and return canonical state plus
 * the version that produced it. Centralized here so the public
 * `migrateUrl` API and the v3 pass-through have one source of truth.
 */
export function parseByRegistry(url: URL): {
  state: import("../types.ts").CanonicalState;
  version: VersionLiteral;
} {
  for (const handler of HANDLERS) {
    if (handler.canHandle(url)) {
      return { state: handler.parse(url), version: handler.version };
    }
  }
  // detectVersion is the public error surface; reuse it for consistency.
  detectVersion(url);
  // Unreachable: detectVersion always throws. This satisfies the type checker.
  throw new MigrationError("UNKNOWN_VERSION", "unreachable");
}
