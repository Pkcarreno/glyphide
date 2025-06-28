import { useEffect, useState } from 'react'

export function useIsInIframe() {
	const [isInIframe, setIsInIframe] = useState(false)

	useEffect(() => {
		try {
			setIsInIframe(window.self !== window.top)
		} catch {
			setIsInIframe(true)
		}
	}, [])

	return isInIframe
}
