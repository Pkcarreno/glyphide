import { splitProps, type ValidComponent } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import type { CommandId } from "../../core/shortcuts/registry.ts";
import {
  Tooltip as TooltipAtom,
  type TooltipProps as TooltipAtomProps,
} from "../atoms/Tooltip.tsx";

/**
 * Props for the ActionTooltip component.
 */
export type ActionTooltipProps<T extends ValidComponent = "div"> = Omit<
  TooltipAtomProps<T>,
  "shortcut"
> & {
  /** Command ID to automatically resolve the keyboard shortcut from the registry. */
  commandId?: CommandId;
  /** Optional manual shortcut string. Overrides the action's shortcut if provided. */
  shortcut?: string;
};

/**
 * Smart ActionTooltip molecule that connects the UI Tooltip atom to the
 * EditorCore. Automatically resolves keyboard shortcuts if a `commandId`
 * is provided.
 */
export function ActionTooltip<T extends ValidComponent = "div">(
  props: ActionTooltipProps<T>
) {
  const [local, rest] = splitProps(props as ActionTooltipProps<T>, [
    "commandId",
    "shortcut",
  ]);
  const core = useEditor();

  const resolvedShortcut = () => {
    if (local.shortcut) {
      return local.shortcut;
    }
    if (local.commandId) {
      return core.shortcuts.getBinding(local.commandId)?.label;
    }
  };

  return (
    <TooltipAtom
      shortcut={resolvedShortcut()}
      {...(rest as unknown as TooltipAtomProps<T>)}
    />
  );
}
