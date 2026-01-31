import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import type React from 'react'

import { cn } from '@/utils'

const spinnerVariants = cva('mr-3 -ml-1 animate-spin', {
	variants: {
		variant: {
			default: 'text-primary-foreground dark:text-primary',
			light: 'text-primary'
		},
		size: {
			sm: 'size-3',
			rg: 'size-5',
			lg: 'size-7',
			icon: 'size-10'
		}
	},
	defaultVariants: {
		variant: 'default',
		size: 'rg'
	}
})

function Spinner({
	className,
	variant,
	size,
	...props
}: React.SVGProps<SVGSVGElement> & VariantProps<typeof spinnerVariants>) {
	return (
		<svg
			className={cn(spinnerVariants({ variant, size, className }))}
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<title>spinner</title>
			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
			<path
				className="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			/>
		</svg>
	)
}

export { Spinner, spinnerVariants }
