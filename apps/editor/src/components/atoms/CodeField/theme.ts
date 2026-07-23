import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

const themeTokens = {
  accent: "var(--editor-accent)",

  background: "var(--color-editor-bg)",
  border: "var(--color-border-subtle)",
  foreground: "var(--color-on-surface)",
  lineBg: "var(--editor-line-bg)",
  muted: "var(--color-surface-variant)",
  mutedForeground: "var(--color-on-surface-variant)",
  plain: "oklch(var(--plain-raw) / 1)",
  quiet: "oklch(var(--quiet-raw) / 1)",
  searchMatch: "var(--editor-search-match)",
  searchSelected: "var(--editor-search-selected)",
  selectionBg: "var(--editor-selection-bg)",
  shy: "oklch(var(--shy-raw) / 1)",
  speak: "oklch(var(--speak-raw) / 1)",
  subtle: "oklch(var(--subtle-raw) / 1)",
  whisper: "oklch(var(--whisper-raw) / 1)",
  yell: "oklch(var(--yell-raw) / 1)",
};

const editorBaseStyles = {
  ".cm-activeLine, .cm-lineHighlight": { backgroundColor: themeTokens.lineBg },
  ".cm-activeLineGutter": {
    backgroundColor: themeTokens.muted,
    color: themeTokens.accent,
  },
  ".cm-button": {
    backgroundColor: themeTokens.background,
    backgroundImage: "none",
    border: `1px solid ${themeTokens.border}`,
    borderRadius: "var(--radius-sm)",
    color: themeTokens.foreground,
    cursor: "pointer",
  },
  ".cm-content": {
    caretColor: themeTokens.accent,
  },
  ".cm-cursor, .cm-dropcursor": { borderLeftColor: themeTokens.accent },
  ".cm-gutters": {
    background: themeTokens.background,
    borderRight: `1px solid ${themeTokens.border}`,
    color: themeTokens.mutedForeground,
  },
  ".cm-panels": {
    background: themeTokens.muted,
    borderTop: `1px solid ${themeTokens.border}`,
    color: themeTokens.foreground,
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-code)",
    lineHeight: "var(--buffer-line-height)",
    overflow: "auto",
  },
  ".cm-searchMatch": {
    backgroundColor: themeTokens.searchMatch,
    color: "inherit",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: themeTokens.searchSelected,
    outline: `1px solid ${themeTokens.accent}`,
  },
  ".cm-textfield": {
    backgroundColor: themeTokens.background,
    border: `1px solid ${themeTokens.border}`,
    borderRadius: "var(--radius-sm)",
    color: themeTokens.foreground,
    outline: "none",
  },
  ".cm-tooltip": {
    backgroundColor: themeTokens.muted,
    border: `1px solid ${themeTokens.border}`,
  },
  "&": {
    background: themeTokens.background,
    caretColor: themeTokens.accent,
    color: themeTokens.foreground,
    height: "100%",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: themeTokens.selectionBg,
    },
};

const syntaxColors = HighlightStyle.define([
  { color: themeTokens.quiet, tag: [t.comment] },
  { color: themeTokens.subtle, tag: [t.bracket, t.punctuation, t.operator] },
  {
    color: themeTokens.plain,
    tag: [
      t.function(t.variableName),
      t.function(t.propertyName),
      t.macroName,
      t.meta,
    ],
  },
  {
    color: themeTokens.yell,
    tag: [
      t.constant(t.variableName),
      t.bool,
      t.number,
      t.invalid,
      t.standard(t.name),
    ],
  },
  { color: themeTokens.speak, tag: [t.typeName, t.className, t.propertyName] },
  {
    color: themeTokens.whisper,
    tag: [t.variableName, t.definition(t.variableName)],
  },
  {
    color: themeTokens.shy,
    tag: [t.string, t.keyword, t.controlKeyword, t.logicOperator, t.regexp],
  },
  { tag: [t.link], textDecoration: "underline" },
]);

/**
 * Syntax highlighting extension for CodeMirror
 */
export const glyphideSyntaxHighlight: Extension =
  syntaxHighlighting(syntaxColors);

/**
 * Returns a CodeMirror theme extension that adapts to the current app theme
 * @param isDark - Whether the current theme is dark
 */
export function getEditorAppearance(isDark: boolean): Extension {
  return EditorView.theme(editorBaseStyles, { dark: isDark });
}
