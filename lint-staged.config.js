export default {
	'**/*.{html,js,jsx,ts,tsx,json}': filenames => [
		`npx biome check --write ${filenames.map(filename => `"${filename}"`).join(' ')}`
	],
	'**/*.astro': filenames =>
		`npx prettier --write ${filenames.map(filename => `"${filename}"`).join(' ')}`
}
