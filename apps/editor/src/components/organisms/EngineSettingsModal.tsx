import type { EngineInitParams } from "@glyphide/rpc-protocol/types";
import X from "lucide-solid/icons/x";
import type { VoidProps } from "solid-js";
import {
  createMemo,
  createStore,
  createUniqueId,
  Errored,
  For,
  isPending,
  Loading,
  Show,
  untrack,
} from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { StepperInput } from "../atoms/StepperInput.tsx";
import { OverlayDialog } from "../molecules/OverlayDialog.tsx";

/* ---------- Internal Components ---------- */

type EngineSettingsStatusVariant =
  | "blocked"
  | "error"
  | "loading"
  | "running"
  | "uninitialized";

const ENGINE_STATUS_MESSAGES: Record<EngineSettingsStatusVariant, string> = {
  blocked:
    "The engine initializes when you grant trust. Parameters can be modified once initialized.",
  error: "Engine initialization failed. Retry to modify parameters.",
  loading: "The engine is initializing. Please wait...",
  running:
    "The engine is currently running. Stop execution to modify parameters.",
  uninitialized:
    "The engine initializes when you run code. Parameters can be modified once initialized.",
};

interface EngineSettingsStatusProps {
  onRetry?: () => void;
  variant: EngineSettingsStatusVariant;
}

function EngineSettingsStatus(props: VoidProps<EngineSettingsStatusProps>) {
  return (
    <div class="flex max-w-xs min-w-35 flex-col gap-3 px-3 py-3">
      <p
        class={cn(
          "text-xs leading-relaxed",
          props.variant === "error" ? "text-error" : "text-on-surface-variant"
        )}
        role={props.variant === "error" ? "alert" : "status"}
      >
        {ENGINE_STATUS_MESSAGES[props.variant]}
      </p>
      <Show when={props.variant === "error" && props.onRetry}>
        {(onRetry) => (
          <Button
            class="w-full"
            onClick={() => onRetry()()}
            type="button"
            variant="primary"
          >
            Retry
          </Button>
        )}
      </Show>
    </div>
  );
}

interface EngineSettingsFormProps {
  initialParams?: EngineInitParams | null;
}

