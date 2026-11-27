import LoaderCircle from "lucide-solid/icons/loader-circle";
import type { VoidProps } from "solid-js";
import { Errored, For, isPending, Loading, latest, Show } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type { EngineEntry } from "../../core/engine/registry.ts";
import { getEngineEntries } from "../../core/engine/registry.ts";
import { Command } from "../atoms/Command.tsx";
import { Icon } from "../atoms/Icon.tsx";

function EngineEntrySpinner(props: VoidProps<{ entry: EngineEntry }>) {
  const core = useEditor();

  const isTargetEntry = () =>
    latest(() => core.engine.activeEngineId()) === props.entry.engineId &&
    latest(() => core.engine.activeLanguage()) === props.entry.language;

  const renderSpinner = () => (
    <Icon
      class="text-on-surface-variant ml-auto animate-spin"
      icon={LoaderCircle}
      label="Initializing engine"
      size={14}
    />
  );

  return (
    <Errored fallback={null}>
      <Loading fallback={<Show when={isTargetEntry()}>{renderSpinner()}</Show>}>
        <Show when={isPending(() => core.engine.engine()) && isTargetEntry()}>
          {renderSpinner()}
        </Show>
      </Loading>
    </Errored>
  );
}

/**
 * Command menu for selecting the active execution engine.
 */
export function EngineSelectorCommand(_props: VoidProps) {
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      core.overlays.open("engine-selector");
    } else {
      core.overlays.close("engine-selector");
    }
  };

  return (
    <Command.Dialog
      isOpen={core.overlays.isOpen("engine-selector")}
      onOpenChange={handleOpenChange}
    >
      <Command.Root>
        <Command.Input placeholder="Select execution engine..." />
        <Command.List>
          <Command.Empty>No engine found.</Command.Empty>
          <Command.Group>
            <For each={getEngineEntries(core.engineRegistry)}>
              {(entry) => (
                <Command.Item
                  class="gap-2"
                  onSelect={() => {
                    core.commands.selectEngine(entry.engineId, entry.language);
                    core.overlays.close("engine-selector");
                  }}
                  value={entry.label}
                >
                  <span class="truncate">{entry.label}</span>
                  <EngineEntrySpinner entry={entry} />
                </Command.Item>
              )}
            </For>
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Command.Dialog>
  );
}
