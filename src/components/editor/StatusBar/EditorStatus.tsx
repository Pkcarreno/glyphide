import { useAppStore } from '@/stores/app'
import { StatusElement } from './components'

export const EditorStatus = () => {
	const { editorState } = useAppStore()

	return (
		<StatusElement>
			<span>
				Ln {editorState.currentLine}, Col {editorState.cursorPosition}{' '}
				{editorState.selectionLength > 0 ? ` (${editorState.selectionLength} selected)` : ''}
			</span>
		</StatusElement>
	)
}
