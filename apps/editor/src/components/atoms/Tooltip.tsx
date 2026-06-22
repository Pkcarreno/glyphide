import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { createSignal, Show, splitProps } from "solid-js";
import type { PopoverPosition } from "./Popover.tsx";
import { Popover } from "./Popover.tsx";

/** Positioning options for the Tooltip, identical to Popover positions. */
export type TooltipPosition = PopoverPosition;

/** Properties for the Tooltip component. */
export type TooltipProps<T extends ValidComponent = "div"> = {
  /** The element type to render the trigger as. Default: 'div' */
  as?: T;
  /** The child elements that will trigger the tooltip. */
  children: JSX.Element;
  /** Optional CSS classes for the trigger. */
  class?: string;
  /** Optional secondary text describing a shortcut or type. */
  meta?: string;
  /** Distance in pixels between the tooltip and the trigger. */
  offset?: number;
  /** Placement of the tooltip relative to the trigger. */
  position?: TooltipPosition;
  /** Optional keyboard shortcut string to display. */
  shortcut?: string;
  /** The primary text content of the tooltip. */
  text: string;
} & Omit<
  ComponentProps<T>,
  | "as"
  | "children"
  | "class"
  | "text"
  | "meta"
  | "shortcut"
  | "position"
  | "offset"
>;

/**
 * Standard unified tooltip for the Glyphide design system.
 * Enforces consistency by accepting only specific textual props.
 */
export function Tooltip<T extends ValidComponent = "div">(
  props: TooltipProps<T>
) {
  const [local, rest] = splitProps(props, [
    "as",
    "children",
    "class",
    "text",
    "meta",
    "shortcut",
    "position",
    "offset",
  ]);

  const [isHovered, setIsHovered] = createSignal(false);

  return (
    <Popover.Root
      isOpen={isHovered()}
      offset={local.offset}
      position={local.position}
    >
      <Popover.Trigger
        as={local.as}
        class={local.class}
        onBlur={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...(rest as unknown as ComponentProps<T>)}
      >
        {local.children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup
            class="w-max max-w-64 px-2 py-1 text-ui-label"
            role="tooltip"
          >
            <div class="flex items-baseline justify-between gap-4">
              <span class="text-on-surface text-xs">{local.text}</span>
              <Show when={local.shortcut}>
                <span class="whitespace-nowrap font-mono text-token-comment text-tooltip-shortcut">
                  {local.shortcut}
                </span>
              </Show>
            </div>
            <Show when={local.meta}>
              <span class="mt-1.5 block text-token-comment text-tooltip-meta">
                {local.meta}
              </span>
            </Show>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
