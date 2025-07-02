import debounce from 'lodash.debounce'
import { getAppStatus, getUntrustedStatus, setAppStatus } from '@/stores/app'
import { getAutorunTimeout } from '@/stores/settings'
import { executeCode, terminateExecution } from './controller'

let lastCodeToExecute: string | null = null
let lastExecutedCode: string | null = null

export const setInitialCode = (code?: string) => {
	if (code) {
		lastCodeToExecute = code
	}
}

const canStartExecution = (): boolean => {
	const currentStatus = getAppStatus()
	const currentUntrustedStatus = getUntrustedStatus()

	const moduleReadyToStart = currentStatus === 'idle' || currentStatus === 'waiting'
	const appPermits = currentUntrustedStatus === 'trusted'

	return moduleReadyToStart && appPermits
}

const debouncedExecute = debounce(() => {
	if (
		lastCodeToExecute &&
		lastCodeToExecute.trim().length > 0 &&
		lastCodeToExecute !== lastExecutedCode
	) {
		if (canStartExecution()) {
			console.log('ExecutionManager: Debounced execution triggered for code change.')
			lastExecutedCode = lastCodeToExecute
			executeCode(lastCodeToExecute)
		} else {
			console.log('ExecutionManager: Debounced execution ignored, state not allowed to start.')
			const currentStatus = getAppStatus()
			if (currentStatus === 'waiting') {
				setAppStatus('idle')
			}
		}
	} else {
		console.log('ExecutionManager: Debounced execution skipped, no code or no changes.')
		const currentStatus = getAppStatus()
		if (currentStatus === 'waiting') {
			setAppStatus('idle')
		}
	}
}, getAutorunTimeout())

export const triggerExecutionDebounced = (code: string) => {
	if (lastCodeToExecute && code === lastCodeToExecute) {
		return
	}

	const currentUntrustedStatus = getUntrustedStatus()

	const isTrusted = currentUntrustedStatus === 'trusted'

	if (!isTrusted) {
		return
	}

	const currentStatus = getAppStatus()

	if (currentStatus === 'idle' || currentStatus === 'waiting') {
		if (code && code.trim().length > 0 && code !== lastCodeToExecute) {
			lastCodeToExecute = code
			if (currentStatus === 'idle') {
				setAppStatus('waiting')
			}
			debouncedExecute()
		} else if (code === lastExecutedCode) {
			debouncedExecute.cancel()
		}
	} else {
		debouncedExecute.cancel()
	}
}

export const triggerExecutionImmediately = (code: string) => {
	debouncedExecute.cancel()

	if (canStartExecution() && code && code.trim().length > 0) {
		console.log('ExecutionManager: Immediate execution triggered.')
		executeCode(code)
		lastExecutedCode = code
	} else {
		console.log('ExecutionManager: Immediate execution ignored, state not allowed or no code.')
	}
}

export const terminateCurrentExecution = () => {
	debouncedExecute.cancel()
	terminateExecution()
}
