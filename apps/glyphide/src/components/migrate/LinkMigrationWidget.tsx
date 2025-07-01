import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { MigrationForm } from './MigrationForm'

export const LinkMigrationWidget = () => {
	return (
		<Card className="mx-4 w-full max-w-2xl">
			<CardHeader>
				<CardTitle>Link Migration</CardTitle>
				<CardDescription>
					Convert your old-version JSOD/Glyphide script links to the latest format.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<MigrationForm />
			</CardContent>
		</Card>
	)
}
