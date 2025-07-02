import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ExposedQuickJsSettings } from '@/types/messages'
import { createSelectors } from '@/utils'

export const DEFAULT_AUTO_RUN_TIMEOUT = 1_500
export const DEFAULT_MEMORY_LIMIT = 1_048_576 // 1024 * 1024
export const DEFAULT_EXECUTION_TIMEOUT = 30_000
export const DEFAULT_MAX_LOGS = 1_000
export const DEFAULT_MAX_STACK_SIZE = 100_000
export const DEFAULT_MAX_TIMEOUT_COUNT = 100
export const DEFAULT_MAX_INTERVAL_COUNT = 100

interface ConfigType {
	autoRun: boolean
	autoRunTimeout: number
	vimMode: boolean
	quickjs: ExposedQuickJsSettings
	maxLogs: number
}

export interface SettingsState {
	config: ConfigType
	updateConfig: (valule: ConfigType) => void
}

const _useSettingsStore = create<SettingsState>()(
	persist(
		set => ({
			config: {
				autoRun: true,
				autoRunTimeout: DEFAULT_AUTO_RUN_TIMEOUT,
				vimMode: false,
				quickjs: {
					memoryLimit: DEFAULT_MEMORY_LIMIT,
					executionTimeout: DEFAULT_EXECUTION_TIMEOUT,
					maxStackSize: DEFAULT_MAX_STACK_SIZE,
					maxIntervalCount: DEFAULT_MAX_INTERVAL_COUNT,
					maxTimeoutCount: DEFAULT_MAX_TIMEOUT_COUNT
				},
				maxLogs: DEFAULT_MAX_LOGS
			},
			updateConfig: newConfig => set({ config: newConfig })
		}),
		{
			name: 'settings'
		}
	)
)

export const useSettingsStore = createSelectors(_useSettingsStore)

export const getQuickjsSettings = () => _useSettingsStore.getState().config.quickjs
export const getMaxLogs = () => _useSettingsStore.getState().config.maxLogs
export const getAutorunTimeout = () => _useSettingsStore.getState().config.autoRunTimeout
export const getIsAutorunEnable = () => _useSettingsStore.getState().config.autoRun
