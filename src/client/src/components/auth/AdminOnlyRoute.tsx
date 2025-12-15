// src/components/auth/AdminOnlyRoute.tsx

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/services/types/auth.types'
import { Loader2 } from 'lucide-react'

interface AdminOnlyRouteProps {
	children: React.ReactNode
}

/**
 * ✅ Route chỉ dành cho Admin
 * - Nếu chưa login → redirect to /auth
 * - Nếu không phải Admin → redirect to /
 */
export const AdminOnlyRoute = ({ children }: AdminOnlyRouteProps) => {
	const { user, isAuthenticated, isLoading } = useAuth()

	// Show loading spinner while checking auth
	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	// Redirect to auth if not authenticated
	if (!isAuthenticated) {
		return <Navigate to="/auth" replace />
	}

	// Redirect to home if not admin
	if (user?.role !== UserRole.ADMIN) {
		return <Navigate to="/" replace />
	}

	return <>{children}</>
}
