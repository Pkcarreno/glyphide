import { useStore } from '@nanostores/react'
import { createQsUtils } from '@vp-tw/nanostores-qs'
import { decode as decodeUriBase64, encodeURI as encodeUriBase64 } from 'js-base64'

const qsUtils = createQsUtils()

const codeScriptStore = qsUtils.createSearchParamStore('c', def =>
	def({
		defaultValue: '',
		decode: v => (!v || typeof v !== 'string' ? '' : decodeUriBase64(v)),
		encode: encodeUriBase64
	})
)

const titleScriptStore = qsUtils.createSearchParamStore('t', def =>
	def({
		defaultValue: undefined,
		decode: v => (!v || typeof v !== 'string' ? '' : decodeUriBase64(v)),
		encode: encodeUriBase64
	})
)

export const scriptStore = qsUtils.createSearchParamsStore(def => ({
	c: def({
		defaultValue: '',
		decode: v => (!v || typeof v !== 'string' ? '' : decodeUriBase64(v)),
		encode: encodeUriBase64
	}),
	t: def({
		defaultValue: undefined
	})
}))

export const useCodeStore = () => {
	const code = useStore(codeScriptStore.$value)

	const setCode = (newCode: string) => {
		codeScriptStore.update(newCode, { replace: true })
	}

	return { code, setCode }
}

export const useTitleStore = () => {
	const title = useStore(titleScriptStore.$value)

	const setTitle = (newTitle: string | undefined) => {
		const finalTitle = newTitle === '' ? undefined : newTitle
		titleScriptStore.update(finalTitle, { replace: true })
	}

	return { title, setTitle }
}

export const getScriptUrlState = () => {
	const code = codeScriptStore.$value.get()
	const title = titleScriptStore.$value.get()

	const params: { c?: string; t?: string } = {}

	if (code !== undefined && code.length > 0) {
		params.c = encodeUriBase64(code)
	}
	if (title !== undefined && title.length > 0) {
		params.t = encodeUriBase64(title)
	}

	const searchParams = new URLSearchParams(params)

	return searchParams
}
