import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/input/button'
import { Input } from '@/components/ui/input/input'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/data-display/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/data-display/table'
import { Badge } from '@/components/ui/data-display/badge'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/navigation/tabs'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/overlay/dialog'
import { Label } from '@/components/ui/input/label'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/overlay/alert-dialog'
import { Eye, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { adminApi } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import type { CreateUserRequest } from '@/services/types'

export default function AdminUsers() {
	const [isAddUserOpen, setIsAddUserOpen] = useState(false)
	const [selectedUserForView, setSelectedUserForView] = useState<any>(null)
	const [isViewUserOpen, setIsViewUserOpen] = useState(false)
	const [newUserData, setNewUserData] = useState<CreateUserRequest>({
		firstName: '',
		lastName: '',
		email: '',
		address: '',
		role: 'ROLE BIDDER',
	})
	const queryClient = useQueryClient()
	const { toast } = useToast()

	// ✅ Fetch users
	const {
		data: usersData = { users: [], pagination: {} },
		isLoading: usersLoading,
	} = useQuery({
		queryKey: ['admin', 'users'],
		queryFn: () => adminApi.getUsers(1, 100),
	})

	const users = usersData.users || []

	// ✅ Fetch upgrade requests
	const { data: upgradeRequests = [], isLoading: requestsLoading } = useQuery(
		{
			queryKey: ['admin', 'upgrade-requests'],
			queryFn: adminApi.getUpgradeRequests,
		}
	)

	// ✅ Approve upgrade mutation
	const approveMutation = useMutation({
		mutationFn: adminApi.approveUpgrade,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin', 'upgrade-requests'],
			})
			queryClient.invalidateQueries({
				queryKey: ['admin', 'users'],
			})
			toast({
				title: 'Thành công',
				description: 'Nâng cấp đã được chấp nhận',
			})
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error ||
					'Không thể chấp nhận nâng cấp',
				variant: 'destructive',
			})
		},
	})

	// ✅ Reject upgrade mutation
	const rejectMutation = useMutation({
		mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
			adminApi.rejectUpgrade(userId, reason),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin', 'upgrade-requests'],
			})
			queryClient.invalidateQueries({
				queryKey: ['admin', 'users'],
			})
			toast({
				title: 'Thành công',
				description: 'Nâng cấp đã bị từ chối',
			})
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error ||
					'Không thể từ chối nâng cấp',
				variant: 'destructive',
			})
		},
	})

	// ✅ Create user mutation
	const createUserMutation = useMutation({
		mutationFn: adminApi.createUser,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin', 'users'],
			})
			setIsAddUserOpen(false)
			setNewUserData({
				firstName: '',
				lastName: '',
				email: '',
				address: '',
				role: 'ROLE BIDDER',
			})
			toast({
				title: 'Thành công',
				description: 'Người dùng đã được thêm',
			})
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error || 'Không thể thêm người dùng',
				variant: 'destructive',
			})
		},
	})

	// ✅ Delete user mutation
	const deleteUserMutation = useMutation({
		mutationFn: adminApi.deleteUser,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin', 'users'],
			})
			toast({
				title: 'Thành công',
				description: 'Người dùng đã được xóa',
			})
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error || 'Không thể xóa người dùng',
				variant: 'destructive',
			})
		},
	})

	const handleApprove = (userId: string) => {
		approveMutation.mutate(userId)
	}

	const handleReject = (userId: string) => {
		const reason = prompt('Vui lòng nhập lý do từ chối:')
		if (reason) {
			rejectMutation.mutate({ userId, reason })
		}
	}

	const handleCreateUser = () => {
		if (
			!newUserData.firstName.trim() ||
			!newUserData.lastName.trim() ||
			!newUserData.email.trim()
		) {
			toast({
				title: 'Lỗi',
				description: 'Vui lòng nhập tên, họ và email người dùng',
				variant: 'destructive',
			})
			return
		}

		createUserMutation.mutate(newUserData)
	}

	const handleDeleteUser = (userId: string, userName: string) => {
		if (confirm(`Bạn có chắc muốn xóa người dùng ${userName}?`)) {
			deleteUserMutation.mutate(userId)
		}
	}

	const getRoleDisplay = (role: string) => {
		switch (role) {
			case 'ROLE ADMIN':
				return {
					label: 'Quản trị viên',
					variant: 'destructive' as const,
				}
			case 'ROLE SELLER':
				return { label: 'Người bán', variant: 'default' as const }
			case 'ROLE BIDDER':
				return { label: 'Người mua', variant: 'secondary' as const }
			default:
				return { label: 'Không xác định', variant: 'outline' as const }
		}
	}

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader />

			<main className="container py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-2">
						Quản lý người dùng
					</h1>
					<p className="text-muted-foreground">
						Quản lý tài khoản người dùng và yêu cầu nâng cấp
					</p>
				</div>

				{/* View User Profile Dialog */}
				<Dialog open={isViewUserOpen} onOpenChange={setIsViewUserOpen}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Hồ sơ người dùng</DialogTitle>
							<DialogDescription>
								Xem thông tin chi tiết của người dùng
							</DialogDescription>
						</DialogHeader>
						{selectedUserForView && (
							<div className="space-y-6">
								{/* User Avatar & Basic Info */}
								<div className="flex items-start gap-4">
									<div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
										{selectedUserForView.fullName?.charAt(
											0
										) || 'U'}
									</div>
									<div className="flex-1">
										<h3 className="text-lg font-semibold">
											{selectedUserForView.fullName}
										</h3>
										<p className="text-sm text-muted-foreground">
											{selectedUserForView.email}
										</p>
										<div className="flex gap-2 mt-2">
											<Badge
												variant={
													getRoleDisplay(
														selectedUserForView.role
													).variant
												}
											>
												{
													getRoleDisplay(
														selectedUserForView.role
													).label
												}
											</Badge>
											<Badge
												variant={
													selectedUserForView.status ===
													'active'
														? 'default'
														: 'destructive'
												}
											>
												{selectedUserForView.status ===
												'active'
													? 'Hoạt động'
													: 'Bị chặn'}
											</Badge>
										</div>
									</div>
								</div>

								{/* Profile Details */}
								<div className="grid grid-cols-2 gap-4 border-t pt-4">
									<div>
										<p className="text-sm text-muted-foreground">
											Họ
										</p>
										<p className="font-medium">
											{selectedUserForView.firstName ||
												'N/A'}
										</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											Tên
										</p>
										<p className="font-medium">
											{selectedUserForView.lastName ||
												'N/A'}
										</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											Địa chỉ
										</p>
										<p className="font-medium">
											{selectedUserForView.address ||
												'Chưa cập nhật'}
										</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											Xác thực
										</p>
										<p className="font-medium">
											{selectedUserForView.isVerified
												? '✓ Đã xác thực'
												: '✗ Chưa xác thực'}
										</p>
									</div>
								</div>

								{/* Rating Info */}
								<div className="border-t pt-4">
									<p className="text-sm text-muted-foreground mb-3">
										Đánh giá
									</p>
									<div className="grid grid-cols-3 gap-4">
										<div className="bg-muted p-3 rounded">
											<p className="text-2xl font-bold">
												{selectedUserForView.rating}%
											</p>
											<p className="text-xs text-muted-foreground">
												Tỷ lệ tích cực
											</p>
										</div>
										<div className="bg-green-50 dark:bg-green-950 p-3 rounded">
											<p className="text-2xl font-bold text-green-600">
												{selectedUserForView.positiveReviews ||
													0}
											</p>
											<p className="text-xs text-muted-foreground">
												Tích cực
											</p>
										</div>
										<div className="bg-red-50 dark:bg-red-950 p-3 rounded">
											<p className="text-2xl font-bold text-red-600">
												{selectedUserForView.negativeReviews ||
													0}
											</p>
											<p className="text-xs text-muted-foreground">
												Tiêu cực
											</p>
										</div>
									</div>
								</div>

								{/* Joined Date */}
								<div className="border-t pt-4">
									<p className="text-sm text-muted-foreground">
										Ngày tham gia
									</p>
									<p className="font-medium">
										{new Date(
											selectedUserForView.createdAt
										).toLocaleDateString('vi-VN')}
									</p>
								</div>
							</div>
						)}
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setIsViewUserOpen(false)}
							>
								Đóng
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Tabs defaultValue="users" className="space-y-6">
					<div className="flex items-center justify-between mb-4">
						<TabsList>
							<TabsTrigger value="users">
								Danh sách người dùng
							</TabsTrigger>
							<TabsTrigger value="upgrade-requests">
								Yêu cầu nâng cấp
							</TabsTrigger>
						</TabsList>
						{/* Add User Button - only on users tab */}
						<div id="add-user-btn-container" />
					</div>

					<TabsContent value="users">
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>
											Danh sách người dùng
										</CardTitle>
										<CardDescription>
											Tổng cộng {users.length} người dùng
										</CardDescription>
									</div>
									<Dialog
										open={isAddUserOpen}
										onOpenChange={setIsAddUserOpen}
									>
										<DialogTrigger asChild>
											<Button size="lg">
												<Plus className="h-5 w-5 mr-2" />
												Thêm người dùng
											</Button>
										</DialogTrigger>
										<DialogContent className="max-w-md">
											<DialogHeader>
												<DialogTitle>
													Thêm người dùng mới
												</DialogTitle>
												<DialogDescription>
													Tạo tài khoản người dùng mới
												</DialogDescription>
											</DialogHeader>
											<div className="space-y-4 py-4">
												<div className="space-y-2">
													<Label>Họ</Label>
													<Input
														placeholder="Nhập họ"
														value={
															newUserData.firstName
														}
														onChange={(e) =>
															setNewUserData({
																...newUserData,
																firstName:
																	e.target
																		.value,
															})
														}
													/>
												</div>
												<div className="space-y-2">
													<Label>Tên</Label>
													<Input
														placeholder="Nhập tên"
														value={
															newUserData.lastName
														}
														onChange={(e) =>
															setNewUserData({
																...newUserData,
																lastName:
																	e.target
																		.value,
															})
														}
													/>
												</div>
												<div className="space-y-2">
													<Label>Email</Label>
													<Input
														type="email"
														placeholder="Nhập email"
														value={
															newUserData.email
														}
														onChange={(e) =>
															setNewUserData({
																...newUserData,
																email: e.target
																	.value,
															})
														}
													/>
												</div>
												<div className="space-y-2">
													<Label>
														Địa chỉ (tùy chọn)
													</Label>
													<Input
														placeholder="Nhập địa chỉ"
														value={
															newUserData.address ||
															''
														}
														onChange={(e) =>
															setNewUserData({
																...newUserData,
																address:
																	e.target
																		.value,
															})
														}
													/>
												</div>
												<div className="space-y-2">
													<Label>Vai trò</Label>
													<select
														value={
															newUserData.role ||
															'ROLE BIDDER'
														}
														onChange={(e) =>
															setNewUserData({
																...newUserData,
																role: e.target
																	.value as any,
															})
														}
														className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
													>
														<option value="ROLE BIDDER">
															Người mua
														</option>
														<option value="ROLE SELLER">
															Người bán
														</option>
													</select>
												</div>
											</div>
											<DialogFooter>
												<Button
													variant="outline"
													onClick={() =>
														setIsAddUserOpen(false)
													}
												>
													Hủy
												</Button>
												<Button
													onClick={handleCreateUser}
													disabled={
														createUserMutation.isPending
													}
												>
													{createUserMutation.isPending
														? 'Đang tạo...'
														: 'Tạo người dùng'}
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</div>
							</CardHeader>
							<CardContent>
								{usersLoading ? (
									<div className="flex justify-center py-8">
										<p className="text-muted-foreground">
											Đang tải dữ liệu...
										</p>
									</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>ID</TableHead>
												<TableHead>Họ tên</TableHead>
												<TableHead>Email</TableHead>
												<TableHead>Vai trò</TableHead>
												<TableHead className="text-right">
													Thao tác
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{users.map((user) => (
												<TableRow key={user.id}>
													<TableCell>
														{user.id.slice(0, 8)}
														...
													</TableCell>
													<TableCell className="font-medium">
														{user.fullName}
													</TableCell>
													<TableCell>
														{user.email}
													</TableCell>
													<TableCell>
														<Badge
															variant={
																getRoleDisplay(
																	user.role
																).variant
															}
														>
															{
																getRoleDisplay(
																	user.role
																).label
															}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-2">
															<Button
																variant="outline"
																size="sm"
																onClick={() => {
																	setSelectedUserForView(
																		user
																	)
																	setIsViewUserOpen(
																		true
																	)
																}}
															>
																<Eye className="h-4 w-4" />
															</Button>
															<AlertDialog>
																<AlertDialogTrigger
																	asChild
																>
																	<Button
																		variant="destructive"
																		size="sm"
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Xóa
																			người
																			dùng
																		</AlertDialogTitle>
																		<AlertDialogDescription>
																			Bạn
																			có
																			chắc
																			muốn
																			xóa
																			người
																			dùng{' '}
																			<strong>
																				{
																					user.fullName
																				}
																			</strong>
																			?
																			Hành
																			động
																			này
																			không
																			thể
																			hoàn
																			tác.
																		</AlertDialogDescription>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Hủy
																		</AlertDialogCancel>
																		<AlertDialogAction
																			onClick={() =>
																				handleDeleteUser(
																					user.id,
																					user.fullName
																				)
																			}
																			className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																		>
																			Xóa
																		</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="upgrade-requests">
						<Card>
							<CardHeader>
								<CardTitle>Yêu cầu nâng cấp Seller</CardTitle>
								<CardDescription>
									Danh sách bidder xin nâng cấp tài khoản
									thành seller
								</CardDescription>
							</CardHeader>
							<CardContent>
								{requestsLoading ? (
									<div className="flex justify-center py-8">
										<p className="text-muted-foreground">
											Đang tải dữ liệu...
										</p>
									</div>
								) : upgradeRequests.length === 0 ? (
									<div className="flex justify-center py-8">
										<p className="text-muted-foreground">
											Không có yêu cầu nâng cấp nào
										</p>
									</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>ID</TableHead>
												<TableHead>Họ tên</TableHead>
												<TableHead>Email</TableHead>
												<TableHead>
													Ngày yêu cầu
												</TableHead>
												<TableHead>Đánh giá</TableHead>
												<TableHead className="text-right">
													Thao tác
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{upgradeRequests.map((request) => (
												<TableRow key={request.id}>
													<TableCell>
														{request.id.slice(0, 8)}
														...
													</TableCell>
													<TableCell className="font-medium">
														{request.fullName}
													</TableCell>
													<TableCell>
														{request.email}
													</TableCell>
													<TableCell>
														{new Date(
															request.requestedAt
														).toLocaleDateString(
															'vi-VN'
														)}
													</TableCell>
													<TableCell>
														{request.rating}%
														<span className="text-xs text-muted-foreground ml-1">
															(
															{
																request.totalReviews
															}{' '}
															đánh giá)
														</span>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-2">
															<Button
																variant="default"
																size="sm"
																onClick={() =>
																	handleApprove(
																		request.id
																	)
																}
																disabled={
																	approveMutation.isPending
																}
															>
																<CheckCircle className="h-4 w-4 mr-1" />
																Chấp nhận
															</Button>
															<Button
																variant="destructive"
																size="sm"
																onClick={() =>
																	handleReject(
																		request.id
																	)
																}
																disabled={
																	rejectMutation.isPending
																}
															>
																<XCircle className="h-4 w-4 mr-1" />
																Từ chối
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</main>
		</div>
	)
}
