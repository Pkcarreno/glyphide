import { useRawScriptStore } from '@/stores/script'
import { useEffect } from 'react'

export const HydrateStoresController = () => {
	useEffect(() => {
		useRawScriptStore.persist.rehydrate()
	}, [])

	return null
}
