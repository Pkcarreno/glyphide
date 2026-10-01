import { buildCurrentUrl } from "@glyphide/url-migration/build-url";
import { decodePayload } from "@glyphide/url-migration/codec";
import { migrateUrl } from "@glyphide/url-migration/migrate";
import type { CanonicalState } from "@glyphide/url-migration/types";
import type {
  UrlPersistencePort,
  UrlPersistenceResult,
} from "../ports/url-persistence.ts";

/**
 * Resolves an engine parameter string that might be plain text or payload-encoded.
 */
function resolveEngineParam(rawEngine: string): {
  engine: string;
  language: string;
} {
  const decoded = decodePayload(rawEngine) ?? rawEngine;
  const [engine, lang] = decoded.split(":");
  const defaultLanguage = engine === "micropython" ? "python" : "javascript";
  return {
    engine: engine || "quickjs",
    language: lang || defaultLanguage,
  };
}

/**
 * Resolves a project name parameter that might be plain text or payload-encoded.
 */
function resolveNameParam(rawName: string): string {
  return decodePayload(rawName) ?? rawName;
}

/**
 * Browser URL-backed implementation of {@link UrlPersistencePort}.
 * Encapsulates canonical URL serialization, fflate compression, version migration,
 * character limit warnings, and History API atomic updates.
 */
export function createBrowserUrlPersistenceAdapter(): UrlPersistencePort {
  function getBaseUrl(): string {
    return `${window.location.origin}${window.location.pathname}`;
  }

  return {
    clear(): void {
      window.history.replaceState(null, "", getBaseUrl());
    },

    load(): CanonicalState | null {
      const { href } = window.location;

      try {
        const migration = migrateUrl(href);
        if (migration.ok) {
          if (migration.version !== "v3") {
            const built = buildCurrentUrl(migration.state, getBaseUrl());
            window.history.replaceState(null, "", built.url);
          }
          return migration.state;
        }
      } catch {
        // Migration failure falls through to partial parameter check
      }

      const searchParams = new URLSearchParams(window.location.search);
      const rawEngine = searchParams.get("engine");
      const rawName = searchParams.get("name");

      if (rawEngine || rawName) {
        const { engine, language } = rawEngine
          ? resolveEngineParam(rawEngine)
          : { engine: "quickjs", language: "javascript" };
        const name = rawName ? resolveNameParam(rawName) : "";

        return {
          code: "",
          engine,
          language,
          name,
        };
      }

      return null;
    },

    save(state: CanonicalState): UrlPersistenceResult {
      const baseUrl = getBaseUrl();
      const built = buildCurrentUrl(state, baseUrl);

      if (built.warning !== null) {
        console.warn(built.warning);
        window.history.replaceState(null, "", baseUrl);
        return { isShareable: false };
      }

      window.history.replaceState(null, "", built.url);
      return { isShareable: true };
    },
  };
}
