import { useMediaQuery } from './use-media-query'

const MOBILE_BREAKPOINT = 1020

export function useIsCompactLayout() {
	const isCompactLayout = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

	return !!isCompactLayout
}
