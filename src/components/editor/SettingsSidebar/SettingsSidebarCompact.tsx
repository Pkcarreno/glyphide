import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from '@/components/ui/Sheet'
import { useIsCompactLayout } from '@/hooks/use-is-compact-layout'
import { useSettingsSidebarStore } from '@/stores/settings-sidebar'
import { SettingsContent } from './SettingsContent'

export const SettingsSidebarCompact = () => {
	const isCompactLayout = useIsCompactLayout()
	const { isSettingsSidebarOpen, toggleSettingsSidebar } = useSettingsSidebarStore()

	if (!isCompactLayout) return null

	return (
		<Sheet open={isSettingsSidebarOpen} onOpenChange={toggleSettingsSidebar}>
			<SheetContent className="w-[calc(100%-48px)]" side="left">
				<SheetHeader>
					<SheetTitle>Settings</SheetTitle>
					<SheetDescription>customize your coding experience.</SheetDescription>
				</SheetHeader>
				<SettingsContent />
			</SheetContent>
		</Sheet>
	)
}
