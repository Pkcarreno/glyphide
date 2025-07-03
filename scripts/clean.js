import { readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const itemsToDelete = {
	folders: ['node_modules', 'dist', 'dev-dist', '.turbo', '.astro'],
	files: ['pnpm-lock.yaml']
}

function cleanDirectory(directory) {
	readdirSync(directory).forEach(item => {
		const fullPath = join(directory, item)
		try {
			const stats = statSync(fullPath)
			if (stats.isDirectory()) {
				if (itemsToDelete.folders.includes(item)) {
					console.log(`Deleting dir: ${fullPath}`)
					rmSync(fullPath, { recursive: true, force: true })
				} else {
					cleanDirectory(fullPath)
				}
			} else if (stats.isFile()) {
				if (itemsToDelete.files.includes(item)) {
					console.log(`Deleting file: ${fullPath}`)
					rmSync(fullPath, { force: true })
				}
			}
		} catch (error) {
			console.error(`Error on ${fullPath}: ${error.message}`)
		}
	})
}

console.log('Start cleaning proyect...')
cleanDirectory(process.cwd())
console.log('Cleaning done.')
