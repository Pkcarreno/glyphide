import { useAppPersistStore, useAppStore } from '@/stores/app'
import { useIsCompactLayout } from './use-is-compact-layout'

export function useMainLayout() {
	const { enviroment, device } = useAppStore()
	const { layout } = useAppPersistStore()
	const shouldForceVerticalLayout = useIsCompactLayout()

	const effectiveLayout = shouldForceVerticalLayout ? 'vertical' : layout
	const effectiveDevice = enviroment === 'iframe' ? 'desktop' : device
	const isResizable = effectiveDevice === 'desktop' && enviroment !== 'iframe'

	return {
		enviroment,
		device: effectiveDevice,
		layout: effectiveLayout,
		isResizable
	}
}
