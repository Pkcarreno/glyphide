import { Button } from '@/components/ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { tryCatch } from '@/lib/try-catch'
import { getScriptUrlState } from '@/stores/script'
import copy from 'copy-to-clipboard'
import { Share2Icon } from 'lucide-react'
import { CheckIcon, LoaderCircleIcon, XIcon } from 'lucide-react'
import { type PropsWithChildren, useMemo, useState } from 'react'

export const ShareButton = () => {
	const copyLinkToClipboard = async () => {
		const url = getCurrentUrl()

		copy(url.href)
	}

	const copyIframeToClipboard = async () => {
		const url = getCurrentUrl()

		const embededUrl = `<iframe src="${url.href}" height="800" width="800" />`
		copy(embededUrl)
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button size="icon" variant="outline">
					<Share2Icon />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="space-y-4">
				<div className="space-y-2">
					<p className="text-muted-foreground text-sm">
						Share Glyphide <br /> with your current code.
					</p>
				</div>
				<div className="flex flex-col gap-1">
					<CopyButton onClick={copyLinkToClipboard}>Copy link</CopyButton>
					<CopyButton onClick={copyIframeToClipboard}>Copy iframe</CopyButton>
				</div>
			</PopoverContent>
		</Popover>
	)
}

const getCurrentUrl = () => {
	const url = new URL(location.origin)
	const searchParams = getScriptUrlState()

	for (const [key, value] of searchParams.entries()) {
		url.searchParams.append(key, value)
	}

	return url
}

type statusType = 'loading' | 'idle' | 'error' | 'done'

interface Props extends PropsWithChildren {
	onClick: () => Promise<void>
}

const CopyButton: React.FC<Props> = ({ children, onClick }) => {
	const [status, setStatus] = useState<statusType>('idle')

	const isLoading = useMemo(() => {
		return status === 'loading'
	}, [status])

	const isDone = useMemo(() => {
		return status === 'done'
	}, [status])

	const handleOnClick = async () => {
		setStatus('loading')

		const res = await tryCatch(onClick())

		if (res.error) {
			setStatus('error')
			console.error('Share: error on copy', res.error)
			return
		}

		setStatus('done')
	}

	return (
		<Button
			onClick={handleOnClick}
			className="w-full justify-between"
			disabled={isLoading || isDone}
			variant="secondary"
		>
			{children}
			<ReferenceStatus status={status} />
		</Button>
	)
}

interface ReferenceStatusProps {
	status: statusType
}

const ReferenceStatus: React.FC<ReferenceStatusProps> = ({ status }) => {
	if (status === 'loading') {
		return <LoaderCircleIcon className="animate-spin" />
	}

	if (status === 'error') {
		return <XIcon />
	}

	if (status === 'done') {
		return <CheckIcon />
	}

	return null
}
