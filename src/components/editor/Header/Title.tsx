import { Button } from '@/components/ui/Button'
import { useAppForm } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { Textarea } from '@/components/ui/Textarea'
import { useIsCompactLayout } from '@/hooks/use-is-compact-layout'
import { useAppStore } from '@/stores/app'
import { useTitleStore } from '@/stores/script'
import { useStore } from '@tanstack/react-form'
import { PencilLineIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'

const DEFAULT_TITLE = 'Untitled Script'
const MAX_TITLE_TITLE_LENGTH = 100
const MIN_TITLE_LENGTH = 0

const TitleSchema = z.object({
	title: z
		.string()
		.min(MIN_TITLE_LENGTH)
		.max(MAX_TITLE_TITLE_LENGTH)
		.transform(val => val.trim())
		.refine(val => !/\r|\n/.test(val), {
			message: 'Text cannot contain line breaks.'
		})
})

export const ScriptTitle: React.FC = () => {
	const { title, setTitle } = useTitleStore()
	const { untrustedStatus } = useAppStore()
	const isCompact = useIsCompactLayout()

	const [isEditing, setIsEditing] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const form = useAppForm({
		defaultValues: {
			title: title
		},
		validators: {
			onChange: TitleSchema,
			onBlur: TitleSchema,
			onSubmit: TitleSchema
		},
		listeners: {
			onBlur: ({ formApi }) => {
				if (formApi.state.isValid) {
					formApi.handleSubmit()
				}
			},
			onBlurDebounceMs: 200
		},
		onSubmit: async ({ value, formApi }) => {
			let finalTitle = value.title

			if (finalTitle === '') {
				finalTitle = undefined
			}

			formApi.setFieldValue('title', finalTitle)
			setTitle(finalTitle)
			setIsEditing(false)
		}
	})

	useEffect(() => {
		form.setFieldValue('title', title)
	}, [title, form])

	const handleEditClick = () => {
		if (untrustedStatus === 'trusted') {
			setIsEditing(true)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			form.handleSubmit()
		}
	}

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
		if (isEditing && textareaRef.current) {
			textareaRef.current.focus()
			textareaRef.current.select()
		}
	}, [isEditing])

	const displayStoreTitle = useStore(form.store, state => state.values.title)

	const displayTitle = useMemo(() => {
		return displayStoreTitle && displayStoreTitle.length > 0 ? displayStoreTitle : DEFAULT_TITLE
	}, [displayStoreTitle])

	if (untrustedStatus === 'uninitialized') {
		return (
			<div className="h-9 w-full pr-6">
				<div className="size-full overflow-hidden">
					<div className="flex h-full items-center gap-2 overflow-hidden">
						<span className="block truncate text-ellipsis whitespace-pre text-nowrap font-bold">
							loading...
						</span>
					</div>
				</div>
			</div>
		)
	}

	if (!isEditing) {
		return (
			<div className="h-9 w-full overflow-hidden pr-6">
				<div className="size-full overflow-hidden">
					<div className="flex h-full items-center gap-2 overflow-hidden">
						<span
							data-is-editable={untrustedStatus === 'trusted'}
							className="peer block truncate text-ellipsis whitespace-pre text-nowrap font-bold data-[is-editable=true]:cursor-pointer data-[is-editable=true]:hover:underline"
							onClick={handleEditClick}
							onKeyUp={() => {}}
							title={displayTitle}
						>
							{displayTitle}
						</span>
						<div
							data-visible={isEditing}
							className="hidden cursor-pointer transition-opacity duration-200 peer-data-[is-editable=true]:peer-hover:block"
						>
							<PencilLineIcon className="size-4" />
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (isCompact) {
		return (
			<Popover open={true}>
				<PopoverTrigger className="size-full overflow-hidden">
					<div className="group h-9 w-full overflow-hidden pr-6">
						<div className="size-full overflow-hidden">
							<div className="flex h-full items-center gap-2 overflow-hidden">
								<span
									className="block cursor-pointer truncate text-ellipsis whitespace-pre text-nowrap font-bold group-hover:underline"
									title={displayTitle}
								>
									{displayTitle}
								</span>
								<div className="block cursor-pointer transition-opacity duration-200">
									<PencilLineIcon className="size-4" />
								</div>
							</div>
						</div>
					</div>
				</PopoverTrigger>
				<PopoverContent>
					<form.AppForm>
						<form
							className="w-full space-y-3"
							onSubmit={e => {
								e.preventDefault()
								e.stopPropagation()
								void form.handleSubmit()
							}}
						>
							<form.AppField
								name="title"
								children={field => {
									return (
										<field.FormItem className="flex w-full items-center gap-2 rounded-md transition-colors duration-200">
											<div className="w-full">
												<field.FormControl>
													<Textarea
														ref={textareaRef}
														value={field.state.value}
														onChange={e => field.setValue(e.target.value)}
														onBlur={() => form.handleSubmit()}
														placeholder="Insert script title"
														className="field-sizing-content size-full max-h-[4lh] p-0 px-1"
													/>
												</field.FormControl>
												<field.FormMessage />
											</div>
										</field.FormItem>
									)
								}}
							/>
							<Button type="submit" className="w-full">
								Save!
							</Button>
						</form>
					</form.AppForm>
				</PopoverContent>
			</Popover>
		)
	}

	return (
		<form.AppForm>
			<form
				className="w-full"
				onSubmit={e => {
					e.preventDefault()
					e.stopPropagation()
					void form.handleSubmit()
				}}
			>
				<form.AppField
					name="title"
					children={field => {
						return (
							<field.FormItem className="group relative flex w-full items-center gap-2 rounded-md transition-colors duration-200">
								<div className="w-full">
									<field.FormControl>
										<Input
											ref={inputRef}
											value={field.state.value}
											onChange={e => field.setValue(e.target.value)}
											onBlur={() => form.handleSubmit()}
											onKeyDown={handleKeyDown}
											placeholder="Insert script title"
											className="w-full p-0 px-1"
										/>
									</field.FormControl>
									<field.FormMessage />
								</div>
								<div
									data-visible={isEditing}
									className="hidden cursor-pointer transition-opacity duration-200 group-hover:block data-[visible=true]:block"
								>
									<PencilLineIcon className="size-4" />
								</div>
							</field.FormItem>
						)
					}}
				/>
			</form>
		</form.AppForm>
	)
}
