import type {
	ArrayLogValue,
	ErrorLogValue,
	FunctionLogValue,
	ObjectLogValue,
	Property,
	SerializableValue
} from '@/types/log'
import { cn } from '@/utils'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'

interface Props {
	value: SerializableValue
	isExpanded?: boolean
	indentationLevel?: number
}

export const LogRenderer: React.FC<Props> = ({ value, isExpanded, indentationLevel = 0 }) => {
	const [expanded, setExpanded] = useState(isExpanded)

	const toggleExpand = () => setExpanded(!expanded)

	const baseClasses = 'font-mono text-sm'

	if (value === null) {
		return <span className={cn('font-mono text-sm text-yell')}>null</span>
	}
	if (typeof value === 'undefined') {
		return <span className={cn('font-mono text-quiet text-sm')}>undefined</span>
	}
	if (typeof value === 'boolean') {
		return <span className={cn('font-mono text-sm text-whisper')}>{String(value)}</span>
	}
	if (typeof value === 'number') {
		if (Number.isNaN(value)) {
			return <span className={cn('font-mono text-sm text-yell')}>NaN</span>
		}
		return <span className={cn('font-mono text-sm text-yell')}>{value}</span>
	}
	if (typeof value === 'string') {
		return <span className={cn('font-mono text-shy text-sm')}>{value}</span>
	}

	// Obj
	if (typeof value === 'object' && 'type' in value && value.type === 'object') {
		const obj = value as ObjectLogValue
		return (
			<span className="font-mono text-sm">
				<span
					className="cursor-pointer text-plain hover:underline"
					onClick={toggleExpand}
					onKeyDown={toggleExpand}
				>
					{expanded ? (
						<ChevronDownIcon className="inline-block size-4" />
					) : (
						<ChevronRightIcon className="inline-block size-4" />
					)}{' '}
					{typeof obj.preview === 'string' ? obj.preview : ''}
				</span>
				{expanded && (
					<div className="pl-4">
						{(obj.properties as Property[]).map(prop => {
							return (
								<div key={obj.key as string} className="flex items-start gap-x-2">
									<span className="text-speak">{prop.key as string}: </span>
									<LogRenderer value={prop.value} indentationLevel={indentationLevel + 1} />
								</div>
							)
						})}
					</div>
				)}
			</span>
		)
	}

	// Array
	if (typeof value === 'object' && 'type' in value && value.type === 'array') {
		const arr = value as ArrayLogValue
		return (
			<span className="font-mono text-sm">
				<span
					className="cursor-pointer text-plain hover:underline"
					onClick={toggleExpand}
					onKeyDown={toggleExpand}
				>
					{expanded ? (
						<ChevronDownIcon className="inline-block size-4" />
					) : (
						<ChevronRightIcon className="inline-block size-4" />
					)}{' '}
					{typeof arr.preview === 'string' ? arr.preview : ''}
				</span>
				{expanded && (
					<div className="pl-4">
						{(arr.items as unknown[]).map((item, index) => {
							const currentItem = String(index)
							return (
								<div
									key={`arr-${indentationLevel}-${currentItem}`}
									className="flex items-start gap-x-2"
								>
									<span className="text-speak">{currentItem}: </span>
									<LogRenderer value={item} indentationLevel={indentationLevel + 1} />
								</div>
							)
						})}
					</div>
				)}
			</span>
		)
	}

	// Error
	if (typeof value === 'object' && 'type' in value && value.type === 'error') {
		const err = value as ErrorLogValue
		return (
			<span className="font-mono text-sm text-whisper">
				<span className="font-bold">
					{err.name}: {err.message}
				</span>
				{err.stack && <div className="whitespace-pre-wrap pl-4 text-xs text-yell">{err.stack}</div>}
			</span>
		)
	}

	// Function
	if (typeof value === 'object' && 'type' in value && value.type === 'function') {
		const fn = value as FunctionLogValue
		return <span className={`${baseClasses} text-plain`}>{fn.preview}</span>
	}

	// Default
	return <span className={`${baseClasses} text-subtle`}>{String(value)}</span>
}
