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

    const editor = new EditorView({ parent: containerRef, state });
    setView(editor);
    return () => editor.destroy();
  });

  createEffect(
    () => [view(), !!props.isDark] as const,
    ([editor, isDark]) => {
      editor?.dispatch({
        effects: appearanceCompartment.reconfigure(getEditorAppearance(isDark)),
      });
    }
  );

  createEffect(
    () => [view(), !!props.isWordWrapEnabled] as const,
    ([editor, isWrap]) => {
      editor?.dispatch({
        effects: wordWrapCompartment.reconfigure(
          isWrap ? EditorView.lineWrapping : []
        ),
      });
    }
  );

  createEffect(
    () => [view(), !!props.isReadOnly] as const,
    ([editor, isReadOnly]) => {
      editor?.dispatch({
        effects: readOnlyCompartment.reconfigure(
          isReadOnly
            ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
            : []
        ),
      });
    }
  );

  createEffect(
    () => [view(), props.language] as const,
    ([editor, language]) => {
      if (!(editor && language)) {
        return;
      }

      let isCurrent = true;
      const loadLanguageEngine = async () => {
        let languageExtension: Extension = [];
        try {
          if (language === "javascript") {
            const { javascript } = await import("@codemirror/lang-javascript");
            languageExtension = javascript();
          } else if (language === "python") {
            const { python } = await import("@codemirror/lang-python");
            languageExtension = python();
          }

          if (isCurrent) {
            editor.dispatch({
              effects: languageCompartment.reconfigure(languageExtension),
            });
          }
        } catch (error) {
          console.error(
            `Error loading language engine for ${language}:`,
            error
          );
        }
      };

      loadLanguageEngine();
      return () => {
        isCurrent = false;
      };
    }
  );

  createEffect(
    () => [view(), props.value] as const,
    ([editor, newValue]) => {
      if (editor && newValue !== undefined) {
        const currentValue = editor.state.doc.toString();
        if (newValue !== currentValue) {
          isProgrammaticSync = true;
          try {
            editor.dispatch({
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
      class="h-full min-h-[300px] w-full overflow-hidden bg-editor-bg"
      ref={(el) => {
        containerRef = el;
      }}
    />
  );
}
