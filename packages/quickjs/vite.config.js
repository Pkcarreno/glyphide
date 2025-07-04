import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
	plugins: [
		dts(),
		nodePolyfills({
			include: ['process', 'fs', 'path', 'stream'],
			overrides: {
				fs: 'memfs'
			}
		})
	],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: '@glyphide/quickjs',
			fileName: format => `index.${format}.js`,
			formats: ['es'],
			sourcemap: true
		},
		assetsDir: '.',
		outDir: 'dist'
	}
})
