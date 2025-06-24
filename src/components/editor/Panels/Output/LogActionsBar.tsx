import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { useAppPersistStore, useAppStore } from '@/stores/app'

export const LogActionsBar = () => {
	const { persistLogs, updatePersistLogs } = useAppPersistStore()
	const { clearLogs } = useAppStore()

	const handlePersistLogsChange = () => {
		updatePersistLogs(!persistLogs)
	}

	return (
		<div className="flex gap-4">
			<div className="flex items-center space-x-2">
				<Switch id="persist-logs" onCheckedChange={handlePersistLogsChange} checked={persistLogs} />
				<Label htmlFor="persist-logs">Persist Logs</Label>
			</div>

			<Button variant="ghost" className="h-fit px-1 py-0.5 text-base" size="sm" onClick={clearLogs}>
				clear
			</Button>
		</div>
	)
}

export const LogActionsBarMobile = () => {
	const { persistLogs, updatePersistLogs } = useAppPersistStore()
	const { clearLogs } = useAppStore()

	const handlePersistLogsChange = () => {
		updatePersistLogs(!persistLogs)
	}

	return (
		<div className="flex w-fit gap-4">
			<div className="flex items-center space-x-2">
				<Switch id="persist-logs" onCheckedChange={handlePersistLogsChange} checked={persistLogs} />
				<Label htmlFor="persist-logs">Persist Logs</Label>
			</div>

			<Button variant="secondary" size="lg" onClick={clearLogs}>
				Clear
			</Button>
		</div>
	)
}
