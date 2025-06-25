import type { SandboxOptions } from '@sebastianwessel/quickjs'
import { z } from 'zod/v4'
import {
	type ConsoleLogType,
	ConsoleLogTypeSchema,
	type SerializableValue,
	SerializableValueSchema
} from './log'

export const MessageTypes = {
	INIT_WORKER: 'INIT_WORKER',
	EXECUTE_CODE: 'EXECUTE_CODE',
	TERMINATE_EXECUTION: 'TERMINATE_EXECUTION',

	WORKER_READY: 'WORKER_READY',
	EXECUTION_RESULT: 'EXECUTION_RESULT',
	EXECUTION_OUTPUT: 'EXECUTION_OUTPUT',
	EXECUTION_ERROR: 'EXECUTION_ERROR'
} as const

export const ExposedQuickJsSettingsSchema = z.object({
	memoryLimit: z.number().int().min(262144).positive(),
	executionTimeout: z.number().int().min(5000).positive(),
	maxStackSize: z.number().int().min(500).positive(),
	maxTimeoutCount: z.number().int().min(20).positive(),
	maxIntervalCount: z.number().int().min(20).positive()
})

export type ExposedQuickJsSettings = Required<
	Pick<
		SandboxOptions,
		'executionTimeout' | 'maxStackSize' | 'memoryLimit' | 'maxTimeoutCount' | 'maxIntervalCount'
	>
>

export const InitWorkerPayloadSchema = z.object({
	port: z.instanceof(MessagePort)
})

export type InitWorkerPayload = z.infer<typeof InitWorkerPayloadSchema>

export const ExecuteCodePayloadSchema = z.object({
	code: z.string().min(1),
	settings: ExposedQuickJsSettingsSchema
})

export type ExecuteCodePayload = z.infer<typeof ExecuteCodePayloadSchema>

export const ExecutionResultPayloadSchema = z
	.object({
		status: z.enum(['success', 'error']),
		result: z.any().optional(),
		error: z
			.object({
				message: z.string(),
				stack: z.string().optional()
			})
			.optional()
	})
	.refine(
		data => {
			// if (data.status === 'success' && data.result === undefined) {
			//   return false
			// }
			if (data.status === 'error' && data.error === undefined) {
				return false
			}

			return true
		},
		{
			message: "Payload must contain 'result' on success and 'error' on failure."
		}
	)

export type ExecutionResultPayload = z.infer<typeof ExecutionResultPayloadSchema>

export const ExecutionOutputPayloadSchema = z.object({
	outputs: z.array(SerializableValueSchema),
	type: ConsoleLogTypeSchema.default('log')
})

export type ExecutionOutputPayload = {
	outputs: SerializableValue[]
	type: ConsoleLogType
}

export const ExecutionErrorPayloadSchema = z.object({
	message: z.string(),
	stack: z.string().optional()
})

export type ExecutionErrorPayload = z.infer<typeof ExecutionErrorPayloadSchema>

export const MainToWorkerMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal(MessageTypes.INIT_WORKER), payload: InitWorkerPayloadSchema }),
	z.object({ type: z.literal(MessageTypes.EXECUTE_CODE), payload: ExecuteCodePayloadSchema }),
	z.object({ type: z.literal(MessageTypes.TERMINATE_EXECUTION), payload: z.undefined().optional() })
])

export type MainToWorkerMessage = z.infer<typeof MainToWorkerMessageSchema>

export const WorkerToMainMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal(MessageTypes.WORKER_READY), payload: z.undefined().optional() }),
	z.object({
		type: z.literal(MessageTypes.EXECUTION_RESULT),
		payload: ExecutionResultPayloadSchema
	}),
	z.object({
		type: z.literal(MessageTypes.EXECUTION_OUTPUT),
		payload: ExecutionOutputPayloadSchema
	}),
	z.object({ type: z.literal(MessageTypes.EXECUTION_ERROR), payload: ExecutionErrorPayloadSchema })
])

export type WorkerToMainMessage = z.infer<typeof WorkerToMainMessageSchema>
