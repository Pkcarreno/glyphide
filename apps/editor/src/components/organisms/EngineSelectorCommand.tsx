import { For } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { getEngineEntries } from "../../core/engine/registry.ts";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandRoot,
} from "../atoms/Command.tsx";

/**
 * Command menu for selecting the active execution engine.
 */
export function EngineSelectorCommand() {
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      core.overlays.open("engine-selector");
    } else {
      core.overlays.close("engine-selector");
    }
  };

  return (
    <CommandDialog
      isOpen={core.overlays.isOpen("engine-selector")}
      onOpenChange={handleOpenChange}
    >
      <CommandRoot>
        <CommandInput placeholder="Select execution engine..." />
        <CommandList>
          <CommandEmpty>No engine found.</CommandEmpty>
          <CommandGroup>
            <For each={getEngineEntries(core.engineRegistry)}>
              {(entry) => (
                <CommandItem
                  onSelect={() => {
                    core.commands.selectEngine(entry.engineId, entry.language);
                    core.overlays.close("engine-selector");
                  }}
                  value={entry.label}
                >
                  {entry.label}
                </CommandItem>
              )}
            </For>
          </CommandGroup>
        </CommandList>
      </CommandRoot>
    </CommandDialog>
  );
}
