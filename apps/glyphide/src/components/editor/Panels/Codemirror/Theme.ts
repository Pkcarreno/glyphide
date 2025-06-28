import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

const cssVariables = {
	quiet: 'var(--quiet-raw)',
	subtle: 'var(--subtle-raw)',
	plain: 'var(--plain-raw)',
	yell: 'var(--yell-raw)',
	speak: 'var(--speak-raw)',
	whisper: 'var(--whisper-raw)',
	shy: 'var(--shy-raw)',
	extra: 'var(--extra-raw)',
	land: 'var(--land-raw)',
	background: 'var(--background)',
	foreground: 'var(--foreground)',
	primary: 'var(--primary-raw)',
	mutedForeground: 'var(--muted-foreground)',
	border: 'var(--border)',
	accentForeground: 'var(--accent-foreground)'
}

const getOklch = (key: keyof typeof cssVariables, alpha?: string) =>
	`oklch(${cssVariables[key]} / ${alpha ?? '1'})`

const themeStyles = {
	'&': {
		background: getOklch('land'),
		color: cssVariables.foreground,
		caretColor: cssVariables.accentForeground,
		height: '100%'
	},
	'.cm-editor': {
		height: '100%'
	},
	'.cm-content': {
		height: '100%',
		caretColor: cssVariables.accentForeground,
		fontFamily: "'IBM Plex Mono', monospace"
	},
	'.cm-cursor, .cm-dropcursor': {
		borderleftcolor: cssVariables.primary
	},
	'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
		{
			backgroundColor: getOklch('primary', '0.3'),
			color: cssVariables.foreground
		},
	'.cm-searchMatch': {
		backgroundColor: getOklch('yell', '0.5'),
		color: cssVariables.foreground,
		outline: `1px solid ${getOklch('yell')}`
	},
	'.cm-searchMatch.cm-searchMatch-selected': {
		backgroundColor: getOklch('yell', '0.7529'),
		color: cssVariables.foreground,
		outline: `1px solid ${getOklch('yell')}`
	},
	'.cm-panels': {
		background: cssVariables.background,
		color: cssVariables.foreground
	},
	'.cm-activeLine': {
		backgroundColor: getOklch('primary', '0.1')
	},
	'.cm-gutters': {
		background: `linear-gradient(90deg,${getOklch('land')} 20%, ${getOklch('land', '0.9')} 100%)`,
		color: cssVariables.mutedForeground,
		borderRight: 'none'
	},
	'.cm-tooltip': {
		backgroundColor: cssVariables.background
	},
	'.cm-gutterElement.cm-active': {
		color: getOklch('extra')
	},
	'.cm-lineHighlight': {
		backgroundColor: getOklch('primary', '0.1')
	},
	'.cm-activeLineGutter': {
		backgroundColor: getOklch('primary', '0.3'),
		color: cssVariables.foreground
	}
}

const _glyphideTheme = EditorView.theme(themeStyles)
const _glyphideThemeDark = EditorView.theme(themeStyles, { dark: true })

const tokenHighlightStyles = HighlightStyle.define([
	{ tag: [t.comment], color: getOklch('quiet') },
	{ tag: [t.bracket, t.punctuation, t.operator], color: getOklch('subtle') },
	{ tag: [t.function(t.variableName), t.meta], color: getOklch('plain') },
	{
		tag: [t.constant(t.variableName), t.definition(t.variableName), t.number, t.invalid],
		color: getOklch('yell')
	},
	{ tag: [t.typeName, t.className, t.function(t.className), t.name], color: getOklch('speak') },
	{ tag: [t.variableName], color: getOklch('whisper') },
	{ tag: [t.string], color: getOklch('shy') },
	{ tag: [t.logicOperator, t.keyword, t.regexp], color: getOklch('extra') },
	{ tag: t.link, textDecoration: 'underline' }
])

export const glyphideTheme: Extension = [_glyphideTheme, syntaxHighlighting(tokenHighlightStyles)]

export const glyphideThemeDark: Extension = [
	_glyphideThemeDark,
	syntaxHighlighting(tokenHighlightStyles)
]
