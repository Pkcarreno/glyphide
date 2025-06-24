import { create } from 'zustand'

import { createSelectors } from '@/utils'

interface SettingsSidebarState {
	isSettingsSidebarOpen: boolean
	toggleSettingsSidebar: () => void
}

const _useSettingsSidebarStore = create<SettingsSidebarState>(set => ({
	isSettingsSidebarOpen: false,
	toggleSettingsSidebar: () =>
		set(state => ({ isSettingsSidebarOpen: !state.isSettingsSidebarOpen }))
}))

export const useSettingsSidebarStore = createSelectors(_useSettingsSidebarStore)
