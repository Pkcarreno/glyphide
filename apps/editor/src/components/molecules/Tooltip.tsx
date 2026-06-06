import { splitProps, type ValidComponent } from "solid-js";
import type { EditorAction } from "../../core/actions/types.ts";
import { useEditor } from "../../core/context.tsx";
import {
  TooltipPrimitive,
  type TooltipPrimitiveProps,
} from "../atoms/TooltipPrimitive.tsx";

/**
 * Props for the Tooltip component.
 */
export type TooltipProps<T extends ValidComponent = "div"> = Omit<
  TooltipPrimitiveProps<T>,
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
 * Smart Tooltip molecule that connects the UI TooltipPrimitive to the EditorCore.
 * Automatically resolves keyboard shortcuts if an `action` is provided.
 */
export function Tooltip<T extends ValidComponent = "div">(
  props: TooltipProps<T>
) {
  const [local, rest] = splitProps(props as TooltipProps<T>, [
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
    <TooltipPrimitive
      shortcut={resolvedShortcut()}
      {...(rest as unknown as TooltipPrimitiveProps<T>)}
    />
  );
}
