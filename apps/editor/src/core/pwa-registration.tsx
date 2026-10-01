// biome-ignore lint/correctness/noUnresolvedImports: virtual module provided by vite-plugin-pwa at build time
import { useRegisterSW } from "virtual:pwa-register/solid";
import { createEffect, on } from "solid-js";
import { useEditor } from "./context.tsx";

/**
 * Controller component that bridges the PWA service worker lifecycle
 * (provided by `virtual:pwa-register/solid`) into the EditorCore PWA model.
 * Renders nothing.
 *
 * Mount inside `<EditorProvider>` so the controller has access to the
 * EditorCore via `useEditor()`.
 *
 * @public
 */
export function PwaRegistration() {
  const core = useEditor();
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  // Wire the model's `applyUpdate` to the real SW update mechanism.
  // The model method is a no-op by design; the controller is the
  // place that knows about the virtual module.
  core.pwa.applyUpdate = () => {
    updateServiceWorker(true);
  };

  // Each notification is triggered at most once per registration lifetime.
  // Re-renders or repeated signal reads must not produce duplicates.
  let notifiedUpdate = false;
  let notifiedOffline = false;

  createEffect(
    on(needRefresh, (isReady) => {
      if (isReady && !notifiedUpdate) {
        notifiedUpdate = true;
        core.pwa.setUpdateAvailable(true);
      }
    })
  );

  createEffect(
    on(offlineReady, (isReady) => {
      if (isReady && !notifiedOffline) {
        notifiedOffline = true;
        core.pwa.setOfflineReady(true);
      }
    })
  );

  return null;
}
