import { TerminalIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
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
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { useAppPersistStore, useAppStore } from '@/stores/app'
import { LogListView } from './LogListView'

export const OutputCompact = () => {
	return (
		<Drawer>
			<DrawerTrigger asChild>
				<DrawerToggler />
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
					<ActionsBarCompact />
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

const DrawerToggler: React.FC<Pick<React.ComponentProps<'button'>, 'onClick'>> = ({ onClick }) => {
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

export const ActionsBarCompact = () => {
	const { persistLogs, updatePersistLogs } = useAppPersistStore()
	const { clearLogs } = useAppStore()
	const switchId = useId()

	const handlePersistLogsChange = () => {
		updatePersistLogs(!persistLogs)
	}

	return (
		<div className="flex w-fit gap-4">
			<div className="flex items-center space-x-2">
				<Switch
					className="cursor-pointer"
					id={switchId}
					onCheckedChange={handlePersistLogsChange}
					checked={persistLogs}
				/>
				<Label className="cursor-pointer" htmlFor={switchId}>
					Persist Logs
				</Label>
			</div>

			<Button variant="secondary" size="lg" onClick={clearLogs}>
				Clear
			</Button>
		</div>
	)
}
