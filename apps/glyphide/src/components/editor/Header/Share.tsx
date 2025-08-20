import copy from 'copy-to-clipboard'
import { CheckIcon, LoaderCircleIcon, Share2Icon, XIcon } from 'lucide-react'
import { type PropsWithChildren, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { useIsInIframe } from '@/hooks/use-is-in-iframe'
import { tryCatch } from '@/lib/try-catch'
import { getCurrentUrl } from '@/utils'

export const ShareButton = () => {
	const isInIframe = useIsInIframe()

	const copyLinkToClipboard = async () => {
		const url = getCurrentUrl()

		copy(url.href)
	}

	const copyIframeToClipboard = async () => {
		const url = getCurrentUrl()

		const embededUrl = `<iframe src="${url.href}" height="800" width="800" />`
		copy(embededUrl)
	}

	if (isInIframe) return null

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button size="icon" variant="outline">
					<span className="sr-only">Share</span>
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