function EngineSettingsForm(props: VoidProps<EngineSettingsFormProps>) {
  const core = useEditor();

  const engineId = () => core.engine.activeEngineId();
  const engineDef = () => core.engineRegistry.getDefinition(engineId());
  const baseParams = createMemo(
    () =>
      (props.initialParams ?? engineDef().defaultInitParams) as Record<
        string,
        unknown
      >
  );

  // Store only unsaved user overrides keyed by engineId so baseParams stays reactive.
  const [localEdits, setLocalEdits] = createStore<{
    engineId: string;
    values: Record<string, unknown>;
  }>({
    engineId: untrack(engineId),
    values: {},
  });

  const getParamValue = (key: string): unknown => {
    if (localEdits.engineId === engineId() && key in localEdits.values) {
      return localEdits.values[key];
    }
    return baseParams()[key];
  };

  const setParamEdit = (key: string, value: unknown) => {
    const activeId = engineId();
    setLocalEdits((draft) => {
      if (draft.engineId !== activeId) {
        draft.engineId = activeId;
        draft.values = {};
      }
      draft.values[key] = value;
    });
  };

  const handleApply = () => {
    const patch: Record<string, unknown> = {};
    for (const desc of engineDef().paramDescriptors) {
      const value = getParamValue(desc.key);
      if (value !== undefined) {
        patch[desc.key] = value;
      }
    }
    core.engine.updateEngineConfig(patch);
    setLocalEdits((draft) => {
      draft.values = {};
    });
    core.overlays.close("engine-settings");
  };

  return (
    <div class="flex max-w-xs min-w-35 flex-col gap-3 px-3 py-3">
      <Show
        fallback={
          <div class="text-on-surface-variant px-3 py-2 text-center text-xs">
            No configurable parameters.
          </div>
        }
        when={engineDef().paramDescriptors.length > 0}
      >
        <For each={engineDef().paramDescriptors}>
          {(desc) => {
            const inputId = createUniqueId();

            return (
              <div class="flex items-center justify-between gap-4 px-3 py-1">
                <label
                  class="text-on-surface cursor-pointer text-xs whitespace-nowrap"
                  for={inputId}
                >
                  {desc.label}
                </label>

                <Show
                  fallback={
                    <input
                      class="border-outline-variant text-on-surface focus:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-5 w-16 rounded border bg-transparent px-1 text-right text-xs outline-none focus:outline-none focus-visible:ring-3 disabled:opacity-50 aria-invalid:ring-3"
                      disabled={!desc.isEditable}
                      id={inputId}
                      onInput={(e) => {
                        const val = e.currentTarget.value;
                        const num = Number(val);
                        const parsed =
                          !Number.isNaN(num) && val.trim() !== "" ? num : val;
                        setParamEdit(
                          desc.key,
                          desc.toModel ? desc.toModel(parsed) : parsed
                        );
                      }}
                      value={String(
                        desc.toView
                          ? desc.toView(getParamValue(desc.key) ?? "")
                          : (getParamValue(desc.key) ?? "")
                      )}
                    />
                  }
                  when={desc.inputType === "compact-number"}
                >
                  <StepperInput
                    {...(desc.inputProps ?? {})}
                    disabled={!desc.isEditable}
                    id={inputId}
                    inputAriaLabel={desc.label}
                    onValueChange={(val) => {
                      setParamEdit(
                        desc.key,
                        desc.toModel ? desc.toModel(val) : val
                      );
                    }}
                    value={Number(
                      desc.toView
                        ? desc.toView(getParamValue(desc.key) ?? 0)
                        : (getParamValue(desc.key) ?? 0)
                    )}
                  />
                </Show>
              </div>
            );
          }}
        </For>
      </Show>

      <Button
        class="w-full"
        onClick={handleApply}
        type="button"
        variant="primary"
      >
        Apply
      </Button>
    </div>
  );
}

function EngineSettingsContent(_props: VoidProps) {
  const core = useEditor();
  const isEnginePending = () => isPending(() => core.engine.engine());

  const statusVariant = (): EngineSettingsStatusVariant | null => {
    if (core.engine.isBlocked()) {
      return "blocked";
    }
    if (isEnginePending()) {
      return "loading";
    }
    if (core.engine.isRunning()) {
      return "running";
    }
    if (core.engine.engine() === null) {
      return "uninitialized";
    }
    return null;
  };

  return (
    <Show
      fallback={
        <EngineSettingsForm
          initialParams={
            core.engine.engine()?.initParams ?? core.engine.activeInitParams()
          }
        />
      }
      when={statusVariant()}
    >
      {(variant) => <EngineSettingsStatus variant={variant()} />}
    </Show>
  );
}

/* ---------- Main Component ---------- */

/**
 * Engine settings modal that renders dynamically generated configuration inputs
 * for the active execution engine or a status view when parameters cannot change.
 */
function EngineSettingsModal(_props: VoidProps) {
  const core = useEditor();

  return (
    <OverlayDialog.Root overlayId="engine-settings">
      <OverlayDialog.Content class="max-w-xs p-0">
        <OverlayDialog.Header>
          <OverlayDialog.Title>Engine Settings</OverlayDialog.Title>
          <OverlayDialog.Close aria-label="Close engine settings">
            <Icon icon={X} size={16} />
          </OverlayDialog.Close>
        </OverlayDialog.Header>
        <Errored
          fallback={(_err, reset) => (
            <EngineSettingsStatus
              onRetry={() => {
                core.commands.retryEngineInit();
                reset();
              }}
              variant="error"
            />
          )}
        >
          <Loading fallback={<EngineSettingsStatus variant="loading" />}>
            <EngineSettingsContent />
          </Loading>
        </Errored>
      </OverlayDialog.Content>
    </OverlayDialog.Root>
  );
}

export { EngineSettingsModal };
