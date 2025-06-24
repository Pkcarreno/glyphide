import {
	type ExecutionOutputPayload,
	type MainToWorkerMessage,
	MainToWorkerMessageSchema,
	MessageTypes,
	WorkerToMainMessageSchema
} from '@/types/messages'

import {
	addLog,
	clearLogs,
	getAppStatus,
	getPersistLogsStatus,
	getUntrustedStatus,
	setAppStatus
} from '@/stores/app'
import { getQuickjsSettings } from '@/stores/settings'
import Worker from './worker.ts?worker'

class ExecutionController {
	private worker: Worker | null = null
	private messageChannel: MessageChannel | null = null
	private workerPort: MessagePort | null = null
	private isWorkerReady = false
	private pendingExecutions: MainToWorkerMessage[] = []
	private resolvePendingInit: (() => void) | null = null
	private rejectPendingInit: ((error: Error) => void) | null = null

	initialize(): Promise<void> {
		return new Promise((resolve, reject) => {
			const currentState = getAppStatus()
			if (currentState !== 'uninitialized' && currentState !== 'error' && this.worker) {
				console.warn(
					`ExecutionController: Initialization called when state is ${currentState}. Ignoring.`
				)
				resolve()
				return
			}

			setAppStatus('loading')

			this.worker = new Worker()
			this.messageChannel = new MessageChannel()
			const mainThreadPort = this.messageChannel.port1
			const workerPort = this.messageChannel.port2

			this.workerPort = workerPort

			mainThreadPort.onmessage = this.handleMessageFromWorker

			this.worker.onerror = (event: ErrorEvent) => {
				console.error('ExecutionController: Worker error:', event)
				setAppStatus('error')
				addLog({
					type: 'error',
					outputs: [`Worker error: ${event.message}`]
				})

				if (this.rejectPendingInit) {
					this.rejectPendingInit(new Error(`Worker error: ${event.message}`))
					this.rejectPendingInit = null
					this.resolvePendingInit = null
				}
			}

			const initMessage: MainToWorkerMessage = {
				type: MessageTypes.INIT_WORKER,
				payload: { port: workerPort }
			}

			const initValidationResult = MainToWorkerMessageSchema.safeParse(initMessage)
			if (!initValidationResult.success) {
				console.error(
					'ExecutionController: Failed to create valid INIT_WORKER message:',
					initValidationResult.error.issues
				)
				reject(new Error('Failed to create valid INIT_WORKER message.'))
				return
			}
			const validatedInitMessage = initValidationResult.data

			this.worker.postMessage(validatedInitMessage, [workerPort])

			console.log('ExecutionController: Worker initialization message sent.')
			setAppStatus('loading')

			this.resolvePendingInit = resolve
			this.rejectPendingInit = reject
		})
	}

	private handleMessageFromWorker = (event: MessageEvent<unknown>) => {
		const validationResult = WorkerToMainMessageSchema.safeParse(event.data)

		if (!validationResult.success) {
			console.error(
				'ExecutionController: received invalid message from worker:',
				validationResult.error.issues,
				event.data
			)
			addLog({
				type: 'error',
				outputs: [`Invalid message from worker: ${JSON.stringify(validationResult.error.issues)}`]
			})
			return
		}

		const message = validationResult.data

		switch (message.type) {
			case MessageTypes.WORKER_READY: {
				console.log('ExecutionController: Worker is ready.')
				this.isWorkerReady = true
				setAppStatus('idle')
				this.processPendingExecutions()
				if (this.resolvePendingInit) {
					this.resolvePendingInit()
					this.resolvePendingInit = null
					this.rejectPendingInit = null
				}
				break
			}

			case MessageTypes.EXECUTION_RESULT: {
				console.log('ExecutionController: Received execution result.', message.payload)
				setAppStatus('idle')

				const resultPayload = message.payload

				if (resultPayload.status === 'success') {
					if (resultPayload.result) {
						addLog({
							type: 'return',
							outputs: [resultPayload.result]
						})
					}
				} else {
					const outputToSend = [
						`Execution Error: ${resultPayload.error?.message ?? 'Unknown error'}`
					]

					if (resultPayload.error?.stack) {
						outputToSend.push(`Stack: ${resultPayload.error.stack}`)
					}

					addLog({
						type: 'return',
						outputs: outputToSend
					})
				}
				break
			}

			case MessageTypes.EXECUTION_OUTPUT: {
				const outputPayload = message.payload
				console.log('ExecutionController: Received execution output.', outputPayload)
				addLog(outputPayload as ExecutionOutputPayload)
				break
			}

			case MessageTypes.EXECUTION_ERROR: {
				const errorPayload = message.payload
				console.error('ExecutionController: Received worker process error.', errorPayload)
				addLog({
					type: 'error',
					outputs: [`Worker Process Error: ${errorPayload.message}`]
				})
				if (errorPayload.stack) {
					addLog({
						type: 'error',
						outputs: [`Stack: ${errorPayload.stack}`]
					})
				}
				break
			}

			default: {
				console.warn('ExecutionController: Received unhandled valid message: ', message)
				break
			}
		}
	}

