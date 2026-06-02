import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { createEffect, onCleanup, onMount } from "solid-js";
import { getEditorAppearance, glyphideSyntaxHighlight } from "./theme.ts";

export interface CodeFieldProps {
  /** Whether the dark theme should be enforced in CodeMirror internals */
  isDark?: boolean;
  /** Programming language for syntax highlighting */
  language?: "javascript" | "python" | "plaintext" | string;
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

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && props.onValueChange) {
        props.onValueChange(update.state.doc.toString());
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
