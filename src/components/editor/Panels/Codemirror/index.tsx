import { useScriptStore } from '@/stores/script'

import { Loading } from '@/components/ui/Loading'
import { type editorStateType, useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import type { Extension } from '@codemirror/state'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import CodemirrorEditor from './Codemirror'

const JavascriptLanguage = () => import('@codemirror/lang-javascript')
const LintGutterEx = () => import('@codemirror/lint')
const LinterEx = () => import('@codemirror/lint')
const EsLintBrowserifyEx = () => import('eslint-linter-browserify')
const globalsWorker = () => import('globals')
const vimEx = () => import('@replit/codemirror-vim')

const Editor = () => {
	const { code, setCode } = useScriptStore()
	const { updateEditorState } = useAppStore()
	const {
		config: { vimMode }
	} = useSettingsStore()

	const [loadedExtensions, setLoadedExtensions] = useState<Extension[]>([])

	const extensionLoaders = useMemo(
		() => ({
			javascript: async () => {
				const { javascript } = await JavascriptLanguage()
				return javascript()
			},
			lintGutter: async () => {
				const { lintGutter } = await LintGutterEx()
				return lintGutter()
			},
			vim: async () => {
				const { vim } = await vimEx()
				return vim()
			},
			linter: async () => {
				const { linter } = await LinterEx()
				const { esLint } = await JavascriptLanguage()
				const { ...eslint } = await EsLintBrowserifyEx()
				const { worker } = await globalsWorker()

				const EsLintConfig = {
					languageOptions: {
						globals: {
							...worker,
							console: true
						},
						parserOptions: {
							ecmaVersion: 2023,
							sourceType: 'module'
						}
					}
				}

				return linter(esLint(new eslint.Linter(), EsLintConfig))
			}
		}),
		[]
	)

	useEffect(() => {
		const extensionsToLoad: (keyof typeof extensionLoaders)[] = []

		extensionsToLoad.push('javascript')
		extensionsToLoad.push('lintGutter')
		extensionsToLoad.push('linter')

		if (vimMode) {
			extensionsToLoad.push('vim')
		}

		const loadExtensions = async () => {
			const extensionPromises = extensionsToLoad
				.map(key => extensionLoaders[key]?.())
				.filter(Boolean)

			try {
				const loaded = await Promise.all(extensionPromises)
				setLoadedExtensions(loaded)
			} catch (error) {
				console.error('Error loading extensions:', error)
			}
		}

		loadExtensions()
	}, [vimMode, extensionLoaders])

	const handleEditorChange = (doc: string) => {
		setCode(doc)
	}

	const handleEditorStateChange = useCallback(
		(state: editorStateType) => {
			updateEditorState(state)
		},
		[updateEditorState]
	)

	return (
		<Suspense fallback={<Loading />}>
			<CodemirrorEditor
				initialDoc={code}
				extensions={loadedExtensions}
				onChange={handleEditorChange}
				onEditorStateChange={handleEditorStateChange}
			/>
		</Suspense>
	)
}

export default Editor
