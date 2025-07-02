import type { Property, SerializableValue } from '@/types/log'

export function serializeValueForLog(value: unknown): SerializableValue {
	if (value === null) {
		return null
	}
	if (typeof value === 'undefined') {
		return undefined
	}
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value
	}
	if (typeof value === 'function') {
		return {
			type: 'function',
			name: value.name || '',
			preview: `ƒ ${value.name || ''}()`
		}
	}
	if (Array.isArray(value)) {
		const items = value.slice(0, 10).map(serializeValueForLog)
		return {
			type: 'array',
			length: value.length,
			preview: `Array(${value.length}) [${items.map(v => getShortPreview(v)).join(', ')}]`,
			items: value.map(serializeValueForLog)
		}
	}
	if (value instanceof Error) {
		return {
			type: 'error',
			name: value.name,
			message: value.message,
			stack: value.stack
		}
	}
	if (typeof value === 'object') {
		const className = value.constructor ? value.constructor.name : 'Object'
		const properties: Property[] = []
		const keys = Object.keys(value).slice(0, 5)
		for (const key of keys) {
			try {
				properties.push({
					key,
					value: serializeValueForLog((value as Record<string, unknown>)[key])
				})
			} catch (e) {
				properties.push({ key, value: `[Non-serializable property: ${(e as Error).message}]` })
			}
		}
		return {
			type: 'object',
			className: className,
			preview: `${className} {${keys.map(k => `${k}: ${getShortPreview((value as Record<string, unknown>)[k])}`).join(', ')}}`,
			properties: Object.keys(value).map(key => ({
				key,
				value: serializeValueForLog((value as Record<string, unknown>)[key])
			}))
		}
	}

	return String(value)
}

function getShortPreview(value: unknown): string {
	if (value === null) return 'null'
	if (typeof value === 'undefined') return 'undefined'
	if (typeof value === 'string')
		return `"${value.substring(0, 20)}${value.length > 20 ? '...' : ''}"`
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)
	if (Array.isArray(value)) return `Array(${value.length})`
	if (typeof value === 'object') {
		if (value instanceof Error) return `${value.name}`
		if (value.constructor) return value.constructor.name
		return 'Object'
	}
	if (typeof value === 'function') return `f ${value.name || ''}()`
	return String(value)
}
