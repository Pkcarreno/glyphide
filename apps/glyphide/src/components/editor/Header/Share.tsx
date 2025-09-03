import { PopoverTrigger } from '@radix-ui/react-popover'
import { CheckIcon, ChevronDownIcon, CopyIcon, Share2Icon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/DropdownMenu'
import { Popover, PopoverContent } from '@/components/ui/Popover'
import { Separator } from '@/components/ui/Separator'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useIsInIframe } from '@/hooks/use-is-in-iframe'
import { getCurrentUrl } from '@/utils'

export const ShareButton = () => {
	const { copied: copiedUrl, copy: copyUrl } = useCopyToClipboard()
	const { copied: copiedEmbeded, copy: copyEmbeded } = useCopyToClipboard()
	const isInIframe = useIsInIframe()

	const onClickUrl = () => {
		const url = getCurrentUrl()
		copyUrl(url.href)
	}

	const onClickEmbeded = () => {
		const url = getCurrentUrl()
		const embededUrl = `<iframe src="${url.href}" height="800" width="800" />`

		copyEmbeded(embededUrl)
	}

	if (isInIframe) return null

	return (
		<Popover>
			<div className="group/buttons relative flex rounded-lg bg-secondary *:[[data-slot=button]]:focus-visible:relative *:[[data-slot=button]]:focus-visible:z-10">
				<Button
					variant="secondary"
					size="sm"
					className="hidden h-full shadow-none sm:flex md:text-[0.8rem]"
					onClick={onClickUrl}
				>
					<span className="sr-only">Copy url</span>
					{copiedUrl || copiedEmbeded ? <CheckIcon /> : <CopyIcon />}
					Copy Url
				</Button>
				<Separator
					orientation="vertical"
					className="!bg-foreground/10 absolute top-0 right-8 z-0 hidden peer-focus-visible:opacity-0 sm:right-7 sm:flex"
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild className="hidden sm:flex">
						<Button
							variant="secondary"
							size="sm"
							className="peer -ml-0.5 h-full w-8 shadow-none md:w-7 md:text-[0.8rem]"
						>
							<span className="sr-only">More copy options</span>
							<ChevronDownIcon />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="shadow-none">
						<DropdownMenuItem onClick={onClickEmbeded}>Copy iframe</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<PopoverTrigger asChild className="flex sm:hidden">
					<Button variant="secondary" size="icon" className="h-full shadow-none">
						<span className="sr-only">Share options</span>
						<Share2Icon />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-52 rounded-lg bg-background/70 p-1 shadow-sm backdrop-blur-sm dark:bg-background/60"
					align="end"
				>
					<Button
						variant="ghost"
						size="lg"
						className="w-full justify-start font-normal text-base *:[svg]:text-muted-foreground"
						onClick={onClickUrl}
					>
						{copiedUrl ? <CheckIcon /> : <CopyIcon />}
						Copy Url
					</Button>
					<Button
						variant="ghost"
						size="lg"
						className="w-full justify-start font-normal text-base *:[svg]:text-muted-foreground"
						onClick={onClickEmbeded}
					>
						{copiedEmbeded ? <CheckIcon /> : <CopyIcon />}
						Copy iframe
					</Button>
				</PopoverContent>
			</div>
		</Popover>
	)
}
