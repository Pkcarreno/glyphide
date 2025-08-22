import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
	ArrayLogValue,
	FunctionLogValue,
	LogEntry,
	ObjectLogValue,
	SerializableValue
} from '@/types/log'
import type { ExecutionOutputPayload } from '@/types/messages'
import { createSelectors } from '@/utils'
import { getMaxLogs } from './settings'

let instanceCounter = 0

function getInstanceKey(): string {
	instanceCounter++
	return instanceCounter.toString(36).padStart(4, '0') + Math.random().toString(36).slice(2, 6)
}

type WithPreview = ObjectLogValue | ArrayLogValue | FunctionLogValue

function hasPreview(val: SerializableValue): val is WithPreview {
	return (
		typeof val === 'object' &&
		val !== null &&
		'preview' in val &&
		typeof (val as any).preview === 'string'
	)
}

function getLogOutputKey(outputs: SerializableValue[]): string {
	let hash = 2166136261 >>> 0
	for (let i = 0; i < outputs.length; i++) {
		const val = outputs[i]
		const str = hasPreview(val) ? val.preview : String(val ?? '')

		for (let j = 0; j < str.length; j++) {
			hash ^= str.charCodeAt(j)
			hash = Math.imul(hash, 16777619)
		}
	}
	return (hash >>> 0).toString(36)
}

type appStatusType = 'uninitialized' | 'loading' | 'idle' | 'waiting' | 'running' | 'error'
type untrustedStatusType = 'uninitialized' | 'trusted' | 'untrusted'
type enviromentType = 'iframe' | 'standalone'
type deviceType = 'desktop' | 'mobile'
type layoutType = 'horizontal' | 'vertical'
export type editorStateType = {
	currentLine: number
	selectionLength: number
	cursorPosition: number
}
type logSummaryType = {
	info: number
	warn: number
	error: number
	total: number
}

const logSummaryDefault: logSummaryType = {
	total: 0,
	error: 0,
	warn: 0,
	info: 0
}

interface AppState {
	status: appStatusType
	enviroment: enviromentType
	device: deviceType
	untrustedStatus: untrustedStatusType
	logs: LogEntry[]
	editorState: editorStateType
	isLayoutReady: boolean
	logSummary: logSummaryType

	setStatus: (value: appStatusType) => void
	setEnviroment: (value: enviromentType) => void
	setDevice: (value: deviceType) => void
	setUntrustedStatus: (value: untrustedStatusType) => void
	updateEditorState: (state: editorStateType) => void
	addLog: (logEntryPayload: ExecutionOutputPayload) => void
	clearLogs: () => void
	toggleIsLayoutReady: () => void
}

const _useAppStore = create<AppState>(set => ({
	status: 'uninitialized',
	untrustedStatus: 'uninitialized',
	enviroment: 'standalone',
	device: 'desktop',
	logs: [],
	editorState: {
		currentLine: 1,
		selectionLength: 0,
		cursorPosition: 0
	},
	isLayoutReady: false,
	logSummary: logSummaryDefault,

	setStatus: status => set({ status }),
	setEnviroment: enviroment => set({ enviroment }),
	setDevice: device => set({ device }),
	clearLogs: () => set({ logs: [], logSummary: { ...logSummaryDefault } }),
	setUntrustedStatus: untrustedStatus => set({ untrustedStatus }),
	updateEditorState: editorState => set({ editorState }),
	toggleIsLayoutReady: () => set({ isLayoutReady: true }),
	addLog: payload => {
		set(state => {
			const newLogs = [...state.logs]
			const lastLog = newLogs[newLogs.length - 1]
			const currentLogKey = getLogOutputKey(payload.outputs)

			if (lastLog && lastLog.type === payload.type && lastLog._outputKey === currentLogKey) {
				lastLog.repeatCount = (lastLog.repeatCount ?? 1) + 1
				lastLog.timestamp = new Date()
			} else {
				newLogs.push({
					...payload,
					outputs: payload.outputs,
					timestamp: new Date(),
					repeatCount: 1,
					_outputKey: currentLogKey,
					id: getInstanceKey()
				})
			}

			const MAX_LOGS = getMaxLogs()

			if (newLogs.length > MAX_LOGS) {
				newLogs.shift()
			}

			const logSummary = state.logSummary
			logSummary.total += 1
			logSummary.error += payload.type === 'error' ? 1 : 0
			logSummary.warn += payload.type === 'warn' ? 1 : 0
			logSummary.info += payload.type === 'info' ? 1 : 0

			return { logs: newLogs, logSummary }
		})
	}
}))

export const useAppStore = createSelectors(_useAppStore)

export const getAppStatus = () => _useAppStore.getState().status
export const getUntrustedStatus = () => _useAppStore.getState().untrustedStatus
export const setAppStatus = (status: appStatusType) => _useAppStore.getState().setStatus(status)
export const addLog = (log: ExecutionOutputPayload) => _useAppStore.getState().addLog(log)
export const clearLogs = () => _useAppStore.getState().clearLogs()

interface AppPersistState {
	layout: layoutType
	persistLogs: boolean

	setLayout: (value: layoutType) => void
	toggleLayout: () => void
	updatePersistLogs: (value: boolean) => void
}

const _useAppPersistStore = create<AppPersistState>()(
	persist(
		set => ({
			layout: 'horizontal',
			persistLogs: false,

			setLayout: layout => set({ layout }),
			toggleLayout: () =>
				set(state => ({
					layout: state.layout === 'horizontal' ? 'vertical' : 'horizontal'
				})),
			updatePersistLogs: persistLogs => set({ persistLogs })
		}),
		{
			name: 'app'
		}
	)
)

export const useAppPersistStore = createSelectors(_useAppPersistStore)

export const getPersistLogsStatus = () => _useAppPersistStore.getState().persistLogs
