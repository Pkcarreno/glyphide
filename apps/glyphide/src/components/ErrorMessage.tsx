interface Props {
	message: string
	error: Error | unknown | undefined
}

export const ErrorMenssage: React.FC<Props> = ({ message, error }) => {
	return (
		<div className="flex flex-col gap-3 border-2 border-transparent border-l-error-foreground bg-error/30 p-4">
			<strong className="text-error-foreground text-xl">Error</strong>
			<div className="flex flex-col gap-2">
				<p>{message}</p>
				<span className="text-sm italic">{error instanceof Error && error.message}</span>
				{import.meta.env.DEV && (
					<pre className="text-muted-foreground text-xs">
						{error instanceof Error ? error.stack : JSON.stringify(error)}
					</pre>
				)}
			</div>
		</div>
	)
}
