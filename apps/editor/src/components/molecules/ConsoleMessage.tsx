import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../helpers/cn";

const consoleMessageVariants = cva(
  "font-mono text-code-mobile md:text-code-desktop py-1 px-2 border-l-2",
  {
    variants: {
      type: {
        log: "text-on-surface border-transparent",
        warn: "text-log-warn border-log-warn bg-log-warn/10",
        error: "text-error border-error bg-error/10",
        system: "text-on-surface-variant border-transparent italic",
      },
    },
    defaultVariants: {
      type: "log",
    },
  },
);

type ConsoleMessageVariants = VariantProps<typeof consoleMessageVariants>;

interface ConsoleMessageProps
  extends JSX.HTMLAttributes<HTMLDivElement>,
    ConsoleMessageVariants {
  /** The message text to display. */
  message: string;
  class?: string;
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

export { ConsoleMessage, consoleMessageVariants, type ConsoleMessageProps };
