import type { JSX } from "solid-js";
import { createContext, onCleanup, onMount, useContext } from "solid-js";
import { createBrowserFileIoAdapter } from "./adapters/file-io.ts";
import { createLocalStorageAdapter } from "./adapters/local-storage.ts";
import { createBrowserUrlPersistenceAdapter } from "./adapters/url-persistence.ts";
import type { EditorCore } from "./editor-core.ts";
import { createEditorCore } from "./editor-core.ts";
import { parseKeyCombo } from "./shortcuts/registry.ts";

const EditorContext = createContext<EditorCore>();

/**
 * SolidJS provider that creates the `EditorCore` and makes it
 * available to all descendants. Adapters (localStorage, URL) are
 * instantiated here — this is the boundary between pure business
 * logic and the browser environment.
 */
export function EditorProvider(props: { children: JSX.Element }) {
  const core = createEditorCore({
    fileIo: createBrowserFileIoAdapter(),
    persistence: createLocalStorageAdapter(),
    urlPersistence: createBrowserUrlPersistenceAdapter(),
  });

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const combo = parseKeyCombo(e);
      const binding = core.shortcuts.matchShortcut(combo, core);

      if (binding) {
        e.preventDefault();
        e.stopPropagation();
        binding.execute(core);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown, true);
    });
  });

  onCleanup(() => core.dispose());

  return (
    <EditorContext.Provider value={core}>
      {props.children}
    </EditorContext.Provider>
  );
}

/**
 * Retrieves the `EditorCore` from the nearest `EditorProvider`.
 * Must be called within a component tree wrapped by `EditorProvider`.
 */
export function useEditor(): EditorCore {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be called within an <EditorProvider>.");
  }
  return context;
}
