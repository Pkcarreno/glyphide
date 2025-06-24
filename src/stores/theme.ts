import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { createSelectors } from '@/utils'

type themeType = 'system' | 'light' | 'dark'
type themeModeType = 'light' | 'dark'

interface ThemeState {
	theme: themeType
	themeMode: themeModeType
	setTheme: (theme: themeType) => void
	setThemeMode: (themeMode: themeModeType) => void
}

const _useThemeStore = create<ThemeState>()(
	persist(
		set => ({
			theme: 'system',
			themeMode: 'light',
			setTheme: theme => set({ theme: theme }),
			setThemeMode: themeMode => set({ themeMode: themeMode })
		}),
		{
			name: 'theme'
		}
	)
)

export const useThemeStore = createSelectors(_useThemeStore)

export const getTheme = () => _useThemeStore.getState().theme
