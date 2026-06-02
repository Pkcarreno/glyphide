import {
  CommandDialog,
  CommandRoot,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../atoms/Command";
import { useEditor } from "../../core/context";
import { Icon } from "../atoms/Icon";
import Zap from "lucide-solid/icons/zap";
import Beaker from "lucide-solid/icons/beaker";
import { For } from "solid-js";
import { getEngineEntries } from "../../core/engine/registry";

/**
 * Command menu for selecting the active execution engine.
 */
export function EngineSelectorCommand() {
  const core = useEditor();

  const handleOpenChange = (isOpen: boolean) => {
    core.dispatcher.dispatch({
      type: isOpen ? "OPEN_OVERLAY" : "CLOSE_OVERLAY",
      overlayId: "engine-selector",
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
                  value={entry.label}
                  onSelect={() => {
                    core.dispatcher.dispatch({
                      type: "SELECT_ENGINE_ENTRY",
                      engineId: entry.engineId,
                      language: entry.language,
                    });
                    core.dispatcher.dispatch({
                      type: "CLOSE_OVERLAY",
                      overlayId: "engine-selector",
                    });
                  }}
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
