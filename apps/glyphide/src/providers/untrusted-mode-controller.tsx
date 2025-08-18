import { TriangleAlertIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/AlertDialog'
import { Button } from '@/components/ui/Button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/Dialog'
import { useAppStore } from '@/stores/app'
import { useCodeStore } from '@/stores/script'

export const UntrustedModeController = () => {
	const { untrustedStatus, setUntrustedStatus } = useAppStore()
	const { code } = useCodeStore()
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (untrustedStatus === 'uninitialized' && code && code.length > 0) {
			setUntrustedStatus('untrusted')
			setOpen(true)
		}
		if (untrustedStatus === 'uninitialized' && (!code || code.length === 0)) {
			setUntrustedStatus('trusted')
		}
	}, [code, untrustedStatus, setUntrustedStatus])

	const handleOnTrustCode = () => {
		setUntrustedStatus('trusted')
		if (open) {
			setOpen(false)
		}
	}

	const handleOnNoTrust = () => {
		setUntrustedStatus('untrusted')
		if (open) {
			setOpen(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Third party code</DialogTitle>
					<DialogDescription>
						This code comes from a shared link. <br />
						You can review it first without running anything, or enable execution if you trust the
						source.
					</DialogDescription>
				</DialogHeader>
				<DialogHeader>
					<div className="text-muted-foreground text-sm">
						<span className="font-semibold">Remember</span>

						<ul className="list-inside list-disc">
							<li>We'll disable all runtime capabilities while inspecting.</li>
							<li>You can enable execution at any time from the toolbar or statusbar.</li>
						</ul>
					</div>
				</DialogHeader>
				<DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-0">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="outline">Enable execution</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Enable execution</AlertDialogTitle>
								<AlertDialogDescription>
									Runs with your current settings. You can change or disable later in Settings.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Go back</AlertDialogCancel>
								<AlertDialogAction className="font-bold" autoFocus onClick={handleOnTrustCode}>
									Enable Execution
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<Button className="font-bold" autoFocus onClick={handleOnNoTrust}>
						Inspect only (recommended)
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
