import { useTitleStore } from '@/stores/script'
import { useEffect } from 'react'

export const AppController = () => {
	const { title } = useTitleStore()

	useEffect(() => {
		if (typeof document !== 'undefined') {
			if (typeof title === 'string' && title.length > 0) {
				document.title = `${title} - Glyphide`
			} else {
				document.title = 'Script - Glyphide'
			}
		}
	}, [title])

	return null
}