	executeCode(code: string) {
		const currentUntrustedStatus = getUntrustedStatus()
		if (currentUntrustedStatus !== 'trusted') {
			console.log(
				'ExecutionController: App is currently in untrusted state, Ignoring execution request.'
			)
			return
		}

		if (!this.worker) {
			console.error('ExecutionController: Worker not initialized.')
			setAppStatus('error')
			addLog({
				type: 'error',
				outputs: ['Execution controller not initialized.']
			})
			return
		}

		const currentStatus = getAppStatus()
		if (currentStatus === 'running') {
			console.log(
				`ExecutionController: Already in status ${currentStatus}, Ignoring new execution request.`
			)
			return
		}

		const quickjsSettings = getQuickjsSettings()

		const executionMessage: MainToWorkerMessage = {
			type: MessageTypes.EXECUTE_CODE,
			payload: {
				code: code,
				settings: quickjsSettings
			}
		}

		const sendValidationResult = MainToWorkerMessageSchema.safeParse(executionMessage)
		if (!sendValidationResult.success) {
			console.error(
				'ExecutionController: Attempted to send invalid message to worker:',
				sendValidationResult.error.issues,
				executionMessage
			)
			setAppStatus('error')
			addLog({
				type: 'error',
				outputs: ['Internal error: Invalid execution message.']
			})
			return
		}

		const messageToSend = sendValidationResult.data

		if (this.isWorkerReady && this.messageChannel) {
			setAppStatus('running')
			const shouldPersistLogs = getPersistLogsStatus()
			if (!shouldPersistLogs) {
				clearLogs()
			}
			this.messageChannel.port1.postMessage(messageToSend)
			return
		}
		console.log('ExecutionConotroller: Worker not ready, enqueuing execution.')
		setAppStatus('waiting')
		this.pendingExecutions.push(messageToSend)
	}

	private processPendingExecutions() {
		while (this.pendingExecutions.length > 0 && this.isWorkerReady && this.messageChannel) {
			const message = this.pendingExecutions.shift()
			if (message && message.type === MessageTypes.EXECUTE_CODE) {
				setAppStatus('running')
				const shouldPersistLogs = getPersistLogsStatus()
				if (!shouldPersistLogs) {
					clearLogs()
				}
				this.messageChannel.port1.postMessage(message)
			}
		}
	}

	terminateExecution() {
		if (this.messageChannel) {
			const terminateMessage: MainToWorkerMessage = { type: MessageTypes.TERMINATE_EXECUTION }
			this.messageChannel.port1.postMessage(terminateMessage)
			setAppStatus('idle')
		}
	}

	destroy() {
		if (this.worker) {
			this.worker.terminate()
			this.worker = null
			this.isWorkerReady = false
		}
		if (this.messageChannel) {
			this.messageChannel.port1.close()
			if (this.workerPort) {
				this.workerPort.close()
			}
			this.messageChannel = null
			this.workerPort = null
		}
		this.pendingExecutions = []
		this.resolvePendingInit = null
		this.rejectPendingInit = null
		setAppStatus('idle')
		console.log('ExecutionController: Destroyed.')
	}
}

const executionControllerInstance = new ExecutionController()
export default executionControllerInstance

export const executeCode = (code: string) => executionControllerInstance.executeCode(code)
export const terminateExecution = () => executionControllerInstance.terminateExecution()
