import { createEffect, For, onCleanup, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useEditor } from "../../core/context.tsx";
import { CompactNumberInput } from "../atoms/CompactNumberInput.tsx";
import { Popover, usePopover } from "../atoms/PopoverPrimitive.tsx";

function VirtualAnchor() {
  const ctx = usePopover();

  createEffect(() => {
    // Repeatedly try to find the element in case it mounts slightly after
    const findAndSet = () => {
      const el = document.getElementById("engine-settings-trigger");
      if (el) {
        ctx.setTriggerRef(el);
        return true;
      }
      return false;
    };

    if (!findAndSet()) {
      // Retry in next microtask
      setTimeout(findAndSet, 0);
    }
  });

  return null;
}

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

  onCleanup(() => {
    // Apply changes when the modal closes
    core.dispatcher.dispatch({
      type: "UPDATE_ENGINE_CONFIG",
      patch: { ...localPatch },
    });
  });

  return (
    <div class="flex min-w-[140px] max-w-xs flex-col gap-1 pb-1">
      <div class="mb-1 border-outline-variant/50 border-b px-2 py-1.5">
        <span class="font-semibold text-on-surface-variant text-xs uppercase tracking-wider">
          Engine Settings
        </span>
      </div>
      <Show
        fallback={
          <div class="py-2 text-center text-on-surface-variant text-xs">
            No configurable parameters.
          </div>
        }
        when={engineDef().paramDescriptors.length > 0}
      >
        <For each={engineDef().paramDescriptors}>
          {(desc) => (
            <div class="flex items-center justify-between gap-4 px-2 py-1">
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
    </div>
  );
}

/**
 * A FloatingUI popover that renders dynamically generated configuration inputs
 * for the currently active execution engine based on its paramDescriptors.
 */
export function EngineSettingsPopover() {
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    core.dispatcher.dispatch({
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
      overlayId: "engine-settings",
    });
  };

  return (
    <Popover.Root
      isOpen={core.overlays.isOpen("engine-settings")}
      offset={8}
      onOpenChange={handleOpenChange}
      position="top-end"
    >
      <VirtualAnchor />
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup>
            <EngineSettingsForm />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
