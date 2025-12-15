// src/components/auth/NonAdminRoute.tsx

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/services/types/auth.types'
import { Loader2 } from 'lucide-react'

interface NonAdminRouteProps {
	children: React.ReactNode
}

/**
 * ✅ Route cho Bidder/Seller - Admin không được vào
 * - Nếu là Admin → redirect to /admin/users (hoặc trang admin mặc định)
 */
export const NonAdminRoute = ({ children }: NonAdminRouteProps) => {
	const { user, isLoading } = useAuth()

	// Show loading spinner while checking auth
	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	// ✅ Redirect Admin to admin dashboard
	if (user?.role === UserRole.ADMIN) {
		return <Navigate to="/admin/categories" replace />
	}

	return <>{children}</>
}
