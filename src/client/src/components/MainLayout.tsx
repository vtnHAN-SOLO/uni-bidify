import { Header } from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import { ReactNode } from 'react'

interface MainLayoutProps {
	children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
	return (
		<div className="flex h-screen bg-gray-50">
			{/* Sidebar */}
			<Sidebar />

			{/* Main Content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Header */}
				<Header />

				{/* Page Content */}
				<main className="flex-1 overflow-y-auto">
					<div className="container mx-auto py-6">{children}</div>
				</main>
			</div>
		</div>
	)
}
