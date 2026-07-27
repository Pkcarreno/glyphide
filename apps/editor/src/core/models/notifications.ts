import { createSignal } from "solid-js";

/** @public */
export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  action?: { label: string; onClick: () => void };
  description?: string;
  id: string;
  timestamp: number;
  title: string;
  type: NotificationType;
}

/** @public */
export interface NotificationPayload {
  action?: { label: string; onClick: () => void };
  description?: string;
  title: string;
  type?: NotificationType;
}

/**
 * Manages currently active toasts without a persistent history.
 */
export interface NotificationModel {
  /** The currently active notifications shown as floating toasts. */
  activeToasts: () => NotificationItem[];
  /** Removes a toast from the active display. */
  dismissToast: (id: string) => void;
  /** Adds a new notification and displays it as an active toast. */
  dispatchNotification: (payload: NotificationPayload) => string;
  /** Tears down timers (used on core disposal). */
  dispose: () => void;
}

/**
 * Creates a new NotificationModel instance.
 */
export function createNotificationModel(): NotificationModel {
  const [activeToasts, setActiveToasts] = createSignal<NotificationItem[]>([]);

  // We maintain a registry of timeout handles to clear them on disposal
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  function dismissToast(id: string) {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    const timeout = timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.delete(id);
    }
  }

  function dispatchNotification(payload: NotificationPayload): string {
    const id = crypto.randomUUID();
    const newItem: NotificationItem = {
      action: payload.action,
      description: payload.description,
      id,
      timestamp: Date.now(),
      title: payload.title,
      type: payload.type || "info",
    };

    setActiveToasts((prev) => [...prev, newItem]);

    // Auto-dismiss the toast after 8000ms
    const timeoutId = setTimeout(() => {
      dismissToast(id);
    }, 8000);
    timeouts.set(id, timeoutId);

    return id;
  }

  function dispose() {
    for (const timeout of timeouts.values()) {
      clearTimeout(timeout);
    }
    timeouts.clear();
  }

  return {
    activeToasts,
    dismissToast,
    dispatchNotification,
    dispose,
  };
}
