export default {
	app: {
		name: process.env.APP_NAME, // Application name
		apiURL: process.env.BASE_API_URL, // Base API URL
		clientURL: process.env.CLIENT_URL, // Client URL
	},
	port: process.env.PORT || 3000, // Server port
	database: {
		url: process.env.MONGO_URL, // MongoDB connection URL
	},
	jwt: {
		secret: process.env.JWT_SECRET, // JWT secret key
		tokenLife: process.env.JWT_LIFE, // JWT token life
	},
	smtp: {
		host: process.env.SMTP_HOST || 'smtp.gmail.com', // SMTP host
		port: parseInt(process.env.SMTP_PORT || '587'), // SMTP port
		secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
		user: process.env.SMTP_USER, // SMTP user (email)
		pass: process.env.SMTP_PASS, // SMTP password (app password)
		from: process.env.SMTP_FROM || 'AuctionHub <noreply@auctionhub.com>', // Sender name and email
	},
	aws: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID, // AWS access key ID
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // AWS secret access key
		region: process.env.AWS_REGION, // AWS region
		bucketName: process.env.AWS_BUCKET_NAME, // AWS S3 bucket name
	},
}
