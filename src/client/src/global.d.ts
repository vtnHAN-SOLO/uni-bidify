/// <reference types="vite/client" />

// CSS Modules
declare module '*.css' {
	const content: Record<string, string>
	export default content
}

// CSS
declare module '*.css' {
	const css: string
	export default css
}

// Images
declare module '*.svg' {
	const content: string
	export default content
}

declare module '*.png' {
	const content: string
	export default content
}

declare module '*.jpg' {
	const content: string
	export default content
}

declare module '*.jpeg' {
	const content: string
	export default content
}

declare module '*.gif' {
	const content: string
	export default content
}

declare module '*.ico' {
	const content: string
	export default content
}
