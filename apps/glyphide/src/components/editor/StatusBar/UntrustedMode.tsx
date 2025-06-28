import { useAppStore } from '@/stores/app'
import { StatusElement } from './Components'

export const UntrustedMode = () => {
	const { untrustedStatus, setUntrustedStatus } = useAppStore()

	const handleOnClick = () => {
		setUntrustedStatus('uninitialized')
	}

	if (untrustedStatus === 'untrusted') {
		return (
			<StatusElement
				className="!text-white hover:!bg-red-600/70 cursor-pointer bg-red-600 font-bold"
				onClick={handleOnClick}
			>
				<span>Untrusted mode</span>
			</StatusElement>
		)
	}

	return null
}
