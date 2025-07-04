import { useEffect } from 'react'
import { config } from '@/config'
import { useMediaQuery } from '@/hooks/use-media-query'
import { type themeModeType, useThemeStore } from '@/stores/theme'

export function ThemeProvider() {
	const { theme, setThemeMode } = useThemeStore()
	const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

	useEffect(() => {
		const root = window.document.documentElement

		root.classList.remove('light', 'dark')

		let systemTheme = theme

		if (theme === 'system') {
			systemTheme = isDarkMode ? 'dark' : 'light'
		}

		root.classList.add(systemTheme)

		updateThemeColor(systemTheme as themeModeType)
	}, [theme, isDarkMode])

	useEffect(() => {
		if (theme === 'system') {
			setThemeMode(isDarkMode ? 'dark' : 'light')
		}
	}, [theme, setThemeMode, isDarkMode])

	return null
}

function updateThemeColor(resolvedTheme: themeModeType): void {
	let metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

	if (!metaThemeColor) {
		metaThemeColor = document.createElement('meta')
		metaThemeColor.name = 'theme-color'
		document.head.appendChild(metaThemeColor)
	}

	metaThemeColor.content = config.theme[resolvedTheme]
}
