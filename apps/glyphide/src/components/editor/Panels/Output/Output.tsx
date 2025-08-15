import { LogActionsBar } from './LogActionsBar'
import { LogListView } from './LogListView'

export const Output = () => {
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center space-x-2 p-2">
				<LogActionsBar />
			</div>

			<LogListView />
		</div>
	)
}
