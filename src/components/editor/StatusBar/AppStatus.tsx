import { useAppStore } from '@/stores/app'
import { StatusElement } from './components'

export const AppStatus = () => {
	const { status } = useAppStore()

	return (
		<StatusElement popoverTitle="App Status">
			<span>{status}</span>
		</StatusElement>
	)
}
