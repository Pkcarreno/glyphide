import { cva, type VariantProps } from "class-variance-authority";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const consoleMessageVariants = cva(
  "shrink-0 border-l-2 px-2 py-1 font-mono text-sm",
  {
    variants: {
      type: {
        log: "border-transparent text-on-surface",
        warn: "border-log-warn bg-log-warn/10 text-log-warn",
        error: "border-error bg-error/10 text-error",
        info: "border-transparent text-primary",
        debug: "border-transparent text-on-surface-variant opacity-80",
        table: "border-transparent text-on-surface",
        system: "border-transparent text-on-surface-variant italic",
      },
    },
    defaultVariants: {
      type: "log",
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
  const [local, rest] = splitProps(props, [
    "type",
    "message",
    "children",
    "class",
  ]);

  return (
    <div
      class={cn(consoleMessageVariants({ type: local.type }), local.class)}
      {...rest}
    >
      {local.children ?? local.message}
    </div>
  );
}

export { ConsoleMessage, type ConsoleMessageProps, consoleMessageVariants };
