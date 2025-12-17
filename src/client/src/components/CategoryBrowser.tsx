/**
 * Example Component: CategoryBrowser
 *
 * Hướng dẫn sử dụng:
 * 1. Import component vào App hoặc Route
 * 2. Render: <CategoryBrowser />
 * 3. Click vào danh mục cha để xem danh mục con
 * 4. Click vào danh mục con để xem sản phẩm
 */

import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { useProductsByCategoryId } from '@/services'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/data-display/card'
import { Button } from '@/components/ui/input/button'
import { Badge } from '@/components/ui/data-display/badge'
import { ProductCard } from '@/components/ProductCard'

interface Category {
	_id: string
	name: string
	parent?: string | null
	children?: Category[]
}

export const CategoryBrowser = () => {
	const { categories, loading, error } = useCategories()
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
		null
	)
	const { data: productsData } = useProductsByCategoryId(
		selectedCategoryId || ''
	)

	if (loading)
		return <div className="p-8 text-center">Loading categories...</div>
	if (error)
		return <div className="p-8 text-red-500">Error loading categories</div>

	const selectedCategory = categories.find(
		(c) => c._id === selectedCategoryId
	)

	return (
		<div className="container py-8">
			<h1 className="text-3xl font-bold mb-8">Duyệt Danh Mục Sản Phẩm</h1>

			<div className="grid grid-cols-4 gap-6">
				{/* Column 1: Parent Categories */}
				<div>
					<h2 className="text-lg font-semibold mb-4">
						Danh Mục Chính
					</h2>
					<div className="space-y-2">
						{categories.map((category) => (
							<Button
								key={category._id}
								variant="outline"
								className="w-full justify-start"
								onClick={() => {
									setSelectedCategoryId(null)
								}}
							>
								{category.name}
								<Badge variant="secondary" className="ml-auto">
									{category.children?.length || 0}
								</Badge>
							</Button>
						))}
					</div>
				</div>

				{/* Column 2-3: Child Categories & Products */}
				<div className="col-span-3">
					{selectedCategoryId ? (
						<>
							<div className="mb-8">
								<h2 className="text-xl font-semibold mb-4">
									Sản phẩm trong "{selectedCategory?.name}"
								</h2>
								{productsData?.products &&
								productsData.products.length > 0 ? (
									<div className="grid grid-cols-4 gap-4">
										{productsData.products.map((p) => {
											const product = p as Record<
												string,
												unknown
											> & {
												_id: string
												isNew?: boolean
												categoryName?: string
											}
											return (
												<ProductCard
													key={product._id}
													id={product._id}
													image={
														(
															product.images as string[]
														)?.[0] ||
														'/images/placeholder.jpg'
													}
													title={
														(product.name as string) ||
														'Chưa có tên'
													}
													currentPrice={
														(product.currentPrice as number) ||
														0
													}
													buyNowPrice={
														(product.buyNowPrice as number) ||
														undefined
													}
													highestBidder={
														(product.highestBidderName as string) ||
														'Chưa có'
													}
													bidCount={
														(product.bidCount as number) ||
														0
													}
													endTime={
														new Date(
															(product.endTime as string) ||
																Date.now()
														)
													}
													isNew={product.isNew}
													category={
														(product.categoryName as string) ||
														'Khác'
													}
												/>
											)
										})}
									</div>
								) : (
									<div className="text-center text-muted-foreground">
										Không có sản phẩm trong danh mục này
									</div>
								)}
							</div>
						</>
					) : (
						<div className="space-y-6">
							{categories.map((parentCategory) => (
								<Card key={parentCategory._id}>
									<CardHeader>
										<CardTitle className="text-lg">
											{parentCategory.name}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-3 gap-2">
											{parentCategory.children?.map(
												(child) => (
													<Button
														key={child._id}
														variant="ghost"
														className="justify-start text-sm"
														onClick={() =>
															setSelectedCategoryId(
																child._id
															)
														}
													>
														➤ {child.name}
													</Button>
												)
											)}
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default CategoryBrowser
