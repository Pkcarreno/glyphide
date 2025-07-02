import { z } from 'zod/v4'
import type { ExecutionOutputPayload } from './messages'

export const ConsoleLogTypeSchema = z.enum(['log', 'info', 'debug', 'warn', 'error', 'return'])

export type ConsoleLogType = z.infer<typeof ConsoleLogTypeSchema>

// biome-ignore lint/style/useConst: helper pattern to avoid circular issues in zod schema
export let SerializableValueSchema: z.ZodUnion
// biome-ignore lint/style/useConst: helper pattern to avoid circular issues in zod schema
let ObjectLogValueSchema: z.ZodObject
// biome-ignore lint/style/useConst: helper pattern to avoid circular issues in zod schema
let ArrayLogValueSchema: z.ZodObject
// biome-ignore lint/style/useConst: helper pattern to avoid circular issues in zod schema
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

export type Property = {
	key: string
	value: SerializableValue
}

ObjectLogValueSchema = z.object({
	type: z.literal('object'),
	className: z.string().optional(),
	preview: z.string(),
	get properties() {
		return z.array(PropertySchema)
	}
})

export type ObjectLogValue = {
	type: 'object'
	className: string | undefined
	preview: string
	properties: Property[]
}

ArrayLogValueSchema = z.object({
	type: z.literal('array'),
	length: z.number(),
	preview: z.string(),
	get items() {
		return z.array(SerializableValueSchema)
	}
})

export type ArrayLogValue = {
	type: 'array'
	length: number
	preview: string
	items: SerializableValue[]
}

export const ErrorLogValueSchema = z.object({
	type: z.literal('error'),
	name: z.string(),
	message: z.string(),
	stack: z.string().optional()
})

export type ErrorLogValue = {
	type: 'error'
	name: string
	message: string
	stack?: string
}

export const FunctionLogValueSchema = z.object({
	type: z.literal('function'),
	name: z.string().optional(),
	preview: z.string()
})

export type FunctionLogValue = {
	type: 'function'
	name: string | undefined
	preview: string
}

SerializableValueSchema = z.union([
	PrimitiveValueSchema,
	ObjectLogValueSchema,
	ArrayLogValueSchema,
	ErrorLogValueSchema,
	FunctionLogValueSchema
])

export type SerializableValue =
	| PrimitiveValue
	| ObjectLogValue
	| ArrayLogValue
	| ErrorLogValue
	| FunctionLogValue

export type LogEntry = Omit<ExecutionOutputPayload, 'outputs'> & {
	outputs: SerializableValue[]
	timestamp: Date
	repeatCount?: number
	_outputKey: string
}
