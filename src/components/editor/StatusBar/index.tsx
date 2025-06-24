import { useIsMobile } from '@/hooks/use-is-mobile'
import { AppStatus } from './AppStatus'
import { EditorStatus } from './EditorStatus'
import { OutputSummary } from './OutputSummary'
import { UntrustedMode } from './UntrustedMode'

export const StatusBar = () => {
	const isMobile = useIsMobile()

	if (isMobile) return null

	return (
		<footer className="flex h-5">
			<div className="flex w-full">
				<UntrustedMode />
				<AppStatus />
				<EditorStatus />
			</div>

			<div className="">
				<OutputSummary />
			</div>
		</footer>
	)
}
