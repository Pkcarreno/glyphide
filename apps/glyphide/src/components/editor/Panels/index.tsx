import { lazy, Suspense } from 'react'
import { Island } from '@/components/Island'
import { Loading } from '@/components/ui/Loading'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable'
import { useMainLayout } from '@/hooks/use-main-layout'
import { useAppStore } from '@/stores/app'
import { SettingsSidebar } from '../SettingsSidebar/SettingsSidebar'

const Output = lazy(() => import('./Output/Output').then(mod => ({ default: mod.Output })))
const OutputCompact = lazy(() =>
	import('./Output/OutputCompact').then(mod => ({ default: mod.OutputCompact }))
)
const Codemirror = lazy(() => import('./Codemirror'))

export const Panels = () => {
	const { isLayoutReady } = useAppStore()
	const { layout, device } = useMainLayout()

	if (!isLayoutReady) {
		return <Loading />
	}

	if (device === 'mobile') {
		return (
			<>
				<div className="h-full">
					<Suspense fallback={<Loading />}>
						<Codemirror />
					</Suspense>
				</div>

				<div className="absolute right-4 bottom-16 z-50">
					<Suspense fallback={<Loading />}>
						<OutputCompact />
					</Suspense>
				</div>
			</>
		)
	}

	return (
		<div className="flex h-full gap-1">
			<SettingsSidebar />
			<ResizablePanelGroup
				autoSave="layout"
				orientation={layout}
				className="flex h-full gap-1 overflow-auto"
			>
				<ResizablePanel defaultSize="70%" minSize="20%">
					<Island>
						<Suspense fallback={<Loading />}>
							<Codemirror />
						</Suspense>
					</Island>
				</ResizablePanel>

				<ResizableHandle className="my-0.5 bg-transparent" withHandle={layout === 'vertical'} />

				<ResizablePanel defaultSize="30%" minSize="20%">
					<Island>
						<Suspense fallback={<Loading />}>
							<Output />
						</Suspense>
					</Island>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	)
}
