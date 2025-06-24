import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { queryStorage } from '@/api/query-storage'
import { createSelectors } from '@/utils'

interface AppState {
	title: string | undefined
	code: string
	_hasHydrated: boolean
	setCode: (code: string) => void
	setTitle: (value: string) => void
	setHasHydrated: (state: boolean) => void
}

const _useScriptStore = create<AppState>()(
	persist(
		set => ({
			title: undefined,
			code: '',
			setCode: code => set({ code }),
			setTitle: title => set({ title }),
			_hasHydrated: false,
			setHasHydrated: state => {
				set({
					_hasHydrated: state
				})
			}
		}),
		{
			name: 'code',
			storage: createJSONStorage(() => queryStorage),
			onRehydrateStorage: state => {
				return () => state.setHasHydrated(true)
			}
		}
	)
)

export const useScriptStore = createSelectors(_useScriptStore)
export const useRawScriptStore = _useScriptStore
