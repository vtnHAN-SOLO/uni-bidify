import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	className?: string
}

const modules = {
	toolbar: [
		[{ header: [1, 2, 3, false] }],
		['bold', 'italic', 'underline', 'strike'],
		[{ color: [] }, { background: [] }],
		[{ list: 'ordered' }, { list: 'bullet' }],
		[{ align: [] }],
		['link'],
		['clean'],
	],
}

const formats = [
	'header',
	'bold',
	'italic',
	'underline',
	'strike',
	'color',
	'background',
	'list',
	'align',
	'link',
]

export function RichTextEditor({
	value,
	onChange,
	placeholder = 'Nhập nội dung...',
	className,
}: RichTextEditorProps) {
	return (
		<div className={cn('rich-text-editor', className)}>
			<ReactQuill
				theme="snow"
				value={value}
				onChange={onChange}
				modules={modules}
				formats={formats}
				placeholder={placeholder}
			/>
		</div>
	)
}
