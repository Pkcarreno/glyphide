import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { CircleHelpIcon, CircleXIcon, CornerDownRightIcon, InfoIcon } from 'lucide-react'
import type React from 'react'
import { type ComponentType, useEffect, useRef } from 'react'
import { type FallbackProps, withErrorBoundary } from 'react-error-boundary'
import { ErrorMenssage } from '@/components/ErrorMessage'
import { useAppStore } from '@/stores/app'
import type { LogEntry } from '@/types/log'
import { cn } from '@/utils'
import { LogRenderer } from './LogRenderer'

interface Props {
	className?: React.ComponentProps<'div'>['className']
}

const LogListViewBase: React.FC<Props> = ({ className }) => {
	const { logs } = useAppStore()
	const scrollableRef = useRef<HTMLDivElement>(null)

	const virtualizer = useVirtualizer({
		count: logs.length,
		getScrollElement: () => scrollableRef.current,
		estimateSize: () => 36,
		overscan: 5
	})

	const virtualItems = virtualizer.getVirtualItems()

	useEffect(() => {
		virtualizer.scrollToIndex(logs.length - 1)
	}, [logs, virtualizer])

	return (
		<div className={cn('flex h-full overflow-y-auto', className)}>
			<div ref={scrollableRef} className="relative flex-grow overflow-auto">
				<div
					className="relative w-full"
					style={{
						height: `${virtualizer.getTotalSize()}px`
					}}
				>
					<div
						className="absolute top-0 left-0 w-full px-2"
						style={{
							transform: `translateY(${virtualItems[0]?.start ?? 0}px)`
						}}
					>
						{virtualItems.map(virtualItem => {
							const log = logs[virtualItem.index]
							return (
								<div
									key={virtualItem.key}
									ref={virtualizer.measureElement}
									data-index={virtualItem.index}
								>
									<LogEntryRow log={log} virtualItem={virtualItem} />
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
}

const LogEntryIcon: React.FC<{ type: LogEntry['type'] }> = ({ type }) => {
	if (type === 'info') {
		return <InfoIcon className="size-full text-quiet" />
	}

	if (type === 'warn') {
		return <CircleHelpIcon className="size-full text-speak" />
	}

	if (type === 'error') {
		return <CircleXIcon className="size-full text-yell" />
	}

	if (type === 'return') {
		return <CornerDownRightIcon className="size-full text-primary" />
	}

	return null
}

const LogEntryRow: React.FC<{ log: LogEntry; virtualItem: VirtualItem }> = ({
	log,
	virtualItem
}) => {
	return (
		<div
			data-type={log.type}
			className={cn(
				'flex items-center space-x-2 rounded-md p-2 transition-colors hover:bg-secondary/40 data-[type=error]:hover:bg-yell/10'
			)}
		>
			<div className="!size-4">
				<LogEntryIcon type={log.type} />
			</div>
			<div className="flex flex-grow flex-wrap gap-x-2">
				{log.outputs.map((outputValue, index) => (
					<LogRenderer key={`output-${virtualItem.key}-render-${index}`} value={outputValue} />
				))}
			</div>

			{log.repeatCount && log.repeatCount > 1 && <span>x{log.repeatCount}</span>}
		</div>
	)
}

const LogListViewErrorFallback: ComponentType<FallbackProps> = ({ error }) => {
	return (
		<ErrorMenssage
			message="Failed to display the log list. Please try reloading the page, or report this issue if the problem persists."
			error={error}
		/>
	)
}

export const LogListView = withErrorBoundary(LogListViewBase, {
	FallbackComponent: LogListViewErrorFallback
})
