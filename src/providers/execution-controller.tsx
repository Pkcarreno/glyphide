import executionControllerInstance from '@/lib/runtime/controller'
import { setInitialCode, triggerExecutionDebounced } from '@/lib/runtime/execution-manager'
import { useAppStore } from '@/stores/app'
import { useCodeStore } from '@/stores/script'
import { useSettingsStore } from '@/stores/settings'
import { useEffect } from 'react'

export function ExecutionController() {
	const { code } = useCodeStore()
	const { status, untrustedStatus } = useAppStore()
	const {
		config: { autoRun }
	} = useSettingsStore()

	useEffect(() => {
		console.log('App: Initializing ExecutionController...')
		executionControllerInstance
			.initialize()
			.then(() => {
				console.log('App: ExecutionController initialized successfully.')
			})
			.catch(err => {
				console.error('App: Failed to initialize ExecutionController:', err)
			})

		return () => {
			executionControllerInstance.destroy()
		}
	}, [])

	useEffect(() => {
		if (untrustedStatus !== 'trusted') {
			setInitialCode(code)
			return
		}

		if (autoRun && code && code.length > 0 && (status === 'idle' || status === 'waiting')) {
			triggerExecutionDebounced(code)
		}
	}, [untrustedStatus, code, status, autoRun])

	return null
}
