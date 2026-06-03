import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { createEffect, onCleanup, onMount } from "solid-js";
import { getEditorAppearance, glyphideSyntaxHighlight } from "./theme.ts";

export interface CodeFieldProps {
  /** Whether the dark theme should be enforced in CodeMirror internals */
  isDark?: boolean;
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

  const languageCompartment = new Compartment();
  const appearanceCompartment = new Compartment();
  const wordWrapCompartment = new Compartment();

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && props.onValueChange) {
        props.onValueChange(update.state.doc.toString());
      }
      if ((update.docChanged || update.selectionSet) && props.onCursorChange) {
        const main = update.state.selection.main;
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
      ],
    });

    view = new EditorView({ state, parent: containerRef });
  });

  createEffect(() => {
    const isDark = !!props.isDark;
    if (view) {
      view.dispatch({
        effects: appearanceCompartment.reconfigure(getEditorAppearance(isDark)),
      });
    }
  });

  createEffect(() => {
    const isWrap = !!props.isWordWrapEnabled;
    if (view) {
      view.dispatch({
        effects: wordWrapCompartment.reconfigure(
          isWrap ? EditorView.lineWrapping : []
        ),
      });
    }
  });

  createEffect(() => {
    const lang = props.language;
    if (!(view && lang)) {
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
          view?.dispatch({
            effects: languageCompartment.reconfigure(languageExtension),
          });
        } else {
          view?.dispatch({
            effects: languageCompartment.reconfigure([]),
          });
        }
      } catch (error) {
        console.error(`Error loading language engine for ${lang}:`, error);
      }
    };

    loadLanguageEngine();
  });

  createEffect(() => {
    const newValue = props.value;
    if (view && newValue !== undefined) {
      const currentValue = view.state.doc.toString();
      if (newValue !== currentValue) {
        view.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: newValue,
          },
        });
      }
    }
  });

  onCleanup(() => {
    if (view) {
      view.destroy();
      view = undefined;
    }
  });

  return (
    <div
      class="h-full min-h-[300px] w-full overflow-hidden bg-editor-bg"
      ref={(el) => {
        containerRef = el;
      }}
    />
  );
}
