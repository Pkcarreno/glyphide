import type { Extension } from "@codemirror/state";
import { Compartment, EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import type { Accessor, VoidProps } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  merge,
  onCleanup,
  onSettled,
} from "solid-js";
import { loadLanguageExtension } from "./language.ts";
import { getEditorAppearance, glyphideSyntaxHighlight } from "./theme.ts";

export interface CodeFieldProps {
  /** Whether the dark theme should be enforced in CodeMirror internals */
  isDark?: boolean;
  /** Whether the editor is read-only (no edits allowed) */
  isReadOnly?: boolean;
  /** Whether lines should wrap when they exceed the editor width */
  isWordWrapEnabled?: boolean;
  /** Programming language for syntax highlighting */
  language?: "javascript" | "python" | "plaintext" | string;
  /** Callback fired when the cursor position changes */
  onCursorChange?: (
    line: number,
    column: number,
    selectionLength: number,
    selectionLines: number
  ) => void;
  /** Callback fired when the document changes */
  onValueChange?: (value: string) => void;
  /** Default or current value of the editor */
  value?: string;
}

function getWordWrapExtension(isWordWrapEnabled: boolean): Extension {
  return isWordWrapEnabled ? EditorView.lineWrapping : [];
}

function getReadOnlyExtension(isReadOnly: boolean): Extension {
  return isReadOnly
    ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
    : [];
}

function createCompartmentEffect(
  view: Accessor<EditorView | undefined>,
  compartment: Compartment,
  getExtension: () => Extension
): void {
  createEffect(
    () => ({ currentView: view(), extension: getExtension() }),
    ({ currentView, extension }) => {
      if (currentView) {
        currentView.dispatch({
          effects: compartment.reconfigure(extension),
        });
      }
    }
  );
}

/**
 * CodeField Component
 *
 * An atomic code editor input powered by CodeMirror.
 * It behaves like a standard controlled or uncontrolled input field.
 */
export function CodeField(rawProps: VoidProps<CodeFieldProps>) {
  const props = merge(
    {
      isDark: false,
      isReadOnly: false,
      isWordWrapEnabled: false,
    },
    rawProps
  );
  let containerRef: HTMLDivElement | undefined;
  const [view, setView] = createSignal<EditorView>();
  let isProgrammaticSync = false;

  const languageCompartment = new Compartment();
  const appearanceCompartment = new Compartment();
  const wordWrapCompartment = new Compartment();
  const readOnlyCompartment = new Compartment();

  onSettled(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isProgrammaticSync && props.onValueChange) {
        props.onValueChange(update.state.doc.toString());
      }
      if ((update.docChanged || update.selectionSet) && props.onCursorChange) {
        const { main } = update.state.selection;
        const line = update.state.doc.lineAt(main.head);
        const column = main.head - line.from + 1;
        const selectionLength = Math.abs(main.to - main.from);
        const selectionLines =
          update.state.doc.lineAt(main.to).number -
          update.state.doc.lineAt(main.from).number +
          1;
        props.onCursorChange(
          line.number,
          column,
          selectionLength,
          selectionLines
        );
      }
    });

    const state = EditorState.create({
      doc: props.value ?? "",
      extensions: [
        basicSetup,
        updateListener,
        glyphideSyntaxHighlight,
        appearanceCompartment.of(getEditorAppearance(props.isDark)),
        languageCompartment.of([]),
        wordWrapCompartment.of(getWordWrapExtension(props.isWordWrapEnabled)),
        readOnlyCompartment.of(getReadOnlyExtension(props.isReadOnly)),
      ],
    });

    const editorView = new EditorView({ parent: containerRef, state });
    setView(editorView);

    return () => {
      editorView.destroy();
      setView(undefined);
    };
  });

  const languageExtension = createMemo(async (): Promise<Extension> => {
    const { language } = props;
    let isCancelled = false;
    onCleanup(() => {
      isCancelled = true;
    });

    try {
      const extension = await loadLanguageExtension(language);
      return isCancelled ? [] : extension;
    } catch (error) {
      if (!isCancelled) {
        console.error(`Error loading language engine for ${language}:`, error);
      }
      return [];
    }
  });

  createCompartmentEffect(view, appearanceCompartment, () =>
    getEditorAppearance(props.isDark)
  );
  createCompartmentEffect(view, wordWrapCompartment, () =>
    getWordWrapExtension(props.isWordWrapEnabled)
  );
  createCompartmentEffect(view, readOnlyCompartment, () =>
    getReadOnlyExtension(props.isReadOnly)
  );
  createCompartmentEffect(view, languageCompartment, languageExtension);

  createEffect(
    () => ({ currentView: view(), value: props.value }),
    ({ currentView, value }) => {
      if (!currentView || value === undefined) {
        return;
      }
      const currentValue = currentView.state.doc.toString();
      if (value === currentValue) {
        return;
      }
      isProgrammaticSync = true;
      try {
        currentView.dispatch({
          changes: {
            from: 0,
            insert: value,
            to: currentValue.length,
          },
        });
      } finally {
        isProgrammaticSync = false;
      }
    }
  );

  return (
    <div
      class="bg-editor-bg h-full min-h-[300px] w-full overflow-hidden"
      ref={(el) => {
        containerRef = el;
      }}
    />
  );
}
