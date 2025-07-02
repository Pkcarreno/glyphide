import { TriangleAlertIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
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
				<DialogHeader className="rounded-xl border border-destructive bg-destructive/10 p-4 text-destructive">
					<DialogTitle className="flex items-center justify-center gap-2 sm:flex-row">
						<TriangleAlertIcon className="size-6" />
						WARNING!
					</DialogTitle>
					<DialogDescription className="text-destructive">
						Although Glyphide aims to provide a safe environment, there may be inappropriate or
						malicious behavior when executing third-party code.
					</DialogDescription>
				</DialogHeader>
				<DialogHeader>
					<DialogDescription>
						If you do not trust the origin of the code, we recommend continuing in the untrusted
						mode. Before executing the code, make sure you understand its behavior and scope.
					</DialogDescription>
					<div className="text-muted-foreground text-sm">
						<span className="font-semibold">Remember</span>

						<ul className="list-inside list-disc">
							<li>The security of your device and your data is your responsibility.</li>
							<li>If you have doubts about the security of the code, do not execute it.</li>
						</ul>
					</div>
				</DialogHeader>
				<DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="outline" className="flex h-full flex-1 flex-col">
								<span className="text-wrap font-semibold">
									Yes, I trust the origin of this code.
								</span>
								<span className="text-wrap italic">Trust the code and enable all features</span>
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>No</AlertDialogCancel>
								<AlertDialogAction onClick={handleOnTrustCode}>Yes</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<Button className="flex h-full flex-1 flex-col" onClick={handleOnNoTrust}>
						<span className="text-wrap font-semibold">
							No, I don't trust the origin of this code.
						</span>
						<span className="text-wrap italic">Inspect code in untrusted mode</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
