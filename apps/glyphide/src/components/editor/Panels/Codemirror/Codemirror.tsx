import { EditorState, type Extension, type SelectionRange, StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { useEffect, useMemo, useRef } from 'react'
import type { editorStateType } from '@/stores/app'
import { useThemeStore } from '@/stores/theme'
import { glyphideTheme, glyphideThemeDark } from './Theme'

interface CodeMirrorEditorProps {
	initialDoc: string
	extensions: Extension[]
	onChange?: (doc: string) => void
	onEditorStateChange?: (state: editorStateType) => void
	disabled?: boolean
}

const CodemirrorEditor: React.FC<CodeMirrorEditorProps> = ({
	initialDoc,
	extensions,
	onChange,
	onEditorStateChange,
	disabled
}) => {
	const editorRef = useRef<HTMLDivElement>(null)
	const editorViewRef = useRef<EditorView | null>(null)
	const { themeMode } = useThemeStore()
	const lastEditorStateInfo = useRef<editorStateType>({
		cursorPosition: -1,
		currentLine: -1,
		selectionLength: -1
	})

	// biome-ignore lint/correctness/useExhaustiveDependencies: this useEffect should run only once
	useEffect(() => {
		if (!editorRef.current) return

		const startState = EditorState.create({
			doc: initialDoc,
			extensions: [
				basicSetup,
				themeMode === 'dark' ? glyphideThemeDark : glyphideTheme,
				EditorView.contentAttributes.of({
					'data-gramm_editor': 'false',
					'aria-label': 'text editor'
				}),
				EditorView.editable.of(!disabled),
				...extensions,
				EditorView.updateListener.of(update => {
					if (update.docChanged && onChange) {
						onChange(update.state.doc.toString())
					}
				})
			]
		})

		const view = new EditorView({
			state: startState,
			parent: editorRef.current
		})

		editorViewRef.current = view

		return () => {
			view.destroy()
			editorViewRef.current = null
		}
	}, [])

	const editorUpdateListener = useMemo(() => {
		return EditorView.updateListener.of(update => {
			if (update.docChanged && onChange) {
				onChange(update.state.doc.toString())
			}

			if (onEditorStateChange) {
				const doc = update.state.doc
				const selection = update.state.selection

				const currentInfo: editorStateType = {
					currentLine: doc.lineAt(selection.main.head).number,
					selectionLength: selection.ranges.reduce(
						(len: number, range: SelectionRange) => len + (range.to - range.from),
						0
					),
					cursorPosition: selection.main.head - doc.lineAt(selection.main.head).from
				}

				if (
					currentInfo.cursorPosition !== lastEditorStateInfo.current.cursorPosition ||
					currentInfo.currentLine !== lastEditorStateInfo.current.currentLine ||
					currentInfo.selectionLength !== lastEditorStateInfo.current.selectionLength
				) {
					onEditorStateChange(currentInfo)
					lastEditorStateInfo.current = currentInfo
				}
			}
		})
	}, [onChange, onEditorStateChange])

	useEffect(() => {
		if (editorViewRef.current) {
			editorViewRef.current.dispatch({
				effects: StateEffect.reconfigure.of([
					basicSetup,
					themeMode === 'dark' ? glyphideThemeDark : glyphideTheme,
					EditorView.contentAttributes.of({
						'data-gramm_editor': 'false',
						'aria-label': 'text editor'
					}),
					EditorView.editable.of(!disabled),
					editorUpdateListener,
					...extensions
				])
			})
		}
	}, [extensions, themeMode, editorUpdateListener, disabled])

	useEffect(() => {
		if (editorViewRef.current && editorViewRef.current.state.doc.toString() !== initialDoc) {
			editorViewRef.current.dispatch(
				editorViewRef.current.state.update({
					changes: {
						from: 0,
						to: editorViewRef.current.state.doc.length,
						insert: initialDoc
					},
					selection: editorViewRef.current.state.selection
				})
			)
		}
	}, [initialDoc])

	return (
		<div
			ref={editorRef}
			style={{ height: '100%', overflow: 'auto', fontSize: '.9rem' }}
			spellCheck={false}
			translate="no"
		/>
	)
}

export default CodemirrorEditor
