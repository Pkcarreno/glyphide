import {
	type ErrorResponse,
	loadQuickJs,
	type OkResponse,
	type SandboxFunction,
	type SandboxOptions
} from '@glyphide/quickjs'
import wasmUrl from '@jitl/quickjs-ng-wasmfile-release-sync?url'
import {
	type ExecutionOutputPayload,
	ExecutionOutputPayloadSchema,
	type ExecutionResultPayload,
	ExecutionResultPayloadSchema,
	MainToWorkerMessageSchema,
	MessageTypes,
	type WorkerToMainMessage
} from '../../types/messages'
import { serializeValueForLog } from '../log-serializer'

type SandboxResult = OkResponse | ErrorResponse

let mainThreadPort: MessagePort | null = null
let quickJsSandboxRuntime: {
	runSandboxed: <T extends SandboxResult>(
		sandboxedFunction: SandboxFunction<T>,
		sandboxOptions?: SandboxOptions
	) => Promise<T>
} | null = null
let currentExecutionTimeoutId: ReturnType<typeof setTimeout> | null = null

class CustomResponse extends Response {
	status: number
	ok: boolean
	statusText: string
	headers: Headers
	url: string
	type: ResponseType
	bodyUsed: boolean
	redirected: boolean
	body: ReadableStream | null
	constructor(response: Response) {
		super(response.body, response)
		this.status = response.status
		this.ok = response.ok
		this.statusText = response.statusText
		this.headers = response.headers
		this.blob = async () => await response.blob()
		this.json = async () => await response.json()
		this.formData = async () => await response.formData()
		this.text = async () => await response.text()
		this.arrayBuffer = async () => await response.arrayBuffer()
		this.clone = () => response.clone()
		this.url = response.url
		this.type = response.type
		this.bodyUsed = response.bodyUsed
		this.redirected = response.redirected
		this.body = response.body
	}
}

type FetchAdapterSignature = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<CustomResponse>

const fetchAdapter: FetchAdapterSignature = async (url, param) => {
	const res = await fetch(url, { ...param })
	return new CustomResponse(res)
}

const sendLogToMainThread = (
	level: ExecutionOutputPayload['type'],
	args: unknown[],
	port: MessagePort | null
) => {
	if (!port) {
		console.warn('Worker: Cannot send log output, mainThreadPort is null.')
		return
	}

	const serializedArgs = args.map(serializeValueForLog)

	const outputMessagePayload: ExecutionOutputPayload = {
		outputs: serializedArgs,
		type: level
	}

	const outputValidationResult = ExecutionOutputPayloadSchema.safeParse(outputMessagePayload)
	if (!outputValidationResult.success) {
		console.error(
			'Worker: Failed to create valid EXECUTION_OUTPUT payload:',
			outputValidationResult.error.issues,
			outputMessagePayload
		)
		port.postMessage({
			type: MessageTypes.EXECUTION_ERROR,
			payload: { message: 'Failed to serialize console output for reporting.' }
		} as WorkerToMainMessage)
		return
	}

	port.postMessage({
		type: MessageTypes.EXECUTION_OUTPUT,
		payload: outputValidationResult.data
	} as WorkerToMainMessage)
}

const initializeQuickJS = async (): Promise<void> => {
	if (quickJsSandboxRuntime) {
		console.warn('Worker: QuickJS sandbox runtime already loaded.')
		return
	}

	console.log('Worker: Loading QuickJS sandbox runtime...')
	try {
		quickJsSandboxRuntime = await loadQuickJs(wasmUrl)
		console.log('Worker: QuickJS sandbox runtime loaded successfully.')
	} catch (error: unknown) {
		console.error('Worker: Failed to load QuickJS sandbox runtime:', error)
		throw new Error(
			`Failed to load QuickJS sandbox runtime: ${error instanceof Error ? error.message : String(error)}`
		)
	}
}

const setupExecutionTimeout = (timeout: number, port: MessagePort) => {
	if (currentExecutionTimeoutId) {
		clearExecutionTimeout()
	}

	if (timeout > 0 && Number.isFinite(timeout)) {
		currentExecutionTimeoutId = setTimeout(async () => {
			console.error('Worker: Execution timed out.')

			port.postMessage({
				type: MessageTypes.EXECUTION_RESULT,
				payload: {
					status: 'error',
					error: {
						message: `Execution timed out after ${timeout}ms.`
					}
				}
			} as WorkerToMainMessage)
		}, timeout + 1)
	}
}

