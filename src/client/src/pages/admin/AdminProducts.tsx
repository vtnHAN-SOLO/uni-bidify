import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/input/button'
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
import { Eye, Trash2 } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { adminApi } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

export default function AdminProducts() {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const navigate = useNavigate()

	// ✅ Fetch products
	const { data: productsData = { products: [], pagination: {} }, isLoading } =
		useQuery({
			queryKey: ['admin', 'products'],
			queryFn: () => adminApi.getAdminProducts(1, 50),
		})

	const products = productsData.products || []

	// ✅ Delete product mutation
	const deleteMutation = useMutation({
		mutationFn: adminApi.deleteProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['admin', 'products'],
			})
			toast({
				title: 'Thành công',
				description: 'Sản phẩm đã được xóa',
			})
		},
		onError: (error: any) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error || 'Không thể xóa sản phẩm',
				variant: 'destructive',
			})
		},
	})

	const handleDeleteProduct = (productId: string) => {
		if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
			deleteMutation.mutate(productId)
		}
	}

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader />

			<main className="container py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-2">
						Quản lý sản phẩm
					</h1>
					<p className="text-muted-foreground">
						Quản lý tất cả sản phẩm đấu giá trên hệ thống
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Danh sách sản phẩm</CardTitle>
						<CardDescription>
							Tổng cộng {products.length} sản phẩm
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="flex justify-center py-8">
								<p className="text-muted-foreground">
									Đang tải dữ liệu...
								</p>
							</div>
						) : products.length === 0 ? (
							<div className="flex justify-center py-8">
								<p className="text-muted-foreground">
									Không có sản phẩm nào
								</p>
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Sản phẩm</TableHead>
										<TableHead>Danh mục</TableHead>
										<TableHead>Giá hiện tại</TableHead>
										<TableHead>Số lượt đấu giá</TableHead>
										<TableHead>Hết hạn</TableHead>
										<TableHead className="text-right">
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{products.map((product) => (
										<TableRow key={product._id}>
											<TableCell>
												<div className="flex items-center gap-3">
													{product.images &&
														product.images[0] && (
															<img
																src={
																	product
																		.images[0]
																}
																alt={
																	product.name
																}
																className="w-12 h-12 object-cover rounded"
															/>
														)}
													<div>
														<span className="font-medium block">
															{product.name}
														</span>
														<span className="text-xs text-muted-foreground">
															ID:{' '}
															{product._id.slice(
																0,
																8
															)}
															...
														</span>
													</div>
												</div>
											</TableCell>
											<TableCell>
												{product.categoryName || 'N/A'}
											</TableCell>
											<TableCell>
												{product.currentPrice.toLocaleString(
													'vi-VN'
												)}
												₫
											</TableCell>
											<TableCell>
												{product.bidCount || 0}
											</TableCell>
											<TableCell>
												{new Date(
													product.endTime
												).toLocaleDateString('vi-VN')}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															navigate(
																`/products/${product._id}`
															)
														}
													>
														<Eye className="h-4 w-4" />
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() =>
															handleDeleteProduct(
																product._id
															)
														}
														disabled={
															deleteMutation.isPending
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
			</main>
		</div>
	)
}
