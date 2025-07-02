import { useEffect } from 'react'
import { useTitleStore } from '@/stores/script'

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
