import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { MigrationForm } from './MigrationForm'

export const LinkMigrationWidget = () => {
	return (
		<Card className="mx-4 w-full max-w-2xl">
			<CardHeader>
				<CardTitle>Migrate Your Code</CardTitle>
				<CardDescription>
					Convert your existing JSOD/Glyphide links to work with the current version. <br /> Paste
					your old link below and get an updated version instantly.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<MigrationForm />
			</CardContent>
		</Card>
	)
}
