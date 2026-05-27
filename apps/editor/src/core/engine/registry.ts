import type { EngineWorkerFactory } from "@glyphide/orchestrator";

/** Unique identifier for a registered engine. */
export type EngineId = "quickjs" | "mock";

/**
 * Descriptor for a lazily-loadable execution engine.
 * The factory is loaded on demand to avoid bundling heavy WASM upfront.
 */
export interface EngineDefinition {
  id: EngineId;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Dynamically imports the engine's worker factory. */
  loadFactory: () => Promise<EngineWorkerFactory>;
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
      label: "QuickJS",
      loadFactory: async () => {
        const { createQuickJSWorker } = await import(
          "@glyphide/quickjs-engine/adapter"
        );
        return createQuickJSWorker;
      },
    },
    {
      id: "mock",
      label: "Mock Engine",
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

  async function loadFactory(id: EngineId): Promise<EngineWorkerFactory> {
    const definition = getDefinition(id);
    return definition.loadFactory();
  }

  return { engines: definitions, getDefinition, loadFactory };
}
