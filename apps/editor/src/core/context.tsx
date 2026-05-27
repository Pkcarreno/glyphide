import {
  createContext,
  useContext,
  onCleanup,
} from "solid-js";
import type { JSX } from "solid-js";
import type { EditorCore } from "./editor-core";
import { createEditorCore } from "./editor-core";
import { createLocalStorageAdapter } from "./adapters/local-storage";
import { createUrlStateAdapter } from "./adapters/url-state";

const EditorContext = createContext<EditorCore>();

/**
 * SolidJS provider that creates the `EditorCore` and makes it
 * available to all descendants. Adapters (localStorage, URL) are
 * instantiated here — this is the boundary between pure business
 * logic and the browser environment.
 */
export function EditorProvider(props: { children: JSX.Element }) {
  const core = createEditorCore({
    persistence: createLocalStorageAdapter(),
    urlState: createUrlStateAdapter(),
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
    throw new Error(
      "useEditor must be called within an <EditorProvider>.",
    );
  }
  return context;
}
