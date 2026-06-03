import type { JSX } from "solid-js";
import { createContext, onCleanup, onMount, useContext } from "solid-js";
import { createFflateCodecAdapter } from "./adapters/fflate-codec.ts";
import { createLocalStorageAdapter } from "./adapters/local-storage.ts";
import { createBrowserUrlStateAdapter } from "./adapters/url-state.ts";
import { composeCompressedUrlState } from "./decorators/url-state-compression.ts";
import { composeSizeLimitedUrlState } from "./decorators/url-state-limit.ts";
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
  let core: EditorCore;

  const browserUrlAdapter = createBrowserUrlStateAdapter();
  const codecAdapter = createFflateCodecAdapter();

  const safeUrlState = composeSizeLimitedUrlState(
    browserUrlAdapter,
    8000,
    (isShareable) => {
      core?.project.setShareableState(isShareable);
    }
  );

  const finalUrlState = composeCompressedUrlState(safeUrlState, codecAdapter, [
    "code",
    "name",
    "engine",
  ]);

  core = createEditorCore({
    persistence: createLocalStorageAdapter(),
    urlState: finalUrlState,
  });

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const combo = parseKeyCombo(e);
      const action = core.shortcuts.matchShortcut(combo, core);

      if (action) {
        e.preventDefault();
        e.stopPropagation();
        core.dispatcher.dispatch(action);
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
