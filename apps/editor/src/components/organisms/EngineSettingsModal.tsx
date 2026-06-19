import X from "lucide-solid/icons/x";
import { For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useEditor } from "../../core/context.tsx";
import { CompactNumberInput } from "../atoms/CompactNumberInput.tsx";
import { Icon } from "../atoms/Icon.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "../molecules/Dialog.tsx";

/* ---------- Internal Components ---------- */

function EngineSettingsForm() {
  const core = useEditor();

  const engineDef = () =>
    core.engineRegistry.getDefinition(core.engine.activeEngineId());

  const activeParams =
    core.engine.activeInitParams() ?? engineDef().defaultInitParams;
  const initialPatch: Record<string, unknown> = {};
  if (activeParams) {
    for (const desc of engineDef().paramDescriptors) {
      if (desc.key in activeParams) {
        initialPatch[desc.key] =
          activeParams[desc.key as keyof typeof activeParams];
      }
    }
  }

  // Local state to store intermediate edits before applying
  const [localPatch, setLocalPatch] =
    createStore<Record<string, unknown>>(initialPatch);

  const handleApply = () => {
    core.dispatcher.dispatch({
      type: "UPDATE_ENGINE_CONFIG",
      patch: { ...localPatch },
    });
    core.dispatcher.dispatch({
      type: "CLOSE_OVERLAY",
      overlayId: "engine-settings",
    });
  };

  return (
    <div class="flex min-w-[140px] max-w-xs flex-col gap-1">
      <Show
        fallback={
          <div class="px-3 py-2 text-center text-on-surface-variant text-xs">
            No configurable parameters.
          </div>
        }
        when={engineDef().paramDescriptors.length > 0}
      >
        <For each={engineDef().paramDescriptors}>
          {(desc) => (
            <div class="flex items-center justify-between gap-4 px-3 py-1">
              <label
                class="whitespace-nowrap text-on-surface text-xs"
                for={`engine-param-${desc.key}`}
              >
                {desc.label}
              </label>

              <Show
                fallback={
                  <input
                    class="h-5 w-16 rounded border border-outline-variant bg-transparent px-1 text-right text-on-surface text-xs focus:border-primary focus:outline-none disabled:opacity-50"
                    disabled={!desc.isEditable}
                    id={`engine-param-${desc.key}`}
                    onInput={(e) => {
                      const val = e.currentTarget.value;
                      const num = Number(val);
                      const parsed =
                        !Number.isNaN(num) && val.trim() !== "" ? num : val;
                      setLocalPatch(
                        desc.key,
                        desc.toModel ? desc.toModel(parsed) : parsed
                      );
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
                <CompactNumberInput
                  {...(desc.inputProps ?? {})}
                  onValueChange={(val) => {
                    setLocalPatch(
                      desc.key,
                      desc.toModel ? desc.toModel(val) : val
                    );
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

      <button
        class="mt-2 w-full rounded-lg bg-primary px-3 py-2 font-medium text-on-primary text-sm transition-colors hover:bg-primary/90"
        onClick={handleApply}
        type="button"
      >
        Apply
      </button>
    </div>
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
    core.dispatcher.dispatch({
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
      overlayId: "engine-settings",
    });
  };

  return (
    <Dialog
      isOpen={core.overlays.isOpen("engine-settings")}
      onOpenChange={handleOpenChange}
    >
      <DialogContent class="max-w-xs p-0">
        <DialogHeader class="justify-between px-3 py-2">
          <span class="font-semibold text-xs uppercase tracking-wider">
            Engine Settings
          </span>
          <DialogClose aria-label="Close engine settings">
            <Icon icon={X} size={16} />
          </DialogClose>
        </DialogHeader>
        <EngineSettingsForm />
      </DialogContent>
    </Dialog>
  );
}

export { EngineSettingsModal };
