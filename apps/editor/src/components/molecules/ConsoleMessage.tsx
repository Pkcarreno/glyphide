import { cva, type VariantProps } from "class-variance-authority";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const consoleMessageVariants = cva(
  "border-l-2 px-2 py-1 font-mono text-code-mobile md:text-code-desktop",
  {
    variants: {
      type: {
        log: "border-transparent text-on-surface",
        warn: "border-log-warn bg-log-warn/10 text-log-warn",
        error: "border-error bg-error/10 text-error",
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
  class?: string;
  /** The message text to display. */
  message: string;
}

/**
 * A formatted log entry for the console pane.
 * Visually distinguishes logs, warnings, errors, and system messages.
 */
function ConsoleMessage(props: ConsoleMessageProps) {
  const [local, rest] = splitProps(props, ["type", "message", "class"]);

  return (
    <div
      class={cn(consoleMessageVariants({ type: local.type }), local.class)}
      {...rest}
    >
      {local.message}
    </div>
  );
}

export { ConsoleMessage, type ConsoleMessageProps, consoleMessageVariants };
