import { decode as decodeUriBase64, encodeURI as encodeUriBase64 } from 'js-base64'
import { z } from 'zod/v4'

const VERSIONS = {
	v1: 'v1',
	v2: 'v2'
}
const LATEST_VERSION = VERSIONS.v2

interface MigratedData {
	code: string
	title?: string
}

export type MigrationResult =
	| { success: true; url: string; meta: MigratedData; isLatest: boolean }
	| { success: false; error: string }

export function migrateUrl(urlString: string): MigrationResult {
	try {
		if (typeof urlString !== 'string' || urlString.trim().length < 1) {
			console.warn('Migrate: Input URL string is empty or whitespace-only.')
			throw new Error('The provided URL is empty. Please enter a valid link.')
		}

		const url = new URL(urlString)

		const version = detectUrlVersion(url)
		const data = extractDataByVersion(url, version)

		if (!data.code && !data.title) {
			return {
				success: false,
				error: 'No relevant migration data found in the provided URL. Please check the link.'
			}
		}

		const newUrl = buildNewUrl(data)

		return {
			success: true,
			url: newUrl.toString(),
			meta: data,
			isLatest: version === LATEST_VERSION
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'An unknown error occurred while processing the URL. Please try again.'
		}
	}
}

function detectUrlVersion(url: URL): string {
	if (url.hash?.startsWith('#code=')) {
		return VERSIONS.v1
	}

	if (url.searchParams.has('c') || url.searchParams.has('t')) {
		return VERSIONS.v2
	}

	console.warn(`Migrate: Could not determine URL version. URL: ${url.toString()}`)
	throw new Error('Unable to identify the URL format. Please check the link and try again.')
}

function extractDataByVersion(url: URL, version: string): MigratedData {
	switch (version) {
		case VERSIONS.v1:
			try {
				const hashContent = url.hash.substring('#code='.length)
				console.log('hash', hashContent)
				const base64ValidationResult = z.base64url().safeParse(hashContent)

				if (base64ValidationResult.error) {
					console.warn(
						`Migrate: Base64 validation error in v1 URL. Zod message: ${base64ValidationResult.error.message}. Hash: ${hashContent}`
					)
					throw new Error(
						'The URL matches v1 format but contains invalid data. Please check the link.'
					)
				}

				const decodedContent = decodeUriBase64(hashContent)
				const parsedState = JSON.parse(JSON.parse(decodedContent))
				console.log('parsedState', parsedState)
				const code = parsedState?.state?.code || ''
				const title = parsedState?.state?.title || ''
				return { code, title }
			} catch (error) {
				console.warn('Migrate: Failed to decode or parse data from v1 URL. Error:', error)
				throw new Error(
					'Could not retrieve data from the v1 URL. It appears to be corrupted or incomplete.'
				)
			}
		case VERSIONS.v2: {
			const rawCode = url.searchParams.get('c') || ''
			const rawTitle = url.searchParams.get('t') || ''

			const evaluationCandidate = {
				code: rawCode,
				title: rawTitle
			}

			const returnCandidate = {
				code: decodeUriBase64(rawCode),
				title: decodeUriBase64(rawTitle)
			}

			const base64ValidationResult = z
				.object({
					code: z.base64url(),
					title: z.base64url().optional()
				})
				.safeParse(evaluationCandidate)

			if (base64ValidationResult.error) {
				console.warn(
					`Migrate: Base53 validation error in v2 URL data. Zod message: ${base64ValidationResult.error.message}. Data:`,
					evaluationCandidate
				)
				throw new Error(
					'The URL matches v2 format but contains invalid data. Please check the link.'
				)
			}

			return returnCandidate
		}
		default:
			console.warn(`Migrate: Received unknown URL version: ${version}. This should not happen.`)
			throw new Error('An unknown URL version was encountered. This indicates an internal problem.')
	}
}

function buildNewUrl(data: MigratedData): URL {
	const baseUrl = new URL('https://glyphide.com/')
	if (data.code) {
		baseUrl.searchParams.set('c', encodeUriBase64(data.code))
	}
	if (data.title) {
		baseUrl.searchParams.set('t', encodeUriBase64(data.title))
	}

	return baseUrl
}
