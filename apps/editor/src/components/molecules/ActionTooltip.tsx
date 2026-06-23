import { splitProps, type ValidComponent } from "solid-js";
import type { EditorAction } from "../../core/actions/types.ts";
import { useEditor } from "../../core/context.tsx";
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
> &
  (
    | {
        /** Optional action to automatically resolve the keyboard shortcut from the registry. */
        action: EditorAction;
        shortcut?: never;
      }
    | {
        action?: never;
        /** Optional manual shortcut string. Overrides the action's shortcut if provided. */
        shortcut?: string;
      }
  );

/**
 * Smart ActionTooltip molecule that connects the UI Tooltip atom to the
 * EditorCore. Automatically resolves keyboard shortcuts if an `action`
 * is provided.
 */
export function ActionTooltip<T extends ValidComponent = "div">(
  props: ActionTooltipProps<T>
) {
  const [local, rest] = splitProps(props as ActionTooltipProps<T>, [
    "action",
    "shortcut",
  ]);
  const core = useEditor();

  const resolvedShortcut = () => {
    if (local.shortcut) {
      return local.shortcut;
    }
    if (local.action) {
      const binding = core.shortcuts.bindings.find((b) => {
        const bAction = b.action as Record<string, unknown>;
        const lAction = local.action as Record<string, unknown>;

        if (!(bAction && lAction)) {
          return false;
        }

        const keys = Object.keys(lAction);
        if (Object.keys(bAction).length !== keys.length) {
          return false;
        }

        return keys.every((k) => bAction[k] === lAction[k]);
      });
      return binding?.label;
    }
    return;
  };

  return (
    <TooltipAtom
      shortcut={resolvedShortcut()}
      {...(rest as unknown as TooltipAtomProps<T>)}
    />
  );
}
