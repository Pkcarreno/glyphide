import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

const themeTokens = {
	quiet: "oklch(var(--quiet-raw) / 1)",
	subtle: "oklch(var(--subtle-raw) / 1)",
	plain: "oklch(var(--plain-raw) / 1)",
	yell: "oklch(var(--yell-raw) / 1)",
	speak: "oklch(var(--speak-raw) / 1)",
	whisper: "oklch(var(--whisper-raw) / 1)",
	shy: "oklch(var(--shy-raw) / 1)",

	background: "var(--color-editor-bg)",
	foreground: "var(--color-on-surface)",
	muted: "var(--color-surface-variant)",
	mutedForeground: "var(--color-on-surface-variant)",
	border: "var(--color-border-subtle)",

	accent: "var(--editor-accent)",
	selectionBg: "var(--editor-selection-bg)",
	lineBg: "var(--editor-line-bg)",
	searchMatch: "var(--editor-search-match)",
	searchSelected: "var(--editor-search-selected)",
};

const editorBaseStyles = {
	"&": {
		background: themeTokens.background,
		color: themeTokens.foreground,
		height: "100%",
		caretColor: themeTokens.accent,
	},
	".cm-editor, .cm-content": { height: "100%" },
	".cm-content": {
		fontFamily: "var(--font-mono)",
		caretColor: themeTokens.accent,
	},
	".cm-panels": {
		background: themeTokens.muted,
		color: themeTokens.foreground,
		borderTop: `1px solid ${themeTokens.border}`,
	},
	".cm-gutters": {
		background: themeTokens.background,
		color: themeTokens.mutedForeground,
		borderRight: `1px solid ${themeTokens.border}`,
	},
	".cm-tooltip": {
		backgroundColor: themeTokens.muted,
		border: `1px solid ${themeTokens.border}`,
	},
	".cm-cursor, .cm-dropcursor": { borderLeftColor: themeTokens.accent },
	"&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
		{
			backgroundColor: themeTokens.selectionBg,
		},
	".cm-activeLine, .cm-lineHighlight": { backgroundColor: themeTokens.lineBg },
	".cm-activeLineGutter": {
		backgroundColor: themeTokens.muted,
		color: themeTokens.accent,
	},
	".cm-searchMatch": {
		backgroundColor: themeTokens.searchMatch,
		color: "inherit",
	},
	".cm-searchMatch.cm-searchMatch-selected": {
		backgroundColor: themeTokens.searchSelected,
		outline: `1px solid ${themeTokens.accent}`,
	},
};

const syntaxColors = HighlightStyle.define([
	{ tag: [t.comment], color: themeTokens.quiet },
	{ tag: [t.bracket, t.punctuation, t.operator], color: themeTokens.subtle },
	{
		tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName, t.meta],
		color: themeTokens.plain,
	},
	{
		tag: [t.constant(t.variableName), t.bool, t.number, t.invalid, t.standard(t.name)],
		color: themeTokens.yell,
	},
	{ tag: [t.typeName, t.className, t.propertyName], color: themeTokens.speak },
	{ tag: [t.variableName, t.definition(t.variableName)], color: themeTokens.whisper },
	{
		tag: [t.string, t.keyword, t.controlKeyword, t.logicOperator, t.regexp],
		color: themeTokens.shy,
	},
	{ tag: [t.link], textDecoration: "underline" },
]);

/**
 * Syntax highlighting extension for CodeMirror
 */
export const glyphideSyntaxHighlight: Extension = syntaxHighlighting(syntaxColors);

/**
 * Returns a CodeMirror theme extension that adapts to the current app theme
 * @param isDark - Whether the current theme is dark
 */
export function getEditorAppearance(isDark: boolean): Extension {
	return EditorView.theme(editorBaseStyles, { dark: isDark });
}
