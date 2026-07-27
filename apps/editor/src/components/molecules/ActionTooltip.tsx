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
        const bAction = b.action;
        const lAction = local.action;

        if (!(bAction && lAction)) {
          return false;
        }

        const bActionObj = bAction as Record<string, unknown>;
        const lActionObj = lAction as Record<string, unknown>;

        const keys = Object.keys(lActionObj);
        if (Object.keys(bActionObj).length !== keys.length) {
          return false;
        }

        return keys.every((k) => bActionObj[k] === lActionObj[k]);
      });
      return binding?.label;
    }
  };

  return (
    <TooltipAtom
      shortcut={resolvedShortcut()}
      {...(rest as unknown as TooltipAtomProps<T>)}
    />
  );
}
