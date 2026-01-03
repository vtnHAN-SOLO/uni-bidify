import { Link } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/input/button'
import { Card, CardContent } from '@/components/ui/data-display/card'
import { Badge } from '@/components/ui/data-display/badge'
import { Plus, Edit, Trash2, Eye, Loader2 } from 'lucide-react'
import {
	useSellerProducts,
	useDeleteProduct,
} from '@/services/utils/products.hooks'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/navigation/pagination'

export default function SellerProducts() {
	const [page, setPage] = useState(1)
	const limit = 20
	const { data, isLoading, error } = useSellerProducts(page, limit)

	// Scroll to top when page changes
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}, [page])

	const deleteProductMutation = useDeleteProduct()

	const handleDelete = async (
		productId: string,
		productName: string,
		bidCount: number
	) => {
		if (bidCount > 0) {
			toast.error('Không thể xóa sản phẩm đã có người đấu giá')
			return
		}

		if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}"?`)) {
			return
		}

		try {
			await deleteProductMutation.mutateAsync(productId)
			toast.success('Đã xóa sản phẩm thành công')
		} catch (err: any) {
			toast.error(err?.response?.data?.error || 'Không thể xóa sản phẩm')
		}
	}

	const formatTimeRemaining = (endTime: string) => {
		const end = new Date(endTime)
		const now = new Date()
		const diff = end.getTime() - now.getTime()

		if (diff <= 0) return 'Đã kết thúc'

		const hours = Math.floor(diff / (1000 * 60 * 60))
		if (hours >= 24) {
			const days = Math.floor(hours / 24)
			return `${days}d`
		}
		return `${hours}h`
	}

	// Helper function to generate smart page numbers
	const getPageNumbers = (
		currentPage: number,
		totalPages: number
	): (number | 'ellipsis')[] => {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1)
		}

		const pages: (number | 'ellipsis')[] = []
		pages.push(1)

		if (currentPage > 3) {
			pages.push('ellipsis')
		}

		for (
			let i = Math.max(2, currentPage - 1);
			i <= Math.min(totalPages - 1, currentPage + 1);
			i++
		) {
			pages.push(i)
		}

		if (currentPage < totalPages - 2) {
			pages.push('ellipsis')
		}

		if (totalPages > 1) {
			pages.push(totalPages)
		}

		return pages
	}

	return (
		<div className="min-h-screen bg-background">
			<Header />

			<main className="container py-8">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold mb-2">
							Quản lý sản phẩm
						</h1>
						<p className="text-muted-foreground">
							Danh sách sản phẩm đang đấu giá của bạn
						</p>
					</div>
					<Link to="/seller/create-product">
						<Button size="lg">
							<Plus className="h-5 w-5 mr-2" />
							Đăng sản phẩm mới
						</Button>
					</Link>
				</div>

				{isLoading && (
					<div className="flex justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}

				{error && (
					<div className="text-center py-12 text-destructive">
						Không thể tải danh sách sản phẩm. Vui lòng thử lại.
					</div>
				)}

				{data && data.data.products.length === 0 && (
					<div className="text-center py-12">
						<p className="text-muted-foreground mb-4">
							Bạn chưa có sản phẩm nào đang đấu giá
						</p>
						<Link to="/seller/create-product">
							<Button>
								<Plus className="h-5 w-5 mr-2" />
								Đăng sản phẩm đầu tiên
							</Button>
						</Link>
					</div>
				)}

				{data && data.data.products.length > 0 && (
					<>
						{/* Product count info */}
						<div className="flex items-center justify-between mb-4">
							<p className="text-sm text-muted-foreground">
								Hiển thị {(page - 1) * limit + 1} -{' '}
								{Math.min(page * limit, data.data.total)} trong
								tổng số {data.data.total} sản phẩm
							</p>
						</div>

						<div className="grid gap-4">
							{data.data.products.map((product) => (
								<Card key={product._id}>
									<CardContent className="p-6">
										<div className="flex gap-6">
											<img
												src={
													product.images?.[0] ||
													'/images/placeholder.jpg'
												}
												alt={product.name}
												className="w-32 h-32 object-cover rounded-lg"
											/>

											<div className="flex-1">
												<div className="flex items-start justify-between mb-2">
													<div>
														<h3 className="font-semibold text-lg mb-1">
															{product.name}
														</h3>
														<Badge variant="secondary">
															{product.categoryName ||
																'Chưa phân loại'}
														</Badge>
													</div>
													<div className="flex gap-2">
														<Link
															to={`/products/${product._id}`}
														>
															<Button
																variant="outline"
																size="sm"
															>
																<Eye className="h-4 w-4 mr-1" />
																Xem
															</Button>
														</Link>
														<Link
															to={`/seller/products/${product._id}/edit`}
														>
															<Button
																variant="outline"
																size="sm"
															>
																<Edit className="h-4 w-4 mr-1" />
																Sửa mô tả
															</Button>
														</Link>

														<Button
															variant="destructive"
															size="sm"
															onClick={() =>
																handleDelete(
																	product._id,
																	product.name,
																	product.bidCount ||
																		0
																)
															}
															disabled={
																deleteProductMutation.isPending
															}
														>
															{deleteProductMutation.isPending ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<Trash2 className="h-4 w-4" />
															)}
														</Button>
													</div>
												</div>

												<div className="grid grid-cols-4 gap-4 mt-4">
													<div>
														<p className="text-sm text-muted-foreground">
															Giá hiện tại
														</p>
														<p className="text-lg font-bold text-primary">
															{product.currentPrice.toLocaleString(
																'vi-VN'
															)}
															₫
														</p>
													</div>
													<div>
														<p className="text-sm text-muted-foreground">
															Số lượt đấu giá
														</p>
														<p className="text-lg font-semibold">
															{product.bidCount ||
																0}
														</p>
													</div>
													<div>
														<p className="text-sm text-muted-foreground">
															Người đấu giá cao
															nhất
														</p>
														<p className="text-lg font-semibold">
															{product.highestBidderName ||
																'Chưa có'}
														</p>
													</div>
													<div>
														<p className="text-sm text-muted-foreground">
															Thời gian còn lại
														</p>
														<p className="text-lg font-semibold">
															{formatTimeRemaining(
																product.endTime
															)}
														</p>
													</div>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						{/* Pagination */}
						{data.data.totalPages > 1 && (
							<div className="mt-8">
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious
												onClick={() =>
													setPage((p) =>
														Math.max(1, p - 1)
													)
												}
												className={
													page === 1
														? 'pointer-events-none opacity-50'
														: 'cursor-pointer'
												}
											/>
										</PaginationItem>

										{getPageNumbers(
											page,
											data.data.totalPages
										).map((pageNum, idx) => (
											<PaginationItem key={idx}>
												{pageNum === 'ellipsis' ? (
													<PaginationEllipsis />
												) : (
													<PaginationLink
														onClick={() =>
															setPage(pageNum)
														}
														isActive={
															page === pageNum
														}
														className="cursor-pointer"
													>
														{pageNum}
													</PaginationLink>
												)}
											</PaginationItem>
										))}

										<PaginationItem>
											<PaginationNext
												onClick={() =>
													setPage((p) =>
														Math.min(
															data.data
																.totalPages,
															p + 1
														)
													)
												}
												className={
													page ===
													data.data.totalPages
														? 'pointer-events-none opacity-50'
														: 'cursor-pointer'
												}
											/>
										</PaginationItem>
									</PaginationContent>
								</Pagination>

								<p className="text-center text-sm text-muted-foreground mt-4">
									Trang {page} / {data.data.totalPages}
								</p>
							</div>
						)}
					</>
				)}
			</main>
		</div>
	)
}
