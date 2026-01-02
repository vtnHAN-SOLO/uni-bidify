import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/input/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/data-display/card'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/input/form'
import { Input } from '@/components/ui/input/input'
import { useToast } from '@/hooks/use-toast'
import { Settings, Clock, Timer, Loader2 } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { adminApi } from '@/services/api'

const settingsSchema = z.object({
	triggerMinutes: z.coerce
		.number()
		.min(1, 'Thời gian kích hoạt phải lớn hơn 0')
		.max(60, 'Thời gian kích hoạt không được vượt quá 60 phút'),
	extensionMinutes: z.coerce
		.number()
		.min(1, 'Thời gian gia hạn phải lớn hơn 0')
		.max(120, 'Thời gian gia hạn không được vượt quá 120 phút'),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

const AdminAuctionSettings = () => {
	const { toast } = useToast()
	const queryClient = useQueryClient()

	// Fetch current settings from API
	const {
		data: settings,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['admin', 'settings'],
		queryFn: adminApi.getSettings,
	})

	const form = useForm<SettingsFormValues>({
		resolver: zodResolver(settingsSchema),
		defaultValues: {
			triggerMinutes: 5,
			extensionMinutes: 10,
		},
	})

	// Update form when settings are fetched
	useEffect(() => {
		if (settings) {
			form.reset({
				triggerMinutes: settings.triggerMinutes,
				extensionMinutes: settings.extensionMinutes,
			})
		}
	}, [settings, form])

	// Mutation for updating settings
	const updateMutation = useMutation({
		mutationFn: adminApi.updateSettings,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
			toast({
				title: 'Lưu cài đặt thành công',
				description: `Đấu giá sẽ tự động gia hạn ${data.extensionMinutes} phút khi có lượt đặt giá trong ${data.triggerMinutes} phút cuối.`,
			})
		},
		onError: (error: Error & { response?: { data?: { error?: string } } }) => {
			toast({
				title: 'Lỗi',
				description:
					error?.response?.data?.error || 'Không thể lưu cài đặt',
				variant: 'destructive',
			})
		},
	})

	const onSubmit = (data: SettingsFormValues) => {
		updateMutation.mutate(data)
	}

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<AdminHeader />
				<main className="container py-8">
					<div className="flex items-center justify-center h-64">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
						<span className="ml-2">Đang tải cài đặt...</span>
					</div>
				</main>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="min-h-screen bg-background">
				<AdminHeader />
				<main className="container py-8">
					<div className="flex items-center justify-center h-64">
						<p className="text-destructive">
							Không thể tải cài đặt. Vui lòng thử lại.
						</p>
					</div>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader />
			<main className="container py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight mb-2">
						Cấu hình hệ thống đấu giá
					</h1>
					<p className="text-muted-foreground">
						Quản lý các tham số tự động gia hạn cho toàn bộ sản phẩm
						đấu giá
					</p>
				</div>

				<div className="grid gap-6 max-w-3xl">
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<Settings className="h-5 w-5 text-primary" />
								<CardTitle>Cài đặt tự động gia hạn</CardTitle>
							</div>
							<CardDescription>
								Cấu hình thời gian kích hoạt và thời gian gia
								hạn cho tất cả các phiên đấu giá
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(onSubmit)}
									className="space-y-6"
								>
									<FormField
										control={form.control}
										name="triggerMinutes"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center gap-2">
													<Clock className="h-4 w-4 text-primary" />
													Thời gian kích hoạt (phút)
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														placeholder="5"
														{...field}
														className="max-w-xs"
													/>
												</FormControl>
												<FormDescription>
													Thời gian trước khi đấu giá
													kết thúc để kích hoạt tính
													năng gia hạn tự động
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="extensionMinutes"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center gap-2">
													<Timer className="h-4 w-4 text-primary" />
													Thời gian gia hạn (phút)
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														placeholder="10"
														{...field}
														className="max-w-xs"
													/>
												</FormControl>
												<FormDescription>
													Thời gian gia hạn thêm khi
													có lượt đặt giá trong khoảng
													thời gian kích hoạt
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="flex gap-4">
										<Button
											type="submit"
											disabled={updateMutation.isPending}
										>
											{updateMutation.isPending ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin mr-2" />
													Đang lưu...
												</>
											) : (
												'Lưu cài đặt'
											)}
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												form.reset({
													triggerMinutes:
														settings?.triggerMinutes ||
														5,
													extensionMinutes:
														settings?.extensionMinutes ||
														10,
												})
											}
										>
											Đặt lại
										</Button>
									</div>
								</form>
							</Form>
						</CardContent>
					</Card>

					<Card className="border-primary/20 bg-primary/5">
						<CardHeader>
							<CardTitle className="text-base">
								Cài đặt hiện tại
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 text-sm">
								<p className="flex items-center gap-2">
									<Clock className="h-4 w-4 text-primary" />
									<span className="font-medium">
										Thời gian kích hoạt:
									</span>
									<span className="text-primary font-semibold">
										{settings?.triggerMinutes || 5} phút
									</span>
								</p>
								<p className="flex items-center gap-2">
									<Timer className="h-4 w-4 text-primary" />
									<span className="font-medium">
										Thời gian gia hạn:
									</span>
									<span className="text-primary font-semibold">
										{settings?.extensionMinutes || 10} phút
									</span>
								</p>
								<p className="text-muted-foreground pt-2 border-t">
									<span className="font-medium">
										Quy tắc:
									</span>{' '}
									Khi có lượt đặt giá mới trong{' '}
									<span className="text-foreground font-semibold">
										{settings?.triggerMinutes || 5} phút
									</span>{' '}
									cuối, đấu giá sẽ tự động gia hạn thêm{' '}
									<span className="text-foreground font-semibold">
										{settings?.extensionMinutes || 10} phút
									</span>
									.
								</p>
								{settings?.updatedAt && (
									<p className="text-xs text-muted-foreground pt-2">
										Cập nhật lần cuối:{' '}
										{new Date(
											settings.updatedAt
										).toLocaleString('vi-VN')}
									</p>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	)
}

export default AdminAuctionSettings
