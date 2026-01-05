import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ReactNode } from 'react'

interface MainLayoutProps {
	children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			{/* Header */}
			<Header />

			{/* Page Content */}
			<main className="flex-1">
				<div className="container mx-auto px-6 py-6">{children}</div>
			</main>

			{/* Footer */}
			<Footer />
		</div>
	)
}
