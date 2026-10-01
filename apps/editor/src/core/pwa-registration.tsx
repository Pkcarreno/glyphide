// biome-ignore lint/correctness/noUnresolvedImports: virtual module provided by vite-plugin-pwa at build time
import { useRegisterSW } from "virtual:pwa-register/solid";
import type { JSX } from "solid-js";
import {
  createContext,
  createEffect,
  createSignal,
  on,
  useContext,
} from "solid-js";

/**
 * Controller interface providing PWA update state and actions to the UI.
 *
 * @public
 */
export interface PwaUpdateController {
  /** Applies the pending service worker update and reloads the application. */
  applyUpdate: () => void;
  /** Reactive accessor indicating whether an application update is waiting. */
  updateAvailable: () => boolean;
}

const DEFAULT_PWA_CONTROLLER: PwaUpdateController = {
  applyUpdate: () => {
    // Default no-op when rendered outside PwaProvider.
  },
  updateAvailable: () => false,
};

const PwaContext = createContext<PwaUpdateController>(DEFAULT_PWA_CONTROLLER);

/**
 * Provider component that bridges the PWA service worker lifecycle into a SolidJS context.
 *
 * @public
 */
export function PwaProvider(props: { children: JSX.Element }) {
  const [updateAvailable, setUpdateAvailable] = createSignal(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  let notifiedUpdate = false;

  createEffect(
    on(needRefresh, (isReady) => {
      if (isReady && !notifiedUpdate) {
        notifiedUpdate = true;
        setUpdateAvailable(true);
      }
    })
  );

  function applyUpdate(): void {
    updateServiceWorker(true);
  }

  const value: PwaUpdateController = {
    applyUpdate,
    updateAvailable,
  };

  return (
    <PwaContext.Provider value={value}>{props.children}</PwaContext.Provider>
  );
}

/**
 * Hook to access PWA update state and actions.
 * Falls back safely when called outside `<PwaProvider>`.
 *
 * @public
 */
export function usePwaUpdate(): PwaUpdateController {
  return useContext(PwaContext);
}

/**
 * Backward compatibility alias for PwaProvider or legacy mounting.
 *
 * @public
 */
export function PwaRegistration() {
  return null;
}
