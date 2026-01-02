import express, { Request, Response } from 'express'
import Category from '../../Models/Category.js'

const router = express.Router()

interface CategoryDoc {
	_id: { toString: () => string }
	name: string
	parent: { _id: { toString: () => string }; name: string } | null
}

// POST /api/categories
router.post('/', async (req: Request, res: Response) => {
	try {
		const { name, parent } = req.body

		if (!name) {
			return res.status(400).json({ error: 'Vui lòng nhập tên danh mục' })
		}

		const category = await Category.create({
			name,
			parent: parent || null,
		})

		return res.status(201).json(category)
	} catch (error: unknown) {
		return res
			.status(500)
			.json({ error: String(error) || 'Không thể tạo danh mục' })
	}
})

// GET /api/categories - xem nhanh tất cả category
router.get('/', async (_req: Request, res: Response) => {
	try {
		// Fetch all parent categories with their children
		const parentCategories = (await Category.find({
			parent: null,
		}).lean()) as unknown as CategoryDoc[]
		const childCategories = (await Category.find({
			parent: { $ne: null },
		})
			.populate('parent', 'name')
			.lean()) as unknown as CategoryDoc[]

		// Group children by parent
		const categoriesWithChildren = parentCategories.map(
			(parent: CategoryDoc) => {
				const children = childCategories.filter(
					(child: CategoryDoc) => {
						const childParentId =
							child.parent?._id?.toString?.() ??
							child.parent?.toString?.()
						const parentId = parent._id.toString()
						return childParentId === parentId
					}
				)

				return {
					...parent,
					children,
				}
			}
		)

		res.json(categoriesWithChildren)
	} catch (error: unknown) {
		res.status(500).json({
			error: String(error) || 'Không thể lấy danh sách danh mục',
		})
	}
})

// GET /api/categories/:id - lấy chi tiết danh mục
router.get('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const category = await Category.findById(id)
			.populate('parent', 'name')
			.lean()

		if (!category) {
			return res.status(404).json({ error: 'Không tìm thấy danh mục' })
		}

		return res.json(category)
	} catch (error: unknown) {
		return res.status(500).json({
			error: String(error) || 'Không thể lấy thông tin danh mục',
		})
	}
})

// GET /api/categories/:id/children - lấy danh mục con
router.get('/:id/children', async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const childCategories = await Category.find({ parent: id })
			.populate('parent', 'name')
			.lean()

		if (!childCategories || childCategories.length === 0) {
			return res.json({
				parentId: id,
				children: [],
				message: 'Không có danh mục con',
			})
		}

		return res.json({
			parentId: id,
			children: childCategories,
		})
	} catch (error: unknown) {
		return res.status(500).json({
			error: String(error) || 'Không thể lấy danh mục con',
		})
	}
})

export default router
