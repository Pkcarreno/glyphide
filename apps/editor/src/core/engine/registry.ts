import type { EngineWorkerFactory } from "@glyphide/orchestrator";
import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import type { EngineInitParams } from "@glyphide/rpc-protocol/types";
import {
  type ConsoleVariant,
  defaultFormat,
  isConsoleTokenArray,
  type OutputFormatter,
  typeToVariant,
} from "./output-formatter.ts";

/** Engine identifiers are now strings, validated at runtime. */
export type EngineId = string;

/** Selectable combination of an engine and a specific language. */
export interface EngineEntry {
  engineId: EngineId;
  /** Human-readable label shown in the selector (e.g., "QuickJS — JavaScript"). */
  label: string;
  language: string;
}

/**
 * Descriptor for an engine-specific configuration parameter.
 *
 * @public
 */
export interface EngineParamDescriptor {
  /** Props passed to the UI input component. */
  inputProps?: Record<string, unknown>;
  /** UI presentation type for the parameter. */
  inputType?: "compact-number" | "text";
  /** Indicates whether the parameter can be edited by the user in the UI. */
  isEditable: boolean;
  /** Unique key identifying the parameter, used in the engine's initialization payload. */
  key: string;
  /** Human-readable label for the parameter shown in the UI. */
  label: string;
  /** Transforms the value from the UI (view) back to the internal model (params). */
  toModel?: (viewValue: unknown) => unknown;
  /** Transforms the value from the internal model (params) to the UI (view). */
  toView?: (modelValue: unknown) => unknown;
}

/**
 * Static definition of a lazily-loadable execution engine.
 *
 * @public
 */
export interface EngineDefinition {
  /** Default INIT params sent to this engine (language is overridden per entry). */
  defaultInitParams: Omit<EngineInitParams, "language">;
  id: EngineId;
  /** Human-readable engine name. */
  label: string;
  loadFactory: () => Promise<EngineWorkerFactory>;
  /**
   * Optional engine-specific output formatter.
   * When absent, the ConsolePane falls back to `defaultFormat`.
   * Formatters receive `OutputEntry` with `data: unknown` and MUST
   * assert the concrete payload type internally with a runtime guard.
   */
  outputFormatter?: OutputFormatter;
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

/** Creates the default `EngineRegistry` with QuickJS, MicroPython, and Mock engines. */
export function createEngineRegistry(): EngineRegistry {
  const definitions: EngineDefinition[] = [
    {
      id: "micropython",
      label: "MicroPython Engine",
      supportedLanguages: ["python"],
      defaultInitParams: { timeout: 30_000 },
      paramDescriptors: [
        {
          key: "timeout",
          label: "Execution Timeout (s)",
          isEditable: true,
          inputType: "compact-number",
          inputProps: { min: 1, max: 120, step: 1 },
          toModel: (val) => Number(val) * 1000,
          toView: (val) => Number(val) / 1000,
        },
      ],
      loadFactory: async () => {
        const { createMicropythonWorker } = await import(
          "@glyphide/micropython-engine/adapter"
        );
        return createMicropythonWorker;
      },
      outputFormatter: {
        format(entry) {
          const text = String(entry.data ?? "");
          switch (entry.type) {
            case "stdout":
              return { variant: "log", text };
            case "stderr":
              return { variant: "error", text };
            case "system":
              return { variant: "system", text };
            default:
              return defaultFormat(entry);
          }
        },
      },
    },
    {
      id: "quickjs",
      label: "QuickJS Engine",
      supportedLanguages: ["javascript"],
      defaultInitParams: { timeout: 30_000 },
      paramDescriptors: [
        {
          key: "timeout",
          label: "Execution Timeout (s)",
          isEditable: true,
          inputType: "compact-number",
          inputProps: { min: 1, max: 120, step: 1 },
          toModel: (val) => Number(val) * 1000,
          toView: (val) => Number(val) / 1000,
        },
      ],
      loadFactory: async () => {
        const { createQuickJSWorker } = await import(
          "@glyphide/quickjs-engine/adapter"
        );
        return createQuickJSWorker;
      },
      outputFormatter: {
        format(entry) {
          if (entry.type === "system") {
            return { variant: "system", text: String(entry.data ?? "") };
          }
          // Guard: data must be ConsoleToken[] — falls back to string on mismatch
          if (isConsoleTokenArray(entry.data)) {
            const tokens = entry.data as ConsoleToken[];
            const variant: ConsoleVariant = typeToVariant(entry.type);
            return { variant, tokens };
          }
          return defaultFormat(entry);
        },
      },
    },
    // Mock engine is dev/test only — Vite statically replaces
    // `import.meta.env.DEV` to `false` in production, so Rollup tree-shakes
    // the entire `@glyphide/mock-engine` dynamic import and chunk.
    ...(import.meta.env.DEV
      ? ([
          {
            id: "mock",
            label: "Mock Test Engine",
            supportedLanguages: ["plaintext"],
            defaultInitParams: { timeout: 30_000 },
            paramDescriptors: [
              {
                key: "timeout",
                label: "Execution Timeout (ms)",
                isEditable: true,
              },
            ],
            loadFactory: async () => {
              const { createMockWorker } = await import(
                "@glyphide/mock-engine/adapter"
              );
              return createMockWorker;
            },
            outputFormatter: {
              format(entry) {
                const text = String(entry.data ?? "");
                switch (entry.type) {
                  case "log":
                  case "print":
                    return { variant: "log", text };
                  case "warn":
                    return { variant: "warn", text };
                  case "system":
                    return { variant: "system", text };
                  default:
                    return defaultFormat(entry);
                }
              },
            },
          },
        ] satisfies EngineDefinition[])
      : []),
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
