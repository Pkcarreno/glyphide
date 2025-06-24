import { Island } from '@/components/Island'
import { useIsCompactLayout } from '@/hooks/use-is-compact-layout'
import { useSettingsSidebarStore } from '@/stores/settings-sidebar'
import { XIcon } from 'lucide-react'
import { SettingsContent } from './SettingsContent'

export const SettingsSidebar = () => {
	const isCompactLayout = useIsCompactLayout()
	const { isSettingsSidebarOpen, toggleSettingsSidebar } = useSettingsSidebarStore()

	if (isCompactLayout) return null

	if (!isSettingsSidebarOpen) return null

	return (
		<Island className="mr-1 flex h-full w-fit flex-col">
			<div className="relative flex flex-col gap-1.5 p-4">
				<h2 className="font-semibold text-foreground">Settings</h2>
				<p className="text-muted-foreground text-sm">customize your coding experience.</p>

				<div className="absolute top-4 right-4">
					<button
						type="button"
						className="rounded-xs bg-secondary opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-2"
						onClick={toggleSettingsSidebar}
					>
						<XIcon className="size-4" />
					</button>
				</div>
			</div>
			<SettingsContent />
		</Island>
	)
}
