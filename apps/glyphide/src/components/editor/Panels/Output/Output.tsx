import { useId } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { useAppPersistStore, useAppStore } from '@/stores/app'
import { LogListView } from './LogListView'

export const Output = () => {
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center space-x-2 p-2">
				<ActionsBar />
			</div>

			<LogListView />
		</div>
	)
}

export const ActionsBar = () => {
	const { persistLogs, updatePersistLogs } = useAppPersistStore()
	const { clearLogs } = useAppStore()
	const switchId = useId()

	const handlePersistLogsChange = () => {
		updatePersistLogs(!persistLogs)
	}

	return (
		<div className="flex gap-4">
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

			<Button variant="ghost" className="h-fit px-1 py-0.5 text-base" size="sm" onClick={clearLogs}>
				clear
			</Button>
		</div>
	)
}
