import type { JSX } from "@solidjs/web";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ParentProps } from "solid-js";
import { children, omit, Show } from "solid-js";
import { cn } from "../../helpers/cn.ts";
import { hasResolvedChildren } from "../../helpers/has-resolved-children.ts";

const consoleMessageVariants = cva(
  "shrink-0 border-l-2 px-2 py-1 font-mono text-sm",
  {
    defaultVariants: {
      type: "log",
    },
    variants: {
      type: {
        debug: "text-on-surface-variant border-transparent opacity-80",
        error: "border-error bg-error/10 text-error",
        info: "text-primary border-transparent",
        log: "text-on-surface border-transparent",
        system: "text-on-surface-variant border-transparent italic",
        table: "text-on-surface border-transparent",
        warn: "border-log-warn bg-log-warn/10 text-log-warn",
      },
    },
  }
);

type ConsoleMessageVariants = VariantProps<typeof consoleMessageVariants>;

interface ConsoleMessageProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children">,
    ConsoleMessageVariants {
  class?: string;
  /** Plain text message. Required when `children` is not provided. */
  message?: string;
}

/**
 * A formatted log entry for the console pane.
 * Visually distinguishes logs, warnings, errors, and system messages.
 *
 * Accepts either a plain `message` string or `children` JSX for structured
 * output such as `ConsoleTokenView`. When `children` is provided, it takes
 * precedence over `message`.
 */
function ConsoleMessage(props: ParentProps<ConsoleMessageProps>) {
  const rest = omit(props, "type", "message", "children", "class");
  const resolved = children(() => props.children);

  return (
    <div
      class={cn(consoleMessageVariants({ type: props.type }), props.class)}
      {...rest}
    >
      <Show fallback={props.message} when={hasResolvedChildren(resolved)}>
        {resolved()}
      </Show>
    </div>
  );
}

/** @public */
export { ConsoleMessage, type ConsoleMessageProps, consoleMessageVariants };
