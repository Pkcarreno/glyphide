import { encodeURI as base64EncodeURI, decode } from 'js-base64'
import type { StateStorage } from 'zustand/middleware'

export const queryStorage: StateStorage = {
	getItem: (key): string => {
		const searchParams = new URLSearchParams(location.hash.slice(1))
		const storedValue = searchParams.get(key) ?? ''
		return JSON.parse(decode(storedValue))
	},
	setItem: (key, newValue): void => {
		const searchParams = new URLSearchParams(location.hash.slice(1))
		searchParams.set(key, base64EncodeURI(JSON.stringify(newValue)))
		location.hash = searchParams.toString()
	},
	removeItem: (key): void => {
		const searchParams = new URLSearchParams(location.hash.slice(1))
		searchParams.delete(key)
		location.hash = searchParams.toString()
	}
}
