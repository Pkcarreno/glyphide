import { cn } from '@/utils'

export const Island: React.FC<React.ComponentProps<'div'>> = ({
	className,
	children,
	...props
}) => {
	return (
		<div className={cn('size-full overflow-hidden rounded-2xl bg-land', className)} {...props}>
			{children}
		</div>
	)
}
