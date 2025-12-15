// src/components/auth/PublicRoute.tsx

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/services/types/auth.types'

interface PublicRouteProps {
	children: React.ReactNode
	redirectIfAuthenticated?: boolean
	redirectTo?: string
}

export const PublicRoute = ({
	children,
	redirectIfAuthenticated = true,
	redirectTo = '/',
}: PublicRouteProps) => {
	const { user, isAuthenticated, isLoading } = useAuth()

	// Show loading while checking auth
	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-muted-foreground">Đang tải...</p>
			</div>
		)
	}

	// ✅ Redirect authenticated users
	if (redirectIfAuthenticated && isAuthenticated) {
		// ✅ Admin redirect to admin dashboard
		if (user?.role === UserRole.ADMIN) {
			return <Navigate to="/admin/users" replace />
		}
		// Bidder/Seller redirect to home
		return <Navigate to={redirectTo} replace />
	}

	return <>{children}</>
}
