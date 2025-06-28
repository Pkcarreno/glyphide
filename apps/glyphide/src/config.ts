const rawUrl =
	process.env.NODE_ENV === 'development' ? 'https://localhost:4000' : process.env.BASE_URL || ''
const Url = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`

export const config = {
	site: Url
}

export const manifest = {
	name: 'Glyphide',
	short_name: 'Glyphide',
	id: 'com.pkcarreno.glyphide',
	start_url: config.site,
	display: 'standalone',
	background_color: '#FDFEFB',
	theme_color: '#fdfefb',
	description: 'Write, run, and share JavaScript code instantly.',
	prefer_related_applications: false,
	categories: ['productivity', 'utilities'],
	orientation: 'portrait',
	dir: 'ltr',
	shortcuts: [
		{
			name: 'New Editor',
			url: config.site,
			description: 'Open new editor'
		}
	],
	icons: [
		{
			src: '/pwa-192x192.png',
			sizes: '192x192',
			type: 'image/png',
			purpose: 'any'
		},
		{
			src: '/pwa-512x512.png',
			sizes: '512x512',
			type: 'image/png',
			purpose: 'any'
		},
		{
			src: '/pwa-maskable-192x192.png',
			sizes: '192x192',
			type: 'image/png',
			purpose: 'maskable'
		},
		{
			src: '/pwa-maskable-512x512.png',
			sizes: '512x512',
			type: 'image/png',
			purpose: 'maskable'
		}
	]
}
