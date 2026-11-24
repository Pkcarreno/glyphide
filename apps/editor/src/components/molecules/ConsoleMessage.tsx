import type { JSX } from "@solidjs/web";
import { cva, type VariantProps } from "class-variance-authority";
import { omit } from "solid-js";
import { cn } from "../../helpers/cn.ts";

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
  extends JSX.HTMLAttributes<HTMLDivElement>,
    ConsoleMessageVariants {
  /** JSX children for structured output (e.g. ConsoleTokenView). When set, `message` is ignored. */
  children?: JSX.Element;
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
function ConsoleMessage(props: ConsoleMessageProps) {
  const rest = omit(props, "type", "message", "children", "class");

  return (
    <div
      class={cn(consoleMessageVariants({ type: props.type }), props.class)}
      {...rest}
    >
      {props.children ?? props.message}
    </div>
  );
}

/** @public */
export { ConsoleMessage, type ConsoleMessageProps, consoleMessageVariants };
