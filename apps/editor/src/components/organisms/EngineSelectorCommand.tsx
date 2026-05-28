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

  const selectEngine = (engineId: "quickjs" | "mock") => {
    core.dispatcher.dispatch({ type: "SELECT_ENGINE", engineId });
    handleOpenChange(false);
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
            <CommandItem
              value="QuickJS Engine"
              onSelect={() => selectEngine("quickjs")}
            >
              QuickJS Engine
            </CommandItem>
            <CommandItem
              value="Mock Test Engine"
              onSelect={() => selectEngine("mock")}
            >
              Mock Test Engine
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandRoot>
    </CommandDialog>
  );
}
