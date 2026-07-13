import { createSignal } from "solid-js";

/**
 * Reactive PWA service-worker lifecycle state.
 *
 * @public
 */
export interface PwaModel {
  /**
   * UI-facing entry point for the user to accept a pending update.
   * The actual SW `SKIP_WAITING` posting is performed by the
   * `PwaRegistration` controller, which wires this method to
   * `updateServiceWorker()` from `virtual:pwa-register/solid`.
   *
   * Exposed as a callable property (not a method) so the controller
   * can rebind it after `useRegisterSW` resolves the real handler.
   */
  applyUpdate: () => void;
  /** Whether the SW has finished precaching and the app is ready offline. */
  offlineReady: () => boolean;
  /** @internal Called by the dispatcher handler for `PWA_OFFLINE_READY`. */
  setOfflineReady(value: boolean): void;
  /** @internal Called by the dispatcher handler for `PWA_UPDATE_AVAILABLE`. */
  setUpdateAvailable(value: boolean): void;
  /** Whether a new SW version is waiting to activate. */
  updateAvailable: () => boolean;
}

/**
 * Creates a new `PwaModel` instance.
 *
 * SW registration errors are intentionally not surfaced here — the app
 * continues to function online with no UI for the user.
 */
export function createPwaModel(): PwaModel {
  const [updateAvailable, setUpdateAvailable] = createSignal(false);
  const [offlineReady, setOfflineReady] = createSignal(false);

  function applyUpdate(): void {
    // Intentionally empty at the model level. The PwaRegistration controller
    // rebinds this method to `updateServiceWorker()` from
    // `virtual:pwa-register/solid`, which posts `SKIP_WAITING` to the
    // waiting SW and triggers a page reload.
  }

  return {
    offlineReady,
    updateAvailable,
    applyUpdate,
    setOfflineReady,
    setUpdateAvailable,
  };
}
