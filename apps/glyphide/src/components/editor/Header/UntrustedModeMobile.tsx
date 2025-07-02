import { ShieldAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useAppStore } from '@/stores/app'

export const UntrustedModeMobile = () => {
	const isMobile = useIsMobile()
	const { untrustedStatus, setUntrustedStatus } = useAppStore()

	const handleOnClick = () => {
		setUntrustedStatus('uninitialized')
	}

	if (!isMobile || untrustedStatus !== 'untrusted') return null

	return (
		<Button variant="destructive" size="icon" onClick={handleOnClick} title="Untrusted mode">
			<span className="sr-only">Untrusted mode</span>
			<ShieldAlertIcon className="size-4" />
		</Button>
	)
}
