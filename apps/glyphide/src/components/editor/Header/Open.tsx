import { Button } from '@/components/ui/Button'
import { useIsInIframe } from '@/hooks/use-is-in-iframe'
import { getCurrentUrl } from '@/utils'

export const OpenInAppButton = () => {
	const isInIframe = useIsInIframe()

	if (!isInIframe) return null

	return (
		<Button
			variant="outline"
			onClick={() => {
				const currentUrl = getCurrentUrl()
				window.open(currentUrl, '_blank', 'noopener,noreferrer')
			}}
		>
			Open in App
		</Button>
	)
}
