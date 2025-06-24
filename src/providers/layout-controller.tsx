import { useIsInIframe } from '@/hooks/use-is-in-iframe'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useAppStore } from '@/stores/app'
import { useEffect, useState } from 'react'

export function LayoutController() {
	const { toggleIsLayoutReady } = useAppStore()
	const IsInIframe = useIsInIframe()
	const IsMobile = useIsMobile()
	const { setDevice, setEnviroment } = useAppStore()
	const [isMobileCheckReady, setIsMobileCheckReady] = useState(false)
	const [isEnviromentCheckReady, setIsEnviromentCheckReady] = useState(false)

	useEffect(() => {
		setEnviroment(IsInIframe ? 'iframe' : 'standalone')
		setIsEnviromentCheckReady(true)
	}, [IsInIframe, setEnviroment])

	useEffect(() => {
		setDevice(IsMobile ? 'mobile' : 'desktop')
		setIsMobileCheckReady(true)
	}, [IsMobile, setDevice])

	useEffect(() => {
		if (isMobileCheckReady && isEnviromentCheckReady) {
			toggleIsLayoutReady()
		}
	}, [isMobileCheckReady, isEnviromentCheckReady, toggleIsLayoutReady])

	return null
}
