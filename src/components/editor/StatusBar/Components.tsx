import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { cn } from '@/utils'

export const StatusElement: React.FC<React.ComponentProps<'div'> & { popoverTitle?: string }> = ({
	children,
	className,
	popoverTitle,
	...props
}) => {
	if (popoverTitle) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger>
						<div
							className={cn(
								'h-full w-fit px-2.5 text-accent-foreground text-xs tabular-nums leading-5 transition-colors hover:bg-secondary',
								className
							)}
							{...props}
						>
							{children}
						</div>
					</TooltipTrigger>
					<TooltipContent>{popoverTitle}</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		)
	}

	return (
		<div
			className={cn(
				className,
				'h-full w-fit px-2.5 text-accent-foreground text-xs tabular-nums leading-5 transition-colors hover:bg-secondary'
			)}
			{...props}
		>
			{children}
		</div>
	)
}
