import type { EngineWorkerFactory } from "@glyphide/orchestrator";
import type { EngineInitParams } from "@glyphide/rpc-protocol/types";

/** Engine identifiers are now strings, validated at runtime. */
export type EngineId = string;

/** Selectable combination of an engine and a specific language. */
export interface EngineEntry {
  engineId: EngineId;
  /** Human-readable label shown in the selector (e.g., "QuickJS — JavaScript"). */
  label: string;
  language: string;
}

/** Descriptor for an engine-specific configuration parameter. */
export interface EngineParamDescriptor {
  isEditable: boolean;
  key: string;
  label: string;
}

/** Static definition of a lazily-loadable execution engine. */
export interface EngineDefinition {
  /** Default INIT params sent to this engine (language is overridden per entry). */
  defaultInitParams: Omit<EngineInitParams, "language">;
  id: EngineId;
  /** Human-readable engine name. */
  label: string;
  loadFactory: () => Promise<EngineWorkerFactory>;
  /** Metadata describing each configurable parameter. */
  paramDescriptors: readonly EngineParamDescriptor[];
  /** Languages this engine can execute. Declared statically. */
  supportedLanguages: readonly string[];
}

/**
 * Immutable catalog of available execution engines.
 * Provides lookup by `EngineId` and lazy-loading of worker factories.
 */
export interface EngineRegistry {
  /** All registered engine definitions. */
  engines: readonly EngineDefinition[];
  /** Retrieves a definition by ID. Throws if not found. */
  getDefinition(id: EngineId): EngineDefinition;
  /** Dynamically loads and returns the worker factory for an engine. */
  loadFactory(id: EngineId): Promise<EngineWorkerFactory>;
}

/** Creates the default `EngineRegistry` with QuickJS and Mock engines. */
export function createEngineRegistry(): EngineRegistry {
  const definitions: EngineDefinition[] = [
    {
      id: "quickjs",
      label: "QuickJS Engine",
      supportedLanguages: ["javascript"],
      defaultInitParams: { timeout: 30_000 },
      paramDescriptors: [
        { key: "timeout", label: "Execution Timeout (ms)", isEditable: true },
      ],
      loadFactory: async () => {
        const { createQuickJSWorker } = await import(
          "@glyphide/quickjs-engine/adapter"
        );
        return createQuickJSWorker;
      },
    },
    {
      id: "mock",
      label: "Mock Test Engine",
      supportedLanguages: ["plaintext"],
      defaultInitParams: { timeout: 30_000 },
      paramDescriptors: [
        { key: "timeout", label: "Execution Timeout (ms)", isEditable: true },
      ],
      loadFactory: async () => {
        const { createMockWorker } = await import(
          "@glyphide/mock-engine/adapter"
        );
        return createMockWorker;
      },
    },
  ];

  const definitionMap = new Map(definitions.map((d) => [d.id, d]));

  function getDefinition(id: EngineId): EngineDefinition {
    const definition = definitionMap.get(id);
    if (!definition) {
      throw new Error(`Unknown engine: "${id}"`);
    }
    return definition;
  }

  function loadFactory(id: EngineId): Promise<EngineWorkerFactory> {
    const definition = getDefinition(id);
    return definition.loadFactory();
  }

  return { engines: definitions, getDefinition, loadFactory };
}

/**
 * Expands all engine definitions into selectable entries,
 * one per supported language.
 */
export function getEngineEntries(registry: EngineRegistry): EngineEntry[] {
  return registry.engines.flatMap((def) =>
    def.supportedLanguages.map((language) => {
      const langLabel = language.charAt(0).toUpperCase() + language.slice(1);
      return {
        engineId: def.id,
        language,
        label: `${def.label} - ${langLabel}`,
      };
    })
  );
}
