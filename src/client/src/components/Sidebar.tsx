import { useState } from 'react'
import { X, Menu, ChevronDown } from 'lucide-react'
import { Button } from './ui/input/button'
import { useCategories } from '../hooks/useCategories'
import { useNavigate } from 'react-router-dom'
import type { Category } from '../services/api/categories.api'

export default function Sidebar() {
	const [isOpen, setIsOpen] = useState(false) // Sidebar ẩn mặc định
	const [expandedCategory, setExpandedCategory] = useState<string | null>(
		null
	) // Chỉ 1 parent mở cùng lúc
	const { categories, loading } = useCategories()
	const navigate = useNavigate()

	// Toggle expand/collapse for parent category - chỉ cho 1 parent mở
	const toggleExpand = (categoryId: string) => {
		if (expandedCategory === categoryId) {
			// Click lại → đóng
			setExpandedCategory(null)
		} else {
			// Click category khác → đóng cái cũ, mở cái mới
			setExpandedCategory(categoryId)
		}
	}

	// Only navigate when clicking child category (not parent)
	const handleChildClick = (categoryId: string) => {
		navigate(`/category/${categoryId}`)
		setIsOpen(false) // Close sidebar after selection (mobile)
	}

	const renderCategories = (cats: Category[]) => {
		return (
			<ul className="space-y-0">
				{cats.map((cat) => {
					const hasChildren = cat.children && cat.children.length > 0
					const isExpanded = expandedCategory === cat._id

					return (
						<li key={cat._id}>
							<button
								onClick={() => {
									// If has children, toggle expand/collapse
									if (hasChildren) {
										toggleExpand(cat._id)
									}
									// If no children, navigate (shouldn't happen with current data)
								}}
								className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b transition-colors text-gray-700 hover:text-blue-600 font-medium flex items-center justify-between group"
							>
								<span>{cat.name}</span>
								{hasChildren && (
									<ChevronDown
										className={`h-4 w-4 transition-transform duration-200 ${
											isExpanded ? 'rotate-180' : ''
										}`}
									/>
								)}
							</button>

							{/* Render children categories - accordion style */}
							{hasChildren && isExpanded && (
								<ul className="bg-gray-50">
									{cat.children!.map((child) => (
										<li key={child._id}>
											<button
												onClick={() =>
													handleChildClick(child._id)
												}
												className="w-full text-left px-8 py-3 hover:bg-blue-100 text-sm text-gray-600 hover:text-blue-600 transition-colors block"
											>
												▸ {child.name}
											</button>
										</li>
									))}
								</ul>
							)}
						</li>
					)
				})}
			</ul>
		)
	}

	return (
		<>
			{/* Hamburger Button (Fixed in top-left) */}
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setIsOpen(!isOpen)}
				className="fixed top-16 left-4 z-40 bg-white border border-gray-200 hover:bg-gray-100"
				aria-label="Toggle menu"
			>
				<Menu className="h-6 w-6" />
			</Button>

			{/* Overlay - click to close */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-30 md:hidden"
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`
					fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-40
					transition-transform duration-300 ease-in-out
					w-72
					${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
					md:relative md:translate-x-0 md:w-64
				`}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b md:hidden">
					<h2 className="text-lg font-bold text-gray-900">
						Danh Mục
					</h2>
					<button
						onClick={() => setIsOpen(false)}
						className="p-1 hover:bg-gray-100 rounded"
						aria-label="Close menu"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Categories List */}
				<div className="overflow-y-auto h-[calc(100vh-100px)] md:h-[calc(100vh-120px)]">
					{loading ? (
						<div className="p-4 text-center text-gray-500">
							Đang tải...
						</div>
					) : categories.length > 0 ? (
						renderCategories(categories)
					) : (
						<div className="p-4 text-center text-gray-500">
							Không có danh mục
						</div>
					)}
				</div>
			</aside>

			{/* Main Content Spacer for Mobile */}
			<div className="md:hidden w-0" />
		</>
	)
}
