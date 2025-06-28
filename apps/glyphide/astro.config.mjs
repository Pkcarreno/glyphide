import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import AstroPWA from '@vite-pwa/astro'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, envField } from 'astro/config'
import robots from 'astro-robots'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'
import { config, manifest } from './src/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageJsonPath = resolve(__dirname, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

// https://astro.build/config
export default defineConfig({
	output: 'static',
	site: config.site === '/' ? undefined : config.site,
	server: {
		host: true,
		port: 4000
	},
	env: {
		schema: {
			BASE_URL: envField.string({
				context: 'client',
				access: 'public',
				default: '/'
			})
		}
	},
	build: {
		sourceMaps: true,
		inlineStylesheets: 'always'
	},
	compressHTML: true,
	prefetch: true,
	integrations: [
		react(),
		robots(),
		sitemap(),
		AstroPWA({
			strategies: 'generateSW',
			registerType: 'prompt',
			injectRegister: null,
			manifest: manifest,
			workbox: {
				globPatterns: ['**/*.{html,js,css,svg,woff,woff2,ttf,eot,ico,wasm}'],
				maximumFileSizeToCacheInBytes: 5000000,
				sourcemap: true
			},
			devOptions: {
				enabled: true,
				type: 'module'
			}
		})
	],
	vite: {
		plugins: [basicSsl(), tailwindcss(), wasm(), topLevelAwait()],
		define: {
			'import.meta.env.APP_VERSION': JSON.stringify(packageJson.version)
		},
		worker: {
			plugins: () => [wasm(), topLevelAwait()]
		}
	}
})
