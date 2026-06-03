import AlertTriangleIcon from "lucide-solid/icons/alert-triangle";
import CheckCircleIcon from "lucide-solid/icons/check-circle";
import XIcon from "lucide-solid/icons/x";
import XCircleIcon from "lucide-solid/icons/x-circle";
import { createSignal, Match, onMount, Show, Switch } from "solid-js";
import type { NotificationItem } from "../../core/models/notifications.ts";
import { cn } from "../../helpers/cn.ts";
import { Button } from "../atoms/Button.tsx";
import { Icon } from "../atoms/Icon.tsx";

/**
 * Props for the Toast component.
 */
interface ToastProps {
  notification: NotificationItem;
  onClose: (id: string) => void;
}

/**
 * Ephemeral notification component that displays a message and an optional action.
 * Uses CSS transitions for smooth mounting and unmounting.
 */
export function Toast(props: ToastProps) {
  const [isClosing, setIsClosing] = createSignal(false);
  const [isMounted, setIsMounted] = createSignal(false);

  onMount(() => {
    setTimeout(() => {
      setIsMounted(true);
    }, 50);
  });

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      props.onClose(props.notification.id);
    }, 300);
  }

  return (
    <div
      class={cn(
        "flex w-full max-w-sm flex-col justify-end transition-all duration-300 ease-out",
        isClosing() ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100",
        isMounted() ? "translate-x-0" : "translate-x-8 opacity-0"
      )}
    >
      <div class="w-full pt-3">
        <div
          aria-live="polite"
          class="pointer-events-auto relative flex w-full overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-md"
          role="status"
        >
          <div class="flex w-full items-start p-3 pl-4">
            <Show when={props.notification.type !== "info"}>
              <div class="mt-0.5 shrink-0">
                <Switch>
                  <Match when={props.notification.type === "success"}>
                    <Icon
                      class="text-primary"
                      icon={CheckCircleIcon}
                      size={16}
                    />
                  </Match>
                  <Match when={props.notification.type === "warning"}>
                    <Icon
                      class="text-log-warn"
                      icon={AlertTriangleIcon}
                      size={16}
                    />
                  </Match>
                  <Match when={props.notification.type === "error"}>
                    <Icon class="text-error" icon={XCircleIcon} size={16} />
                  </Match>
                </Switch>
              </div>
            </Show>

            <div class="ml-3 flex w-0 flex-1 flex-col gap-1.5">
              <p class="font-mono font-semibold text-on-surface text-xs">
                {props.notification.title}
              </p>
              <Show when={props.notification.description}>
                <p class="wrap-break-word whitespace-pre-wrap font-mono text-[11px] text-on-surface-variant leading-relaxed">
                  {props.notification.description}
                </p>
              </Show>
              <Show when={props.notification.action}>
                {(action) => (
                  <div class="mt-1">
                    <Button
                      onClick={() => {
                        action().onClick();
                        handleClose();
                      }}
                      size="sm"
                      variant="primary"
                    >
                      {action().label}
                    </Button>
                  </div>
                )}
              </Show>
            </div>

            <div class="ml-3 flex shrink-0">
              <Button
                aria-label="Close"
                class="text-on-surface-variant/50 hover:text-on-surface"
                onClick={handleClose}
                size="icon"
                variant="ghost"
              >
                <Icon icon={XIcon} size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
