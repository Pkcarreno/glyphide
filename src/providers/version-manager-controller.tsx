// import { useRegisterSW } from 'virtual:pwa-register/react'
// import { useVersionManagerStore } from '@/stores/version-manager'
// import { RefreshCwIcon } from 'lucide-react'
// import { useEffect } from 'react'
// import { toast } from 'sonner'
//
// const intervalMS = 60 * 60 * 1000

export const VersionManagerController = () => {
	// const { setNeedRefresh, setUpdateServiceWorkerAction } = useVersionManagerStore()

	// const {
	// 	offlineReady: [offlineReady, setOfflineReady],
	// 	needRefresh: [needRefreshSW],
	// 	updateServiceWorker
	// } = useRegisterSW({
	// 	onRegistered(r) {
	// 		if (r) {
	// 			setUpdateServiceWorkerAction(async () => r.update())
	// 			setInterval(() => {
	// 				r.update()
	// 			}, intervalMS)
	// 			console.log('ServiceWorker: Registered')
	// 		} else {
	// 			console.log('ServiceWorker: Not registered', r)
	// 			setUpdateServiceWorkerAction(async () => {
	// 				console.error(
	// 					'ServiceWorker: update function not available because ServiceWorker is not registered.'
	// 				)
	// 			})
	// 		}
	// 	},
	// 	onRegisterError(error) {
	// 		console.error('ServiceWorker: registration error', error)
	// 		setUpdateServiceWorkerAction(async () => {
	// 			console.error('ServiceWorker: update function not available due to registration error.')
	// 		})
	// 	}
	// })

	// useEffect(() => {
	// 	setNeedRefresh(needRefreshSW)
	// }, [needRefreshSW, setNeedRefresh])

	// useEffect(() => {
	// 	if (offlineReady) {
	// 		const onOfflineClose = () => setOfflineReady(false)
	// 		toast('App ready to work offline', {
	// 			onDismiss: onOfflineClose,
	// 			onAutoClose: onOfflineClose
	// 		})
	// 	}
	// }, [offlineReady, setOfflineReady])

	// useEffect(() => {
	// 	if (needRefreshSW) {
	// 		toast('New content available', {
	// 			description: 'click on reload button to update',
	// 			icon: <RefreshCwIcon className="size-4" />,
	// 			action: {
	// 				label: 'Reload',
	// 				onClick: () => updateServiceWorker(true)
	// 			}
	// 		})
	// 	}
	// }, [needRefreshSW, updateServiceWorker])

	return null
}
