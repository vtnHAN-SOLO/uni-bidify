import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Format price in a compact way for large numbers
 * @param price - The price to format
 * @returns Formatted price string
 *
 * Examples:
 * - 38000000000 → "38 tỷ"
 * - 18000000000 → "18 tỷ"
 * - 50000000 → "50 triệu"
 * - 500000 → "500K"
 * - 50000 → "50.000₫"
 */
export function formatCompactPrice(price: number): string {
	if (price >= 1000000000) {
		// Tỷ (billion)
		const billions = price / 1000000000
		return billions % 1 === 0
			? `${billions} tỷ`
			: `${billions.toFixed(1)} tỷ`
	} else if (price >= 1000000) {
		// Triệu (million)
		const millions = price / 1000000
		return millions % 1 === 0
			? `${millions} triệu`
			: `${millions.toFixed(1)} triệu`
	} else if (price >= 100000) {
		// K (thousand) - only for 100K+
		const thousands = price / 1000
		return `${Math.round(thousands)}K`
	} else {
		// Regular format for smaller numbers
		return `${price.toLocaleString('vi-VN')}₫`
	}
}
