import { useEffect } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useThemeStore } from '@/stores/theme'

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
	}, [theme, isDarkMode])

	useEffect(() => {
		if (theme === 'system') {
			setThemeMode(isDarkMode ? 'dark' : 'light')
		}
	}, [theme, setThemeMode, isDarkMode])

	return null
}
