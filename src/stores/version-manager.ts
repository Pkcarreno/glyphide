import { create } from 'zustand'

import { createSelectors } from '@/utils'

type UpdateServiceWorkerFn = (force: boolean) => Promise<void>

interface VersionManagerState {
	needRefresh: boolean
	setNeedRefresh: (value: boolean) => void

	updateServiceWorkerAction: UpdateServiceWorkerFn
	setUpdateServiceWorkerAction: (fn: UpdateServiceWorkerFn) => void
}

const _useVersionManagerStore = create<VersionManagerState>(set => ({
	needRefresh: false,
	setNeedRefresh: needRefresh => set({ needRefresh }),
	updateServiceWorkerAction: async () => {
		console.warn('VersionManager: update function not mounted')
	},
	setUpdateServiceWorkerAction: updateServiceWorkerAction => set({ updateServiceWorkerAction })
}))

export const useVersionManagerStore = createSelectors(_useVersionManagerStore)
