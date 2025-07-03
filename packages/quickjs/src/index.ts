import quickJsNgWasmVariant from '@jitl/quickjs-ng-wasmfile-release-sync'
import {
	loadQuickJs as _loadQuickJsFromSebastianWessel,
	type ErrorResponse,
	type OkResponse,
	type SandboxFunction,
	type SandboxOptions
} from '@sebastianwessel/quickjs'
import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten-core'

async function loadQuickJs(): Promise<ReturnType<typeof _loadQuickJsFromSebastianWessel>> {
	try {
		const wasmModuleInstance = await newQuickJSWASMModuleFromVariant(quickJsNgWasmVariant)
		const quickJsInstance = await _loadQuickJsFromSebastianWessel(wasmModuleInstance)
		return quickJsInstance
	} catch (error) {
		console.error('Error al cargar QuickJS en loadQuickJs():', error)
		throw error
	}
}

export {
	loadQuickJs,
	type SandboxOptions,
	type ErrorResponse,
	type OkResponse,
	type SandboxFunction
}
