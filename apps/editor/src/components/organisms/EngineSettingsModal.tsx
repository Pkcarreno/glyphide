import type { EngineInitParams } from "@glyphide/rpc-protocol/types";
import X from "lucide-solid/icons/x";
import {
  createEffect,
  createStore,
  Errored,
  For,
  isPending,
  Loading,
  Show,
} from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { Button } from "../atoms/Button.tsx";
import { Icon } from "../atoms/Icon.tsx";
import { StepperInput } from "../atoms/StepperInput.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../molecules/Dialog.tsx";

/* ---------- Internal Components ---------- */

interface EngineSettingsFormProps {
  initialParams?: EngineInitParams | null;
  isReady: boolean;
  statusMessage: string;
}

function EngineSettingsForm(props: EngineSettingsFormProps) {
  const core = useEditor();

  const engineDef = () =>
    core.engineRegistry.getDefinition(core.engine.activeEngineId());

  // Local state to store intermediate edits before applying
  const [localPatch, setLocalPatch] = createStore<Record<string, unknown>>({});

  createEffect(
    () => ({
      def: engineDef(),
      params: props.initialParams ?? engineDef().defaultInitParams,
    }),
    ({ def, params }) => {
      setLocalPatch((draft) => {
        for (const desc of def.paramDescriptors) {
          if (params && desc.key in params) {
            draft[desc.key] = params[desc.key as keyof typeof params];
          }
        }
      });
    }
  );

  const handleApply = () => {
    core.engine.updateEngineConfig({ ...localPatch });
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
          {(desc) => (
            <div class="flex items-center justify-between gap-4 px-3 py-1">
              <label
                class="text-on-surface text-xs whitespace-nowrap"
                for={`engine-param-${desc.key}`}
              >
                {desc.label}
              </label>

              <Show
                fallback={
                  <input
                    class="border-outline-variant text-on-surface focus:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-5 w-16 rounded border bg-transparent px-1 text-right text-xs outline-none focus:outline-none focus-visible:ring-3 disabled:opacity-50 aria-invalid:ring-3"
                    disabled={!(desc.isEditable && props.isReady)}
                    id={`engine-param-${desc.key}`}
                    onInput={(e) => {
                      const val = e.currentTarget.value;
                      const num = Number(val);
                      const parsed =
                        !Number.isNaN(num) && val.trim() !== "" ? num : val;
                      setLocalPatch((draft) => {
                        draft[desc.key] = desc.toModel
                          ? desc.toModel(parsed)
                          : parsed;
                      });
                    }}
                    value={String(
                      desc.toView
                        ? desc.toView(localPatch[desc.key] ?? "")
                        : (localPatch[desc.key] ?? "")
                    )}
                  />
                }
                when={desc.inputType === "compact-number"}
              >
                <StepperInput
                  {...(desc.inputProps ?? {})}
                  disabled={!(desc.isEditable && props.isReady)}
                  onValueChange={(val) => {
                    setLocalPatch((draft) => {
                      draft[desc.key] = desc.toModel ? desc.toModel(val) : val;
                    });
                  }}
                  value={Number(
                    desc.toView
                      ? desc.toView(localPatch[desc.key] ?? 0)
                      : (localPatch[desc.key] ?? 0)
                  )}
                />
              </Show>
            </div>
          )}
        </For>
      </Show>

      <Show when={!props.isReady && props.statusMessage}>
        <div class="text-on-surface-variant text-xs">{props.statusMessage}</div>
      </Show>

      <Button
        class="w-full"
        disabled={!props.isReady}
        onClick={handleApply}
        type="button"
        variant="primary"
      >
        Apply
      </Button>
    </div>
  );
}

function EngineSettingsContent() {
  const core = useEditor();
  const isEnginePending = () => isPending(() => core.engine.engine());

  const isReady = () =>
    !(
      core.engine.isBlocked() ||
      core.engine.isRunning() ||
      isEnginePending()
    ) && core.engine.engine() !== null;

  const statusMessage = (): string => {
    if (core.engine.isBlocked()) {
      return "The engine initializes when you grant trust. Parameters can be modified once initialized.";
    }
    if (isEnginePending()) {
      return "The engine is initializing. Please wait...";
    }
    if (core.engine.isRunning()) {
      return "The engine is currently running. Stop execution to modify parameters.";
    }
    if (core.engine.engine() === null) {
      return "The engine initializes when you run code. Parameters can be modified once initialized.";
    }
    return "";
  };

  return (
    <Show when={core.engine.engine() !== undefined}>
      <EngineSettingsForm
        initialParams={
          core.engine.engine()?.initParams ?? core.engine.activeInitParams()
        }
        isReady={isReady()}
        statusMessage={statusMessage()}
      />
    </Show>
  );
}

/* ---------- Main Component ---------- */

/**
 * Engine settings modal that renders dynamically generated configuration inputs
 * for the currently active execution engine based on its paramDescriptors.
 * Uses Dialog compound component for consistent modal behavior.
 */
function EngineSettingsModal() {
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      core.overlays.open("engine-settings");
    } else {
      core.overlays.close("engine-settings");
    }
  };

  return (
    <Dialog
      isOpen={core.overlays.isOpen("engine-settings")}
      onOpenChange={handleOpenChange}
    >
      <DialogContent class="max-w-xs p-0">
        <DialogHeader>
          <DialogTitle>Engine Settings</DialogTitle>
          <DialogClose aria-label="Close engine settings">
            <Icon icon={X} size={16} />
          </DialogClose>
        </DialogHeader>
        <Errored
          fallback={
            <EngineSettingsForm
              isReady={false}
              statusMessage="Engine initialization failed. Retry to modify parameters."
            />
          }
        >
          <Loading
            fallback={
              <EngineSettingsForm
                isReady={false}
                statusMessage="The engine is initializing. Please wait..."
              />
            }
          >
            <EngineSettingsContent />
          </Loading>
        </Errored>
      </DialogContent>
    </Dialog>
  );
}

export { EngineSettingsModal };