const clearExecutionTimeout = () => {
	if (currentExecutionTimeoutId) {
		clearTimeout(currentExecutionTimeoutId)
		currentExecutionTimeoutId = null
	}
}

const handleMessageFromMainThread = async (event: MessageEvent<unknown>) => {
	const validationResult = MainToWorkerMessageSchema.safeParse(event.data)

	if (!validationResult.success) {
		console.error(
			'Worker: Received invalid message from main thread:',
			validationResult.error.issues,
			event.data
		)
		if (mainThreadPort) {
			mainThreadPort.postMessage({
				type: MessageTypes.EXECUTION_ERROR,
				payload: {
					message: `Invalid message received: ${JSON.stringify(validationResult.error.issues)}`
				}
			} as WorkerToMainMessage)
		}
		return
	}

	const message = validationResult.data

	if (!quickJsSandboxRuntime || !mainThreadPort) {
		console.error(
			`Worker: Received message type ${message.type} before QuickJS sandbox runtime is loaded or main thread port is ready.`
		)
		if (mainThreadPort) {
			mainThreadPort.postMessage({
				type: MessageTypes.EXECUTION_ERROR,
				payload: {
					message: `Worker not ready, ignoring message type ${message.type}.`
				}
			} as WorkerToMainMessage)
		}
		return
	}

	switch (message.type) {
		case MessageTypes.EXECUTE_CODE: {
			const executePayload = message.payload

			const sandboxOptions: SandboxOptions = {
				allowFetch: true,
				fetchAdapter,
				allowFs: false,
				env: {},
				console: {
					log: (...args: unknown[]) => sendLogToMainThread('log', args, mainThreadPort),
					info: (...args: unknown[]) => sendLogToMainThread('info', args, mainThreadPort),
					debug: (...args: unknown[]) => sendLogToMainThread('debug', args, mainThreadPort),
					warn: (...args: unknown[]) => sendLogToMainThread('warn', args, mainThreadPort),
					error: (...args: unknown[]) => sendLogToMainThread('error', args, mainThreadPort)
				},
				executionTimeout: executePayload.settings.executionTimeout,
				maxStackSize: executePayload.settings.maxStackSize,
				memoryLimit: executePayload.settings.memoryLimit,
				maxTimeoutCount: executePayload.settings.maxTimeoutCount,
				maxIntervalCount: executePayload.settings.maxIntervalCount
			}

			try {
				clearExecutionTimeout()
				setupExecutionTimeout(executePayload.settings.executionTimeout, mainThreadPort)

				const sandboxResult = await quickJsSandboxRuntime.runSandboxed(
					async ({ evalCode, validateCode }) => {
						try {
							const validateRes = await validateCode(executePayload.code, 'script.js')

							if (!validateRes.ok) {
								return validateRes
							}

							return await evalCode(executePayload.code, 'script.js')
						} catch (error: unknown) {
							console.error('Worker: Error during sandboxed evalCode:', error)
							throw new Error(
								`Execution failed: ${error instanceof Error ? error.message : String(error)}`
							)
						}
					},
					sandboxOptions
				)

				clearExecutionTimeout()

				if (sandboxResult.ok) {
					const executionResultPayload: ExecutionResultPayload = {
						status: 'success',
						result: sandboxResult.data
					}

					const resultValidationResult =
						ExecutionResultPayloadSchema.safeParse(executionResultPayload)
					if (!resultValidationResult.success) {
						console.error(
							'Worker: Failed to create valid EXECUTION_RESULT payload (success):',
							resultValidationResult.error.issues,
							executionResultPayload
						)
						mainThreadPort.postMessage({
							type: MessageTypes.EXECUTION_ERROR,
							payload: {
								message: 'Failed to serialize execution result.'
							}
						} as WorkerToMainMessage)
						return
					}

					mainThreadPort.postMessage({
						type: MessageTypes.EXECUTION_RESULT,
						payload: resultValidationResult.data
					} as WorkerToMainMessage)
				} else {
					const executionErrorPayload: ExecutionResultPayload = {
						status: 'error',
						error: {
							message: sandboxResult.error?.message || 'Unknown execution error',
							stack: sandboxResult.error?.stack
						}
					}

					const errorValidationResult =
						ExecutionResultPayloadSchema.safeParse(executionErrorPayload)
					if (!errorValidationResult.success) {
						console.error(
							'Worker: Failed to create valid EXECUTION_RESULT payload (error):',
							errorValidationResult.error.issues,
							executionErrorPayload
						)
						if (mainThreadPort) {
							mainThreadPort.postMessage({
								type: MessageTypes.EXECUTION_ERROR,
								payload: { message: 'Failed to serialize execution error details.' }
							} as WorkerToMainMessage)
						}
						return
					}

					mainThreadPort.postMessage({
						type: MessageTypes.EXECUTION_RESULT,
						payload: errorValidationResult.data
					} as WorkerToMainMessage)
				}
			} catch (error: unknown) {
				clearExecutionTimeout()

				const executionResultPayload: ExecutionResultPayload = {
					status: 'error',
					error: {
						message: `Sandbox setup failed: ${error instanceof Error ? error.message : String(error)}`,
						stack: error instanceof Error ? error.stack : undefined
					}
				}

				const errorValidationResult = ExecutionResultPayloadSchema.safeParse(executionResultPayload)
				if (!errorValidationResult.success) {
					console.error(
						'Worker: Failed to create valid EXECUTION_RESULT payload (error):',
						errorValidationResult.error.issues,
						executionResultPayload
					)
					mainThreadPort.postMessage({
						type: MessageTypes.EXECUTION_ERROR,
						payload: {
							message: 'Failed to serialize execution error details.'
						}
					} as WorkerToMainMessage)
					return
				}

				mainThreadPort.postMessage({
					type: MessageTypes.EXECUTION_RESULT,
					payload: errorValidationResult.data
				} as WorkerToMainMessage)

				console.error('Worker: Error during execution, considering resetting QuickJS...')
			}

			break
		}

		case MessageTypes.TERMINATE_EXECUTION: {
			clearExecutionTimeout()
			console.warn('Worker: Termination requested.')

			// TODO: implement abort execution logic

			if (mainThreadPort) {
				mainThreadPort.postMessage({
					type: MessageTypes.EXECUTION_RESULT,
					payload: {
						status: 'error',
						error: {
							message: 'Execution terminated by user.'
						}
					}
				} as WorkerToMainMessage)
			}

			break
		}

		default: {
			console.warn(`Worker: Received unhandled valid message type: ${message.type}`, message)

			break
		}
	}
}

