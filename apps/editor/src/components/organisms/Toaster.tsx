import { For } from "solid-js";
import { useEditor } from "../../core/context.tsx";
import { Toast } from "../molecules/Toast.tsx";

/**
 * Global container for active toast notifications.
 * Manages the layout and positioning of the toast stack.
 */
export function Toaster() {
  const core = useEditor();

  function handleClose(id: string) {
    core.dispatcher.dispatch({ id, type: "DISMISS_TOAST" });
  }

  const activeNotifications = () => core.notifications.activeToasts();

  return (
    <div
      aria-live="assertive"
      class="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-end px-4 pt-6 pb-12 sm:items-end sm:px-6 sm:pt-6 sm:pb-14"
    >
      <div class="flex w-full flex-col items-center justify-end sm:items-end">
        <For each={activeNotifications()}>
          {(notification) => (
            <Toast notification={notification} onClose={handleClose} />
          )}
        </For>
      </div>
    </div>
  );
}
