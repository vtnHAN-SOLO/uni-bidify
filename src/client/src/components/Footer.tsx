import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react'

export const Footer = () => {
	const currentYear = new Date().getFullYear()

	return (
		<footer className="border-t bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
			<div className="container mx-auto px-6 py-12">
				<div className="grid gap-8 sm:grid-cols-2">
					{/* About Section */}
					<div className="space-y-4">
						<h3 className="text-lg font-bold text-primary">
							Về AuctionHub
						</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Sàn đấu giá trực tuyến uy tín hàng đầu Việt Nam,
							mang đến trải nghiệm đấu giá an toàn và minh bạch.
						</p>
						<div className="flex gap-3">
							<a
								href="https://facebook.com"
								target="_blank"
								rel="noopener noreferrer"
								className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-white hover:scale-110"
								aria-label="Facebook"
							>
								<Facebook className="h-4 w-4" />
							</a>
							<a
								href="https://instagram.com"
								target="_blank"
								rel="noopener noreferrer"
								className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-white hover:scale-110"
								aria-label="Instagram"
							>
								<Instagram className="h-4 w-4" />
							</a>
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-white hover:scale-110"
								aria-label="Twitter"
							>
								<Twitter className="h-4 w-4" />
							</a>
						</div>
					</div>

					{/* Contact Info */}
					<div className="space-y-4">
						<h3 className="text-lg font-bold text-primary">
							Liên hệ
						</h3>
						<ul className="space-y-3 text-sm text-muted-foreground">
							<li className="flex items-start gap-2">
								<MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
								<span>
									227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM
								</span>
							</li>
							<li className="flex items-center gap-2">
								<Phone className="h-4 w-4 flex-shrink-0 text-primary" />
								<a
									href="tel:+84123456789"
									className="hover:text-primary transition-colors hover:underline"
								>
									+84 123 456 789
								</a>
							</li>
							<li className="flex items-center gap-2">
								<Mail className="h-4 w-4 flex-shrink-0 text-primary" />
								<a
									href="mailto:support@auctionhub.vn"
									className="hover:text-primary transition-colors hover:underline"
								>
									support@auctionhub.vn
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-12 border-t pt-8 text-center">
					<p className="text-sm text-muted-foreground">
						© {currentYear} AuctionHub. All rights reserved.
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Made with ❤️ in Vietnam
					</p>
				</div>
			</div>
		</footer>
	)
}
