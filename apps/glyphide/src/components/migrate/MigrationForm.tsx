import {
	ArrowRightIcon,
	CheckCircleIcon,
	CheckIcon,
	CopyIcon,
	ExternalLinkIcon
} from 'lucide-react'
import { useState } from 'react'
import { useAppForm } from '@/components/ui/Form'
import { Textarea } from '@/components/ui/Textarea'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { type MigrationResult, migrateUrl } from '@/lib/migrations'
import { Button } from '../ui/Button'
import { Input, InputWrapper } from '../ui/Input'
import { Label } from '../ui/Label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip'

export const MigrationForm = () => {
	const [currentLinkData, setCurrentLinkData] = useState<undefined | MigrationResult>(undefined)
	const form = useAppForm({
		defaultValues: {
			link: ''
		},
		onSubmit: ({ value }) => {
			const migrationRes = migrateUrl(value.link)
			setCurrentLinkData(migrationRes)
		}
	})

	return (
		<div className="space-y-6">
			<form.AppForm>
				<form className="space-y-4">
					<form.AppField
						name="link"
						children={field => (
							<field.FormItem>
								<field.FormControl>
									<Textarea
										placeholder="Insert your old link here..."
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										className="field-sizing-content size-full max-h-[6lh]"
									/>
								</field.FormControl>
							</field.FormItem>
						)}
					/>
					<Button
						type="submit"
						className="w-full"
						onClick={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						Migrate Link
						<ArrowRightIcon className="ml-2 h-4 w-4" />
					</Button>
				</form>
			</form.AppForm>

			<StatusMessage data={currentLinkData} />
		</div>
	)
}

interface StatusMessageProps {
	data: MigrationResult | undefined
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ data }) => {
	const { copy, copied } = useCopyToClipboard()

	const handleCopy = () => {
		if (data?.success) {
			copy(data.url)
		}
	}

	if (!data) return null

	if (!data.success) {
		return (
			<div className="space-y-4 rounded-lg border border-error-foreground bg-error/40 p-4">
				<div className="flex items-center gap-2 text-error-foreground">
					<CheckCircleIcon className="h-5 w-5" />
					<span className="font-medium">An error ocurred!</span>
				</div>

				<div className="space-y-3">
					<p>{data.error}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4 rounded-lg border border-success-foreground bg-land p-4">
			<div className="flex items-center gap-2 text-success-foreground">
				<CheckCircleIcon className="h-5 w-5" />
				<span className="font-medium">
					{data.isLatest ? 'Your link is already up to date!' : 'Migration Successful!'}
				</span>
			</div>

			<div className="space-y-3">
				<Label className="font-medium text-muted-foreground text-sm">
					{data.isLatest ? 'Your link' : 'Your migrated link'}:
				</Label>

				<InputWrapper>
					<Input disabled value={data.url} />
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button onClick={handleCopy} variant="dim" disabled={copied} className="-me-3.5">
									{copied ? (
										<CheckIcon className="stroke-green-600" size={16} />
									) : (
										<CopyIcon size={16} />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent className="px-2 py-1 text-xs">Copy to clipboard</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</InputWrapper>

				<Button asChild variant="secondary" className="w-full">
					<a href={data.url} target="_blank">
						Open Link
						<ExternalLinkIcon className="ml-2 h-4 w-4" />
					</a>
				</Button>
			</div>
		</div>
	)
}
