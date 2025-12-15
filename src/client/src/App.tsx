// src/App.tsx

import { Toaster } from '@/components/ui/feedback/toaster'
import { Toaster as Sonner } from '@/components/ui/feedback/sonner'
import { TooltipProvider } from '@/components/ui/overlay/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicRoute } from '@/components/auth/PublicRoute'
import { AdminOnlyRoute } from '@/components/auth/AdminOnlyRoute' // ✅ NEW
import { NonAdminRoute } from '@/components/auth/NonAdminRoute' // ✅ NEW
import { UserRole } from '@/services/types/auth.types'
import { RecaptchaProvider } from '@/components/providers/RecaptchaProvider'
import { WatchlistProvider } from './contexts/WatchlistContext'

// Pages
import Index from './pages/Index'
import ProductDetail from './pages/ProductDetail'
import Auth from './pages/Auth'
import CategoryProducts from './pages/CategoryProducts'
import Search from './pages/Search'
import CreateProduct from './pages/CreateProduct'
import SellerProducts from './pages/SellerProducts'
import EditProductDescription from './pages/EditProductDescription'
import OrderCompletion from './pages/OrderCompletion'
import NotFound from './pages/NotFound'
import ForgotPassword from './pages/ForgotPassword'
import VerifyOTP from './pages/VerifyOTP'
import WatchList from './pages/WatchList'
import BidderProfile from './pages/BidderProfile'
import SellerProfile from './pages/SellerProfile'
import AdminProfile from './pages/admin/AdminProfile'
import { ProductsList } from './pages/ProductsList'

// Admin pages
import AdminCategories from './pages/admin/AdminCategories'
import AdminProducts from './pages/admin/AdminProducts'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAuctionSettings from './pages/admin/AdminAuctionSettings'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
})

const App = () => (
	<QueryClientProvider client={queryClient}>
		<RecaptchaProvider>
			<TooltipProvider>
				<Toaster />
				<Sonner />
				<BrowserRouter>
					<AuthProvider>
						<WatchlistProvider>
							<Routes>
								{/* ✅ Public Routes - Admin không được vào */}
								<Route
									path="/"
									element={
										<NonAdminRoute>
											<Index />
										</NonAdminRoute>
									}
								/>
								<Route
									path="/products/:id"
									element={<ProductDetail />}
								/>
								<Route
									path="/category/:categoryName"
									element={
										<NonAdminRoute>
											<CategoryProducts />
										</NonAdminRoute>
									}
								/>
								<Route
									path="/search"
									element={
										<NonAdminRoute>
											<Search />
										</NonAdminRoute>
									}
								/>
								<Route
									path="/products"
									element={
										<NonAdminRoute>
											<ProductsList />
										</NonAdminRoute>
									}
								/>

								{/* Auth Routes - Redirect if already logged in */}
								<Route
									path="/auth"
									element={
										<PublicRoute>
											<Auth />
										</PublicRoute>
									}
								/>
								<Route
									path="/verify-otp"
									element={
										<PublicRoute>
											<VerifyOTP />
										</PublicRoute>
									}
								/>
								<Route
									path="/forgot-password"
									element={
										<PublicRoute>
											<ForgotPassword />
										</PublicRoute>
									}
								/>

								{/* ✅ Protected Routes - Bidder/Seller only (Admin redirect to /admin/users) */}
								<Route
									path="/profile"
									element={
										<ProtectedRoute>
											<NonAdminRoute>
												<BidderProfile />
											</NonAdminRoute>
										</ProtectedRoute>
									}
								/>
								<Route
									path="/watchlist"
									element={
										<ProtectedRoute>
											<NonAdminRoute>
												<WatchList />
											</NonAdminRoute>
										</ProtectedRoute>
									}
								/>
								<Route
									path="/order-completion"
									element={
										<ProtectedRoute>
											<NonAdminRoute>
												<OrderCompletion />
											</NonAdminRoute>
										</ProtectedRoute>
									}
								/>

								{/* ✅ Seller Routes - Admin không được vào */}
								<Route
									path="/seller/profile"
									element={
										<ProtectedRoute
											allowedRoles={[UserRole.SELLER]}
										>
											<SellerProfile />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/seller/products"
									element={
										<ProtectedRoute
											allowedRoles={[UserRole.SELLER]}
										>
											<SellerProducts />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/seller/products/new"
									element={
										<ProtectedRoute
											allowedRoles={[UserRole.SELLER]}
										>
											<CreateProduct />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/seller/products/:id/edit"
									element={
										<ProtectedRoute
											allowedRoles={[UserRole.SELLER]}
										>
											<EditProductDescription />
										</ProtectedRoute>
									}
								/>

								{/* ✅ Admin Routes - Chỉ Admin mới vào được */}
								<Route
									path="/admin/profile"
									element={
										<AdminOnlyRoute>
											<AdminProfile />
										</AdminOnlyRoute>
									}
								/>
								<Route
									path="/admin/categories"
									element={
										<AdminOnlyRoute>
											<AdminCategories />
										</AdminOnlyRoute>
									}
								/>
								<Route
									path="/admin/products"
									element={
										<AdminOnlyRoute>
											<AdminProducts />
										</AdminOnlyRoute>
									}
								/>
								<Route
									path="/admin/users"
									element={
										<AdminOnlyRoute>
											<AdminUsers />
										</AdminOnlyRoute>
									}
								/>
								<Route
									path="/admin/auction-settings"
									element={
										<AdminOnlyRoute>
											<AdminAuctionSettings />
										</AdminOnlyRoute>
									}
								/>

								{/* 404 Route */}
								<Route path="*" element={<NotFound />} />
							</Routes>
						</WatchlistProvider>
					</AuthProvider>
				</BrowserRouter>
			</TooltipProvider>
		</RecaptchaProvider>
	</QueryClientProvider>
)

export default App
