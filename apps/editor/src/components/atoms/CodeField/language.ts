import type { Extension } from "@codemirror/state";

const PLAINTEXT_EXTENSION: Extension = [];

const LANGUAGE_LOADERS: Record<string, () => Promise<Extension>> = {
  javascript: async () => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript();
  },
  python: async () => {
    const { python } = await import("@codemirror/lang-python");
    return python();
  },
};

/**
 * Loads a CodeMirror language extension dynamically for the given language id,
 * or returns an empty extension array when the language is plaintext or unsupported.
 */
export async function loadLanguageExtension(
  language?: string
): Promise<Extension> {
  if (!language) {
    return PLAINTEXT_EXTENSION;
  }

  const loadLanguage = LANGUAGE_LOADERS[language];
  return loadLanguage ? await loadLanguage() : PLAINTEXT_EXTENSION;
}
