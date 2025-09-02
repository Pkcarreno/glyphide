import { CheckIcon, ChevronDownIcon, ExternalLinkIcon, RefreshCwIcon } from 'lucide-react'
import Logo from '@/assets/logo-square.svg?react'
import { Button } from '@/components/ui/Button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger
} from '@/components/ui/DropdownMenu'
import { useSettingsSidebarStore } from '@/stores/settings-sidebar'
import { useThemeStore } from '@/stores/theme'
import { useVersionManagerStore } from '@/stores/version-manager'

export const Menu = () => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="group ml-1 px-0 hover:bg-muted/60">
					<span className="sr-only">Menu</span>
					<div className="flex items-center justify-center gap-0.5">
						<Logo className="size-8" />
						<ChevronDownIcon className="size-3 text-muted-foreground transition-transform duration-150 ease-in-out group-hover:translate-y-[2px] group-hover:text-muted-foreground/70" />
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<NewScriptLinkItem />
				<DropdownMenuSeparator />
				<ThemeSubmenu />
				<SettingsItem />
				<DropdownMenuSeparator />
				<MigratePageLinkItem />
				{/* <DocumentationLinkItem /> */}
				<GithubLinkItem />
				<DropdownMenuSeparator />
				<UpdateItem />
				<AppVersionItem />
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

const ThemeSubmenu = () => {
	const { theme, setTheme } = useThemeStore()

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
			<DropdownMenuPortal>
				<DropdownMenuSubContent>
					<DropdownMenuItem
						disabled={theme === 'light'}
						onClick={() => setTheme('light')}
						className="justify-between"
					>
						Light
						{theme === 'light' && <CheckIcon className="size-4" />}
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={theme === 'dark'}
						onClick={() => setTheme('dark')}
						className="justify-between"
					>
						Dark
						{theme === 'dark' && <CheckIcon className="size-4" />}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						disabled={theme === 'system'}
						onClick={() => setTheme('system')}
						className="justify-between"
					>
						System
						{theme === 'system' && <CheckIcon className="size-4" />}
					</DropdownMenuItem>
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>
	)
}

const SettingsItem = () => {
	const { toggleSettingsSidebar } = useSettingsSidebarStore()

	return <DropdownMenuItem onClick={toggleSettingsSidebar}>Settings</DropdownMenuItem>
}

const UpdateItem = () => {
	const { needRefresh, updateServiceWorkerAction } = useVersionManagerStore()

	if (!needRefresh) return null

	return (
		<>
			<DropdownMenuItem
				className="gap-1 bg-primary/20 focus:bg-primary/40 focus:text-foreground"
				onClick={() => updateServiceWorkerAction(true)}
			>
				<RefreshCwIcon className="size-4" />
				New Update
			</DropdownMenuItem>
			<DropdownMenuSeparator />
		</>
	)
}

const GithubLinkItem = () => {
	return (
		<DropdownMenuItem asChild>
			<a href="https://github.com/pkcarreno/glyphide" className="flex cursor-pointer gap-1">
				Github <ExternalLinkIcon className="size-4" />
			</a>
		</DropdownMenuItem>
	)
}

// const DocumentationLinkItem = () => {
// 	return (
// 		<DropdownMenuItem asChild>
// 			<a href="/doc" className="flex cursor-pointer gap-1">
// 				Docs
// 			</a>
// 		</DropdownMenuItem>
// 	)
// }

const NewScriptLinkItem = () => {
	return (
		<DropdownMenuItem asChild>
			<a href="/" className="flex cursor-pointer gap-1" target="_blank" rel="noreferrer">
				New Script
			</a>
		</DropdownMenuItem>
	)
}

const MigratePageLinkItem = () => {
	return (
		<DropdownMenuItem asChild>
			<a href="/migrate" className="flex cursor-pointer gap-1" target="_blank" rel="noreferrer">
				Migrate old link
			</a>
		</DropdownMenuItem>
	)
}

const AppVersionItem = () => {
	return <DropdownMenuItem disabled>Glyphide v{import.meta.env.APP_VERSION}</DropdownMenuItem>
}
