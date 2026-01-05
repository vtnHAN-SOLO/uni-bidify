import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

interface HtmlContentProps {
	html: string
	className?: string
}

// Decode HTML entities that may have been escaped
function decodeHtmlEntities(str: string): string {
	const textarea = document.createElement('textarea')
	textarea.innerHTML = str
	return textarea.value
}

export function HtmlContent({ html, className }: HtmlContentProps) {
	// First decode any escaped HTML entities, then sanitize
	const decodedHtml = decodeHtmlEntities(html || '')
	const sanitizedHtml = DOMPurify.sanitize(decodedHtml, {
		ALLOWED_TAGS: [
			'p',
			'br',
			'hr',
			'div',
			'strong',
			'b',
			'em',
			'i',
			'u',
			's',
			'strike',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'ul',
			'ol',
			'li',
			'a',
			'span',
		],
		ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
	})

	return (
		<div
			className={cn('prose prose-sm max-w-none html-content', className)}
			dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
		/>
	)
}
