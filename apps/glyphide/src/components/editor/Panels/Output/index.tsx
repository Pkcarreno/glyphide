import { TerminalIcon } from 'lucide-react'
import { type ComponentType, useEffect, useRef, useState } from 'react'
import { type FallbackProps, withErrorBoundary } from 'react-error-boundary'
import { ErrorMenssage } from '@/components/ErrorMessage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger
} from '@/components/ui/Drawer'
import { useAppStore } from '@/stores/app'
import { LogActionsBar, LogActionsBarMobile } from './LogActionsBar'
import { LogListView } from './LogListView'

const OutputContent = () => {
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center space-x-2 p-2">
				<LogActionsBar />
			</div>

			<LogListView />
		</div>
	)
}

export const OutputDrawerContent = () => {
	return (
		<Drawer>
			<DrawerTrigger asChild>
				<OutputDrawerButton />
			</DrawerTrigger>
			<DrawerContent className="h-full">
				<DrawerHeader>
					<DrawerTitle>Output</DrawerTitle>
					<DrawerDescription className="sr-only">
						Panel where the logs are displayed
					</DrawerDescription>
				</DrawerHeader>
				<div className="h-full overflow-hidden px-2">
					<LogListView />
				</div>
				<DrawerFooter className="flex flex-row justify-between">
					<LogActionsBarMobile />
					<DrawerClose className="w-fit">
						<Button variant="outline" size="lg">
							Close
						</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}

const OutputDrawerButton: React.FC<Pick<React.ComponentProps<'button'>, 'onClick'>> = ({
	onClick
}) => {
	const { logs } = useAppStore()
	const [showBadge, setShowBadge] = useState(false)
	const [firstTime, setFirstTime] = useState(true)
	const prevLastLogRef = useRef<string | null>(null)

	useEffect(() => {
		if (!prevLastLogRef.current && logs && logs.length > 0 && !firstTime) {
			prevLastLogRef.current = logs[logs.length - 1]._outputKey
			setShowBadge(true)
		}
		if (
			!firstTime &&
			prevLastLogRef.current &&
			logs &&
			logs.length > 0 &&
			logs[logs.length - 1]._outputKey !== prevLastLogRef.current
		) {
			setShowBadge(true)
			prevLastLogRef.current = logs[logs.length - 1]._outputKey
		}
		if (!prevLastLogRef.current && logs && logs.length > 0 && firstTime) {
			prevLastLogRef.current = logs[logs.length - 1]._outputKey
		}
		if (firstTime) {
			setFirstTime(false)
		}
	}, [logs, firstTime])

	const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		setShowBadge(false)
		if (onClick) {
			onClick(e)
		}
	}

	return (
		<Button
			size="lg"
			onClick={handleClick}
			className="relative flex size-13 items-center justify-center rounded-xl"
		>
			<span className="sr-only">Show output</span>
			<TerminalIcon className="size-6" />

			{showBadge && (
				<Badge className="-top-1 -right-1 absolute min-w-[1rem] rounded-full bg-warning px-1 py-0.5 dark:bg-warning-foreground">
					New
				</Badge>
			)}
		</Button>
	)
}

const OutputErrorFallback: ComponentType<FallbackProps> = ({ error }) => {
	return (
		<ErrorMenssage
			message="Failed to display the output console. Please try reloading the page, or report this issue if the problem persists."
			error={error}
		/>
	)
}

export const Output = withErrorBoundary(OutputContent, {
	FallbackComponent: OutputErrorFallback
})

export const OutputDrawer = withErrorBoundary(OutputDrawerContent, {
	FallbackComponent: OutputErrorFallback
})
