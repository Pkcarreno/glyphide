import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { StoreApi, UseBoundStore } from 'zustand'
import { getScriptUrlState } from './stores/script'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

type WithSelectors<S> = S extends { getState: () => infer T }
	? S & { use: { [K in keyof T]: () => T[K] } }
	: never

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(_store: S) => {
	const store = _store as WithSelectors<typeof _store>
	store.use = {} as Record<string, () => unknown>
	for (const k of Object.keys(store.getState())) {
		;(store.use as Record<string, () => unknown>)[k] = () => store(s => s[k as keyof typeof s])
	}

	return store
}

export const getCurrentUrl = () => {
	const url = new URL(location.origin)
	const searchParams = getScriptUrlState()

	for (const [key, value] of searchParams.entries()) {
		url.searchParams.append(key, value)
	}

	return url
}
