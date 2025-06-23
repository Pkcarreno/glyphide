export default {
	'**/*.{html,js,jsx,svelte,ts,tsx,vue,md,mdx,json}': filenames => [
		`npx biome check --write ${filenames.map(filename => `"${filename}"`).join(' ')}`
	],
	'**/*.astro': filenames =>
		`npx prettier --write ${filenames.map(filename => `"${filename}"`).join(' ')}`
}
