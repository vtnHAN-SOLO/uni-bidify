import { Header } from '@/components/Header'
import { ReactNode } from 'react'

interface MainLayoutProps {
	children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<Header />

			{/* Page Content */}
			<main>
				<div className="container mx-auto px-6 py-6">{children}</div>
			</main>
		</div>
	)
}
