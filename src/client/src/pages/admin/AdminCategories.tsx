import { useState, useEffect } from 'react'
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
import { Plus, Edit, Trash2 } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { adminApi } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import type { AdminCategory } from '@/services/types'

export default function AdminCategories() {
	const [isOpen, setIsOpen] = useState(false)
	const [isEditOpen, setIsEditOpen] = useState(false)
	const [newCategoryName, setNewCategoryName] = useState('')
	const [parentCategory, setParentCategory] = useState('')
	const [editingCategory, setEditingCategory] =
		useState<AdminCategory | null>(null)
	const [editName, setEditName] = useState('')
	const [editParent, setEditParent] = useState('')
	const queryClient = useQueryClient()
	const { toast } = useToast()

	// ✅ Fetch categories
	const { data: categories = [], isLoading } = useQuery({
		queryKey: ['admin', 'categories'],
		queryFn: adminApi.getCategories,
	})

	// ✅ Create category mutation
	const createMutation = useMutation({
		mutationFn: adminApi.createCategory,
		onSuccess: (newCategory) => {
			queryClient.invalidateQueries({
				queryKey: ['admin', 'categories'],
			})
			setIsOpen(false)
			setNewCategoryName('')
			setParentCategory('')
			toast({
				title: 'Thành công',
				description: 'Danh mục đã được thêm',
			})
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error || 'Không thể thêm danh mục',
				variant: 'destructive',
			})
		},
	})

	// ✅ Delete category mutation
	const deleteMutation = useMutation({
		mutationFn: adminApi.deleteCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin', 'categories'],
			})
			toast({
				title: 'Thành công',
				description: 'Danh mục đã được xóa',
			})
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error || 'Không thể xóa danh mục',
				variant: 'destructive',
			})
		},
	})

	// ✅ Update category mutation
	const updateMutation = useMutation({
		mutationFn: ({
			categoryId,
			data,
		}: {
			categoryId: string
			data: { name: string; parent?: string | null }
		}) => adminApi.updateCategory(categoryId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin', 'categories'],
			})
			setIsEditOpen(false)
			setEditingCategory(null)
			setEditName('')
			setEditParent('')
			toast({
				title: 'Thành công',
				description: 'Danh mục đã được cập nhật',
			})
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error ||
					'Không thể cập nhật danh mục',
				variant: 'destructive',
			})
		},
	})

	const handleCreateCategory = () => {
		if (!newCategoryName.trim()) {
			toast({
				title: 'Lỗi',
				description: 'Vui lòng nhập tên danh mục',
				variant: 'destructive',
			})
			return
		}

		createMutation.mutate({
			name: newCategoryName,
			parent: parentCategory || null,
		})
	}

	const handleDeleteCategory = (categoryId: string) => {
		if (confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
			deleteMutation.mutate(categoryId)
		}
	}

	const handleEditCategory = (category: AdminCategory) => {
		setEditingCategory(category)
		setEditName(category.name)
		setEditParent(category.parent || '')
		setIsEditOpen(true)
	}

	const handleUpdateCategory = () => {
		if (!editName.trim()) {
			toast({
				title: 'Lỗi',
				description: 'Vui lòng nhập tên danh mục',
				variant: 'destructive',
			})
			return
		}

		if (editingCategory) {
			updateMutation.mutate({
				categoryId: editingCategory.id,
				data: {
					name: editName,
					parent: editParent || null,
				},
			})
		}
	}

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader />

			<main className="container py-8">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold mb-2">
							Quản lý danh mục
						</h1>
						<p className="text-muted-foreground">
							Quản lý danh mục sản phẩm đấu giá
						</p>
					</div>

					<Dialog open={isOpen} onOpenChange={setIsOpen}>
						<DialogTrigger asChild>
							<Button size="lg">
								<Plus className="h-5 w-5 mr-2" />
								Thêm danh mục
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Thêm danh mục mới</DialogTitle>
								<DialogDescription>
									Tạo danh mục sản phẩm mới
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="category-name">
										Tên danh mục
									</Label>
									<Input
										id="category-name"
										placeholder="Ví dụ: Điện tử"
										value={newCategoryName}
										onChange={(e) =>
											setNewCategoryName(e.target.value)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="parent-category">
										Danh mục cha (Tùy chọn)
									</Label>
									<select
										id="parent-category"
										className="w-full px-3 py-2 border border-input bg-background rounded-md"
										value={parentCategory}
										onChange={(e) =>
											setParentCategory(e.target.value)
										}
									>
										<option value="">
											Để trống nếu là danh mục gốc
										</option>
										{categories
											.filter((c) => !c.parent)
											.map((c) => (
												<option key={c.id} value={c.id}>
													{c.name}
												</option>
											))}
									</select>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="submit"
									onClick={handleCreateCategory}
									disabled={createMutation.isPending}
								>
									{createMutation.isPending
										? 'Đang thêm...'
										: 'Thêm danh mục'}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Danh sách danh mục</CardTitle>
						<CardDescription>
							Tổng cộng {categories.length} danh mục
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? (
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
										<TableHead>Tên danh mục</TableHead>
										<TableHead>Danh mục cha</TableHead>
										<TableHead>Số sản phẩm</TableHead>
										<TableHead className="text-right">
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{categories.map((category) => (
										<TableRow key={category.id}>
											<TableCell>
												{category.id.slice(0, 8)}...
											</TableCell>
											<TableCell className="font-medium">
												{category.name}
											</TableCell>
											<TableCell>
												{category.parent
													? categories.find(
															(c) =>
																c.id ===
																category.parent
														)?.name || '-'
													: '-'}
											</TableCell>
											<TableCell>
												{category.productCount}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															handleEditCategory(
																category
															)
														}
													>
														<Edit className="h-4 w-4" />
													</Button>
													<Button
														variant="destructive"
														size="sm"
														disabled={
															category.productCount >
																0 ||
															deleteMutation.isPending
														}
														onClick={() =>
															handleDeleteCategory(
																category.id
															)
														}
													>
														<Trash2 className="h-4 w-4" />
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

				{/* Edit Category Dialog */}
				<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Chỉnh sửa danh mục</DialogTitle>
							<DialogDescription>
								Cập nhật thông tin danh mục sản phẩm
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="edit-name">Tên danh mục</Label>
								<Input
									id="edit-name"
									placeholder="Nhập tên danh mục"
									value={editName}
									onChange={(e) =>
										setEditName(e.target.value)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="edit-parent">
									Danh mục cha (tùy chọn)
								</Label>
								<select
									id="edit-parent"
									value={editParent}
									onChange={(e) =>
										setEditParent(e.target.value)
									}
									className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
								>
									<option value="">
										Không có danh mục cha
									</option>
									{categories
										.filter(
											(cat) =>
												cat.id !== editingCategory?.id
										)
										.map((cat) => (
											<option key={cat.id} value={cat.id}>
												{cat.name}
											</option>
										))}
								</select>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setIsEditOpen(false)
									setEditingCategory(null)
								}}
							>
								Hủy
							</Button>
							<Button
								onClick={handleUpdateCategory}
								disabled={updateMutation.isPending}
							>
								{updateMutation.isPending
									? 'Đang cập nhật...'
									: 'Cập nhật'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</main>
		</div>
	)
}
