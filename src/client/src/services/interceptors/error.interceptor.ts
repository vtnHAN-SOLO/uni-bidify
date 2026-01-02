import { AxiosInstance, AxiosError } from 'axios'
import { toast } from 'sonner' // hoặc react-toastify

interface ApiErrorResponse {
	message?: string
	statusCode?: number
	error?: string
}

// Helper function để lấy error message từ response
const getErrorMessage = (data: ApiErrorResponse, fallback: string): string => {
	return data.error || data.message || fallback
}

export const errorInterceptor = (axiosInstance: AxiosInstance) => {
	axiosInstance.interceptors.response.use(
		(response) => response,
		(error: AxiosError<ApiErrorResponse>) => {
			if (error.response) {
				const { status, data } = error.response

				switch (status) {
					case 400:
						// Bad request - hiển thị lỗi cụ thể từ backend
						toast.error(getErrorMessage(data, 'Yêu cầu không hợp lệ'))
						break

					case 401:
						// Unauthorized - redirect to login
						localStorage.removeItem('accessToken')
						window.location.href = '/auth'
						toast.error('Phiên đăng nhập đã hết hạn')
						break

					case 403:
						// Hiển thị lỗi cụ thể từ backend nếu có
						toast.error(getErrorMessage(data, 'Bạn không có quyền truy cập'))
						break

					case 404:
						toast.error(getErrorMessage(data, 'Không tìm thấy dữ liệu'))
						break

					case 422:
						toast.error(getErrorMessage(data, 'Dữ liệu không hợp lệ'))
						break

					case 500:
						toast.error('Lỗi hệ thống. Vui lòng thử lại sau')
						break

					default:
						// Không hiển thị toast mặc định ở đây
						// Để cho các component tự xử lý hiển thị lỗi cụ thể
						break
				}
			} else if (error.request) {
				toast.error('Không thể kết nối đến server')
			}

			return Promise.reject(error)
		}
	)
}