self.onmessage = async (event: MessageEvent<unknown>) => {
	const validationResult = MainToWorkerMessageSchema.safeParse(event.data)

	if (!validationResult.success) {
		console.error(
			'Worker: Received invalid initial message:',
			validationResult.error.issues,
			event.data
		)
		return
	}

	const message = validationResult.data

	switch (message.type) {
		case MessageTypes.INIT_WORKER: {
			const initPayload = message.payload
			if (initPayload && initPayload.port instanceof MessagePort) {
				mainThreadPort = initPayload.port
				mainThreadPort.onmessage = handleMessageFromMainThread

				try {
					await initializeQuickJS()

					mainThreadPort.postMessage({ type: MessageTypes.WORKER_READY })
					console.log('Worker: Initialized successfully.')
				} catch (error: unknown) {
					console.error('Worker: Failed to initialize QuickJS:', error)

					if (mainThreadPort) {
						mainThreadPort.postMessage({
							type: MessageTypes.EXECUTION_ERROR,
							payload: {
								message: 'Failed to initialize QuickJS',
								stack: error instanceof Error ? error.stack : undefined
							}
						} as WorkerToMainMessage)
					}
				}
			} else {
				console.error('Worker: Received INIT_WORKER without a valid port.')
			}

			break
		}

		default: {
			console.warn(
				`Worker: Received unhandled valid initial message type: ${message.type}`,
				message
			)
			break
		}
	}
}

console.log('Worker: Web Worker script loaded')
