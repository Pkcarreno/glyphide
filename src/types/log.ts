import { z } from 'zod/v4'
import type { ExecutionOutputPayload } from './messages'

export const ConsoleLogTypeSchema = z.enum(['log', 'info', 'debug', 'warn', 'error', 'return'])

export type ConsoleLogType = z.infer<typeof ConsoleLogTypeSchema>

export let SerializableValueSchema: z.ZodUnion
let ObjectLogValueSchema: z.ZodObject
let ArrayLogValueSchema: z.ZodObject
let PropertySchema: z.ZodObject

export const PrimitiveValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
	z.undefined()
])

export type PrimitiveValue = z.infer<typeof PrimitiveValueSchema>

PropertySchema = z.object({
	key: z.string(),
	get value() {
		return SerializableValueSchema
	}
})

export type Property = z.infer<typeof PropertySchema>

ObjectLogValueSchema = z.object({
	type: z.literal('object'),
	className: z.string().optional(),
	preview: z.string(),
	get properties() {
		return z.array(PropertySchema)
	}
})

export type ObjectLogValue = z.infer<typeof ObjectLogValueSchema>

ArrayLogValueSchema = z.object({
	type: z.literal('array'),
	length: z.number(),
	preview: z.string(),
	get items() {
		return z.array(SerializableValueSchema)
	}
})

export type ArrayLogValue = z.infer<typeof ArrayLogValueSchema>

export const ErrorLogValueSchema = z.object({
	type: z.literal('error'),
	name: z.string(),
	message: z.string(),
	stack: z.string().optional()
})

export type ErrorLogValue = z.infer<typeof ErrorLogValueSchema>

export const FunctionLogValueSchema = z.object({
	type: z.literal('function'),
	name: z.string().optional(),
	preview: z.string()
})

export type FunctionLogValue = z.infer<typeof FunctionLogValueSchema>

SerializableValueSchema = z.union([
	PrimitiveValueSchema,
	ObjectLogValueSchema,
	ArrayLogValueSchema,
	ErrorLogValueSchema,
	FunctionLogValueSchema
])

export type SerializableValue = z.infer<typeof SerializableValueSchema>

export type LogEntry = Omit<ExecutionOutputPayload, 'outputs'> & {
	outputs: SerializableValue[]
	timestamp: Date
	repeatCount?: number
	_outputKey: string
}
