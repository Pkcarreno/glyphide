import { useAppStore } from '@/stores/app'
import type { LogEntry } from '@/types/log'
import { CircleHelpIcon, CircleXIcon, InfoIcon } from 'lucide-react'
import { StatusElement } from './components'

export const OutputSummary = () => {
	const { logSummary } = useAppStore()

	return (
		<StatusElement>
			<button type="button" className="flex h-full whitespace-pre">
				<SummaryTag type="error" quantity={logSummary.error} />
				<SummaryTag type="warn" quantity={logSummary.warn} />
				<SummaryTag type="info" quantity={logSummary.info} />
				<SummaryTag type="total" quantity={logSummary.total} />
			</button>
		</StatusElement>
	)
}

const SummaryTag: React.FC<{ type: LogEntry['type'] | 'total'; quantity: number }> = ({
	type,
	quantity
}) => {
	if (type === 'info' && quantity > 0) {
		return (
			<>
				<InfoIcon className="mr-0.5 h-full" height="14" width="14" />
				<span>{quantity} </span>
			</>
		)
	}

	if (type === 'warn' && quantity > 0) {
		return (
			<>
				<CircleHelpIcon className="mr-0.5 h-full" height="14" width="14" />
				<span>{quantity} </span>
			</>
		)
	}

	if (type === 'error' && quantity > 0) {
		return (
			<>
				<CircleXIcon className="mr-0.5 h-full" height="14" width="14" />
				<span>{quantity} </span>
			</>
		)
	}

	if (type === 'total') {
		return (
			<>
				<span>Total {quantity}</span>
			</>
		)
	}

	return null
}
