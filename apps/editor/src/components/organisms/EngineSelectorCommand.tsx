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
    core.dispatcher.dispatch({
      overlayId: "engine-selector",
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
    });
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
                    core.dispatcher.dispatch({
                      engineId: entry.engineId,
                      language: entry.language,
                      type: "SELECT_ENGINE_ENTRY",
                    });
                    core.dispatcher.dispatch({
                      overlayId: "engine-selector",
                      type: "CLOSE_OVERLAY",
                    });
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
