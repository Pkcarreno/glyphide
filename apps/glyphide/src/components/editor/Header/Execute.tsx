import { PlayIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { triggerExecutionImmediately } from '@/lib/runtime/execution-manager'
import { useAppStore } from '@/stores/app'
import { useCodeStore } from '@/stores/script'

export const ExecuteButton = () => {
	const { status, untrustedStatus } = useAppStore()
	const { code } = useCodeStore()

	const isDisabled = useMemo(() => {
		if (untrustedStatus !== 'trusted') return true

		return status === 'running' || status === 'waiting'
	}, [status, untrustedStatus])

	const handleManualExecution = () => {
		triggerExecutionImmediately(code)
	}

	// const handleManualStop = () => {
	//   terminateCurrentExecution()
	// }

	// if (status === 'running') {
	//   return (
	//     <Button size="icon" title="Terminate execution" variant="destructive" onClick={handleManualStop}>
	//       <span className="sr-only" >Terminate execution</span>
	//       <SquareIcon className="size-4" />
	//     </Button>
	//   )
	// }

	return (
		<Button
			size="icon"
			title="Execute script"
			onClick={handleManualExecution}
			disabled={isDisabled}
		>
			<span className="sr-only">Execute script</span>
			<PlayIcon className="size-4" />
		</Button>
	)
}
