// biome-ignore lint/correctness/noUnresolvedImports: virtual module provided by vite-plugin-pwa at build time
import { useRegisterSW } from "virtual:pwa-register/solid";
import type { ParentProps } from "solid-js";
import { createContext, createMemo, useContext } from "solid-js";

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

const PwaContext = createContext<PwaUpdateController | null>(null);

/**
 * Provider component that bridges the PWA service worker lifecycle into a SolidJS context.
 *
 * @public
 */
export function PwaProvider(props: ParentProps) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  const updateAvailable = createMemo<boolean>((prev) =>
    Boolean(prev || needRefresh())
  );

  function applyUpdate(): void {
    updateServiceWorker(true);
  }

  const value: PwaUpdateController = {
    applyUpdate,
    updateAvailable,
  };

  return <PwaContext value={value}>{props.children}</PwaContext>;
}

/**
 * Hook to access PWA update state and actions.
 * Falls back safely when called outside `<PwaProvider>`.
 *
 * @public
 */
export function usePwaUpdate(): PwaUpdateController {
  return useContext(PwaContext) ?? DEFAULT_PWA_CONTROLLER;
}
