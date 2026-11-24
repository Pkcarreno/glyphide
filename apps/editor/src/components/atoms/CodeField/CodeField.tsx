import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { createEffect, createSignal, onSettled } from "solid-js";
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

/**
 * CodeField Component
 *
 * An atomic code editor input powered by CodeMirror.
 * It behaves like a standard controlled or uncontrolled input field.
 */
export function CodeField(props: CodeFieldProps) {
  let containerRef: HTMLDivElement | undefined;
  let view: EditorView | undefined;
  const [editorView, setEditorView] = createSignal<EditorView>();
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
      doc: props.value || "",
      extensions: [
        basicSetup,
        updateListener,
        glyphideSyntaxHighlight,
        appearanceCompartment.of(getEditorAppearance(!!props.isDark)),
        languageCompartment.of([]),
        wordWrapCompartment.of(
          props.isWordWrapEnabled ? EditorView.lineWrapping : []
        ),
        readOnlyCompartment.of(
          props.isReadOnly
            ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
            : []
        ),
      ],
    });

    const v = new EditorView({ parent: containerRef, state });
    view = v;
    setEditorView(v);

    return () => {
      v.destroy();
      view = undefined;
      setEditorView(undefined);
    };
  });

  createEffect(
    () => !!props.isDark,
    (isDark) => {
      if (view) {
        view.dispatch({
          effects: appearanceCompartment.reconfigure(
            getEditorAppearance(isDark)
          ),
        });
      }
    }
  );

  createEffect(
    () => !!props.isWordWrapEnabled,
    (isWrap) => {
      if (view) {
        view.dispatch({
          effects: wordWrapCompartment.reconfigure(
            isWrap ? EditorView.lineWrapping : []
          ),
        });
      }
    }
  );

  createEffect(
    () => !!props.isReadOnly,
    (isReadOnly) => {
      if (view) {
        view.dispatch({
          effects: readOnlyCompartment.reconfigure(
            isReadOnly
              ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
              : []
          ),
        });
      }
    }
  );

  createEffect(
    () => ({ lang: props.language, v: editorView() }),
    ({ lang, v }) => {
      if (!(v && lang)) {
        return;
      }

      const loadLanguageEngine = async () => {
        let languageExtension: Extension | undefined;
        try {
          if (lang === "javascript") {
            const { javascript } = await import("@codemirror/lang-javascript");
            languageExtension = javascript();
          } else if (lang === "python") {
            const { python } = await import("@codemirror/lang-python");
            languageExtension = python();
          }

          if (languageExtension) {
            v.dispatch({
              effects: languageCompartment.reconfigure(languageExtension),
            });
          } else {
            v.dispatch({
              effects: languageCompartment.reconfigure([]),
            });
          }
        } catch (error) {
          console.error(`Error loading language engine for ${lang}:`, error);
        }
      };

      loadLanguageEngine();
    }
  );

  createEffect(
    () => props.value,
    (newValue) => {
      if (view && newValue !== undefined) {
        const currentValue = view.state.doc.toString();
        if (newValue !== currentValue) {
          isProgrammaticSync = true;
          try {
            view.dispatch({
              changes: {
                from: 0,
                insert: newValue,
                to: currentValue.length,
              },
            });
          } finally {
            isProgrammaticSync = false;
          }
        }
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
