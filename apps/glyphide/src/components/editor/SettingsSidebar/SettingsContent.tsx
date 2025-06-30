import { Slot } from '@radix-ui/react-slot'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/Button'
import { useAppForm } from '@/components/ui/Form'
import { Input, InputWrapper } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import {
	DEFAULT_AUTO_RUN_TIMEOUT,
	DEFAULT_EXECUTION_TIMEOUT,
	DEFAULT_MAX_INTERVAL_COUNT,
	DEFAULT_MAX_LOGS,
	DEFAULT_MAX_STACK_SIZE,
	DEFAULT_MAX_TIMEOUT_COUNT,
	DEFAULT_MEMORY_LIMIT,
	useSettingsStore
} from '@/stores/settings'
import { cn } from '@/utils'

export const SettingsContent = () => {
	const { config, updateConfig } = useSettingsStore()

	const form = useAppForm({
		defaultValues: config,
		listeners: {
			onChange: ({ formApi }) => {
				if (formApi.state.isValid) {
					formApi.handleSubmit()
				}
			},
			onChangeDebounceMs: 500
		},
		onSubmit: ({ value }) => {
			updateConfig(value)
		}
	})

	return (
		<div className="h-full overflow-auto">
			<form.AppForm>
				<form>
					<Group>
						<GroupLabel>General</GroupLabel>
						<GroupContent>
							<form.AppField
								name="autoRun"
								children={field => (
									<field.FormItem className="flex gap-2">
										<field.FormLabel>Auto execution</field.FormLabel>
										<field.FormControl>
											<Switch
												checked={field.state.value}
												onCheckedChange={e => field.handleChange(e)}
											/>
										</field.FormControl>
									</field.FormItem>
								)}
							/>
							<form.AppField
								name="autoRunTimeout"
								children={field => (
									<field.FormItem>
										<field.FormLabel>Auto execution delay</field.FormLabel>
										<div>
											<div className="flex w-full items-center gap-1">
												<field.FormControl>
													<InputWrapper>
														<span className="text-muted-foreground text-sm" title="milliseconds">
															ms
														</span>
														<Input
															type="number"
															min="600"
															step="100"
															value={field.state.value}
															onChange={e => field.handleChange(Number(e.target.value))}
															onBlur={field.handleBlur}
														/>
													</InputWrapper>
												</field.FormControl>
											</div>
											<field.FormControl>
												<ResetButton
													onClick={() => field.handleChange(DEFAULT_AUTO_RUN_TIMEOUT)}
													isResetAble={field.state.value !== DEFAULT_AUTO_RUN_TIMEOUT}
												/>
											</field.FormControl>
										</div>
									</field.FormItem>
								)}
							/>
						</GroupContent>
					</Group>
					<Group>
						<GroupLabel>Editor</GroupLabel>
						<GroupContent>
							<form.AppField
								name="vimMode"
								children={field => (
									<field.FormItem className="flex gap-2">
										<field.FormLabel>Vim motions</field.FormLabel>
										<field.FormControl>
											<Switch
												checked={field.state.value}
												onCheckedChange={e => field.handleChange(e)}
											/>
										</field.FormControl>
									</field.FormItem>
								)}
							/>
						</GroupContent>
					</Group>
					<Group>
						<GroupLabel>Output</GroupLabel>
						<GroupContent>
							<form.AppField
								name="maxLogs"
								children={field => (
									<field.FormItem>
										<field.FormLabel>Maximum stack of logs</field.FormLabel>
										<div>
											<div className="flex w-full items-center gap-1">
												<field.FormControl>
													<InputWrapper>
														<Input
															type="number"
															min="600"
															step="100"
															value={field.state.value}
															onChange={e => field.handleChange(Number(e.target.value))}
															onBlur={field.handleBlur}
														/>
													</InputWrapper>
												</field.FormControl>
											</div>
											<field.FormControl>
												<ResetButton
													onClick={() => field.handleChange(DEFAULT_MAX_LOGS)}
													isResetAble={field.state.value !== DEFAULT_MAX_LOGS}
												/>
											</field.FormControl>
										</div>
									</field.FormItem>
								)}
							/>
						</GroupContent>
					</Group>
					<Group>
						<GroupLabel>Runtime limits</GroupLabel>
						<GroupContent>
							<form.AppField
								name="quickjs.executionTimeout"
								children={field => (
									<field.FormItem>
										<field.FormLabel>Maximum execution time</field.FormLabel>
										<div>
											<div className="flex w-full items-center gap-1">
												<field.FormControl>
													<InputWrapper>
														<span className="text-muted-foreground text-sm" title="milliseconds">
															ms
														</span>
														<Input
															type="number"
															min="5000"
															step="1000"
															value={field.state.value}
															onChange={e => field.handleChange(Number(e.target.value))}
															onBlur={field.handleBlur}
														/>
													</InputWrapper>
												</field.FormControl>
											</div>
											<field.FormControl>
												<ResetButton
													onClick={() => field.handleChange(DEFAULT_EXECUTION_TIMEOUT)}
													isResetAble={field.state.value !== DEFAULT_EXECUTION_TIMEOUT}
												/>
											</field.FormControl>
										</div>
									</field.FormItem>
								)}
							/>
							<form.AppField
								name="quickjs.maxStackSize"
								children={field => (
									<field.FormItem>
										<field.FormLabel>Maximum stack size</field.FormLabel>
										<div>
											<div className="flex w-full items-center gap-1">
												<field.FormControl>
													<InputWrapper>
														<Input
															type="number"
															min="500"
															step="100"
															value={field.state.value}
															onChange={e => field.handleChange(Number(e.target.value))}
															onBlur={field.handleBlur}
														/>
													</InputWrapper>
												</field.FormControl>
											</div>
											<field.FormControl>
												<ResetButton
													onClick={() => field.handleChange(DEFAULT_MAX_STACK_SIZE)}
													isResetAble={field.state.value !== DEFAULT_MAX_STACK_SIZE}
												/>
											</field.FormControl>
										</div>
									</field.FormItem>
								)}
							/>
							<form.AppField
								name="quickjs.memoryLimit"
								children={field => (
									<field.FormItem>
										<field.FormLabel>Maximum memory allocation</field.FormLabel>
										<div>
											<div className="flex w-full items-center gap-1">
												<field.FormControl>
													<InputWrapper>
														<span className="text-muted-foreground text-sm" title="bytes">
															bytes
														</span>
														<Input
															type="number"
															min="262144"
															value={field.state.value}
															onChange={e => field.handleChange(Number(e.target.value))}
															onBlur={field.handleBlur}
														/>
													</InputWrapper>
												</field.FormControl>
											</div>
											<field.FormControl>
												<ResetButton
													onClick={() => field.handleChange(DEFAULT_MEMORY_LIMIT)}
													isResetAble={field.state.value !== DEFAULT_MEMORY_LIMIT}
												/>
											</field.FormControl>
										</div>
									</field.FormItem>
								)}
							/>
							<form.AppField
								name="quickjs.maxTimeoutCount"
								children={field => (
									<field.FormItem>
										<field.FormLabel>Maximum timeouts</field.FormLabel>
										<div>
											<div className="flex w-full items-center gap-1">
												<field.FormControl>
													<InputWrapper>
														<Input
															type="number"
															min="20"
															value={field.state.value}
															onChange={e => field.handleChange(Number(e.target.value))}
															onBlur={field.handleBlur}
														/>
													</InputWrapper>
												</field.FormControl>
											</div>
											<field.FormControl>
												<ResetButton
													onClick={() => field.handleChange(DEFAULT_MAX_TIMEOUT_COUNT)}
													isResetAble={field.state.value !== DEFAULT_MAX_TIMEOUT_COUNT}
												/>
											</field.FormControl>
										</div>
									</field.FormItem>
								)}
							/>
							<form.AppField
								name="quickjs.maxIntervalCount"
								children={field => (
									<field.FormItem>
										<field.FormLabel>Maximum intervals</field.FormLabel>
										<div>
											<div className="flex w-full items-center gap-1">
												<field.FormControl>
													<InputWrapper>
														<Input
															type="number"
															min="20"
															value={field.state.value}
															onChange={e => field.handleChange(Number(e.target.value))}
															onBlur={field.handleBlur}
														/>
													</InputWrapper>
												</field.FormControl>
											</div>
											<field.FormControl>
												<ResetButton
													onClick={() => field.handleChange(DEFAULT_MAX_INTERVAL_COUNT)}
													isResetAble={field.state.value !== DEFAULT_MAX_INTERVAL_COUNT}
												/>
											</field.FormControl>
										</div>
									</field.FormItem>
								)}
							/>
						</GroupContent>
					</Group>
				</form>
			</form.AppForm>
		</div>
	)
}

const ResetButton: React.FC<{ onClick: () => void; isResetAble: boolean }> = ({
	isResetAble,
	onClick
}) => {
	return (
		<Button
			type="button"
			data-display={isResetAble}
			title="reset"
			variant="dim"
			size="sm"
			className="data-[display=false]:hidden"
			onClick={onClick}
		>
			reset
		</Button>
	)
}

const Group = ({ className, ...props }: ComponentProps<'div'>) => {
	return <div className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />
}

const GroupLabel = ({
	className,
	asChild = false,
	...props
}: ComponentProps<'div'> & { asChild?: boolean }) => {
	const Comp = asChild ? Slot : 'div'
	return (
		<Comp
			className={cn(
				'flex h-8 shrink-0 items-center rounded-md px-2 font-medium text-muted-foreground/70 text-xs outline-hidden ring-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
				className
			)}
			{...props}
		/>
	)
}

const GroupContent = ({ className, ...props }: ComponentProps<'div'>) => {
	return <div className={cn('relative w-full min-w-0 space-y-3 px-2', className)} {...props} />
}
