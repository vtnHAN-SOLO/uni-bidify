import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/input/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/data-display/card'
import { Textarea } from '@/components/ui/input/textarea'
import { Label } from '@/components/ui/input/label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useProductDetail, useAppendProductDescription } from '@/services/utils/products.hooks'
import { toast } from 'sonner'

export default function EditProductDescription() {
	const { id } = useParams()
	const navigate = useNavigate()
	const { data: product, isLoading, error } = useProductDetail(id || '')
	const appendDescriptionMutation = useAppendProductDescription()

	const [additionalDescription, setAdditionalDescription] = useState('')

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<Header />
				<div className="flex justify-center items-center py-20">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			</div>
		)
	}

	if (error || !product) {
		return (
			<div className="min-h-screen bg-background">
				<Header />
				<div className="container py-8 text-center">
					<p className="text-destructive mb-4">Không tìm thấy sản phẩm</p>
					<Button onClick={() => navigate('/seller/products')}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Quay lại
					</Button>
				</div>
			</div>
		)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			await appendDescriptionMutation.mutateAsync({
				productId: id!,
				content: additionalDescription,
			})
			toast.success('Đã cập nhật mô tả thành công')
			navigate('/seller/products')
		} catch (err: any) {
			toast.error(err?.response?.data?.error || 'Không thể cập nhật mô tả')
		}
	}

	return (
		<div className="min-h-screen bg-background">
			<Header />

			<main className="container py-8">
				<Button
					variant="ghost"
					onClick={() => navigate('/seller/products')}
					className="mb-6"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Quay lại
				</Button>

				<div className="max-w-4xl mx-auto">
					<Card>
						<CardHeader>
							<CardTitle>Bổ sung mô tả sản phẩm</CardTitle>
							<CardDescription>
								Thông tin mới sẽ được thêm vào cuối mô tả hiện
								tại (không thay thế)
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="space-y-2">
									<Label>Sản phẩm</Label>
									<div className="flex gap-4 p-4 border rounded-lg bg-muted/50">
										<img
											src={product.images?.[0] || '/images/placeholder.jpg'}
											alt={product.name}
											className="w-20 h-20 object-cover rounded"
										/>
										<div>
											<h3 className="font-semibold">
												{product.name}
											</h3>
											<p className="text-sm text-muted-foreground">
												{product.categoryName || 'Chưa phân loại'}
											</p>
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Mô tả hiện tại</Label>
									<div className="p-4 border rounded-lg bg-muted/50 max-h-60 overflow-y-auto">
										<p className="text-sm whitespace-pre-wrap">
											{product.description}
										</p>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="additional-description">
										Thông tin bổ sung *
									</Label>
									<Textarea
										id="additional-description"
										value={additionalDescription}
										onChange={(e) =>
											setAdditionalDescription(
												e.target.value
											)
										}
										placeholder="Nhập thông tin bổ sung cho sản phẩm..."
										className="min-h-[200px]"
										required
									/>
									<p className="text-sm text-muted-foreground">
										Thông tin này sẽ được thêm vào cuối mô
										tả hiện tại với dấu thời gian
									</p>
								</div>

								<div className="flex gap-4">
									<Button
										type="submit"
										size="lg"
										disabled={appendDescriptionMutation.isPending}
									>
										{appendDescriptionMutation.isPending ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												Đang cập nhật...
											</>
										) : (
											'Cập nhật mô tả'
										)}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="lg"
										onClick={() => navigate('/seller/products')}
										disabled={appendDescriptionMutation.isPending}
									>
										Hủy
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	)
}
